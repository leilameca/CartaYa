import { redirect } from "next/navigation";
import { QrManager } from "@/components/dashboard/qr-manager";
import { getSiteUrl } from "@/lib/site-url";
import type { SubscriptionTier } from "@/lib/subscriptions";
import { createClient } from "@/lib/supabase/server";

export default async function QrPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("restaurant_id, role, restaurants(name, slug, subscription_tier)")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/completar-registro");
  if (profile.role !== "owner") redirect("/dashboard");

  const relation = profile.restaurants as unknown as
    | { name: string; slug: string; subscription_tier: SubscriptionTier }
    | { name: string; slug: string; subscription_tier: SubscriptionTier }[]
    | null;
  const restaurant = Array.isArray(relation) ? relation[0] : relation;
  if (!restaurant) redirect("/completar-registro");

  const { data: tables } = restaurant.subscription_tier === "gratis"
    ? { data: [] }
    : await supabase.from("tables").select("id, label, qr_code_url").eq("restaurant_id", profile.restaurant_id).order("label");

  return <QrManager restaurantName={restaurant.name} slug={restaurant.slug} tier={restaurant.subscription_tier} tables={tables ?? []} siteUrl={getSiteUrl()} />;
}
