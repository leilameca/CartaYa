"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellRing, Check, ChefHat, Clock3, Loader2, MoveRight, Volume2 } from "lucide-react";
import { advanceKitchenOrderAction } from "@/app/dashboard/cocina/actions";
import { useRealtimeOrders } from "@/hooks/use-realtime-orders";
import { orderTime, shortOrderId } from "@/lib/order-display";
import { cn } from "@/lib/utils";
import type { DashboardOrder, OrderStatus } from "@/types/orders";

const columns: Array<{
  status: Extract<OrderStatus, "nuevo" | "en_preparacion" | "listo">;
  title: string;
  accent: string;
  badge: string;
  next: OrderStatus;
  action: string;
}> = [
  { status: "nuevo", title: "Nuevos", accent: "border-t-brand-orange", badge: "bg-orange-100 text-orange-700", next: "en_preparacion", action: "Comenzar preparación" },
  { status: "en_preparacion", title: "En preparación", accent: "border-t-blue-500", badge: "bg-blue-100 text-blue-700", next: "listo", action: "Marcar como listo" },
  { status: "listo", title: "Listo", accent: "border-t-brand-green", badge: "bg-emerald-100 text-emerald-700", next: "entregado", action: "Marcar entregado" },
];

function elapsedMinutes(createdAt: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60_000));
}

function timerClass(minutes: number, threshold: number) {
  if (minutes >= threshold) return "bg-red-100 text-red-700 ring-1 ring-red-200";
  if (minutes >= Math.max(1, Math.floor(threshold * 0.7))) return "bg-amber-100 text-amber-800 ring-1 ring-amber-200";
  return "bg-slate-100 text-slate-600";
}

