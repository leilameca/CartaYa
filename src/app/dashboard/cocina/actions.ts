"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/types/orders";

export type KitchenActionResult = { error?: string; success?: string };

const orderIdSchema = z.string().uuid();
const statusSchema = z.enum(["en_preparacion", "listo", "entregado"]);
const transitions: Record<OrderStatus, OrderStatus | null> = {
  nuevo: "en_preparacion",
  en_preparacion: "listo",
  listo: "entregado",
  entregado: null,
};

export async function advanceKitchenOrderAction(orderId: string, nextStatus: OrderStatus): Promise<KitchenActionResult> {
  const parsedId = orderIdSchema.safeParse(orderId);
  const parsedStatus = statusSchema.safeParse(nextStatus);
  if (!parsedId.success || !parsedStatus.success) return { error: "La actualización solicitada no es válida." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión venció. Inicia sesión nuevamente." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("restaurant_id, role, restaurants(subscription_tier)")
    .eq("id", user.id)
    .single();
  const relation = profile?.restaurants as unknown as
    | { subscription_tier: "gratis" | "plus" | "pro" }
    | { subscription_tier: "gratis" | "plus" | "pro" }[]
    | null;
  const restaurant = Array.isArray(relation) ? relation[0] : relation;
  if (!profile || !["owner", "staff"].includes(profile.role) || restaurant?.subscription_tier !== "pro") {
    return { error: "La Pantalla de Cocina y los cambios de estado requieren el plan Pro." };
  }

  const { data: order, error: readError } = await supabase
    .from("orders")
    .select("status")
    .eq("id", parsedId.data)
    .eq("restaurant_id", profile.restaurant_id)
    .maybeSingle();
  if (readError || !order) return { error: "El pedido ya no existe o no te pertenece." };
  if (transitions[order.status] !== parsedStatus.data) return { error: "El pedido cambió de estado. Recarga la pantalla." };

  const { data, error } = await supabase
    .from("orders")
    .update({ status: parsedStatus.data })
    .eq("id", parsedId.data)
    .eq("restaurant_id", profile.restaurant_id)
    .eq("status", order.status)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "No se pudo actualizar el pedido. Comprueba la conexión e inténtalo otra vez." };
  return { success: "Estado actualizado." };
}
