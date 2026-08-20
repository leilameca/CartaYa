"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const memberSchema = z.object({ email: z.string().trim().email(), password: z.string().min(8).max(72), fullName: z.string().trim().min(2).max(100), role: z.enum(["mesero", "cocina"]) });
const updateMemberSchema = z.object({ memberId: z.string().uuid(), password: z.string().min(8).max(72).optional().or(z.literal("")), fullName: z.string().trim().min(2).max(100), role: z.enum(["mesero", "cocina"]) });

async function getOwnerContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión venció. Inicia sesión nuevamente." } as const;
  const { data: profile } = await supabase.from("profiles").select("restaurant_id, role, restaurants(subscription_tier)").eq("id", user.id).single();
  if (!profile || profile.role !== "owner") return { error: "Solo el dueño puede administrar el equipo." } as const;
  const relation = profile.restaurants as unknown as { subscription_tier: "gratis" | "plus" | "pro" } | { subscription_tier: "gratis" | "plus" | "pro" }[] | null;
  const restaurant = Array.isArray(relation) ? relation[0] : relation;
  if (restaurant?.subscription_tier !== "pro") return { error: "La gestión del equipo requiere el plan Pro." } as const;
  return { restaurantId: profile.restaurant_id } as const;
}

export async function createTeamMemberAction(formData: FormData) {
  const parsed = memberSchema.safeParse({ email: formData.get("email"), password: formData.get("password"), fullName: formData.get("fullName"), role: formData.get("role") });
  if (!parsed.success) redirect("/dashboard/equipo?error=formulario");
  const context = await getOwnerContext();
  if ("error" in context) redirect("/dashboard/equipo?error=permisos");
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email: parsed.data.email, password: parsed.data.password, email_confirm: true, user_metadata: { full_name: parsed.data.fullName, signup_type: "restaurant_staff" } });
  if (error || !data.user) redirect("/dashboard/equipo?error=crear");
  const { error: profileError } = await admin.from("profiles").insert({ id: data.user.id, restaurant_id: context.restaurantId, full_name: parsed.data.fullName, role: parsed.data.role });
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    redirect("/dashboard/equipo?error=perfil");
  }
  revalidatePath("/dashboard/equipo");
  redirect("/dashboard/equipo?success=creado");
}

export async function updateTeamMemberAction(formData: FormData) {
  const parsed = updateMemberSchema.safeParse({ memberId: formData.get("memberId"), password: formData.get("password"), fullName: formData.get("fullName"), role: formData.get("role") });
  if (!parsed.success) redirect("/dashboard/equipo?error=formulario");
  const context = await getOwnerContext();
  if ("error" in context) redirect("/dashboard/equipo?error=permisos");
  const admin = createAdminClient();
  const { data: member } = await admin.from("profiles").select("id").eq("id", parsed.data.memberId).eq("restaurant_id", context.restaurantId).neq("role", "owner").maybeSingle();
  if (!member) redirect("/dashboard/equipo?error=empleado");
  const { error: profileError } = await admin.from("profiles").update({ full_name: parsed.data.fullName, role: parsed.data.role }).eq("id", parsed.data.memberId).eq("restaurant_id", context.restaurantId);
  if (profileError) redirect("/dashboard/equipo?error=actualizar");
  if (parsed.data.password) {
    const { error: passwordError } = await admin.auth.admin.updateUserById(parsed.data.memberId, { password: parsed.data.password, user_metadata: { full_name: parsed.data.fullName } });
    if (passwordError) redirect("/dashboard/equipo?error=clave");
  } else {
    await admin.auth.admin.updateUserById(parsed.data.memberId, { user_metadata: { full_name: parsed.data.fullName } });
  }
  revalidatePath("/dashboard/equipo");
  redirect("/dashboard/equipo?success=actualizado");
}

export async function removeTeamMemberAction(formData: FormData) {
  const memberId = z.string().uuid().safeParse(formData.get("memberId"));
  if (!memberId.success) redirect("/dashboard/equipo?error=empleado");
  const context = await getOwnerContext();
  if ("error" in context) redirect("/dashboard/equipo?error=permisos");
  const admin = createAdminClient();
  const { data: member } = await admin.from("profiles").select("id").eq("id", memberId.data).eq("restaurant_id", context.restaurantId).neq("role", "owner").maybeSingle();
  if (!member) redirect("/dashboard/equipo?error=empleado");
  const { error } = await admin.from("profiles").delete().eq("id", memberId.data).eq("restaurant_id", context.restaurantId);
  if (error) redirect("/dashboard/equipo?error=retirar");
  await admin.auth.admin.deleteUser(memberId.data);
  revalidatePath("/dashboard/equipo");
  redirect("/dashboard/equipo?success=retirado");
}