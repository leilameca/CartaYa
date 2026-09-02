"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { notifyAdminOfPlanRequest } from "@/lib/notifications/plan-notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const tierSchema = z.enum(["gratis", "plus", "pro"]);

export async function requestPlanChangeAction(formData: FormData) {
  const tier = tierSchema.safeParse(formData.get("tier"));
  if (!tier.success) redirect("/dashboard/plan?error=invalid");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("restaurant_id, role, full_name")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "owner") redirect("/dashboard/plan?error=owner");

  const admin = createAdminClient();
  const { data: restaurant } = await admin.from("restaurants").select("name, subscription_tier").eq("id", profile.restaurant_id).single();
  if (!restaurant || restaurant.subscription_tier === tier.data) redirect("/dashboard/plan?error=invalid");
  const notifyByWhatsApp = formData.get("notifyWhatsApp") === "on";
  const { error: preferenceError } = await admin
    .from("restaurants")
    .update({ plan_notifications_whatsapp: notifyByWhatsApp })
    .eq("id", profile.restaurant_id);
  if (preferenceError) redirect("/dashboard/plan?error=request");
  await admin.from("plan_change_requests").update({ status: "cancelled" }).eq("restaurant_id", profile.restaurant_id).eq("status", "pending");
  const note = z.string().trim().max(500).catch("").parse(formData.get("note"));
  const { data: request, error } = await admin.from("plan_change_requests").insert({ restaurant_id: profile.restaurant_id, requested_by: user.id, current_tier: restaurant.subscription_tier, requested_tier: tier.data, note: note || null }).select("id").single();
  if (error || !request) redirect("/dashboard/plan?error=request");

  await notifyAdminOfPlanRequest({
    requestId: request.id,
    restaurantName: restaurant.name,
    ownerName: profile.full_name,
    currentTier: restaurant.subscription_tier,
    requestedTier: tier.data,
  });

  revalidatePath("/dashboard/plan");
  revalidatePath("/admin");
  redirect(`/dashboard/plan?requested=${tier.data}`);
}
