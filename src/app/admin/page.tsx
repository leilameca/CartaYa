import { redirect } from "next/navigation";
import { BarChart3, Building2, ClipboardCheck, LogOut } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "superadmin") redirect("/dashboard");
  const { data: restaurants } = await supabase.from("restaurants").select("id, name, subscription_tier, created_at").order("created_at", { ascending: false });
  const totals = { gratis: 0, plus: 0, pro: 0 };
  for (const restaurant of restaurants ?? []) totals[restaurant.subscription_tier] += 1;

  return (
    <main className="min-h-screen bg-brand-gray px-4 py-8 sm:px-8 lg:px-12">
      <header className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl bg-brand-navy px-5 py-5 text-white shadow-lg"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">CartaYa SaaS</p><h1 className="mt-1 text-2xl font-black">Panel de administración</h1></div><form action={logoutAction}><Button type="submit" variant="ghost" className="gap-2 text-white hover:bg-white/10 hover:text-white"><LogOut className="size-4" />Salir</Button></form></header>
      <section className="mx-auto mt-6 grid max-w-7xl gap-4 sm:grid-cols-3"><Stat icon={<Building2 className="size-5" />} label="Restaurantes activos" value={String(restaurants?.length ?? 0)} /><Stat icon={<BarChart3 className="size-5" />} label="Plus" value={String(totals.plus)} /><Stat icon={<BarChart3 className="size-5" />} label="Pro" value={String(totals.pro)} /></section>
      <section className="mx-auto mt-6 max-w-7xl rounded-3xl border bg-white shadow-sm"><div className="flex items-center gap-3 border-b px-5 py-5"><ClipboardCheck className="size-5 text-brand-orange" /><div><h2 className="font-black text-brand-navy">Restaurantes registrados</h2><p className="text-sm text-slate-500">Vista operativa del SaaS.</p></div></div><div className="divide-y">{restaurants?.map((restaurant) => <div key={restaurant.id} className="flex items-center justify-between gap-4 px-5 py-4"><div><p className="font-bold text-brand-navy">{restaurant.name}</p><p className="text-xs text-slate-400">{new Date(restaurant.created_at).toLocaleDateString("es-DO")}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold uppercase text-slate-600">{restaurant.subscription_tier}</span></div>)}</div></section>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-brand-orange">{icon}<p className="text-sm font-bold text-slate-500">{label}</p></div><p className="mt-3 text-3xl font-black text-brand-navy">{value}</p></div>;
}