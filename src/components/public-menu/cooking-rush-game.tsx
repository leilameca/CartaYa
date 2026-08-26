"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { CakeSlice, Check, ChefHat, Circle, CircleDot, Coffee, Cookie, CookingPot, Croissant, Droplets, Flame, Leaf, Timer, Trash2, UserRound, Wheat, Zap } from "lucide-react";

export type CookingGameId = "taco" | "pizza" | "cafe";
export type CookingSnapshot = { score: number; served: number; combo: number; time: number };
export type CookingResult = CookingSnapshot & { stars: number };

type Station = { id: string; label: string; icon: ComponentType<{ className?: string }>; processMs?: number; color: string };
type Recipe = { id: string; name: string; steps: string[] };
type GameConfig = { title: string; serviceLabel: string; stations: Station[]; recipes: Recipe[] };
type Order = { uid: number; recipeId: string; progress: number; patience: number; processEnd: number | null; mistakes: number };

const configs: Record<CookingGameId, GameConfig> = {
  taco: {
    title: "Taco Express",
    serviceLabel: "Servir taco",
    stations: [
      { id: "tortilla", label: "Tortilla", icon: Wheat, color: "bg-amber-100 text-amber-800" },
      { id: "carne", label: "Carne", icon: Circle, color: "bg-red-100 text-red-700" },
      { id: "plancha", label: "Plancha", icon: CookingPot, processMs: 2600, color: "bg-slate-800 text-white" },
      { id: "lechuga", label: "Lechuga", icon: Leaf, color: "bg-emerald-100 text-emerald-700" },
      { id: "tomate", label: "Tomate", icon: CircleDot, color: "bg-rose-100 text-rose-700" },
      { id: "salsa", label: "Salsa", icon: Droplets, color: "bg-orange-100 text-orange-700" },
    ],
    recipes: [
      { id: "clasico", name: "Taco clásico", steps: ["tortilla", "carne", "plancha", "lechuga", "salsa"] },
      { id: "rojo", name: "Taco rojo", steps: ["tortilla", "carne", "plancha", "tomate", "salsa"] },
      { id: "completo", name: "Taco completo", steps: ["tortilla", "carne", "plancha", "lechuga", "tomate", "salsa"] },
    ],
  },
  pizza: {
    title: "Pizzería CartaYa",
    serviceLabel: "Servir pizza",
    stations: [
      { id: "masa", label: "Masa", icon: Wheat, color: "bg-amber-100 text-amber-800" },
      { id: "salsa", label: "Salsa", icon: Droplets, color: "bg-red-100 text-red-700" },
      { id: "queso", label: "Queso", icon: Circle, color: "bg-yellow-100 text-yellow-700" },
      { id: "pepperoni", label: "Pepperoni", icon: CircleDot, color: "bg-rose-100 text-rose-700" },
      { id: "vegetales", label: "Vegetales", icon: Leaf, color: "bg-emerald-100 text-emerald-700" },
      { id: "horno", label: "Horno", icon: Flame, processMs: 3800, color: "bg-orange-600 text-white" },
    ],
    recipes: [
      { id: "queso", name: "Pizza de queso", steps: ["masa", "salsa", "queso", "horno"] },
      { id: "pepperoni", name: "Pizza pepperoni", steps: ["masa", "salsa", "queso", "pepperoni", "horno"] },
      { id: "huerto", name: "Pizza del huerto", steps: ["masa", "salsa", "queso", "vegetales", "horno"] },
    ],
  },
  cafe: {
    title: "Café Rush",
    serviceLabel: "Entregar bandeja",
    stations: [
      { id: "taza", label: "Taza", icon: Coffee, color: "bg-slate-100 text-slate-700" },
      { id: "espresso", label: "Espresso", icon: Droplets, color: "bg-amber-950 text-white" },
      { id: "leche", label: "Leche", icon: Circle, color: "bg-blue-50 text-blue-700" },
      { id: "chocolate", label: "Chocolate", icon: Cookie, color: "bg-amber-100 text-amber-800" },
      { id: "cafetera", label: "Cafetera", icon: Zap, processMs: 2400, color: "bg-brand-navy text-white" },
      { id: "croissant", label: "Croissant", icon: Croissant, color: "bg-orange-100 text-orange-700" },
      { id: "pastel", label: "Pastel", icon: CakeSlice, color: "bg-pink-100 text-pink-700" },
    ],
    recipes: [
      { id: "latte", name: "Latte y croissant", steps: ["taza", "espresso", "leche", "cafetera", "croissant"] },
      { id: "mocha", name: "Mocha", steps: ["taza", "espresso", "chocolate", "leche", "cafetera"] },
      { id: "espresso", name: "Espresso y pastel", steps: ["taza", "espresso", "cafetera", "pastel"] },
    ],
  },
};

