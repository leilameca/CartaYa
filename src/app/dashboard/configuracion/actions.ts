"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { deleteRestaurantLogo, uploadRestaurantLogo } from "@/lib/cloudflare/r2";
import { createClient } from "@/lib/supabase/server";

const settingsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  phone: z.string().trim().max(40),
  address: z.string().trim().max(240),
  primaryColor: z.string().trim().regex(/^#[0-9a-f]{6}$/i),
  secondaryColor: z.string().trim().regex(/^#[0-9a-f]{6}$/i),
  menuStyle: z.enum(["moderno", "clasico", "calido"]),
  internalPrimaryColor: z.string().trim().regex(/^#[0-9a-f]{6}$/i).optional(),
  internalSecondaryColor: z.string().trim().regex(/^#[0-9a-f]{6}$/i).optional(),
});

async function getOwnerContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión venció. Inicia sesión nuevamente." } as const;
  const { data: profile } = await supabase.from("profiles").select("restaurant_id, role, restaurants(subscription_tier)").eq("id", user.id).single();
  if (!profile || profile.role !== "owner") return { error: "Solo el dueño puede editar la configuración." } as const;
  const relation = profile.restaurants as unknown as { subscription_tier: "gratis" | "plus" | "pro" } | { subscription_tier: "gratis" | "plus" | "pro" }[] | null;
  const restaurant = Array.isArray(relation) ? relation[0] : relation;
  if (!restaurant || restaurant.subscription_tier === "gratis") return { error: "La personalización requiere el plan Plus o Pro." } as const;
  return { supabase, restaurantId: profile.restaurant_id, tier: restaurant.subscription_tier } as const;
}

export async function updateRestaurantSettingsAction(formData: FormData) {
  const parsed = settingsSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    primaryColor: formData.get("primaryColor"),
    secondaryColor: formData.get("secondaryColor"),
    menuStyle: formData.get("menuStyle"),
    internalPrimaryColor: formData.get("internalPrimaryColor") || undefined,
    internalSecondaryColor: formData.get("internalSecondaryColor") || undefined,
  });
  if (!parsed.success) redirect("/dashboard/configuracion?error=formulario");

  const context = await getOwnerContext();
  if ("error" in context) redirect("/dashboard/configuracion?error=permisos");
  const logo = formData.get("logo");
  let logoUrl: string | null = null;
  if (logo instanceof File && logo.size > 0) {
    try {
      logoUrl = (await uploadRestaurantLogo(logo, context.restaurantId)).url;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "R2_NOT_CONFIGURED") redirect("/dashboard/configuracion?error=r2");
      if (message === "IMAGE_TYPE_INVALID") redirect("/dashboard/configuracion?error=tipo-logo");
      if (message === "IMAGE_SIZE_INVALID") redirect("/dashboard/configuracion?error=tamano-logo");
      redirect("/dashboard/configuracion?error=logo");
    }
  }
  const { data: current } = await context.supabase.from("restaurants").select("logo_url").eq("id", context.restaurantId).single();
  const { error } = await context.supabase.from("restaurants").update({
    name: parsed.data.name,
    slug: parsed.data.slug,
    phone: parsed.data.phone || null,
    address: parsed.data.address || null,
    logo_url: logoUrl ?? current?.logo_url ?? null,
    primary_color: parsed.data.primaryColor,
    secondary_color: parsed.data.secondaryColor,
    menu_style: parsed.data.menuStyle,
    ...(context.tier === "pro" ? { internal_primary_color: parsed.data.internalPrimaryColor, internal_secondary_color: parsed.data.internalSecondaryColor } : {}),
  }).eq("id", context.restaurantId);
  if (error) {
    if (logoUrl) await deleteRestaurantLogo(logoUrl, context.restaurantId).catch(console.error);
    if (error.code === "23505") redirect("/dashboard/configuracion?error=slug");
    redirect("/dashboard/configuracion?error=guardar");
  }
  if (logoUrl && current?.logo_url && current.logo_url !== logoUrl) await deleteRestaurantLogo(current.logo_url, context.restaurantId).catch(console.error);
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/configuracion");
  revalidatePath("/r", "layout");
  redirect("/dashboard/configuracion?success=1");
}
