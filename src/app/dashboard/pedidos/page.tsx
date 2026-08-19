import { redirect } from "next/navigation";
import { OrdersManager } from "@/components/dashboard/orders-manager";
import { fetchRestaurantOrders } from "@/lib/orders";
import { createClient } from "@/lib/supabase/server";

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("restaurant_id, restaurants(name)")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/completar-registro");

  const relation = profile.restaurants as unknown as { name: string } | { name: string }[] | null;
  const restaurant = Array.isArray(relation) ? relation[0] : relation;
  const orders = await fetchRestaurantOrders(supabase, profile.restaurant_id);

  return <OrdersManager restaurantId={profile.restaurant_id} restaurantName={restaurant?.name ?? "Tu restaurante"} initialOrders={orders} />;
}

