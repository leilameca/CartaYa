import { readFileSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import JSZip from "jszip";
import QRCode from "qrcode";

function loadEnv(path) {
  return Object.fromEntries(readFileSync(path, "utf8").split(/\r?\n/).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => {
    const index = line.indexOf("=");
    return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^"|"$/g, "")];
  }));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const env = loadEnv(".env.local");
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl = process.env.CARTAYA_TEST_SITE_URL || "https://www.tucartaya.com";
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `qr-entitlements-${suffix}@example.com`;
const password = `Qr-${suffix}-A9!`;
const slug = `qr-entitlements-${suffix}`;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const authenticated = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
let userId;
let restaurantId;
let orderId;
let tableId;

try {
  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      signup_type: "restaurant_owner",
      restaurant_name: "CartaYa QR Entitlements Test",
      restaurant_slug: slug,
      full_name: "QR Entitlements Test",
      phone: "18095550198",
    },
  });
  if (userError) throw userError;
  userId = created.user.id;

  const { data: profile, error: profileError } = await admin.from("profiles").select("restaurant_id").eq("id", userId).single();
  if (profileError) throw profileError;
  restaurantId = profile.restaurant_id;
  const { error: signInError } = await authenticated.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  const blockedTable = await authenticated.from("tables").insert({ restaurant_id: restaurantId, label: "Bloqueada Gratis" });
  assert(blockedTable.error, "RLS permitió crear una mesa en plan Gratis");

  tableId = crypto.randomUUID();
  const tableUrl = `${siteUrl}/r/${slug}/mesa/${tableId}`;
  const { error: adminTableError } = await admin.from("tables").insert({ id: tableId, restaurant_id: restaurantId, label: "Terraza 1", qr_code_url: tableUrl });
  if (adminTableError) throw adminTableError;
  const { data: order, error: orderError } = await admin.from("orders").insert({ restaurant_id: restaurantId, table_id: tableId, total: 100 }).select("id").single();
  if (orderError) throw orderError;
  orderId = order.id;

  const { data: hiddenOrders, error: hiddenOrdersError } = await authenticated.from("orders").select("id").eq("id", orderId);
  if (hiddenOrdersError) throw hiddenOrdersError;
  assert(hiddenOrders.length === 0, "RLS mostró pedidos a un restaurante Gratis");
  const { data: freeMenu, error: freeMenuError } = await authenticated.rpc("get_public_menu", { p_slug: slug, p_table_id: tableId });
  if (freeMenuError) throw freeMenuError;
  assert(freeMenu.table_valid === false && freeMenu.table === null, "Un QR viejo siguió identificando mesa en plan Gratis");

  const { error: plusError } = await admin.from("restaurants").update({ subscription_tier: "plus" }).eq("id", restaurantId);
  if (plusError) throw plusError;
  const { data: plusTable, error: plusTableError } = await authenticated.from("tables").insert({ restaurant_id: restaurantId, label: "Salón 2", qr_code_url: `${siteUrl}/r/${slug}/mesa/${crypto.randomUUID()}` }).select("id").single();
  if (plusTableError) throw plusTableError;
  assert(plusTable?.id, "Plus no pudo crear una mesa");
  const { data: visibleOrders, error: visibleOrdersError } = await authenticated.from("orders").select("id").eq("id", orderId);
  if (visibleOrdersError) throw visibleOrdersError;
  assert(visibleOrders.length === 1, "Plus no pudo leer sus pedidos");
  const forbiddenStatus = await authenticated.from("orders").update({ status: "en_preparacion" }).eq("id", orderId).select("id");
  assert(forbiddenStatus.error || forbiddenStatus.data?.length === 0, "Plus pudo usar directamente una actualización reservada al KDS Pro");
  const { data: plusMenu, error: plusMenuError } = await authenticated.rpc("get_public_menu", { p_slug: slug, p_table_id: tableId });
  if (plusMenuError) throw plusMenuError;
  assert(plusMenu.table_valid === true && plusMenu.table?.label === "Terraza 1", "El QR Plus no preseleccionó la mesa correcta");

  const { error: proError } = await admin.from("restaurants").update({ subscription_tier: "pro" }).eq("id", restaurantId);
  if (proError) throw proError;
  const { error: statusError } = await authenticated.from("orders").update({ status: "en_preparacion" }).eq("id", orderId);
  if (statusError) throw statusError;
  const { data: persisted } = await admin.from("orders").select("status").eq("id", orderId).single();
  assert(persisted.status === "en_preparacion", "Pro no pudo persistir el estado del KDS");

  const png = await QRCode.toDataURL(tableUrl, { errorCorrectionLevel: "H", width: 720 });
  const svg = await QRCode.toString(tableUrl, { type: "svg", errorCorrectionLevel: "H" });
  assert(png.startsWith("data:image/png;base64,"), "La librería no generó un PNG válido");
  assert(svg.includes("<svg") && svg.includes("</svg>"), "La librería no generó un SVG válido");
  const zip = new JSZip();
  zip.file("mesa.png", png.split(",")[1], { base64: true });
  zip.file("mesa.svg", svg);
  const archive = await zip.generateAsync({ type: "uint8array" });
  assert(archive.byteLength > 100, "No se pudo generar el ZIP de QR");

  const cookieJar = new Map();
  const ssr = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [...cookieJar.entries()].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => cookieJar.set(name, value)),
    },
  });
  const { error: ssrError } = await ssr.auth.signInWithPassword({ email, password });
  if (ssrError) throw ssrError;
  const cookieHeader = [...cookieJar.entries()].map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join("; ");
  const qrResponse = await fetch(`${siteUrl}/dashboard/qr`, { headers: { Cookie: cookieHeader }, redirect: "manual" });
  assert(qrResponse.status === 200, `La página QR Pro respondió ${qrResponse.status}`);

  const { error: downgradeError } = await admin.from("restaurants").update({ subscription_tier: "gratis" }).eq("id", restaurantId);
  if (downgradeError) throw downgradeError;
  const ordersResponse = await fetch(`${siteUrl}/dashboard/pedidos`, { headers: { Cookie: cookieHeader }, redirect: "manual" });
  const kdsResponse = await fetch(`${siteUrl}/dashboard/cocina`, { headers: { Cookie: cookieHeader }, redirect: "manual" });
  assert([307, 308].includes(ordersResponse.status) && (ordersResponse.headers.get("location") || "").includes("required=plus"), "Gratis abrió directamente /dashboard/pedidos");
  assert([307, 308].includes(kdsResponse.status) && (kdsResponse.headers.get("location") || "").includes("required=pro"), "Gratis abrió directamente /dashboard/cocina");
  const { data: hiddenTables, error: hiddenTablesError } = await authenticated.from("tables").select("id");
  if (hiddenTablesError) throw hiddenTablesError;
  assert(hiddenTables.length === 0, "Tras bajar a Gratis todavía se leen mesas por API");

  console.log(JSON.stringify({
    ok: true,
    freeTableWriteBlocked: true,
    freeOrdersHidden: true,
    plusTableQrValid: plusMenu.table?.label,
    plusKdsWriteBlocked: true,
    proKdsStatusPersisted: persisted.status,
    pngSvgAndZipGenerated: true,
    directOrdersRouteBlockedForFree: ordersResponse.status,
    directKdsRouteBlockedForFree: kdsResponse.status,
  }, null, 2));
} finally {
  await authenticated.auth.signOut({ scope: "local" });
  if (restaurantId) await admin.from("orders").delete().eq("restaurant_id", restaurantId);
  if (userId) await admin.auth.admin.deleteUser(userId);
  if (restaurantId) {
    const { data: target } = await admin.from("restaurants").select("name,slug").eq("id", restaurantId).maybeSingle();
    if (target?.name === "CartaYa QR Entitlements Test" && target.slug.startsWith("qr-entitlements-")) await admin.from("restaurants").delete().eq("id", restaurantId);
  }
}
