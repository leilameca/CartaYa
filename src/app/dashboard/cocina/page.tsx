import { redirect } from "next/navigation";
import { KitchenDisplay } from "@/components/dashboard/kitchen-display";
import { fetchRestaurantOrders } from "@/lib/orders";
import { createClient } from "@/lib/supabase/server";

export default async function KitchenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("restaurant_id, role, restaurants(name, subscription_tier)")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/completar-registro");
  if (!["owner", "cocina"].includes(profile.role)) redirect("/dashboard");

  const relation = profile.restaurants as unknown as
    | { name: string; subscription_tier: "gratis" | "plus" | "pro" }
    | { name: string; subscription_tier: "gratis" | "plus" | "pro" }[]
    | null;
  const restaurant = Array.isArray(relation) ? relation[0] : relation;
  if (restaurant?.subscription_tier !== "pro") redirect("/dashboard/plan?required=pro");

  const orders = await fetchRestaurantOrders(supabase, profile.restaurant_id, { activeOnly: true });
  return <KitchenDisplay restaurantId={profile.restaurant_id} restaurantName={restaurant.name} initialOrders={orders} />;
}

