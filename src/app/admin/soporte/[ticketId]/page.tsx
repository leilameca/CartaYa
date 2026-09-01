import Link from "next/link";
import { ArrowLeft, Clock3, ExternalLink, ImageIcon, LockKeyhole, MonitorSmartphone, ShieldAlert } from "lucide-react";
import { notFound } from "next/navigation";
import { updateSupportTicketStatusAction } from "@/app/admin/soporte/actions";
import { AdminTicketReplyForm } from "@/components/support/admin-ticket-reply-form";
import { Button } from "@/components/ui/button";
import { requireSuperadmin } from "@/lib/auth/superadmin";
import { isR2Configured } from "@/lib/cloudflare/r2";
import { formatTicketNumber, supportCategoryLabels, supportImpactLabels, supportStatusLabels } from "@/lib/support";
import { createAdminClient } from "@/lib/supabase/admin";

type Single<T> = T | T[] | null;

export default async function AdminSupportTicketPage({ params, searchParams }: { params: Promise<{ ticketId: string }>; searchParams: Promise<{ sent?: string; attachment?: string; status?: string; error?: string }> }) {
  const { ticketId } = await params;
  const notices = await searchParams;
  await requireSuperadmin();
  const admin = createAdminClient();
  const [{ data: ticket }, { data: messages }, { data: attachments }] = await Promise.all([
    admin.from("support_tickets").select("*, restaurant:restaurants(name, slug), creator:profiles(full_name, role)").eq("id", ticketId).maybeSingle(),
    admin.from("support_messages").select("id, body, is_internal, created_at, author_id, author:profiles(full_name, role)").eq("ticket_id", ticketId).order("created_at"),
    admin.from("support_attachments").select("id, message_id, original_name, mime_type, byte_size, created_at").eq("ticket_id", ticketId).order("created_at"),
  ]);
  if (!ticket) notFound();

  const restaurantRelation = ticket.restaurant as unknown as Single<{ name: string; slug: string }>;
  const creatorRelation = ticket.creator as unknown as Single<{ full_name: string; role: string }>;
  const restaurant = Array.isArray(restaurantRelation) ? restaurantRelation[0] : restaurantRelation;
  const creator = Array.isArray(creatorRelation) ? creatorRelation[0] : creatorRelation;
  const initialAttachments = (attachments ?? []).filter((attachment) => !attachment.message_id);

  return (
    <main className="min-h-screen bg-brand-gray px-4 py-7 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl"><Button asChild variant="ghost" className="mb-4 -ml-3 gap-2"><Link href="/admin/soporte"><ArrowLeft className="size-4" />Volver a tickets</Link></Button></div>
      {notices.sent ? <Notice tone="success">Respuesta guardada correctamente.</Notice> : null}
      {notices.status ? <Notice tone="success">Estado actualizado.</Notice> : null}
      {notices.attachment ? <Notice tone="warning">El mensaje se guardó, pero la captura no pudo adjuntarse.</Notice> : null}
      {notices.error ? <Notice tone="error">No se pudo completar la operación.</Notice> : null}

      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-brand-green">{formatTicketNumber(ticket.ticket_number, ticket.created_at)}</p><h1 className="mt-2 text-2xl font-black tracking-tight text-brand-navy sm:text-3xl">{ticket.subject}</h1><p className="mt-2 text-sm text-slate-500">{restaurant?.name ?? "Restaurante"} · {creator?.full_name ?? "Usuario"}</p></div>{ticket.priority === 3 ? <span className="inline-flex self-start items-center gap-1 rounded-full bg-red-100 px-3 py-2 text-xs font-black text-red-700"><ShieldAlert className="size-4" />Operación detenida</span> : null}</div>
            <div className="mt-6 rounded-2xl bg-slate-50 p-4 sm:p-5"><p className="whitespace-pre-wrap leading-7 text-slate-700">{ticket.description}</p><p className="mt-4 flex items-center gap-1 text-xs text-slate-400"><Clock3 className="size-3" />{new Date(ticket.created_at).toLocaleString("es-DO")}</p>{initialAttachments.length ? <AttachmentList attachments={initialAttachments} /> : null}</div>
          </section>

          <section className="rounded-3xl border bg-white shadow-sm"><div className="border-b px-5 py-4 sm:px-7"><h2 className="font-black text-brand-navy">Conversación</h2></div><div className="space-y-4 p-5 sm:p-7">{messages?.length ? messages.map((message) => {
            const authorRelation = message.author as unknown as Single<{ full_name: string; role: string }>;
            const author = Array.isArray(authorRelation) ? authorRelation[0] : authorRelation;
            const fromSupport = author?.role === "superadmin";
            const messageAttachments = (attachments ?? []).filter((attachment) => attachment.message_id === message.id);
            return <article key={message.id} className={`max-w-[94%] rounded-2xl border p-4 ${message.is_internal ? "mr-auto border-amber-200 bg-amber-50 text-amber-950" : fromSupport ? "ml-auto border-brand-navy bg-brand-navy text-white" : "mr-auto border-slate-200 bg-slate-50 text-brand-navy"}`}><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-black">{message.is_internal ? "Nota interna" : fromSupport ? "Soporte CartaYa" : author?.full_name ?? "Usuario"}</p><p className="text-[10px] opacity-60">{new Date(message.created_at).toLocaleString("es-DO")}</p></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.body}</p>{messageAttachments.length ? <AttachmentList attachments={messageAttachments} dark={fromSupport && !message.is_internal} /> : null}</article>;
          }) : <p className="py-7 text-center text-sm text-slate-500">Aún no hay respuestas.</p>}</div></section>

          {ticket.status !== "cerrado" ? <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-7"><h2 className="mb-5 font-black text-brand-navy">Responder o agregar nota</h2><AdminTicketReplyForm ticketId={ticket.id} attachmentsEnabled={isR2Configured()} /></section> : null}
        </div>

        <aside className="space-y-5">
          <section className="rounded-3xl border bg-white p-5 shadow-sm"><h2 className="font-black text-brand-navy">Estado del ticket</h2><form action={updateSupportTicketStatusAction} className="mt-4 space-y-3"><input type="hidden" name="ticketId" value={ticket.id} /><select name="status" defaultValue={ticket.status} className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm font-bold">{Object.entries(supportStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><Button type="submit" className="w-full bg-brand-orange">Actualizar estado</Button></form></section>
          <section className="rounded-3xl border bg-white p-5 shadow-sm"><h2 className="font-black text-brand-navy">Detalles</h2><dl className="mt-4 space-y-4 text-sm"><Detail label="Área" value={supportCategoryLabels[ticket.category]} /><Detail label="Impacto" value={supportImpactLabels[ticket.impact]} /><Detail label="Restaurante" value={restaurant?.name ?? "No disponible"} /><Detail label="Creado por" value={creator?.full_name ?? "No disponible"} /></dl>{restaurant?.slug ? <Button asChild variant="outline" className="mt-5 w-full gap-2"><Link href={`/r/${restaurant.slug}`} target="_blank">Ver menú público<ExternalLink className="size-4" /></Link></Button> : null}</section>
          <section className="rounded-3xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><MonitorSmartphone className="size-4 text-brand-green" /><h2 className="font-black text-brand-navy">Contexto técnico</h2></div><dl className="mt-4 space-y-4 text-xs"><Detail label="Versión" value={ticket.app_version ?? "No disponible"} />{ticket.page_url ? <Detail label="Página" value={ticket.page_url} /> : null}<Detail label="Navegador" value={ticket.user_agent ?? "No disponible"} /></dl><p className="mt-4 flex gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500"><LockKeyhole className="mt-0.5 size-4 shrink-0" />Los adjuntos se descifran únicamente después de validar tu sesión y MFA.</p></section>
        </aside>
      </div>
    </main>
  );
}

function AttachmentList({ attachments, dark = false }: { attachments: { id: string; original_name: string }[]; dark?: boolean }) {
  return <div className="mt-4 flex flex-wrap gap-2">{attachments.map((attachment) => <a key={attachment.id} href={`/api/support/attachments/${attachment.id}`} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${dark ? "border-white/20 bg-white/10 text-white" : "bg-white text-brand-orange"}`}><ImageIcon className="size-3" />{attachment.original_name}</a>)}</div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="font-bold text-slate-400">{label}</dt><dd className="mt-1 break-words font-semibold text-slate-700">{value}</dd></div>;
}

function Notice({ children, tone }: { children: React.ReactNode; tone: "success" | "warning" | "error" }) {
  const colors = tone === "success" ? "bg-emerald-50 text-emerald-700" : tone === "warning" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700";
  return <p className={`mx-auto mb-5 max-w-7xl rounded-xl px-4 py-3 text-sm font-bold ${colors}`}>{children}</p>;
}
