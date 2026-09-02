"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSuperadmin } from "@/lib/auth/superadmin";
import { notifyOwnerOfPlanDecision } from "@/lib/notifications/plan-notifications";
import { createAdminClient } from "@/lib/supabase/admin";

const planSchema = z.object({
  restaurantId: z.string().uuid(),
  tier: z.enum(["gratis", "plus", "pro"]),
});

export async function changeRestaurantPlanAction(formData: FormData) {
  const parsed = planSchema.safeParse({ restaurantId: formData.get("restaurantId"), tier: formData.get("tier") });
  if (!parsed.success) redirect("/admin?error=formulario");

  await requireSuperadmin();

  const admin = createAdminClient();
  const [{ data: restaurant }, { data: owner }] = await Promise.all([
    admin.from("restaurants").select("name, phone, plan_notifications_whatsapp").eq("id", parsed.data.restaurantId).single(),
    admin.from("profiles").select("id, full_name").eq("restaurant_id", parsed.data.restaurantId).eq("role", "owner").maybeSingle(),
  ]);
  if (!restaurant) redirect("/admin?error=restaurante");
  const { error } = await admin.from("restaurants").update({ subscription_tier: parsed.data.tier }).eq("id", parsed.data.restaurantId);
  if (error) redirect("/admin?error=plan");

  const { data: ownerAuth } = owner ? await admin.auth.admin.getUserById(owner.id) : { data: { user: null } };
  await notifyOwnerOfPlanDecision({
    eventId: `${parsed.data.restaurantId}-${parsed.data.tier}`,
    restaurantName: restaurant.name,
    ownerName: owner?.full_name || "propietario",
    ownerEmail: ownerAuth.user?.email,
    ownerPhone: restaurant.plan_notifications_whatsapp ? restaurant.phone : null,
    requestedTier: parsed.data.tier,
    activeTier: parsed.data.tier,
    decision: "updated",
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard", "layout");
  redirect("/admin?success=plan");
}

const requestSchema = z.object({ requestId: z.string().uuid(), decision: z.enum(["approved", "rejected"]) });

export async function reviewPlanRequestAction(formData: FormData) {
  const parsed = requestSchema.safeParse({ requestId: formData.get("requestId"), decision: formData.get("decision") });
  if (!parsed.success) redirect("/admin?error=formulario");
  const { user } = await requireSuperadmin();
  const admin = createAdminClient();
  const { data: request } = await admin.from("plan_change_requests").select("restaurant_id, requested_by, current_tier, requested_tier, status").eq("id", parsed.data.requestId).single();
  if (!request || request.status !== "pending") redirect("/admin?error=solicitud");
  const [{ data: restaurant }, { data: owner }, { data: ownerAuth }] = await Promise.all([
    admin.from("restaurants").select("name, phone, plan_notifications_whatsapp").eq("id", request.restaurant_id).single(),
    admin.from("profiles").select("full_name").eq("id", request.requested_by).maybeSingle(),
    admin.auth.admin.getUserById(request.requested_by),
  ]);
  if (!restaurant) redirect("/admin?error=restaurante");
  if (parsed.data.decision === "approved") {
    const { error } = await admin.from("restaurants").update({ subscription_tier: request.requested_tier }).eq("id", request.restaurant_id);
    if (error) redirect("/admin?error=plan");
  }
  const { error: reviewError } = await admin.from("plan_change_requests").update({ status: parsed.data.decision, reviewed_at: new Date().toISOString(), reviewed_by: user.id }).eq("id", parsed.data.requestId);
  if (reviewError) redirect("/admin?error=solicitud");

  await notifyOwnerOfPlanDecision({
    eventId: parsed.data.requestId,
    restaurantName: restaurant.name,
    ownerName: owner?.full_name || "propietario",
    ownerEmail: ownerAuth.user?.email,
    ownerPhone: restaurant.plan_notifications_whatsapp ? restaurant.phone : null,
    requestedTier: request.requested_tier,
    activeTier: parsed.data.decision === "approved" ? request.requested_tier : request.current_tier,
    decision: parsed.data.decision,
  });
  revalidatePath("/admin");
  revalidatePath("/dashboard", "layout");
  redirect(`/admin?success=${parsed.data.decision}`);
}
