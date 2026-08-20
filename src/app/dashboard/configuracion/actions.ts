"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const settingsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  phone: z.string().trim().max(40),
  address: z.string().trim().max(240),
  logoUrl: z.string().trim().url().or(z.literal("")),
  primaryColor: z.string().trim().regex(/^#[0-9a-f]{6}$/i),
});

async function getOwnerContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión venció. Inicia sesión nuevamente." } as const;
  const { data: profile } = await supabase.from("profiles").select("restaurant_id, role").eq("id", user.id).single();
  if (!profile || profile.role !== "owner") return { error: "Solo el dueño puede editar la configuración." } as const;
  return { supabase, restaurantId: profile.restaurant_id } as const;
}

export async function updateRestaurantSettingsAction(formData: FormData) {
  const parsed = settingsSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    logoUrl: formData.get("logoUrl"),
    primaryColor: formData.get("primaryColor"),
  });
  if (!parsed.success) redirect("/dashboard/configuracion?error=formulario");

  const context = await getOwnerContext();
  if ("error" in context) redirect("/dashboard/configuracion?error=permisos");
  const { error } = await context.supabase.from("restaurants").update({
    name: parsed.data.name,
    slug: parsed.data.slug,
    phone: parsed.data.phone || null,
    address: parsed.data.address || null,
    logo_url: parsed.data.logoUrl || null,
    primary_color: parsed.data.primaryColor,
  }).eq("id", context.restaurantId);
  if (error) {
    if (error.code === "23505") redirect("/dashboard/configuracion?error=slug");
    redirect("/dashboard/configuracion?error=guardar");
  }
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/configuracion");
  revalidatePath("/r", "layout");
  redirect("/dashboard/configuracion?success=1");
}