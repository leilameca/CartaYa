import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadLocalEnv() {
  const values = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const separator = line.indexOf("=");
    if (separator > 0) values[line.slice(0, separator)] = line.slice(separator + 1);
  }
  return values;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const env = loadLocalEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secretKey = env.SUPABASE_SERVICE_ROLE_KEY;
assert(url && publicKey && secretKey, "Faltan variables de Supabase en .env.local");

const admin = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const password = `CartaYa-${crypto.randomUUID()}-Aa1!`;
const fixtures = [
  {
    email: `foundation-a-${suffix}@example.com`,
    fullName: "Prueba Owner A",
    restaurantName: `Restaurante Prueba A ${suffix}`,
    slug: `prueba-a-${suffix}`,
  },
  {
    email: `foundation-b-${suffix}@example.com`,
    fullName: "Prueba Owner B",
    restaurantName: `Restaurante Prueba B ${suffix}`,
    slug: `prueba-b-${suffix}`,
  },
];
const createdUsers = [];
const createdRestaurants = [];

async function createOwner(fixture) {
  const signupClient = createClient(url, publicKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await signupClient.auth.signUp({
    email: fixture.email,
    password,
    options: {
      data: {
        signup_type: "restaurant_owner",
        full_name: fixture.fullName,
        restaurant_name: fixture.restaurantName,
        restaurant_slug: fixture.slug,
        phone: "8095550101",
      },
    },
  });
  if (error) throw error;
  assert(data.session, "El registro público no inició sesión automáticamente");
  createdUsers.push(data.user.id);

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, restaurant_id, role, restaurants(name, slug)")
    .eq("id", data.user.id)
    .single();
  if (profileError) throw profileError;
  assert(profile.role === "owner", "El trigger no creó el perfil owner");
  assert(profile.restaurants?.slug === fixture.slug, "El trigger no creó el restaurante correcto");
  createdRestaurants.push(profile.restaurant_id);
  return { userId: data.user.id, restaurantId: profile.restaurant_id };
}

async function signIn(email) {
  const client = createClient(url, publicKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

try {
  const ownerA = await createOwner(fixtures[0]);
  const ownerB = await createOwner(fixtures[1]);
  console.log("✓ Registro transaccional crea auth user + restaurante + owner");

  const clientA = await signIn(fixtures[0].email);
  const clientB = await signIn(fixtures[1].email);
  console.log("✓ Ambos owners pueden iniciar sesión automáticamente con contraseña");

  const { data: restaurantsA, error: restaurantsAError } = await clientA.from("restaurants").select("id, name");
  const { data: restaurantsB, error: restaurantsBError } = await clientB.from("restaurants").select("id, name");
  if (restaurantsAError) throw restaurantsAError;
  if (restaurantsBError) throw restaurantsBError;
  assert(restaurantsA.length === 1 && restaurantsA[0].id === ownerA.restaurantId, "Owner A leyó otro tenant");
  assert(restaurantsB.length === 1 && restaurantsB[0].id === ownerB.restaurantId, "Owner B leyó otro tenant");
  console.log("✓ Cada owner solo puede leer su propio restaurante");

  const { error: ownInsertError } = await clientA.from("categories").insert({
    restaurant_id: ownerA.restaurantId,
    name: "Categoría Propia",
  });
  if (ownInsertError) throw ownInsertError;

  const { error: crossInsertError } = await clientA.from("categories").insert({
    restaurant_id: ownerB.restaurantId,
    name: "Intento Cruzado",
  });
  assert(crossInsertError, "RLS permitió escritura cruzada entre tenants");
  console.log("✓ RLS permite escritura propia y bloquea escritura cruzada");

  const { data: menuCategory, error: menuCategoryError } = await clientA
    .from("categories")
    .insert({ restaurant_id: ownerA.restaurantId, name: "Menú Gratis" })
    .select("id")
    .single();
  if (menuCategoryError) throw menuCategoryError;
  const twentyItems = Array.from({ length: 20 }, (_, index) => ({
    restaurant_id: ownerA.restaurantId,
    category_id: menuCategory.id,
    name: `Plato ${index + 1}`,
    price: 100 + index,
  }));
  const { error: twentyItemsError } = await clientA.from("menu_items").insert(twentyItems);
  if (twentyItemsError) throw twentyItemsError;
  const { error: limitError } = await clientA.from("menu_items").insert({
    restaurant_id: ownerA.restaurantId,
    category_id: menuCategory.id,
    name: "Plato 21",
    price: 999,
  });
  assert(limitError, "El plan Gratis permitió más de 20 platos");
  console.log("✓ El plan Gratis queda limitado a 20 platos en la base de datos");

  const { error: promoteError } = await admin
    .from("profiles")
    .update({ role: "superadmin" })
    .eq("id", ownerA.userId);
  if (promoteError) throw promoteError;
  const { data: allRestaurants, error: allRestaurantsError } = await clientA
    .from("restaurants")
    .select("id")
    .in("id", [ownerA.restaurantId, ownerB.restaurantId]);
  if (allRestaurantsError) throw allRestaurantsError;
  assert(allRestaurants.length === 2, "Superadmin no pudo leer ambos tenants");
  console.log("✓ Superadmin puede leer todos los restaurantes");

  console.log("\nFundación Supabase verificada correctamente.");
} finally {
  for (const userId of createdUsers) await admin.auth.admin.deleteUser(userId);
  if (createdRestaurants.length) await admin.from("restaurants").delete().in("id", createdRestaurants);
}

const { count: remainingRestaurants, error: cleanupRestaurantError } = await admin
  .from("restaurants")
  .select("id", { count: "exact", head: true })
  .like("slug", "prueba-%");
if (cleanupRestaurantError) throw cleanupRestaurantError;
const { data: remainingUsers, error: cleanupUserError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (cleanupUserError) throw cleanupUserError;
assert(remainingRestaurants === 0, "Quedaron restaurantes temporales después de la prueba");
assert(
  !remainingUsers.users.some((user) => user.email?.startsWith("foundation-")),
  "Quedaron usuarios temporales después de la prueba",
);
console.log("✓ Los datos temporales fueron eliminados");