function KitchenCard({
  order,
  now,
  threshold,
  busy,
  onAdvance,
}: {
  order: DashboardOrder;
  now: number;
  threshold: number;
  busy: boolean;
  onAdvance: (order: DashboardOrder) => void;
}) {
  const column = columns.find((entry) => entry.status === order.status)!;
  const minutes = elapsedMinutes(order.createdAt, now);

  return (
    <article className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-md">
      <div className="flex items-start justify-between gap-3 border-b bg-slate-50 px-4 py-4">
        <div>
          <p className="text-2xl font-black tracking-tight text-brand-navy">{order.tableLabel ? `Mesa ${order.tableLabel}` : "Pedido general"}</p>
          <p className="mt-1 text-xs font-bold text-slate-400">#{shortOrderId(order.id)} · {orderTime(order.createdAt)}</p>
        </div>
        <span className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-black", timerClass(minutes, threshold))}>
          <Clock3 className="size-4" />{minutes} min
        </span>
      </div>

      <div className="space-y-3 px-4 py-4">
        {order.items.map((item) => (
          <div key={item.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
            <p className="text-lg font-extrabold leading-6"><span className="mr-2 text-brand-orange">{item.quantity}×</span>{item.name}</p>
            {item.notes ? <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold leading-5 text-amber-900">⚠ {item.notes}</p> : null}
          </div>
        ))}
        {order.notes ? <div className="rounded-xl bg-brand-navy px-3 py-2 text-sm font-bold text-white">Nota general: {order.notes}</div> : null}
      </div>

      <div className="border-t p-3">
        <button
          onClick={() => onAdvance(order)}
          disabled={busy}
          className={cn(
            "flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold text-white transition active:scale-[0.98] disabled:opacity-60",
            order.status === "nuevo" ? "bg-brand-orange" : order.status === "en_preparacion" ? "bg-blue-600" : "bg-brand-green",
          )}
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : order.status === "listo" ? <Check className="size-5" /> : <MoveRight className="size-5" />}
          {busy ? "Guardando…" : column.action}
        </button>
      </div>
    </article>
  );
}

export function KitchenDisplay({
  restaurantId,
  restaurantName,
  initialOrders,
}: {
  restaurantId: string;
  restaurantName: string;
  initialOrders: DashboardOrder[];
}) {
  const audioContext = useRef<AudioContext | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [threshold, setThreshold] = useState(15);
  const [now, setNow] = useState(() => Date.now());
  const [busyOrder, setBusyOrder] = useState<string | null>(null);
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});

  const beep = useCallback(() => {
    const context = audioContext.current;
    if (!context || context.state !== "running") return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.32);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.34);
  }, []);

  const onInsert = useCallback((order: { status: OrderStatus }) => {
    if (order.status === "nuevo") beep();
  }, [beep]);

  const { orders, setOrders, connection } = useRealtimeOrders({
    initialOrders,
    restaurantId,
    activeOnly: true,
    onInsert,
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const grouped = useMemo(() => Object.fromEntries(columns.map((column) => [
    column.status,
    orders.filter((order) => order.status === column.status).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
  ])) as Record<"nuevo" | "en_preparacion" | "listo", DashboardOrder[]>, [orders]);

  async function enableSound() {
    const AudioContextConstructor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const context = audioContext.current ?? new AudioContextConstructor();
    audioContext.current = context;
    if (context.state === "suspended") await context.resume();
    setSoundEnabled(true);
    window.setTimeout(beep, 0);
  }

  async function advanceOrder(order: DashboardOrder) {
    const column = columns.find((entry) => entry.status === order.status);
    if (!column) return;
    setBusyOrder(order.id);
    setMessage({});
    const previous = orders;
    setOrders((current) => current.map((entry) => entry.id === order.id ? { ...entry, status: column.next } : entry));

    const result = await advanceKitchenOrderAction(order.id, column.next);

    if (result.error) {
      setOrders(previous);
      setMessage({ error: result.error });
    } else {
      setMessage({ success: `Pedido #${shortOrderId(order.id)} actualizado.` });
    }
    setBusyOrder(null);
  }

  return (
    <main className="min-h-screen bg-[#eef1f4] px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 rounded-2xl bg-brand-navy px-5 py-5 text-white shadow-lg sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <span className="flex size-12 items-center justify-center rounded-xl bg-white/10"><ChefHat className="size-7 text-brand-orange" /></span>
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">Cocina · {restaurantName}</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">Pantalla de pedidos</h1></div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-10 items-center gap-2 rounded-xl bg-white/10 px-3 text-xs font-bold"><span className={cn("size-2 rounded-full", connection === "connected" ? "bg-emerald-400" : connection === "error" ? "bg-red-400" : "animate-pulse bg-amber-300")} />{connection === "connected" ? "En vivo" : connection === "error" ? "Reconectando" : "Conectando"}</span>
          <label className="flex h-10 items-center gap-2 rounded-xl bg-white/10 px-3 text-xs font-bold">Alerta <input type="number" min={1} max={120} value={threshold} onChange={(event) => setThreshold(Math.min(120, Math.max(1, Number(event.target.value) || 1)))} className="w-12 rounded-md bg-white px-1.5 py-1 text-center text-brand-navy" aria-label="Minutos para alerta" /> min</label>
          <button onClick={enableSound} className={cn("flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-extrabold", soundEnabled ? "bg-emerald-500 text-white" : "bg-brand-orange text-white")}>
            {soundEnabled ? <BellRing className="size-4" /> : <Volume2 className="size-4" />}{soundEnabled ? "Sonido activo" : "Activar sonido"}
          </button>
        </div>
      </header>

      {message.error ? <p role="alert" className="mt-4 rounded-xl bg-red-100 px-4 py-3 text-sm font-bold text-red-700">{message.error}</p> : null}
      {message.success ? <p role="status" className="mt-4 rounded-xl bg-emerald-100 px-4 py-3 text-sm font-bold text-emerald-700">{message.success}</p> : null}

      <div className="mt-5 overflow-x-auto pb-4">
        <div className="grid min-w-[960px] grid-cols-3 gap-4">
          {columns.map((column) => (
            <section key={column.status} className={cn("rounded-2xl border border-slate-200 border-t-4 bg-slate-100/80 p-3", column.accent)}>
              <div className="mb-3 flex items-center justify-between px-1 py-1">
                <h2 className="text-lg font-black text-brand-navy">{column.title}</h2>
                <span className={cn("flex min-w-8 items-center justify-center rounded-full px-2.5 py-1 text-sm font-black", column.badge)}>{grouped[column.status].length}</span>
              </div>
              <div className="space-y-3">
                {grouped[column.status].length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 px-4 py-12 text-center text-slate-400"><Bell className="mx-auto size-8" /><p className="mt-3 text-sm font-bold">Sin pedidos</p></div>
                ) : grouped[column.status].map((order) => <KitchenCard key={order.id} order={order} now={now} threshold={threshold} busy={busyOrder === order.id} onAdvance={advanceOrder} />)}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
