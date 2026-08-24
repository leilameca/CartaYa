"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
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
    .select("restaurant_id, role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "owner") redirect("/dashboard/plan?error=owner");

  const admin = createAdminClient();
  const { data: restaurant } = await admin.from("restaurants").select("subscription_tier").eq("id", profile.restaurant_id).single();
  if (!restaurant || restaurant.subscription_tier === tier.data) redirect("/dashboard/plan?error=invalid");
  await admin.from("plan_change_requests").update({ status: "cancelled" }).eq("restaurant_id", profile.restaurant_id).eq("status", "pending");
  const note = z.string().trim().max(500).catch("").parse(formData.get("note"));
  const { error } = await admin.from("plan_change_requests").insert({ restaurant_id: profile.restaurant_id, requested_by: user.id, current_tier: restaurant.subscription_tier, requested_tier: tier.data, note: note || null });
  if (error) redirect("/dashboard/plan?error=request");

  revalidatePath("/dashboard/plan");
  revalidatePath("/admin");
  redirect(`/dashboard/plan?requested=${tier.data}`);
}
