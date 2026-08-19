"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown, Clock3, Filter, ReceiptText, RotateCcw, Utensils } from "lucide-react";
import { dopCurrency, ORDER_STATUS, orderDate, orderDateKey, orderTime, shortOrderId } from "@/lib/order-display";
import { cn } from "@/lib/utils";
import { useRealtimeOrders } from "@/hooks/use-realtime-orders";
import type { DashboardOrder, OrderStatus } from "@/types/orders";

const statuses: Array<{ value: "todos" | OrderStatus; label: string }> = [
  { value: "todos", label: "Todos los estados" },
  { value: "nuevo", label: "Nuevos" },
  { value: "en_preparacion", label: "En preparación" },
  { value: "listo", label: "Listos" },
  { value: "entregado", label: "Entregados" },
];

function OrderDetail({ order }: { order: DashboardOrder }) {
  return (
    <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-6">
      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <div>
          <p className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-400">Detalle de platos</p>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="rounded-xl border bg-white p-3">
                <div className="flex items-start justify-between gap-4">
                  <div><span className="mr-2 font-extrabold text-brand-orange">{item.quantity}×</span><span className="font-bold text-brand-navy">{item.name}</span></div>
                  <span className="shrink-0 text-sm font-bold text-brand-navy">{dopCurrency.format(item.unitPrice * item.quantity)}</span>
                </div>
                {item.notes ? <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">Nota: {item.notes}</p> : null}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Información del pedido</p>
          <dl className="mt-3 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Código</dt><dd className="font-bold">#{shortOrderId(order.id)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Fecha</dt><dd className="text-right font-bold">{orderDate(order.createdAt)}, {orderTime(order.createdAt)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Mesa</dt><dd className="font-bold">{order.tableLabel ?? "Pedido general"}</dd></div>
          </dl>
          {order.notes ? <div className="mt-4 border-t pt-4"><p className="text-xs font-bold uppercase text-slate-400">Notas generales</p><p className="mt-1 text-sm text-slate-700">{order.notes}</p></div> : null}
        </div>
      </div>
    </div>
  );
}

export function OrdersManager({
  restaurantId,
  restaurantName,
  initialOrders,
}: {
  restaurantId: string;
  restaurantName: string;
  initialOrders: DashboardOrder[];
}) {
  const { orders, connection } = useRealtimeOrders({ initialOrders, restaurantId });
  const [status, setStatus] = useState<"todos" | OrderStatus>("todos");
  const [date, setDate] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => orders.filter((order) => {
    if (status !== "todos" && order.status !== status) return false;
    if (date && orderDateKey(order.createdAt) !== date) return false;
    return true;
  }), [date, orders, status]);

  const activeCount = orders.filter((order) => order.status !== "entregado").length;
  const newCount = orders.filter((order) => order.status === "nuevo").length;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-brand-green">{restaurantName}</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">Pedidos</h1>
          <p className="mt-2 text-slate-500">Consulta y sigue cada pedido en tiempo real.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span className={cn("size-2.5 rounded-full", connection === "connected" ? "bg-emerald-500" : connection === "error" ? "bg-red-500" : "animate-pulse bg-amber-400")} />
          {connection === "connected" ? "Actualización en vivo" : connection === "error" ? "Reconectando…" : "Conectando…"}
        </div>
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Pedidos registrados</p><p className="mt-1 text-3xl font-extrabold">{orders.length}</p></div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Activos ahora</p><p className="mt-1 text-3xl font-extrabold text-brand-green">{activeCount}</p></div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Nuevos</p><p className="mt-1 text-3xl font-extrabold text-brand-orange">{newCount}</p></div>
      </section>

      <section className="mt-6 flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-sm font-bold text-brand-navy"><Filter className="size-4 text-brand-orange" />Filtros</div>
        <select value={status} onChange={(event) => setStatus(event.target.value as "todos" | OrderStatus)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange/20">
          {statuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <label className="relative">
          <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange/20 sm:w-auto" aria-label="Filtrar por fecha" />
        </label>
        {(status !== "todos" || date) ? <button onClick={() => { setStatus("todos"); setDate(""); }} className="flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold text-slate-500 hover:bg-slate-100"><RotateCcw className="size-4" />Limpiar</button> : null}
        <span className="sm:ml-auto text-sm text-slate-500">{filtered.length} resultado{filtered.length === 1 ? "" : "s"}</span>
      </section>

      <section className="mt-5 space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed bg-white px-6 py-16 text-center"><ReceiptText className="mx-auto size-11 text-slate-300" /><h2 className="mt-4 text-xl font-bold">No hay pedidos con estos filtros</h2><p className="mt-2 text-sm text-slate-500">Los pedidos nuevos aparecerán aquí automáticamente.</p></div>
        ) : filtered.map((order) => {
          const isExpanded = expanded === order.id;
          const statusMeta = ORDER_STATUS[order.status];
          return (
            <article key={order.id} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <button onClick={() => setExpanded(isExpanded ? null : order.id)} className="grid w-full gap-4 px-4 py-4 text-left sm:grid-cols-[1.2fr_0.8fr_1fr_auto] sm:items-center sm:px-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange"><Utensils className="size-5" /></span>
                  <div><p className="font-extrabold">{order.tableLabel ? `Mesa ${order.tableLabel}` : "Pedido general"}</p><p className="mt-0.5 text-xs text-slate-400">#{shortOrderId(order.id)}</p></div>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600"><Clock3 className="size-4" />{orderTime(order.createdAt)} <span className="text-slate-300">·</span> {orderDate(order.createdAt)}</div>
                <div className="flex items-center gap-3"><span className={cn("rounded-full px-3 py-1 text-xs font-extrabold", statusMeta.className)}>{statusMeta.label}</span><span className="text-sm text-slate-500">{order.items.reduce((sum, item) => sum + item.quantity, 0)} platos</span></div>
                <div className="flex items-center justify-between gap-4 sm:justify-end"><span className="font-extrabold">{dopCurrency.format(order.total)}</span><ChevronDown className={cn("size-5 text-slate-400 transition-transform", isExpanded && "rotate-180")} /></div>
              </button>
              {isExpanded ? <OrderDetail order={order} /> : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}

