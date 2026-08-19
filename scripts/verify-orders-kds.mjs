import { readFileSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";
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
const siteUrl = process.env.CARTAYA_TEST_SITE_URL || "https://cartaya-seven.vercel.app";
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `kds-test-${suffix}@example.com`;
const password = `Kds-${suffix}-A9!`;
const slug = `kds-test-${suffix}`;

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const authenticated = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
let userId;
let restaurantId;
let orderId;
let channel;

try {
  const { data: created, error: createUserError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      signup_type: "restaurant_owner",
      restaurant_name: "CartaYa KDS Integration Test",
      restaurant_slug: slug,
      full_name: "KDS Test",
      phone: "18095550199",
    },
  });
  if (createUserError) throw createUserError;
  userId = created.user.id;

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("restaurant_id")
    .eq("id", userId)
    .single();
  if (profileError) throw profileError;
  restaurantId = profile.restaurant_id;

  const { error: tierError } = await admin
    .from("restaurants")
    .update({ subscription_tier: "pro", phone: "18095550199" })
    .eq("id", restaurantId);
  if (tierError) throw tierError;

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
      name: "Pedido KDS de prueba",
      price: 325,
      is_available: true,
    })
    .select("id")
    .single();
  if (itemError) throw itemError;

  const { error: signInError } = await authenticated.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  let resolveRealtime;
  let rejectRealtime;
  const realtimeEvent = new Promise((resolve, reject) => {
    resolveRealtime = resolve;
    rejectRealtime = reject;
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Realtime no llegó a SUBSCRIBED")), 8_000);
    channel = authenticated
      .channel(`verify-orders-${suffix}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "orders",
        filter: `restaurant_id=eq.${restaurantId}`,
      }, (payload) => resolveRealtime(payload))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timeout);
          resolve();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          clearTimeout(timeout);
          reject(new Error(`Realtime terminó con ${status}`));
        }
      });
  });

  const realtimeTimeout = setTimeout(() => rejectRealtime(new Error("No llegó el pedido por Realtime en 5 segundos")), 5_000);
  const startedAt = performance.now();
  const response = await fetch(`${siteUrl}/api/public/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug,
      tableId: null,
      notes: "Prueba Realtime KDS",
      items: [{ menu_item_id: item.id, quantity: 2, notes: "Sin picante" }],
    }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `El pedido respondió ${response.status}`);
  orderId = result.order_id;

  const payload = await realtimeEvent;
  clearTimeout(realtimeTimeout);
  const realtimeLatencyMs = Math.round(performance.now() - startedAt);
  if (payload.new.id !== orderId) throw new Error("Realtime entregó un pedido diferente");
  if (realtimeLatencyMs >= 2_000) throw new Error(`Realtime tardó ${realtimeLatencyMs} ms`);

  const { data: visibleOrder, error: visibleOrderError } = await authenticated
    .from("orders")
    .select("id,status,order_items(quantity,notes,menu_items(name))")
    .eq("id", orderId)
    .single();
  if (visibleOrderError) throw visibleOrderError;
  if (visibleOrder.order_items?.[0]?.notes !== "Sin picante") throw new Error("No se cargaron las notas del plato");

  const { error: updateError } = await authenticated
    .from("orders")
    .update({ status: "en_preparacion" })
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId);
  if (updateError) throw updateError;
  const { data: updatedOrder, error: updatedOrderError } = await admin.from("orders").select("status").eq("id", orderId).single();
  if (updatedOrderError) throw updatedOrderError;
  if (updatedOrder.status !== "en_preparacion") throw new Error("El cambio de estado no persistió");

  const cookieJar = new Map();
  const ssr = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [...cookieJar.entries()].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => cookieJar.set(name, value)),
    },
  });
  const { error: ssrSignInError } = await ssr.auth.signInWithPassword({ email, password });
  if (ssrSignInError) throw ssrSignInError;
  const cookieHeader = [...cookieJar.entries()].map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join("; ");

  const proResponse = await fetch(`${siteUrl}/dashboard/cocina`, { headers: { Cookie: cookieHeader }, redirect: "manual" });
  if (proResponse.status !== 200) throw new Error(`El plan Pro no pudo abrir KDS: ${proResponse.status}`);

  const { error: downgradeError } = await admin.from("restaurants").update({ subscription_tier: "plus" }).eq("id", restaurantId);
  if (downgradeError) throw downgradeError;
  const plusResponse = await fetch(`${siteUrl}/dashboard/cocina`, { headers: { Cookie: cookieHeader }, redirect: "manual" });
  const location = plusResponse.headers.get("location") || "";
  if (![307, 308].includes(plusResponse.status) || !location.includes("/dashboard/plan?required=pro")) {
    throw new Error(`El plan Plus no fue redirigido correctamente: ${plusResponse.status} ${location}`);
  }

  console.log(JSON.stringify({
    ok: true,
    orderCreated: response.status === 201,
    realtimeLatencyMs,
    realtimeUnderTwoSeconds: realtimeLatencyMs < 2_000,
    itemNotesLoaded: true,
    statusPersisted: updatedOrder.status,
    proKdsStatus: proResponse.status,
    plusKdsRedirectStatus: plusResponse.status,
    plusKdsRedirectLocation: location,
    temporaryDataWillBeRemoved: true,
  }, null, 2));
} finally {
  if (channel) await authenticated.removeChannel(channel);
  if (restaurantId) await admin.from("orders").delete().eq("restaurant_id", restaurantId);
  if (userId) await admin.auth.admin.deleteUser(userId);
  if (restaurantId) {
    const { data: target } = await admin.from("restaurants").select("name,slug").eq("id", restaurantId).maybeSingle();
    if (target?.name === "CartaYa KDS Integration Test" && target.slug.startsWith("kds-test-")) {
      await admin.from("restaurants").delete().eq("id", restaurantId);
    }
  }
}

