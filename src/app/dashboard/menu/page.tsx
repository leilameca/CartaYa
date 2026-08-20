import { redirect } from "next/navigation";
import { MenuManager } from "@/components/dashboard/menu-manager";
import { isR2Configured } from "@/lib/cloudflare/r2";
import { createClient } from "@/lib/supabase/server";

export default async function MenuPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("restaurant_id, role, restaurants(name, subscription_tier)")
    .eq("id", user.id)
    .single();
  if (profileError || !profile) throw new Error("No se pudo cargar el restaurante de esta cuenta.");
  if (profile.role !== "owner") redirect("/dashboard");

  const relation = profile.restaurants as unknown as
    | { name: string; subscription_tier: "gratis" | "plus" | "pro" }
    | { name: string; subscription_tier: "gratis" | "plus" | "pro" }[]
    | null;
  const restaurant = Array.isArray(relation) ? relation[0] : relation;
  if (!restaurant) throw new Error("No se encontró el restaurante.");

  const [{ data: categories, error: categoriesError }, { data: items, error: itemsError }] = await Promise.all([
    supabase.from("categories").select("id, name, display_order, restaurant_id").eq("restaurant_id", profile.restaurant_id).order("display_order").order("name"),
    supabase.from("menu_items").select("id, restaurant_id, category_id, name, description, price, image_url, is_available, tag, display_order").eq("restaurant_id", profile.restaurant_id).order("display_order").order("name"),
  ]);
  if (categoriesError || itemsError) throw new Error("No se pudo cargar el menú.");

  return (
    <MenuManager
      restaurantName={restaurant.name}
      tier={restaurant.subscription_tier}
      categories={categories ?? []}
      items={items ?? []}
      r2Configured={isR2Configured()}
    />
  );
}
