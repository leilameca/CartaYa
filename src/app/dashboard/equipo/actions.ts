"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const inviteSchema = z.object({ email: z.string().trim().email(), fullName: z.string().trim().min(2).max(100), role: z.enum(["mesero", "cocina"]) });

async function getOwnerContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión venció. Inicia sesión nuevamente." } as const;
  const { data: profile } = await supabase.from("profiles").select("restaurant_id, role").eq("id", user.id).single();
  if (!profile || profile.role !== "owner") return { error: "Solo el dueño puede administrar el equipo." } as const;
  return { restaurantId: profile.restaurant_id } as const;
}

export async function inviteTeamMemberAction(formData: FormData) {
  const parsed = inviteSchema.safeParse({ email: formData.get("email"), fullName: formData.get("fullName"), role: formData.get("role") });
  if (!parsed.success) redirect("/dashboard/equipo?error=formulario");
  const context = await getOwnerContext();
  if ("error" in context) redirect("/dashboard/equipo?error=permisos");
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, { data: { full_name: parsed.data.fullName, signup_type: "restaurant_staff" } });
  if (error || !data.user) redirect("/dashboard/equipo?error=invitacion");
  const { error: profileError } = await admin.from("profiles").insert({ id: data.user.id, restaurant_id: context.restaurantId, full_name: parsed.data.fullName, role: parsed.data.role });
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    redirect("/dashboard/equipo?error=perfil");
  }
  revalidatePath("/dashboard/equipo");
  redirect("/dashboard/equipo?success=invitacion");
}

export async function removeTeamMemberAction(formData: FormData) {
  const memberId = z.string().uuid().safeParse(formData.get("memberId"));
  if (!memberId.success) redirect("/dashboard/equipo?error=empleado");
  const context = await getOwnerContext();
  if ("error" in context) redirect("/dashboard/equipo?error=permisos");
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").delete().eq("id", memberId.data).eq("restaurant_id", context.restaurantId);
  if (error) redirect("/dashboard/equipo?error=retirar");
  await admin.auth.admin.deleteUser(memberId.data);
  revalidatePath("/dashboard/equipo");
  redirect("/dashboard/equipo?success=retirado");
}