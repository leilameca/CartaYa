import Link from "next/link";
import { BarChart3, BookOpen, Building2, ClipboardCheck, LifeBuoy, LogOut } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { changeRestaurantPlanAction, reviewPlanRequestAction } from "@/app/admin/actions";
import { PushNotifications } from "@/components/dashboard/push-notifications";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperadmin } from "@/lib/auth/superadmin";

const planPrices = { gratis: 0, plus: 700, pro: 1200 } as const;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  await requireSuperadmin();
  const admin = createAdminClient();
  const [{ data: restaurants }, { data: orders }, { data: planRequests }, { count: activeSupportCount }] = await Promise.all([
    admin.from("restaurants").select("id, name, slug, phone, subscription_tier, created_at").order("created_at", { ascending: false }),
    admin.from("orders").select("restaurant_id, total, created_at"),
    admin.from("plan_change_requests").select("id, current_tier, requested_tier, note, created_at, restaurant:restaurants(name)").eq("status", "pending").order("created_at", { ascending: true }),
    admin.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["abierto", "en_revision"]),
  ]);
  const totals = { gratis: 0, plus: 0, pro: 0 };
  for (const restaurant of restaurants ?? []) totals[restaurant.subscription_tier] += 1;
  const monthlyRevenue = (restaurants ?? []).reduce((sum, restaurant) => sum + planPrices[restaurant.subscription_tier], 0);
  const orderCount = orders?.length ?? 0;

  return (
    <main className="min-h-screen bg-brand-gray px-4 py-8 sm:px-8 lg:px-12">
      <header className="mx-auto flex max-w-7xl flex-col gap-4 rounded-2xl bg-brand-navy px-5 py-5 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">CartaYa SaaS</p><h1 className="mt-1 text-2xl font-black">Panel de administración</h1></div><div className="flex flex-wrap items-center gap-2"><PushNotifications className="w-auto text-white hover:bg-white/10 hover:text-white" /><Button asChild variant="ghost" className="gap-2 text-white hover:bg-white/10 hover:text-white"><Link href="/admin/soporte"><LifeBuoy className="size-4" />Soporte{activeSupportCount ? <span className="rounded-full bg-brand-orange px-2 py-0.5 text-[10px] font-black text-white">{activeSupportCount}</span> : null}</Link></Button><Button asChild variant="ghost" className="gap-2 text-white hover:bg-white/10 hover:text-white"><Link href="/admin/tutoriales"><BookOpen className="size-4" />Tutoriales</Link></Button><form action={logoutAction}><Button type="submit" variant="ghost" className="gap-2 text-white hover:bg-white/10 hover:text-white"><LogOut className="size-4" />Salir</Button></form></div></header>
      {params.success ? <p className="mx-auto mt-5 max-w-7xl rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">Plan actualizado correctamente.</p> : null}
      {params.error ? <p className="mx-auto mt-5 max-w-7xl rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">No se pudo completar la operación.</p> : null}
      <section className="mx-auto mt-6 grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-5"><Stat icon={<Building2 className="size-5" />} label="Restaurantes" value={String(restaurants?.length ?? 0)} /><Stat icon={<BarChart3 className="size-5" />} label="Gratis" value={String(totals.gratis)} /><Stat icon={<BarChart3 className="size-5" />} label="Plus" value={String(totals.plus)} /><Stat icon={<BarChart3 className="size-5" />} label="Pro" value={String(totals.pro)} /><Stat icon={<ClipboardCheck className="size-5" />} label="Pedidos" value={String(orderCount)} /></section>
      <section className="mx-auto mt-6 max-w-7xl rounded-3xl border bg-white p-5 shadow-sm"><p className="text-sm font-bold text-slate-500">Ingreso mensual estimado</p><p className="mt-1 text-3xl font-black text-brand-green">RD$ {monthlyRevenue.toLocaleString("es-DO")}</p><p className="mt-1 text-xs text-slate-500">Estimación según el plan actual: Plus RD$ 700, Pro RD$ 1,200.</p></section>
      <section className="mx-auto mt-6 max-w-7xl rounded-3xl border bg-white shadow-sm"><div className="border-b px-5 py-5"><h2 className="font-black text-brand-navy">Solicitudes de plan</h2><p className="text-sm text-slate-500">Aprueba o rechaza antes de activar beneficios.</p></div><div className="divide-y">{planRequests?.length ? planRequests.map((request) => { const relation = request.restaurant as unknown as { name: string } | { name: string }[] | null; const restaurant = Array.isArray(relation) ? relation[0] : relation; return <div key={request.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-brand-navy">{restaurant?.name ?? "Restaurante"}</p><p className="text-sm text-slate-500">{request.current_tier} → <strong>{request.requested_tier}</strong> · {new Date(request.created_at).toLocaleDateString("es-DO")}</p>{request.note ? <p className="mt-1 text-sm text-slate-600">{request.note}</p> : null}</div><div className="flex gap-2"><form action={reviewPlanRequestAction}><input type="hidden" name="requestId" value={request.id} /><input type="hidden" name="decision" value="rejected" /><Button variant="outline" type="submit">Rechazar</Button></form><form action={reviewPlanRequestAction}><input type="hidden" name="requestId" value={request.id} /><input type="hidden" name="decision" value="approved" /><Button type="submit" className="bg-brand-green">Aprobar y activar</Button></form></div></div>; }) : <p className="px-5 py-8 text-center text-sm text-slate-500">No hay solicitudes pendientes.</p>}</div></section>
      <section className="mx-auto mt-6 max-w-7xl rounded-3xl border bg-white shadow-sm"><div className="flex items-center gap-3 border-b px-5 py-5"><ClipboardCheck className="size-5 text-brand-orange" /><div><h2 className="font-black text-brand-navy">Restaurantes registrados</h2><p className="text-sm text-slate-500">Administra el nivel contratado por cada negocio.</p></div></div><div className="divide-y">{restaurants?.map((restaurant) => <div key={restaurant.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-brand-navy">{restaurant.name}</p><p className="text-xs text-slate-400">/{restaurant.slug} · {restaurant.phone || "Sin teléfono"} · creado {new Date(restaurant.created_at).toLocaleDateString("es-DO")}</p></div><form action={changeRestaurantPlanAction} className="flex items-center gap-2"><input type="hidden" name="restaurantId" value={restaurant.id} /><select name="tier" defaultValue={restaurant.subscription_tier} className="h-10 rounded-md border border-input bg-white px-3 text-sm font-bold"><option value="gratis">Gratis</option><option value="plus">Plus</option><option value="pro">Pro</option></select><Button type="submit" className="rounded-xl bg-brand-orange hover:bg-brand-orange/90">Guardar plan</Button></form></div>)}</div></section>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-brand-orange">{icon}<p className="text-sm font-bold text-slate-500">{label}</p></div><p className="mt-3 text-3xl font-black text-brand-navy">{value}</p></div>;
}
