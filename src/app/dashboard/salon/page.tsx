import { redirect } from "next/navigation";
import { SalonDashboard } from "@/components/dashboard/salon-dashboard";
import { fetchRestaurantOrders } from "@/lib/orders";
import { createClient } from "@/lib/supabase/server";

export default async function SalonPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("restaurant_id, full_name, role, restaurants(subscription_tier)").eq("id", user.id).single();
  const relation = profile?.restaurants as unknown as { subscription_tier: string } | { subscription_tier: string }[] | null;
  const restaurant = Array.isArray(relation) ? relation[0] : relation;
  if (!profile || profile.role !== "mesero" || restaurant?.subscription_tier !== "pro") redirect("/dashboard");
  const [{ data: requests }, { data: sessions }, { data: tables }, { data: menuItems }, orders] = await Promise.all([
    supabase.from("table_service_requests").select("id, table_id, created_at").eq("restaurant_id", profile.restaurant_id).eq("status", "pending").order("created_at"),
    supabase.from("table_service_sessions").select("id, table_id, claimed_at").eq("restaurant_id", profile.restaurant_id).eq("waiter_id", user.id).eq("status", "active").order("claimed_at"),
    supabase.from("tables").select("id, label").eq("restaurant_id", profile.restaurant_id).order("label"),
    supabase.from("menu_items").select("id, name, price, offer_price, category:categories(name)").eq("restaurant_id", profile.restaurant_id).eq("is_available", true).order("name"),
    fetchRestaurantOrders(supabase, profile.restaurant_id, { activeOnly: true }),
  ]);
  const items = (menuItems ?? []).map((item) => { const category = item.category as unknown as { name: string } | { name: string }[] | null; return { id: item.id, name: item.name, price: Number(item.offer_price ?? item.price), regularPrice: Number(item.price), onOffer: item.offer_price !== null, category: (Array.isArray(category) ? category[0] : category)?.name ?? "Menú" }; });
  const tableMap = new Map((tables ?? []).map((table) => [table.id, table.label]));
  const mappedRequests = (requests ?? []).map((request) => ({ ...request, table: { label: tableMap.get(request.table_id) ?? "—" } }));
  const mappedSessions = (sessions ?? []).map((session) => ({ ...session, table: { label: tableMap.get(session.table_id) ?? "—" } }));
  return <SalonDashboard restaurantId={profile.restaurant_id} waiterName={profile.full_name} requests={mappedRequests} sessions={mappedSessions} tables={tables ?? []} items={items} assignedOrders={orders.filter((order) => order.assignedWaiterId === user.id)} restaurantOrders={orders} />;
}
