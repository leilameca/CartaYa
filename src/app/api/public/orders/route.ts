import { NextResponse } from "next/server";
import { z } from "zod";
import { isRestaurantOpen } from "@/lib/opening-hours";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendRestaurantPush } from "@/lib/push/server";
import type { PublicMenuData, PublicOrderResult } from "@/types/public-menu";

const orderSchema = z.object({
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  tableId: z.uuid().nullable(),
  customerName: z.string().trim().min(2).max(100).optional().default(""),
  notes: z.string().trim().max(500).optional().default(""),
  items: z.array(z.object({
    menu_item_id: z.uuid(),
    quantity: z.number().int().min(1).max(99),
    notes: z.string().trim().max(200).optional().default(""),
  })).min(1).max(50),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "El pedido no tiene un formato válido." }, { status: 400 });
  }

  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Revisa los platos, cantidades y notas del pedido." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: menuData, error: menuError } = await admin.rpc("get_public_menu", {
    p_slug: parsed.data.slug,
    p_table_id: parsed.data.tableId,
  });
  const menu = menuData as PublicMenuData | null;

  if (menuError || !menu) {
    return NextResponse.json({ error: "El restaurante no está disponible." }, { status: 404 });
  }
  if (!menu.table_valid) {
    return NextResponse.json({ error: "El código QR de esta mesa no es válido." }, { status: 400 });
  }
  if (!isRestaurantOpen(menu.restaurant.opening_hours)) {
    return NextResponse.json({ error: "El restaurante está fuera de horario." }, { status: 409 });
  }
  if (menu.restaurant.subscription_tier === "gratis") {
    return NextResponse.json({ error: "Este restaurante recibe el pedido directamente con el mesero." }, { status: 403 });
  }
  if (!menu.restaurant.phone) {
    return NextResponse.json({ error: "El restaurante todavía no ha configurado su número de WhatsApp." }, { status: 409 });
  }

  const { data, error } = await admin.rpc("create_public_order_with_customer", {
    p_slug: parsed.data.slug,
    p_table_id: parsed.data.tableId,
    p_items: parsed.data.items,
    p_notes: parsed.data.notes || null,
    p_customer_name: parsed.data.customerName || null,
  });

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "No se pudo registrar el pedido. Inténtalo nuevamente." },
      { status: 400 },
    );
  }

  await sendRestaurantPush({
    restaurantId: menu.restaurant.id,
    audience: ["cocina", "owner"],
    title: "Nuevo pedido recibido",
    body: `${parsed.data.customerName || "Cliente"} realizó un pedido${menu.table?.label ? ` en mesa ${menu.table.label}` : ""}.`,
    url: "/dashboard/cocina",
    tag: `new-order-${(data as PublicOrderResult).order_id}`,
  });

  return NextResponse.json(data as PublicOrderResult, {
    status: 201,
    headers: { "Cache-Control": "no-store" },
  });
}

