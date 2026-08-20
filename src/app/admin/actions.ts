"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const planSchema = z.object({
  restaurantId: z.string().uuid(),
  tier: z.enum(["gratis", "plus", "pro"]),
});

export async function changeRestaurantPlanAction(formData: FormData) {
  const parsed = planSchema.safeParse({ restaurantId: formData.get("restaurantId"), tier: formData.get("tier") });
  if (!parsed.success) redirect("/admin?error=formulario");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "superadmin") redirect("/dashboard");

  const admin = createAdminClient();
  const { error } = await admin.from("restaurants").update({ subscription_tier: parsed.data.tier }).eq("id", parsed.data.restaurantId);
  if (error) redirect("/admin?error=plan");

  revalidatePath("/admin");
  revalidatePath("/dashboard", "layout");
  redirect("/admin?success=plan");
}