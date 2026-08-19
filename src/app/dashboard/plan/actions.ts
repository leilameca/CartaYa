"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const tierSchema = z.enum(["gratis", "plus", "pro"]);

export async function changeDemoPlanAction(formData: FormData) {
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
  const { error } = await admin
    .from("restaurants")
    .update({ subscription_tier: tier.data })
    .eq("id", profile.restaurant_id);
  if (error) redirect("/dashboard/plan?error=update");

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/plan");
  revalidatePath("/dashboard/qr");
  revalidatePath("/dashboard/pedidos");
  revalidatePath("/dashboard/cocina");
  redirect(`/dashboard/plan?changed=${tier.data}`);
}
