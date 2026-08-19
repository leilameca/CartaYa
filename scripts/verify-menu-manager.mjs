import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadLocalEnv() {
  const values = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const separator = line.indexOf("=");
    if (separator > 0) values[line.slice(0, separator)] = line.slice(separator + 1).replace(/^['\"]|['\"]$/g, "");
  }
  return values;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const env = loadLocalEnv();
assert(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY && env.SUPABASE_SERVICE_ROLE_KEY, "Faltan variables de Supabase");

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const publicClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const email = `menu-test-${suffix}@example.com`;
const password = `CartaYa-${crypto.randomUUID()}-Aa1!`;
let userId;
let restaurantId;

try {
  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (userError) throw userError;
  userId = userData.user.id;

  const { data: restaurant, error: restaurantError } = await admin
    .from("restaurants")
    .insert({ name: `Menú Test ${suffix}`, slug: `menu-test-${suffix}`, subscription_tier: "gratis" })
    .select("id")
    .single();
  if (restaurantError) throw restaurantError;
  restaurantId = restaurant.id;

  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    restaurant_id: restaurantId,
    role: "owner",
    full_name: "Prueba Gestor",
  });
  if (profileError) throw profileError;

  const { error: loginError } = await publicClient.auth.signInWithPassword({ email, password });
  if (loginError) throw loginError;

  const { data: categories, error: categoryError } = await publicClient
    .from("categories")
    .select("id, name")
    .order("display_order");
  if (categoryError) throw categoryError;
  assert(categories.length === 4, "No se crearon las cuatro categorías predeterminadas");

  const entradas = categories.find((category) => category.name === "Entradas");
  const fuertes = categories.find((category) => category.name === "Platos fuertes");
  assert(entradas && fuertes, "No se recuperaron las categorías creadas");

  const { error: renameError } = await publicClient.from("categories").update({ name: "Aperitivos" }).eq("id", entradas.id);
  if (renameError) throw renameError;
  const orderedIds = [fuertes.id, ...categories.filter((category) => category.id !== fuertes.id).map((category) => category.id)];
  const { error: reorderError } = await publicClient.rpc("reorder_categories", { p_ordered_ids: orderedIds });
  if (reorderError) throw reorderError;
  const { data: reordered } = await publicClient.from("categories").select("id").order("display_order");
  assert(reordered?.[0]?.id === fuertes.id, "No se guardó el nuevo orden de categorías");
  console.log("✓ Categorías predeterminadas: crear automáticamente, renombrar y reordenar");

  const { data: testDish, error: dishError } = await publicClient
    .from("menu_items")
    .insert({ restaurant_id: restaurantId, category_id: fuertes.id, name: "Mofongo", description: "Prueba", price: 450, tag: "popular" })
    .select("id")
    .single();
  if (dishError) throw dishError;
  const { error: unavailableError } = await publicClient.from("menu_items").update({ is_available: false }).eq("id", testDish.id);
  if (unavailableError) throw unavailableError;
  const { data: unavailableDish } = await publicClient.from("menu_items").select("is_available").eq("id", testDish.id).single();
  assert(unavailableDish?.is_available === false, "El estado Agotado no se guardó");
  const { error: deleteDishError } = await publicClient.from("menu_items").delete().eq("id", testDish.id);
  if (deleteDishError) throw deleteDishError;
  console.log("✓ Platos: crear, marcar Agotado y eliminar");

  const twentyItems = Array.from({ length: 20 }, (_, index) => ({
    restaurant_id: restaurantId,
    category_id: fuertes.id,
    name: `Plato ${index + 1}`,
    price: 100 + index,
  }));
  const { error: twentyError } = await publicClient.from("menu_items").insert(twentyItems);
  if (twentyError) throw twentyError;
  const { error: twentyOneError } = await publicClient.from("menu_items").insert({
    restaurant_id: restaurantId,
    category_id: fuertes.id,
    name: "Plato 21 forzado",
    price: 999,
  });
  assert(twentyOneError, "La API permitió crear el plato 21");
  assert(twentyOneError.message.includes("Llegaste al límite del plan Gratis"), "La base no devolvió el mensaje correcto del plan Gratis");
  console.log("✓ El plato 21 fue bloqueado directamente por Postgres con el mensaje correcto");

  const { error: deleteCategoryError } = await publicClient.from("categories").delete().eq("id", fuertes.id);
  if (deleteCategoryError) throw deleteCategoryError;
  const { count } = await publicClient.from("menu_items").select("id", { count: "exact", head: true });
  assert(count === 0, "Eliminar la categoría no eliminó sus platos");
  console.log("✓ Eliminar una categoría elimina sus platos asociados");
} finally {
  await publicClient.auth.signOut();
  if (userId) await admin.auth.admin.deleteUser(userId);
  if (restaurantId) await admin.from("restaurants").delete().eq("id", restaurantId);
}

console.log("\nGestor de Menú verificado y datos temporales eliminados.");
