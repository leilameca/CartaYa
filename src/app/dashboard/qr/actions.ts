"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSiteUrl } from "@/lib/site-url";
import { hasTier, type SubscriptionTier } from "@/lib/subscriptions";
import { createClient } from "@/lib/supabase/server";

export type QrActionResult = { error?: string; success?: string };

const labelSchema = z.string().trim().min(1, "Escribe el nombre o número de la mesa.").max(40, "Usa 40 caracteres o menos.");
const idSchema = z.string().uuid("La mesa no es válida.");

async function getTableContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión venció. Inicia sesión nuevamente." } as const;

  const { data: profile } = await supabase
    .from("profiles")
    .select("restaurant_id, role, restaurants(slug, subscription_tier)")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "owner") {
    return { error: "No tienes permisos para administrar mesas." } as const;
  }

  const relation = profile.restaurants as unknown as
    | { slug: string; subscription_tier: SubscriptionTier }
    | { slug: string; subscription_tier: SubscriptionTier }[]
    | null;
  const restaurant = Array.isArray(relation) ? relation[0] : relation;
  if (!restaurant) return { error: "No encontramos el restaurante de esta cuenta." } as const;
  if (!hasTier(restaurant.subscription_tier, "plus")) {
    return { error: "Los QR por mesa requieren el plan Plus o Pro." } as const;
  }

  return { supabase, restaurantId: profile.restaurant_id, slug: restaurant.slug } as const;
}

function databaseError(error: { code?: string }) {
  if (error.code === "23505") return "Ya existe una mesa con ese nombre.";
  if (error.code === "42501") return "Los QR por mesa requieren el plan Plus o Pro.";
  return "No pudimos guardar la mesa. Inténtalo nuevamente.";
}

export async function createTableAction(label: string): Promise<QrActionResult> {
  const parsed = labelSchema.safeParse(label);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const context = await getTableContext();
  if ("error" in context) return { error: context.error };

  const tableId = crypto.randomUUID();
  const qrCodeUrl = `${getSiteUrl()}/r/${encodeURIComponent(context.slug)}/mesa/${tableId}`;
  const { error } = await context.supabase.from("tables").insert({
    id: tableId,
    restaurant_id: context.restaurantId,
    label: parsed.data,
    qr_code_url: qrCodeUrl,
  });
  if (error) return { error: databaseError(error) };
  revalidatePath("/dashboard/qr");
  return { success: `Mesa ${parsed.data} creada.` };
}

export async function renameTableAction(tableId: string, label: string): Promise<QrActionResult> {
  const parsedId = idSchema.safeParse(tableId);
  const parsedLabel = labelSchema.safeParse(label);
  if (!parsedId.success) return { error: parsedId.error.issues[0]?.message };
  if (!parsedLabel.success) return { error: parsedLabel.error.issues[0]?.message };
  const context = await getTableContext();
  if ("error" in context) return { error: context.error };

  const { data, error } = await context.supabase
    .from("tables")
    .update({ label: parsedLabel.data })
    .eq("id", parsedId.data)
    .eq("restaurant_id", context.restaurantId)
    .select("id")
    .maybeSingle();
  if (error) return { error: databaseError(error) };
  if (!data) return { error: "La mesa ya no existe o no te pertenece." };
  revalidatePath("/dashboard/qr");
  return { success: "Nombre de mesa actualizado." };
}

export async function deleteTableAction(tableId: string): Promise<QrActionResult> {
  const parsed = idSchema.safeParse(tableId);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const context = await getTableContext();
  if ("error" in context) return { error: context.error };

  const { data, error } = await context.supabase
    .from("tables")
    .delete()
    .eq("id", parsed.data)
    .eq("restaurant_id", context.restaurantId)
    .select("id")
    .maybeSingle();
  if (error) return { error: databaseError(error) };
  if (!data) return { error: "La mesa ya no existe o no te pertenece." };
  revalidatePath("/dashboard/qr");
  return { success: "Mesa eliminada." };
}
