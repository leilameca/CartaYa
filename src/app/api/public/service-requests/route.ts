import { NextResponse } from "next/server";
import { z } from "zod";
import { sendRestaurantPush } from "@/lib/push/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit, getClientAddress } from "@/lib/security/rate-limit";
import type { PublicMenuData } from "@/types/public-menu";

const schema = z.object({ slug: z.string().trim().min(2).max(120), tableId: z.string().uuid() });

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Mesa inválida." }, { status: 400 });
  const clientAddress = getClientAddress(request.headers);
  const [addressAllowed, tableAllowed] = await Promise.all([
    consumeRateLimit({ scope: "service-address", identifier: clientAddress, maxRequests: 20, windowSeconds: 60 }),
    consumeRateLimit({
      scope: "service-table",
      identifier: `${clientAddress}:${parsed.data.slug}:${parsed.data.tableId}`,
      maxRequests: 4,
      windowSeconds: 60,
    }),
  ]);
  if (!addressAllowed || !tableAllowed) {
    return NextResponse.json(
      { error: "Ya recibimos varios avisos de esta mesa. Espera un momento." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }
  const admin = createAdminClient();
  const { data } = await admin.rpc("get_public_menu", { p_slug: parsed.data.slug, p_table_id: parsed.data.tableId });
  const menu = data as PublicMenuData | null;
  if (!menu?.table_valid || !menu.table || menu.restaurant.subscription_tier !== "pro") return NextResponse.json({ error: "La asistencia desde la mesa requiere el plan Pro." }, { status: 403 });

  const { data: activeSession } = await admin.from("table_service_sessions").select("waiter_id").eq("table_id", parsed.data.tableId).eq("status", "active").maybeSingle();
  if (activeSession?.waiter_id) {
    await sendRestaurantPush({ restaurantId: menu.restaurant.id, audience: ["mesero"], onlyUserIds: [activeSession.waiter_id], title: `Tu mesa ${menu.table.label} solicita asistencia`, body: "Los clientes de una de tus mesas te necesitan.", url: "/dashboard/salon", tag: `assigned-service-${menu.table.id}` });
    return NextResponse.json({ ok: true, assigned: true });
  }

  const { data: existing } = await admin.from("table_service_requests").select("id, status").eq("table_id", parsed.data.tableId).eq("status", "pending").maybeSingle();
  if (existing) return NextResponse.json({ ok: true, requestId: existing.id, alreadyPending: true });
  const { data: created, error } = await admin.from("table_service_requests").insert({ restaurant_id: menu.restaurant.id, table_id: parsed.data.tableId }).select("id").single();
  if (error || !created) return NextResponse.json({ error: "No pudimos avisar al mesero. Inténtalo otra vez." }, { status: 500 });
  await sendRestaurantPush({ restaurantId: menu.restaurant.id, audience: ["mesero", "owner"], title: `Mesa ${menu.table.label} solicita asistencia`, body: "El primer mesero disponible puede aceptar la solicitud.", url: "/dashboard/salon", tag: `service-${created.id}` });
  return NextResponse.json({ ok: true, requestId: created.id }, { status: 201 });
}
