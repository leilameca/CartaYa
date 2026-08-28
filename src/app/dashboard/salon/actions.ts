"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sendRestaurantPush } from "@/lib/push/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { PublicOrderResult } from "@/types/public-menu";

async function waiterContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("restaurant_id, role, restaurants(slug, subscription_tier)").eq("id", user.id).single();
  const relation = profile?.restaurants as unknown as { slug: string; subscription_tier: string } | { slug: string; subscription_tier: string }[] | null;
  const restaurant = Array.isArray(relation) ? relation[0] : relation;
  return profile?.role === "mesero" && restaurant?.subscription_tier === "pro" ? { supabase, user, profile, restaurant } : null;
}

export async function claimServiceRequestAction(requestId: string) {
  if (!z.string().uuid().safeParse(requestId).success) return { error: "Solicitud inválida." };
  const context = await waiterContext();
  if (!context) return { error: "No tienes permiso para aceptar solicitudes." };
  const { data, error } = await context.supabase.rpc("claim_table_service_request", { p_request_id: requestId });
  if (error) return { error: "No se pudo aceptar la solicitud. Inténtalo nuevamente." };
  const result = data as { claimed?: boolean } | null;
  revalidatePath("/dashboard/salon");
  return result?.claimed ? { success: "Mesa asignada. Serás su mesero durante esta visita." } : { error: "Otro mesero ya aceptó esta solicitud." };
}

export async function closeTableSessionAction(sessionId: string) {
  const parsed = z.string().uuid().safeParse(sessionId);
  if (!parsed.success) return { error: "Mesa inválida." };
  const context = await waiterContext();
  if (!context) return { error: "Sin permiso." };
  const { data } = await context.supabase.rpc("close_table_service_session", { p_session_id: parsed.data });
  revalidatePath("/dashboard/salon");
  return data ? { success: "Servicio de mesa finalizado." } : { error: "No se pudo cerrar la mesa." };
}

const waiterOrderSchema = z.object({ tableId: z.string().uuid(), customerName: z.string().trim().min(2).max(100), notes: z.string().trim().max(500), items: z.array(z.object({ menu_item_id: z.string().uuid(), quantity: z.number().int().min(1).max(99), notes: z.string().max(200) })).min(1).max(50) });

export async function createWaiterOrderAction(input: unknown) {
  const parsed = waiterOrderSchema.safeParse(input);
  if (!parsed.success) return { error: "Revisa la mesa, el cliente y los platos." };
  const context = await waiterContext();
  if (!context) return { error: "Solo un mesero Pro puede registrar pedidos." };
  const admin = createAdminClient();
  const { data: table } = await admin.from("tables").select("id, label").eq("id", parsed.data.tableId).eq("restaurant_id", context.profile.restaurant_id).single();
  if (!table) return { error: "Esa mesa no pertenece a tu restaurante." };
  const { data: activeSession } = await admin.from("table_service_sessions").select("waiter_id").eq("table_id", table.id).eq("status", "active").maybeSingle();
  if (activeSession && activeSession.waiter_id !== context.user.id) return { error: "Esta mesa ya está siendo atendida por otro mesero." };
  if (!activeSession) {
    const { error: sessionError } = await admin.from("table_service_sessions").insert({ restaurant_id: context.profile.restaurant_id, table_id: table.id, waiter_id: context.user.id });
    if (sessionError) return { error: "Otro mesero acaba de tomar esta mesa." };
  }
  const { data, error } = await admin.rpc("create_public_order_with_customer", { p_slug: context.restaurant.slug, p_table_id: table.id, p_items: parsed.data.items, p_notes: parsed.data.notes || null, p_customer_name: parsed.data.customerName });
  if (error || !data) return { error: "No se pudo crear el pedido." };
  const result = data as PublicOrderResult;
  await admin.from("orders").update({ created_by_waiter_id: context.user.id, assigned_waiter_id: context.user.id }).eq("id", result.order_id).eq("restaurant_id", context.profile.restaurant_id);
  await sendRestaurantPush({ restaurantId: context.profile.restaurant_id, audience: ["owner", "cocina"], title: `Nuevo pedido · Mesa ${table.label}`, body: `${parsed.data.customerName} pidió con asistencia de un mesero.`, url: "/dashboard/cocina", tag: `new-order-${result.order_id}` });
  revalidatePath("/dashboard/salon"); revalidatePath("/dashboard/cocina"); revalidatePath("/dashboard/pedidos");
  return { success: `Pedido #${result.order_id.slice(0, 8).toUpperCase()} enviado a cocina.` };
}
