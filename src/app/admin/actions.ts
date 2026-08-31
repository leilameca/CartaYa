"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSuperadmin } from "@/lib/auth/superadmin";
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
  const { error } = await admin.from("restaurants").update({ subscription_tier: parsed.data.tier }).eq("id", parsed.data.restaurantId);
  if (error) redirect("/admin?error=plan");

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
  const { data: request } = await admin.from("plan_change_requests").select("restaurant_id, requested_tier, status").eq("id", parsed.data.requestId).single();
  if (!request || request.status !== "pending") redirect("/admin?error=solicitud");
  if (parsed.data.decision === "approved") {
    const { error } = await admin.from("restaurants").update({ subscription_tier: request.requested_tier }).eq("id", request.restaurant_id);
    if (error) redirect("/admin?error=plan");
  }
  await admin.from("plan_change_requests").update({ status: parsed.data.decision, reviewed_at: new Date().toISOString(), reviewed_by: user.id }).eq("id", parsed.data.requestId);
  revalidatePath("/admin");
  revalidatePath("/dashboard", "layout");
  redirect(`/admin?success=${parsed.data.decision}`);
}
