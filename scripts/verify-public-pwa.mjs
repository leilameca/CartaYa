import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path) {
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^"|"$/g, "")];
      }),
  );
}

const env = loadEnv(".env.local");
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) throw new Error("Faltan variables de Supabase en .env.local");

const anon = createClient(url, anonKey, { auth: { persistSession: false } });
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data: restaurants, error: restaurantsError } = await admin
  .from("restaurants")
  .select("id,name,slug,subscription_tier")
  .order("created_at", { ascending: true });
if (restaurantsError) throw restaurantsError;
if (!restaurants?.length) throw new Error("No hay restaurantes de prueba para validar");

const candidates = await Promise.all(restaurants.map(async (restaurant) => {
  const [{ count: categoryCount }, { count: dishCount }] = await Promise.all([
    admin.from("categories").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurant.id),
    admin.from("menu_items").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurant.id),
  ]);
  return { ...restaurant, categoryCount: categoryCount ?? 0, dishCount: dishCount ?? 0 };
}));
const restaurant = candidates.sort((a, b) => b.dishCount - a.dishCount)[0];
const temporaryTestsRemaining = candidates.filter((candidate) =>
  candidate.name === "CartaYa PWA Integration Test" && candidate.slug.startsWith("pwa-test-"),
).length;
if (temporaryTestsRemaining > 0) throw new Error("Quedaron restaurantes temporales de integración sin limpiar");

const { data: publicMenu, error: publicMenuError } = await anon.rpc("get_public_menu", {
  p_slug: restaurant.slug,
  p_table_id: null,
});
if (publicMenuError) throw publicMenuError;
if (!publicMenu || publicMenu.restaurant?.slug !== restaurant.slug) throw new Error("El RPC público no devolvió el tenant esperado");

const directRead = await anon.from("restaurants").select("id").limit(1);
if (!directRead.error) throw new Error("Fallo de seguridad: anon pudo leer restaurants directamente");

const directWrite = await anon.from("orders").insert({
  restaurant_id: restaurant.id,
  total: 0,
});
if (!directWrite.error) throw new Error("Fallo de seguridad: anon pudo insertar orders directamente");

const forbiddenRpc = await anon.rpc("create_public_order", {
  p_slug: restaurant.slug,
  p_table_id: null,
  p_items: [],
  p_notes: null,
});
if (!forbiddenRpc.error) throw new Error("Fallo de seguridad: anon pudo ejecutar create_public_order directamente");

console.log(JSON.stringify({
  ok: true,
  testedRestaurant: restaurant.slug,
  tier: restaurant.subscription_tier,
  categoriesInDatabase: restaurant.categoryCount,
  dishesInDatabase: restaurant.dishCount,
  categoriesInPublicMenu: publicMenu.categories?.length ?? 0,
  availableDishesInPublicMenu: publicMenu.categories?.flatMap((category) => category.items ?? []).length ?? 0,
  anonDirectTablesBlocked: true,
  publicOrderRpcBlockedFromAnon: true,
  temporaryTestsRemaining,
}, null, 2));
