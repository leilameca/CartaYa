import Link from "next/link";
import { Clock3, LifeBuoy, MessageSquareText, Plus, Search } from "lucide-react";
import { NewTicketForm } from "@/components/support/new-ticket-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isR2Configured } from "@/lib/cloudflare/r2";
import { formatTicketNumber, getRestaurantSupportContext, supportCategoryLabels, supportStatusLabels } from "@/lib/support";
import { cn } from "@/lib/utils";

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; error?: string }> }) {
  const params = await searchParams;
  const context = await getRestaurantSupportContext();
  let query = context.admin.from("support_tickets").select("id, ticket_number, subject, category, impact, priority, status, created_at, last_activity_at, created_by").eq("restaurant_id", context.profile.restaurant_id).order("last_activity_at", { ascending: false }).limit(200);
  if (context.profile.role !== "owner") query = query.eq("created_by", context.user.id);
  if (params.status && ["abierto", "en_revision", "esperando_cliente", "resuelto", "cerrado"].includes(params.status)) query = query.eq("status", params.status);
  const { data: allTickets } = await query;
  const search = params.q?.trim().toLowerCase() ?? "";
  const tickets = (allTickets ?? []).filter((ticket) => !search || ticket.subject.toLowerCase().includes(search) || formatTicketNumber(ticket.ticket_number, ticket.created_at).toLowerCase().includes(search));

  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-brand-green"><LifeBuoy className="size-4" />Centro de soporte</p><h1 className="mt-3 text-3xl font-black tracking-tight text-brand-navy sm:text-4xl">¿Cómo podemos ayudarte?</h1><p className="mt-3 max-w-2xl leading-7 text-slate-600">Reporta una avería, conversa con soporte y consulta el estado sin salir de CartaYa.</p></div></header>
    {params.error ? <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">No pudimos abrir ese ticket o no tienes permiso para verlo.</p> : null}

    <details className="group mt-7 rounded-3xl border bg-white shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between px-5 py-5 sm:px-7"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange"><Plus className="size-5" /></span><div><h2 className="font-black text-brand-navy">Crear un ticket</h2><p className="text-sm text-slate-500">Incluye todos los detalles para ayudarte más rápido.</p></div></div><Button type="button" size="sm" className="pointer-events-none bg-brand-orange">Nuevo reporte</Button></summary><div className="border-t px-5 py-6 sm:px-7"><NewTicketForm attachmentsEnabled={isR2Configured()} /></div></details>

    <section className="mt-7 rounded-3xl border bg-white shadow-sm"><div className="border-b p-5 sm:p-6"><div className="flex items-center gap-3"><MessageSquareText className="size-5 text-brand-green" /><div><h2 className="font-black text-brand-navy">Mis tickets</h2><p className="text-sm text-slate-500">{tickets.length} resultado{tickets.length === 1 ? "" : "s"}</p></div></div><form className="mt-5 grid gap-3 sm:grid-cols-[1fr_190px_auto]"><div className="relative"><Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input name="q" defaultValue={params.q} placeholder="Buscar por título o número" className="pl-10" /></div><select name="status" defaultValue={params.status ?? ""} className="h-10 rounded-md border border-input bg-white px-3 text-sm"><option value="">Todos los estados</option>{Object.entries(supportStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><Button type="submit" variant="outline">Buscar</Button></form></div>
      <div className="divide-y">{tickets.length ? tickets.map((ticket) => <Link key={ticket.id} href={`/dashboard/soporte/${ticket.id}`} className="flex flex-col gap-3 px-5 py-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-black text-brand-navy">{ticket.subject}</p>{ticket.priority === 3 ? <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-black uppercase text-red-700">Operación detenida</span> : null}</div><p className="mt-1 text-xs font-bold text-slate-400">{formatTicketNumber(ticket.ticket_number, ticket.created_at)} · {supportCategoryLabels[ticket.category] ?? ticket.category}</p></div><div className="flex items-center gap-3"><span className={cn("rounded-full px-3 py-1.5 text-xs font-black", ticket.status === "cerrado" || ticket.status === "resuelto" ? "bg-slate-100 text-slate-600" : ticket.status === "esperando_cliente" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700")}>{supportStatusLabels[ticket.status] ?? ticket.status}</span><span className="flex items-center gap-1 text-xs text-slate-400"><Clock3 className="size-3" />{new Date(ticket.last_activity_at).toLocaleDateString("es-DO")}</span></div></Link>) : <div className="px-5 py-12 text-center"><LifeBuoy className="mx-auto size-8 text-slate-300" /><p className="mt-3 font-bold text-brand-navy">No hay tickets con esos filtros</p><p className="mt-1 text-sm text-slate-500">Puedes crear un reporte desde el formulario superior.</p></div>}</div>
    </section>
  </main>;
}
