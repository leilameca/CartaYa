"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { CakeSlice, Check, ChefHat, Coffee, CookingPot, Croissant, Droplets, Flame, Leaf, Timer, Trash2, UserRound, Wheat, Zap } from "lucide-react";

export type CookingGameId = "taco" | "pizza" | "cafe";
export type CookingSnapshot = { score: number; served: number; combo: number; time: number };
export type CookingResult = CookingSnapshot & { stars: number };
type Station = { id: string; label: string; icon: ComponentType<{ className?: string }>; processMs?: number; tone: string };
type Recipe = { id: string; name: string; steps: string[] };
type GameConfig = { serviceLabel: string; stations: Station[]; recipes: Recipe[] };
type Order = { uid: number; recipeId: string; progress: number; patience: number; processEnd: number | null };

const configs: Record<CookingGameId, GameConfig> = {
  taco: {
    serviceLabel: "Servir taco",
    stations: [
      { id: "tortilla", label: "Tortilla", icon: Wheat, tone: "from-amber-200 to-orange-300" },
      { id: "carne", label: "Carne", icon: CookingPot, tone: "from-red-700 to-amber-950" },
      { id: "plancha", label: "Plancha", icon: CookingPot, processMs: 2600, tone: "from-slate-600 to-slate-950" },
      { id: "lechuga", label: "Lechuga", icon: Leaf, tone: "from-lime-300 to-emerald-600" },
      { id: "tomate", label: "Tomate", icon: Droplets, tone: "from-red-400 to-red-700" },
      { id: "salsa", label: "Salsa", icon: Droplets, tone: "from-orange-400 to-red-700" },
    ],
    recipes: [
      { id: "clasico", name: "Taco clásico", steps: ["tortilla", "carne", "plancha", "lechuga", "salsa"] },
      { id: "rojo", name: "Taco rojo", steps: ["tortilla", "carne", "plancha", "tomate", "salsa"] },
      { id: "completo", name: "Taco completo", steps: ["tortilla", "carne", "plancha", "lechuga", "tomate", "salsa"] },
    ],
  },
  pizza: {
    serviceLabel: "Servir pizza",
    stations: [
      { id: "masa", label: "Masa", icon: Wheat, tone: "from-amber-200 to-orange-300" },
      { id: "salsa", label: "Salsa", icon: Droplets, tone: "from-red-500 to-red-800" },
      { id: "queso", label: "Queso", icon: CakeSlice, tone: "from-yellow-200 to-amber-400" },
      { id: "pepperoni", label: "Pepperoni", icon: CookingPot, tone: "from-rose-500 to-red-800" },
      { id: "vegetales", label: "Vegetales", icon: Leaf, tone: "from-lime-300 to-green-700" },
      { id: "horno", label: "Horno", icon: Flame, processMs: 3800, tone: "from-orange-500 to-red-900" },
    ],
    recipes: [
      { id: "queso", name: "Pizza de queso", steps: ["masa", "salsa", "queso", "horno"] },
      { id: "pepperoni", name: "Pizza pepperoni", steps: ["masa", "salsa", "queso", "pepperoni", "horno"] },
      { id: "huerto", name: "Pizza del huerto", steps: ["masa", "salsa", "queso", "vegetales", "horno"] },
    ],
  },
  cafe: {
    serviceLabel: "Entregar bandeja",
    stations: [
      { id: "taza", label: "Taza", icon: Coffee, tone: "from-slate-100 to-slate-400" },
      { id: "espresso", label: "Espresso", icon: Droplets, tone: "from-amber-800 to-amber-950" },
      { id: "leche", label: "Leche", icon: Droplets, tone: "from-blue-50 to-blue-300" },
      { id: "chocolate", label: "Chocolate", icon: CakeSlice, tone: "from-amber-500 to-amber-900" },
      { id: "cafetera", label: "Cafetera", icon: Zap, processMs: 2400, tone: "from-slate-600 to-slate-950" },
      { id: "croissant", label: "Croissant", icon: Croissant, tone: "from-orange-300 to-amber-700" },
      { id: "pastel", label: "Pastel", icon: CakeSlice, tone: "from-pink-300 to-rose-600" },
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
const starsFor = (served: number) => served >= 8 ? 3 : served >= 5 ? 2 : served >= 3 ? 1 : 0;

function FoodPiece({ id, small = false }: { id: string; small?: boolean }) {
  const size = small ? "size-5" : "size-10 sm:size-12";
  if (id === "tortilla" || id === "masa") return <span className={`${size} rounded-full border-2 border-amber-500 bg-[radial-gradient(circle_at_35%_30%,#fff4c7,#e9a94b)] shadow-inner`} />;
  if (id === "carne") return <span className={`${size} rotate-6 rounded-[35%] border-2 border-amber-950 bg-[repeating-linear-gradient(45deg,#7f1d1d_0_5px,#b45309_5px_9px)] shadow`} />;
  if (id === "lechuga" || id === "vegetales") return <span className={`${size} rotate-12 rounded-[65%_35%_60%_40%] border-2 border-green-700 bg-[radial-gradient(circle,#bef264_15%,#22c55e_70%)] shadow`} />;
  if (id === "tomate" || id === "pepperoni") return <span className={`${size} rounded-full border-4 border-red-700 bg-[radial-gradient(circle,#fecaca_0_12%,#ef4444_14%_58%,#991b1b_60%)] shadow`} />;
  if (id === "salsa" || id === "espresso") return <span className={`${size} rounded-[55%_45%_60%_40%] border-2 border-orange-950 bg-[radial-gradient(circle_at_35%_30%,#fb923c,#991b1b)] shadow`} />;
  if (id === "queso") return <span className={`${size} rotate-6 rounded-lg border-2 border-yellow-600 bg-[radial-gradient(circle_at_30%_30%,#fff7ae_0_8%,transparent_9%),linear-gradient(135deg,#fde047,#f59e0b)] shadow`} />;
  if (id === "leche") return <span className={`${size} rounded-full border-2 border-blue-300 bg-[radial-gradient(circle_at_35%_30%,white,#dbeafe)] shadow`} />;
  if (id === "chocolate") return <span className={`${size} rounded-lg border-2 border-amber-950 bg-[linear-gradient(135deg,#92400e,#451a03)] shadow`} />;
  const Icon = id === "croissant" ? Croissant : id === "pastel" ? CakeSlice : id === "cafetera" ? Coffee : id === "horno" ? Flame : CookingPot;
  return <span className={`${size} flex items-center justify-center rounded-xl bg-gradient-to-br from-white to-slate-200 text-slate-800 shadow`}><Icon className={small ? "size-3.5" : "size-6"} /></span>;
}

export function CookingRushGame({ game, onUpdate, onFinish }: { game: CookingGameId; onUpdate: (snapshot: CookingSnapshot) => void; onFinish: (result: CookingResult) => void }) {
  const config = configs[game];
  const uidRef = useRef(3);
  const [orders, setOrders] = useState<Order[]>(() => config.recipes.map((recipe, index) => ({ uid: index + 1, recipeId: recipe.id, progress: 0, patience: 100, processEnd: null })));
  const [activeUid, setActiveUid] = useState(1);
  const [score, setScore] = useState(0);
  const [served, setServed] = useState(0);
  const [combo, setCombo] = useState(0);
  const [time, setTime] = useState(SHIFT_SECONDS);
  const [now, setNow] = useState(() => Date.now());
  const [feedback, setFeedback] = useState("Toca los ingredientes en el orden de la burbuja");
  const finishedRef = useRef(false);
  const scoreRef = useRef(0); const servedRef = useRef(0); const comboRef = useRef(0); const bestComboRef = useRef(0); const timeRef = useRef(SHIFT_SECONDS);
  const recipeMap = useMemo(() => new Map(config.recipes.map((recipe) => [recipe.id, recipe])), [config.recipes]);
  const stationMap = useMemo(() => new Map(config.stations.map((station) => [station.id, station])), [config.stations]);
  const createOrder = useCallback((): Order => {
    uidRef.current += 1;
    const recipe = config.recipes[Math.floor(Math.random() * config.recipes.length)];
    return { uid: uidRef.current, recipeId: recipe.id, progress: 0, patience: 100, processEnd: null };
  }, [config.recipes]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const timestamp = Date.now(); setNow(timestamp);
      timeRef.current = Math.max(0, timeRef.current - 0.25); setTime(Math.ceil(timeRef.current));
      let expired = false;
      setOrders((current) => {
        const updated = current.map((order) => {
          const recipe = recipeMap.get(order.recipeId)!;
          const done = order.processEnd !== null && order.processEnd <= timestamp;
          return { ...order, patience: order.patience - 0.48, progress: done ? Math.min(recipe.steps.length, order.progress + 1) : order.progress, processEnd: done ? null : order.processEnd };
        });
        const surviving = updated.filter((order) => { const keep = order.patience > 0; if (!keep) expired = true; return keep; });
        while (surviving.length < 3) surviving.push(createOrder());
        if (!surviving.some((order) => order.uid === activeUid)) setActiveUid(surviving[0].uid);
        return surviving;
      });
      if (expired) { comboRef.current = 0; setCombo(0); setFeedback("Un cliente se fue: prepara el siguiente pedido"); }
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
    if (station.processMs && busyStations.has(station.id)) { setFeedback(`${station.label} está ocupada; prepara otro pedido`); return; }
    if (station.id !== expectedStep) {
      comboRef.current = 0; setCombo(0); setFeedback(`Ahora necesitas ${stationMap.get(expectedStep || "")?.label ?? "servir"}`);
      setOrders((current) => current.map((order) => order.uid === activeOrder.uid ? { ...order, patience: Math.max(0, order.patience - 7) } : order));
      return;
    }
    if (station.processMs) {
      setOrders((current) => current.map((order) => order.uid === activeOrder.uid ? { ...order, processEnd: Date.now() + station.processMs! } : order));
      setFeedback(`${station.label} encendida; toca otro cliente mientras termina`);
    } else {
      const nextProgress = activeOrder.progress + 1;
      setOrders((current) => current.map((order) => order.uid === activeOrder.uid ? { ...order, progress: nextProgress } : order));
      setFeedback(nextProgress === activeRecipe.steps.length ? "Plato terminado: llévalo al cliente" : "Ingrediente colocado en la mesa");
    }
  }

  function serveOrder() {
    if (!activeOrder || !activeRecipe || activeOrder.progress < activeRecipe.steps.length || activeOrder.processEnd) return;
    const earned = Math.round(180 + activeOrder.patience * 2 + comboRef.current * 35);
    scoreRef.current += earned; servedRef.current += 1; comboRef.current += 1; bestComboRef.current = Math.max(bestComboRef.current, comboRef.current);
    setScore(scoreRef.current); setServed(servedRef.current); setCombo(comboRef.current); setFeedback(`Pedido servido: +${earned}`);
    if (servedRef.current >= TARGET_SERVICES && !finishedRef.current) {
      finishedRef.current = true; onFinish({ score: scoreRef.current, served: servedRef.current, combo: bestComboRef.current, time: Math.ceil(timeRef.current), stars: 3 }); return;
    }
    const replacement = createOrder();
    setOrders((current) => current.map((order) => order.uid === activeOrder.uid ? replacement : order)); setActiveUid(replacement.uid);
  }

  function restartPreparation() {
    if (!activeOrder) return;
    comboRef.current = 0; setCombo(0); setFeedback("Plato descartado; vuelve a prepararlo");
    setOrders((current) => current.map((order) => order.uid === activeOrder.uid ? { ...order, progress: 0, processEnd: null, patience: Math.max(0, order.patience - 10) } : order));
  }

  const placedSteps = activeRecipe?.steps.slice(0, activeOrder?.progress ?? 0).filter((step) => !stationMap.get(step)?.processMs) ?? [];

  return <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#182536]">
    <div className="relative mx-auto flex min-h-[560px] w-full max-w-6xl flex-1 flex-col overflow-hidden bg-[url('/game-assets/cooking-counter-stage.png')] bg-cover bg-center sm:aspect-[16/9] sm:min-h-[620px]">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/5 via-transparent to-slate-950/35" />
      <section className="relative z-10 grid shrink-0 grid-cols-3 gap-2 px-2 pt-2 sm:gap-4 sm:px-8 sm:pt-4" aria-label="Clientes esperando">
        {orders.map((order, index) => {
          const recipe = recipeMap.get(order.recipeId)!; const selected = order.uid === activeUid; const ready = order.progress >= recipe.steps.length && !order.processEnd;
          return <button key={order.uid} type="button" onClick={() => setActiveUid(order.uid)} className={`relative min-w-0 rounded-2xl border-2 bg-white/95 p-2 text-left shadow-xl backdrop-blur transition active:scale-95 sm:p-3 ${selected ? "border-orange-500 ring-4 ring-orange-400/35" : "border-white/60"}`}>
            <span className={`absolute -bottom-3 left-1/2 size-4 -translate-x-1/2 rotate-45 border-b-2 border-r-2 bg-white ${selected ? "border-orange-500" : "border-white"}`} />
            <div className="flex items-center gap-1.5"><span className={`flex size-8 shrink-0 items-center justify-center rounded-full sm:size-10 ${ready ? "bg-emerald-500 text-white" : "bg-brand-navy text-white"}`}>{ready ? <Check className="size-4" /> : <UserRound className="size-4 sm:size-5" />}</span><div className="flex min-w-0 flex-1 items-center justify-center gap-0.5 rounded-xl bg-amber-50 px-1 py-1.5 sm:gap-1">{recipe.steps.filter((step) => !stationMap.get(step)?.processMs).map((step, stepIndex) => <FoodPiece key={`${step}-${stepIndex}`} id={step} small />)}</div></div>
            <span className="sr-only">Cliente {index + 1}: {recipe.name}</span>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className={`h-full ${order.patience > 55 ? "bg-emerald-500" : order.patience > 25 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.max(0, order.patience)}%` }} /></div>
          </button>;
        })}
      </section>

      <section className="relative z-10 mt-8 px-2 sm:mt-14 sm:px-8" aria-label="Estante de ingredientes">
        <div className={`mx-auto grid max-w-4xl gap-1.5 rounded-3xl border-4 border-amber-950/45 bg-amber-900/75 p-2 shadow-2xl backdrop-blur-sm ${config.stations.length > 6 ? "grid-cols-4 sm:grid-cols-7" : "grid-cols-3 sm:grid-cols-6"}`}>
          {config.stations.map((station) => {
            const Icon = station.icon; const expected = station.id === expectedStep; const occupied = Boolean(station.processMs && busyStations.has(station.id) && !activeOrder?.processEnd);
            return <button key={station.id} type="button" onClick={() => handleStation(station)} disabled={Boolean(activeOrder?.processEnd)} aria-label={station.label} aria-disabled={occupied} className={`relative flex min-h-16 flex-col items-center justify-center rounded-[45%_45%_30%_30%] border-2 bg-gradient-to-br p-1 shadow-lg transition active:scale-90 sm:min-h-20 ${station.tone} ${expected ? "border-white ring-4 ring-orange-400 animate-pulse" : "border-white/25"} disabled:opacity-50`}>
              {station.processMs ? <Icon className="size-7 text-white drop-shadow sm:size-9" /> : <FoodPiece id={station.id} />}
              <span className="mt-0.5 rounded-full bg-slate-950/65 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white sm:text-[10px]">{occupied ? "Ocupada" : station.label}</span>
            </button>;
          })}
        </div>
      </section>

      <section className="relative z-10 flex flex-1 items-end justify-center px-3 pb-4 pt-6 sm:px-10 sm:pb-7" aria-label="Mesa de preparación">
        <div className="relative flex h-48 w-full max-w-3xl items-center justify-center rounded-[2rem] border-4 border-white/40 bg-amber-50/20 shadow-2xl backdrop-blur-[2px] sm:h-60">
          <button type="button" onClick={restartPreparation} className="absolute left-3 top-3 flex size-10 items-center justify-center rounded-full bg-slate-900/75 text-white shadow" aria-label="Descartar preparación"><Trash2 className="size-4" /></button>
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-brand-navy/90 px-3 py-1.5 text-xs font-black text-white"><Timer className="size-3.5" />{time}s</div>
          <div className="relative flex h-36 w-52 items-center justify-center rounded-[50%] border-[10px] border-white bg-gradient-to-br from-white to-slate-200 shadow-2xl sm:h-44 sm:w-72">
            {placedSteps.length === 0 ? <ChefHat className="size-12 text-slate-300" /> : placedSteps.map((step, index) => <span key={`${activeOrder?.uid}-${step}-${index}`} className="cartaya-food-drop absolute" style={{ left: `${28 + (index % 3) * 18}%`, top: `${24 + Math.floor(index / 3) * 28}%`, zIndex: index + 1 }}><FoodPiece id={step} /></span>)}
            {activeOrder?.processEnd ? <span className="absolute inset-0 flex flex-col items-center justify-center rounded-[50%] bg-slate-950/65 text-white backdrop-blur-sm"><Flame className="size-9 animate-bounce text-orange-400" /><strong className="mt-1 text-xl tabular-nums">{Math.max(0, (activeOrder.processEnd - now) / 1000).toFixed(1)}s</strong></span> : null}
          </div>
          <button type="button" onClick={serveOrder} disabled={!activeRecipe || !activeOrder || activeOrder.progress < activeRecipe.steps.length || Boolean(activeOrder.processEnd)} className="absolute bottom-3 right-3 flex min-h-11 items-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white shadow-xl transition active:scale-95 disabled:translate-y-2 disabled:bg-slate-400 disabled:opacity-55 sm:px-6"><ChefHat className="size-5" />{config.serviceLabel}</button>
        </div>
      </section>
      <div role="status" className="relative z-10 mx-auto mb-2 max-w-[92%] rounded-full bg-slate-950/80 px-4 py-2 text-center text-xs font-bold text-white shadow-lg sm:text-sm">{feedback}</div>
    </div>
    <footer className="relative z-20 grid shrink-0 grid-cols-3 bg-brand-navy px-3 py-2 text-center text-white"><div><p className="text-[9px] font-bold uppercase text-white/50">Puntos</p><p className="font-black tabular-nums">{score}</p></div><div><p className="text-[9px] font-bold uppercase text-white/50">Servidos</p><p className="font-black">{served}/{TARGET_SERVICES}</p></div><div><p className="text-[9px] font-bold uppercase text-white/50">Combo</p><p className="font-black">x{combo}</p></div></footer>
  </div>;
}
