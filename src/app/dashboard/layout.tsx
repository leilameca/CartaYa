import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { BrandLogo } from "@/components/brand-logo";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { PushNotifications } from "@/components/dashboard/push-notifications";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("full_name, role, restaurants(name, subscription_tier)").eq("id", user.id).maybeSingle();
  if (!profile) redirect("/completar-registro");

  const relation = profile.restaurants as unknown as { name: string; subscription_tier: "gratis" | "plus" | "pro" } | { name: string; subscription_tier: "gratis" | "plus" | "pro" }[] | null;
  const restaurant = Array.isArray(relation) ? relation[0] : relation;

  return (
    <div className="min-h-screen bg-brand-gray">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-white lg:flex lg:flex-col">
        <div className="border-b px-6 py-5"><BrandLogo className="w-32" priority /></div>
        <div className="px-6 pb-5 pt-6">
          <p className="truncate text-sm font-semibold text-brand-navy">{restaurant?.name ?? "Tu restaurante"}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wider text-brand-green">Plan {restaurant?.subscription_tier ?? "gratis"}</p>
        </div>
        <DashboardNav role={profile.role} tier={restaurant?.subscription_tier ?? "gratis"} />
        <form action={logoutAction} className="mt-auto border-t p-4">
          <PushNotifications />
          <Button type="submit" variant="ghost" className="w-full justify-start gap-3 text-slate-600"><LogOut className="h-4 w-4" />Cerrar sesión</Button>
        </form>
      </aside>
      <div className="lg:pl-64">
        <header className="border-b bg-white lg:hidden">
          <div className="flex items-center justify-between px-4 py-4">
            <BrandLogo className="w-28" priority />
            <form action={logoutAction}><Button type="submit" variant="ghost" size="icon" aria-label="Cerrar sesión"><LogOut className="h-5 w-5" /></Button></form>
          </div>
          <DashboardNav mobile role={profile.role} tier={restaurant?.subscription_tier ?? "gratis"} />
          <div className="border-t px-4 py-2"><PushNotifications /></div>
        </header>
        {children}
      </div>
    </div>
  );
}
