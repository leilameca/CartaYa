import { redirect } from "next/navigation";
import { BarChart3, Building2, ClipboardCheck, LogOut } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { changeRestaurantPlanAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const planPrices = { gratis: 0, plus: 999, pro: 1999 } as const;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "superadmin") redirect("/dashboard");
  const admin = createAdminClient();
  const [{ data: restaurants }, { data: orders }] = await Promise.all([
    admin.from("restaurants").select("id, name, slug, subscription_tier, created_at").order("created_at", { ascending: false }),
    admin.from("orders").select("restaurant_id, total, created_at"),
  ]);
  const totals = { gratis: 0, plus: 0, pro: 0 };
  for (const restaurant of restaurants ?? []) totals[restaurant.subscription_tier] += 1;
  const monthlyRevenue = (restaurants ?? []).reduce((sum, restaurant) => sum + planPrices[restaurant.subscription_tier], 0);
  const orderCount = orders?.length ?? 0;

  return (
    <main className="min-h-screen bg-brand-gray px-4 py-8 sm:px-8 lg:px-12">
      <header className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl bg-brand-navy px-5 py-5 text-white shadow-lg"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">CartaYa SaaS</p><h1 className="mt-1 text-2xl font-black">Panel de administración</h1></div><form action={logoutAction}><Button type="submit" variant="ghost" className="gap-2 text-white hover:bg-white/10 hover:text-white"><LogOut className="size-4" />Salir</Button></form></header>
      {params.success ? <p className="mx-auto mt-5 max-w-7xl rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">Plan actualizado correctamente.</p> : null}
      {params.error ? <p className="mx-auto mt-5 max-w-7xl rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">No se pudo completar la operación.</p> : null}
      <section className="mx-auto mt-6 grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-5"><Stat icon={<Building2 className="size-5" />} label="Restaurantes" value={String(restaurants?.length ?? 0)} /><Stat icon={<BarChart3 className="size-5" />} label="Gratis" value={String(totals.gratis)} /><Stat icon={<BarChart3 className="size-5" />} label="Plus" value={String(totals.plus)} /><Stat icon={<BarChart3 className="size-5" />} label="Pro" value={String(totals.pro)} /><Stat icon={<ClipboardCheck className="size-5" />} label="Pedidos" value={String(orderCount)} /></section>
      <section className="mx-auto mt-6 max-w-7xl rounded-3xl border bg-white p-5 shadow-sm"><p className="text-sm font-bold text-slate-500">Ingreso mensual estimado</p><p className="mt-1 text-3xl font-black text-brand-green">RD$ {monthlyRevenue.toLocaleString("es-DO")}</p><p className="mt-1 text-xs text-slate-500">Estimación según el plan actual: Plus RD$ 999, Pro RD$ 1,999.</p></section>
      <section className="mx-auto mt-6 max-w-7xl rounded-3xl border bg-white shadow-sm"><div className="flex items-center gap-3 border-b px-5 py-5"><ClipboardCheck className="size-5 text-brand-orange" /><div><h2 className="font-black text-brand-navy">Restaurantes registrados</h2><p className="text-sm text-slate-500">Administra el nivel contratado por cada negocio.</p></div></div><div className="divide-y">{restaurants?.map((restaurant) => <div key={restaurant.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-brand-navy">{restaurant.name}</p><p className="text-xs text-slate-400">/{restaurant.slug} · creado {new Date(restaurant.created_at).toLocaleDateString("es-DO")}</p></div><form action={changeRestaurantPlanAction} className="flex items-center gap-2"><input type="hidden" name="restaurantId" value={restaurant.id} /><select name="tier" defaultValue={restaurant.subscription_tier} className="h-10 rounded-md border border-input bg-white px-3 text-sm font-bold"><option value="gratis">Gratis</option><option value="plus">Plus</option><option value="pro">Pro</option></select><Button type="submit" className="rounded-xl bg-brand-orange hover:bg-brand-orange/90">Guardar plan</Button></form></div>)}</div></section>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-brand-orange">{icon}<p className="text-sm font-bold text-slate-500">{label}</p></div><p className="mt-3 text-3xl font-black text-brand-navy">{value}</p></div>;
}