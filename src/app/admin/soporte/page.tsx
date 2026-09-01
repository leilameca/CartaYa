import Link from "next/link";
import { ArrowLeft, Clock3, LifeBuoy, Search, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireSuperadmin } from "@/lib/auth/superadmin";
import { formatTicketNumber, supportCategoryLabels, supportStatusLabels } from "@/lib/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

type SearchParams = { q?: string; status?: string; category?: string; priority?: string; error?: string };
type TicketRelation = { name: string; slug: string } | { name: string; slug: string }[] | null;
type CreatorRelation = { full_name: string } | { full_name: string }[] | null;

export default async function AdminSupportPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  await requireSuperadmin();
  const admin = createAdminClient();
  const { data: allTickets } = await admin
    .from("support_tickets")
    .select("id, ticket_number, subject, category, impact, priority, status, created_at, last_activity_at, restaurant:restaurants(name, slug), creator:profiles(full_name)")
    .order("priority", { ascending: false })
    .order("last_activity_at", { ascending: false })
    .limit(500);

  const search = params.q?.trim().toLowerCase() ?? "";
  const tickets = (allTickets ?? []).filter((ticket) => {
    const restaurantRelation = ticket.restaurant as unknown as TicketRelation;
    const restaurant = Array.isArray(restaurantRelation) ? restaurantRelation[0] : restaurantRelation;
    const number = formatTicketNumber(ticket.ticket_number, ticket.created_at).toLowerCase();
    return (!search || ticket.subject.toLowerCase().includes(search) || restaurant?.name.toLowerCase().includes(search) || number.includes(search))
      && (!params.status || ticket.status === params.status)
      && (!params.category || ticket.category === params.category)
      && (!params.priority || String(ticket.priority) === params.priority);
  });

  const stats = {
    active: (allTickets ?? []).filter((ticket) => ["abierto", "en_revision"].includes(ticket.status)).length,
    blocked: (allTickets ?? []).filter((ticket) => ticket.priority === 3 && !["resuelto", "cerrado"].includes(ticket.status)).length,
    waiting: (allTickets ?? []).filter((ticket) => ticket.status === "esperando_cliente").length,
    resolved: (allTickets ?? []).filter((ticket) => ticket.status === "resuelto").length,
  };

  return (
    <main className="min-h-screen bg-brand-gray px-4 py-7 sm:px-8 lg:px-12">
      <header className="mx-auto flex max-w-7xl flex-col gap-4 rounded-2xl bg-brand-navy px-5 py-5 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-400">Operaciones CartaYa</p><h1 className="mt-1 text-2xl font-black">Bandeja de soporte</h1></div>
        <Button asChild variant="ghost" className="self-start gap-2 text-white hover:bg-white/10 hover:text-white"><Link href="/admin"><ArrowLeft className="size-4" />Volver al panel</Link></Button>
      </header>
      {params.error ? <p className="mx-auto mt-5 max-w-7xl rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">No se pudo completar la operación.</p> : null}

      <section className="mx-auto mt-6 grid max-w-7xl grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Activos" value={stats.active} tone="text-brand-orange" />
        <Stat label="Operación detenida" value={stats.blocked} tone="text-red-600" />
        <Stat label="Esperando cliente" value={stats.waiting} tone="text-amber-600" />
        <Stat label="Resueltos" value={stats.resolved} tone="text-emerald-600" />
      </section>

      <section className="mx-auto mt-6 max-w-7xl overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="border-b p-5 sm:p-6">
          <div className="flex items-center gap-3"><LifeBuoy className="size-5 text-brand-orange" /><div><h2 className="font-black text-brand-navy">Tickets</h2><p className="text-sm text-slate-500">{tickets.length} resultado{tickets.length === 1 ? "" : "s"}</p></div></div>
          <form className="mt-5 grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_180px_160px_auto]">
            <div className="relative"><Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input name="q" defaultValue={params.q} placeholder="Número, asunto o restaurante" className="pl-10" /></div>
            <select name="status" defaultValue={params.status ?? ""} className="h-10 rounded-md border border-input bg-white px-3 text-sm"><option value="">Todos los estados</option>{Object.entries(supportStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select name="category" defaultValue={params.category ?? ""} className="h-10 rounded-md border border-input bg-white px-3 text-sm"><option value="">Todas las áreas</option>{Object.entries(supportCategoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select name="priority" defaultValue={params.priority ?? ""} className="h-10 rounded-md border border-input bg-white px-3 text-sm"><option value="">Toda prioridad</option><option value="3">Urgente</option><option value="2">Normal</option><option value="1">Consulta</option></select>
            <Button type="submit" variant="outline">Filtrar</Button>
          </form>
        </div>
        <div className="divide-y">
          {tickets.length ? tickets.map((ticket) => {
            const restaurantRelation = ticket.restaurant as unknown as TicketRelation;
            const creatorRelation = ticket.creator as unknown as CreatorRelation;
            const restaurant = Array.isArray(restaurantRelation) ? restaurantRelation[0] : restaurantRelation;
            const creator = Array.isArray(creatorRelation) ? creatorRelation[0] : creatorRelation;
            return <Link key={ticket.id} href={`/admin/soporte/${ticket.id}`} className="grid gap-3 px-5 py-5 transition hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-black text-brand-navy">{ticket.subject}</p>{ticket.priority === 3 ? <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-[10px] font-black uppercase text-red-700"><ShieldAlert className="size-3" />Urgente</span> : null}</div><p className="mt-1 text-xs font-bold text-slate-400">{formatTicketNumber(ticket.ticket_number, ticket.created_at)} · {restaurant?.name ?? "Restaurante"} · {creator?.full_name ?? "Usuario"}</p><p className="mt-1 text-xs text-slate-500">{supportCategoryLabels[ticket.category]}</p></div><div className="flex flex-wrap items-center gap-3"><span className={cn("rounded-full px-3 py-1.5 text-xs font-black", ["resuelto", "cerrado"].includes(ticket.status) ? "bg-slate-100 text-slate-600" : ticket.status === "esperando_cliente" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700")}>{supportStatusLabels[ticket.status]}</span><span className="flex items-center gap-1 text-xs text-slate-400"><Clock3 className="size-3" />{new Date(ticket.last_activity_at).toLocaleString("es-DO", { dateStyle: "short", timeStyle: "short" })}</span></div></Link>;
          }) : <div className="px-5 py-14 text-center"><LifeBuoy className="mx-auto size-9 text-slate-300" /><p className="mt-3 font-bold text-brand-navy">No hay tickets con esos filtros</p></div>}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5"><p className="text-xs font-bold text-slate-500 sm:text-sm">{label}</p><p className={cn("mt-2 text-3xl font-black", tone)}>{value}</p></div>;
}
