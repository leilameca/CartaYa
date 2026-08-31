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
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const siteUrl = process.env.CARTAYA_TEST_SITE_URL || "https://www.tucartaya.com";
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const slug = `pwa-test-${suffix}`;
let restaurantId;

async function removeTemporaryRestaurant(id) {
  const { data: target } = await admin.from("restaurants").select("name,slug").eq("id", id).maybeSingle();
  if (target?.name !== "CartaYa PWA Integration Test" || !target.slug.startsWith("pwa-test-")) return;
  const { error: ordersError } = await admin.from("orders").delete().eq("restaurant_id", id);
  if (ordersError) throw ordersError;
  const { error: restaurantError } = await admin.from("restaurants").delete().eq("id", id);
  if (restaurantError) throw restaurantError;
}

const { data: staleTests, error: staleTestsError } = await admin
  .from("restaurants")
  .select("id")
  .eq("name", "CartaYa PWA Integration Test")
  .like("slug", "pwa-test-%");
if (staleTestsError) throw staleTestsError;
for (const staleTest of staleTests) await removeTemporaryRestaurant(staleTest.id);

try {
  const { data: restaurant, error: restaurantError } = await admin
    .from("restaurants")
    .insert({
      name: "CartaYa PWA Integration Test",
      slug,
      phone: "18095550199",
      subscription_tier: "plus",
      opening_hours: {},
    })
    .select("id")
    .single();
  if (restaurantError) throw restaurantError;
  restaurantId = restaurant.id;

  const { data: category, error: categoryError } = await admin
    .from("categories")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .order("display_order")
    .limit(1)
    .single();
  if (categoryError) throw categoryError;

  const { data: item, error: itemError } = await admin
    .from("menu_items")
    .insert({
      restaurant_id: restaurantId,
      category_id: category.id,
      name: "Plato de prueba PWA",
      price: 245.5,
      is_available: true,
    })
    .select("id")
    .single();
  if (itemError) throw itemError;

  const response = await fetch(`${siteUrl}/api/public/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug,
      tableId: null,
      notes: "Prueba automatizada; se elimina al terminar",
      items: [{ menu_item_id: item.id, quantity: 2, notes: "" }],
    }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `El endpoint respondió ${response.status}`);

  const [{ data: order, error: orderError }, { data: orderItems, error: orderItemsError }] = await Promise.all([
    admin.from("orders").select("id,total,status").eq("id", result.order_id).single(),
    admin.from("order_items").select("quantity,unit_price").eq("order_id", result.order_id),
  ]);
  if (orderError) throw orderError;
  if (orderItemsError) throw orderItemsError;
  if (Number(order.total) !== 491 || orderItems.length !== 1 || orderItems[0].quantity !== 2) {
    throw new Error("El pedido transaccional no coincide con las cantidades y precios esperados");
  }

  console.log(JSON.stringify({
    ok: true,
    endpointStatus: response.status,
    orderCreated: true,
    orderItemsCreated: orderItems.length,
    serverCalculatedTotal: Number(order.total),
    initialStatus: order.status,
    whatsappPhoneReturned: result.phone === "18095550199",
    temporaryRestaurantWillBeRemoved: true,
  }, null, 2));
} finally {
  if (restaurantId) await removeTemporaryRestaurant(restaurantId);
}