const SHIFT_SECONDS = 80;
const TARGET_SERVICES = 8;

function starsFor(served: number) { return served >= 8 ? 3 : served >= 5 ? 2 : served >= 3 ? 1 : 0; }

export function CookingRushGame({ game, onUpdate, onFinish }: { game: CookingGameId; onUpdate: (snapshot: CookingSnapshot) => void; onFinish: (result: CookingResult) => void }) {
  const config = configs[game];
  const uidRef = useRef(3);
  const [orders, setOrders] = useState<Order[]>(() => config.recipes.slice(0, 3).map((recipe, index) => ({ uid: index + 1, recipeId: recipe.id, progress: 0, patience: 100, processEnd: null, mistakes: 0 })));
  const [activeUid, setActiveUid] = useState(1);
  const [score, setScore] = useState(0);
  const [served, setServed] = useState(0);
  const [combo, setCombo] = useState(0);
  const [time, setTime] = useState(SHIFT_SECONDS);
  const [now, setNow] = useState(() => Date.now());
  const [feedback, setFeedback] = useState("Selecciona un pedido y sigue la receta");
  const finishedRef = useRef(false);
  const scoreRef = useRef(0); const servedRef = useRef(0); const comboRef = useRef(0); const bestComboRef = useRef(0); const timeRef = useRef(SHIFT_SECONDS);

  const recipeMap = useMemo(() => new Map(config.recipes.map((recipe) => [recipe.id, recipe])), [config.recipes]);
  const stationMap = useMemo(() => new Map(config.stations.map((station) => [station.id, station])), [config.stations]);

  const createOrder = useCallback((): Order => {
    uidRef.current += 1;
    const recipe = config.recipes[Math.floor(Math.random() * config.recipes.length)];
    return { uid: uidRef.current, recipeId: recipe.id, progress: 0, patience: 100, processEnd: null, mistakes: 0 };
  }, [config.recipes]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const timestamp = Date.now(); setNow(timestamp);
      timeRef.current = Math.max(0, timeRef.current - 0.25); setTime(Math.ceil(timeRef.current));
      let expired = 0;
      setOrders((current) => {
        const updated = current.map((order) => {
          const recipe = recipeMap.get(order.recipeId)!;
          const processingComplete = order.processEnd !== null && order.processEnd <= timestamp;
          return { ...order, patience: order.patience - 0.48, progress: processingComplete ? Math.min(recipe.steps.length, order.progress + 1) : order.progress, processEnd: processingComplete ? null : order.processEnd };
        });
        const surviving = updated.filter((order) => { const keep = order.patience > 0; if (!keep) expired += 1; return keep; });
        while (surviving.length < 3) surviving.push(createOrder());
        if (!surviving.some((order) => order.uid === activeUid)) setActiveUid(surviving[0].uid);
        return surviving;
      });
      if (expired) { comboRef.current = 0; setCombo(0); setFeedback(expired > 1 ? "Se fueron clientes sin recibir su pedido" : "Un cliente perdió la paciencia"); }
      onUpdate({ score: scoreRef.current, served: servedRef.current, combo: comboRef.current, time: Math.ceil(timeRef.current) });
      if (timeRef.current <= 0 && !finishedRef.current) {
        finishedRef.current = true;
        onFinish({ score: scoreRef.current, served: servedRef.current, combo: bestComboRef.current, time: 0, stars: starsFor(servedRef.current) });
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [activeUid, createOrder, onFinish, onUpdate, recipeMap]);

  const activeOrder = orders.find((order) => order.uid === activeUid) ?? orders[0];
  const activeRecipe = activeOrder ? recipeMap.get(activeOrder.recipeId) : null;
  const expectedStep = activeOrder && activeRecipe ? activeRecipe.steps[activeOrder.progress] : null;
  const busyStations = new Set(orders.filter((order) => order.processEnd).map((order) => recipeMap.get(order.recipeId)?.steps[order.progress]).filter(Boolean));

  function handleStation(station: Station) {
    if (!activeOrder || !activeRecipe || activeOrder.processEnd) return;
    if (station.processMs && busyStations.has(station.id)) {
      setFeedback(`${station.label} está ocupada. Adelanta otra parte del servicio mientras termina.`);
      return;
    }
    if (station.id !== expectedStep) {
      comboRef.current = 0; setCombo(0); setFeedback(`Ese paso no corresponde. Ahora necesitas: ${stationMap.get(expectedStep || "")?.label ?? "servir"}.`);
      setOrders((current) => current.map((order) => order.uid === activeOrder.uid ? { ...order, patience: Math.max(0, order.patience - 7), mistakes: order.mistakes + 1 } : order));
      return;
    }
    if (station.processMs) {
      setOrders((current) => current.map((order) => order.uid === activeOrder.uid ? { ...order, processEnd: Date.now() + station.processMs! } : order));
      setFeedback(`${station.label} trabajando. Puedes adelantar otra comanda mientras termina.`);
    } else {
      const nextProgress = activeOrder.progress + 1;
      setOrders((current) => current.map((order) => order.uid === activeOrder.uid ? { ...order, progress: nextProgress } : order));
      setFeedback(nextProgress === activeRecipe.steps.length ? "Pedido listo para servir" : `Bien. Siguiente paso: ${stationMap.get(activeRecipe.steps[nextProgress])?.label}.`);
    }
  }

  function serveOrder() {
    if (!activeOrder || !activeRecipe || activeOrder.progress < activeRecipe.steps.length || activeOrder.processEnd) return;
    const earned = Math.round(180 + activeOrder.patience * 2 + comboRef.current * 35);
    scoreRef.current += earned; servedRef.current += 1; comboRef.current += 1; bestComboRef.current = Math.max(bestComboRef.current, comboRef.current);
    setScore(scoreRef.current); setServed(servedRef.current); setCombo(comboRef.current); setFeedback(`Servicio correcto: +${earned} puntos`);
    if (servedRef.current >= TARGET_SERVICES && !finishedRef.current) {
      finishedRef.current = true;
      onFinish({ score: scoreRef.current, served: servedRef.current, combo: bestComboRef.current, time: Math.ceil(timeRef.current), stars: 3 });
      return;
    }
    const replacement = createOrder();
    setOrders((current) => current.map((order) => order.uid === activeOrder.uid ? replacement : order)); setActiveUid(replacement.uid);
  }

  function restartPreparation() {
    if (!activeOrder) return;
    comboRef.current = 0; setCombo(0); setFeedback("Preparación reiniciada. La paciencia del cliente bajó.");
    setOrders((current) => current.map((order) => order.uid === activeOrder.uid ? { ...order, progress: 0, processEnd: null, patience: Math.max(0, order.patience - 10), mistakes: order.mistakes + 1 } : order));
  }

  return <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-slate-100">
    <div className="grid shrink-0 grid-cols-3 gap-px bg-slate-200">{orders.map((order, index) => {
      const recipe = recipeMap.get(order.recipeId)!; const selected = order.uid === activeUid; const ready = order.progress >= recipe.steps.length && !order.processEnd;
      return <button key={order.uid} type="button" onClick={() => setActiveUid(order.uid)} className={`relative min-w-0 bg-white px-2 py-3 text-left transition sm:px-4 ${selected ? "z-10 ring-2 ring-inset ring-brand-orange" : "opacity-85"}`}><div className="flex items-center gap-2"><span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${ready ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{ready ? <Check className="size-4" /> : <UserRound className="size-4" />}</span><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Cliente {index + 1}</p><p className="truncate text-xs font-black text-brand-navy sm:text-sm">{recipe.name}</p></div></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full transition-all ${order.patience > 55 ? "bg-emerald-500" : order.patience > 25 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.max(0, order.patience)}%` }} /></div></button>;
    })}</div>

    <div className="mx-auto grid w-full max-w-5xl flex-1 gap-4 p-3 sm:p-5 lg:grid-cols-[1.05fr_.95fr]">
      <section className="rounded-3xl border bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-brand-green">Comanda activa</p><h4 className="mt-1 text-xl font-black text-brand-navy">{activeRecipe?.name ?? "Preparando cocina"}</h4></div><button type="button" onClick={restartPreparation} className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold text-slate-500"><Trash2 className="size-4" />Reiniciar</button></div>
        <div className="mt-4 flex flex-wrap gap-2">{activeRecipe?.steps.map((step, index) => { const station = stationMap.get(step)!; const Icon = station.icon; const completed = index < (activeOrder?.progress ?? 0); const current = index === activeOrder?.progress; return <div key={`${step}-${index}`} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${completed ? "border-emerald-200 bg-emerald-50 text-emerald-700" : current ? "border-orange-300 bg-orange-50 text-orange-800 ring-2 ring-orange-100" : "border-slate-200 text-slate-400"}`}><span className="flex size-6 items-center justify-center rounded-lg bg-white">{completed ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}</span>{station.label}{current && activeOrder?.processEnd ? <span className="ml-1 tabular-nums">{Math.max(0, ((activeOrder.processEnd - now) / 1000)).toFixed(1)}s</span> : null}</div>; })}</div>
        <div role="status" className="mt-4 min-h-12 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">{feedback}</div>
        <button type="button" onClick={serveOrder} disabled={!activeRecipe || !activeOrder || activeOrder.progress < activeRecipe.steps.length || Boolean(activeOrder.processEnd)} className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-green px-5 font-black text-white shadow-lg transition disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"><ChefHat className="size-5" />{config.serviceLabel}</button>
      </section>

      <section className="rounded-3xl border bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-brand-orange">Estaciones</p><h4 className="mt-1 text-xl font-black text-brand-navy">Prepara en orden</h4></div>{activeOrder?.processEnd ? <span className="flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-black text-orange-700"><Timer className="size-4 animate-pulse" />Procesando</span> : null}</div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{config.stations.map((station) => { const Icon = station.icon; const expected = station.id === expectedStep; const occupied = Boolean(station.processMs && busyStations.has(station.id) && !activeOrder?.processEnd); return <button key={station.id} type="button" onClick={() => handleStation(station)} disabled={Boolean(activeOrder?.processEnd)} aria-disabled={occupied} className={`relative flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border-2 px-2 text-sm font-black transition active:scale-95 disabled:opacity-45 ${station.color} ${expected ? "border-brand-orange ring-4 ring-orange-100" : "border-transparent"} ${occupied ? "saturate-50" : ""}`}><Icon className="size-6" />{station.label}{occupied ? <span className="absolute right-1 top-1 rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-black text-slate-600">OCUPADA</span> : null}</button>; })}</div></section>
    </div>

    <footer className="grid shrink-0 grid-cols-4 border-t bg-brand-navy px-3 py-2 text-center text-white"><div><p className="text-[10px] font-bold uppercase text-white/50">Tiempo</p><p className="font-black tabular-nums">{time}s</p></div><div><p className="text-[10px] font-bold uppercase text-white/50">Puntos</p><p className="font-black tabular-nums">{score}</p></div><div><p className="text-[10px] font-bold uppercase text-white/50">Servidos</p><p className="font-black">{served}/{TARGET_SERVICES}</p></div><div><p className="text-[10px] font-bold uppercase text-white/50">Combo</p><p className="font-black">x{combo}</p></div></footer>
  </div>;
}
