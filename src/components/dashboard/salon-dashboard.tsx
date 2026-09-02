"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Check, ChefHat, Minus, Plus, UserCheck, X } from "lucide-react";
import { claimServiceRequestAction, closeTableSessionAction, createWaiterOrderAction } from "@/app/dashboard/salon/actions";
import { createClient } from "@/lib/supabase/client";
import type { DashboardOrder } from "@/types/orders";

type Request = { id: string; table_id: string; created_at: string; table: { label: string } | { label: string }[] | null };
type Session = { id: string; table_id: string; claimed_at: string; table: { label: string } | { label: string }[] | null };
type Table = { id: string; label: string };
type Item = { id: string; name: string; price: number; regularPrice: number; onOffer: boolean; category: string };
const relation = <T,>(value: T | T[] | null) => Array.isArray(value) ? value[0] ?? null : value;

export function SalonDashboard({ restaurantId, waiterName, requests, sessions, assignedOrders, tables, items }: { restaurantId: string; waiterName: string; requests: Request[]; sessions: Session[]; assignedOrders: DashboardOrder[]; tables: Table[]; items: Item[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});
  const [orderOpen, setOrderOpen] = useState(false);
  const [tableId, setTableId] = useState(sessions[0]?.table_id ?? tables[0]?.id ?? "");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const seen = useRef(new Set(requests.map((request) => request.id)));

  useEffect(() => {
    const channel = supabase.channel(`salon-${restaurantId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "table_service_requests", filter: `restaurant_id=eq.${restaurantId}` }, (payload) => {
        if (!seen.current.has(String(payload.new.id))) {
          seen.current.add(String(payload.new.id));
          navigator.vibrate?.([300, 120, 300, 120, 500]);
          const audio = new Audio("data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ4AAACAgICAgICAgICAgIA=");
          void audio.play().catch(() => undefined);
        }
        router.refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` }, () => router.refresh())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [restaurantId, router, supabase]);

  function claim(id: string) { startTransition(async () => { const result = await claimServiceRequestAction(id); setMessage(result); router.refresh(); }); }
  function close(id: string) { startTransition(async () => { const result = await closeTableSessionAction(id); setMessage(result); router.refresh(); }); }
  function quantity(id: string, delta: number) { setCart((current) => ({ ...current, [id]: Math.max(0, (current[id] ?? 0) + delta) })); }
  function submitOrder() {
    const selected = Object.entries(cart).filter(([, quantity]) => quantity > 0).map(([id, quantity]) => ({ menu_item_id: id, quantity, notes: "" }));
    startTransition(async () => { const result = await createWaiterOrderAction({ tableId, customerName, notes, items: selected }); setMessage(result); if (result.success) { setCart({}); setCustomerName(""); setNotes(""); setOrderOpen(false); } router.refresh(); });
  }

  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-bold uppercase tracking-wider text-brand-green">Salón en vivo</p><h1 className="mt-2 text-3xl font-black text-brand-navy">Hola, {waiterName}</h1><p className="mt-2 text-slate-500">Acepta una mesa y conserva su atención hasta finalizar la visita.</p></div><button onClick={() => setOrderOpen(true)} className="rounded-xl bg-brand-orange px-5 py-3 font-bold text-white shadow-lg"><ChefHat className="mr-2 inline size-5" />Crear pedido sin celular</button></div>
    {message.error ? <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{message.error}</p> : null}{message.success ? <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message.success}</p> : null}
    <div className="mt-7 grid gap-6 lg:grid-cols-2">
      <section className="rounded-3xl border bg-white shadow-sm"><div className="flex items-center gap-3 border-b p-5"><BellRing className="text-brand-orange" /><div><h2 className="font-black">Solicitudes nuevas</h2><p className="text-sm text-slate-500">Solo el primer mesero que acepte obtiene la mesa.</p></div><span className="ml-auto rounded-full bg-orange-100 px-3 py-1 text-sm font-black text-orange-700">{requests.length}</span></div><div className="divide-y">{requests.length ? requests.map((request) => <div key={request.id} className="flex items-center justify-between gap-4 p-5"><div><p className="text-lg font-black">Mesa {relation(request.table)?.label ?? "—"}</p><p className="text-xs text-slate-500">Solicitó ayuda a las {new Date(request.created_at).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}</p></div><button disabled={pending} onClick={() => claim(request.id)} className="rounded-xl bg-brand-green px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Aceptar mesa</button></div>) : <p className="p-10 text-center text-sm text-slate-500">No hay mesas esperando.</p>}</div></section>
      <section className="rounded-3xl border bg-white shadow-sm"><div className="flex items-center gap-3 border-b p-5"><UserCheck className="text-brand-green" /><div><h2 className="font-black">Mis mesas activas</h2><p className="text-sm text-slate-500">Los pedidos nuevos de estas mesas se asignan a ti.</p></div></div><div className="divide-y">{sessions.length ? sessions.map((session) => <div key={session.id} className="flex items-center justify-between p-5"><div><p className="text-lg font-black">Mesa {relation(session.table)?.label ?? "—"}</p><p className="text-xs text-slate-500">Desde {new Date(session.claimed_at).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}</p></div><button disabled={pending} onClick={() => close(session.id)} className="rounded-xl border px-4 py-2 text-sm font-bold text-slate-600">Finalizar visita</button></div>) : <p className="p-10 text-center text-sm text-slate-500">Todavía no tienes mesas asignadas.</p>}</div></section>
    </div>
    <section className="mt-6 rounded-3xl border bg-white shadow-sm"><div className="border-b p-5"><h2 className="font-black">Pedidos de mis mesas</h2></div><div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">{assignedOrders.length ? assignedOrders.map((order) => <div key={order.id} className="rounded-2xl border p-4"><div className="flex justify-between"><strong>Mesa {order.tableLabel ?? "—"}</strong><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{order.status.replace("_", " ")}</span></div><p className="mt-1 text-sm text-slate-500">{order.customerName ?? "Cliente"}</p><p className="mt-3 text-sm">{order.items.map((item) => `${item.quantity}× ${item.name}`).join(", ")}</p></div>) : <p className="col-span-full py-8 text-center text-sm text-slate-500">Aún no hay pedidos asignados.</p>}</div></section>
    {orderOpen ? <div className="fixed inset-0 z-50 flex items-end bg-black/50 sm:items-center sm:justify-center"><div className="max-h-[92svh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 sm:max-w-3xl sm:rounded-3xl sm:p-7"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase text-brand-green">Pedido asistido</p><h2 className="text-2xl font-black">Enviar a cocina</h2></div><button onClick={() => setOrderOpen(false)} className="rounded-full bg-slate-100 p-2"><X /></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">Mesa<select value={tableId} onChange={(event) => setTableId(event.target.value)} className="mt-1 h-11 w-full rounded-xl border px-3">{tables.map((table) => <option key={table.id} value={table.id}>{table.label}</option>)}</select></label><label className="text-sm font-bold">Nombre del cliente<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="mt-1 h-11 w-full rounded-xl border px-3" /></label></div><div className="mt-5 grid gap-2 sm:grid-cols-2">{items.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl border p-3"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate font-bold">{item.name}</p>{item.onOffer ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-black uppercase text-red-600">Oferta</span> : null}</div><p className="text-xs text-slate-500">{item.category} · RD$ {item.price.toFixed(2)}{item.onOffer ? <span className="ml-1 line-through">RD$ {item.regularPrice.toFixed(2)}</span> : null}</p></div><button onClick={() => quantity(item.id, -1)} className="rounded-lg bg-slate-100 p-2"><Minus className="size-4" /></button><span className="w-5 text-center font-black">{cart[item.id] ?? 0}</span><button onClick={() => quantity(item.id, 1)} className="rounded-lg bg-brand-orange p-2 text-white"><Plus className="size-4" /></button></div>)}</div><label className="mt-4 block text-sm font-bold">Notas para cocina<textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 min-h-20 w-full rounded-xl border p-3" /></label><button disabled={pending} onClick={submitOrder} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green px-5 py-3 font-black text-white disabled:opacity-50"><Check />{pending ? "Enviando…" : "Enviar pedido a cocina"}</button></div></div> : null}
  </main>;
}
