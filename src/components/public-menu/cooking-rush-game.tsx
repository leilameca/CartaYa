"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { CakeSlice, ChefHat, Coffee, CookingPot, Croissant, Droplets, Flame, Leaf, Timer, Trash2, Wheat, Zap } from "lucide-react";

export type CookingGameId = "taco" | "pizza" | "cafe";
export type CookingSnapshot = { score: number; served: number; combo: number; time: number };
export type CookingResult = CookingSnapshot & { stars: number };
type Station = { id: string; label: string; icon: ComponentType<{ className?: string }>; processMs?: number; tone: string };
type Recipe = { id: string; name: string; steps: string[] };
type GameConfig = { serviceLabel: string; stations: Station[]; recipes: Recipe[] };
type Order = { uid: number; recipeId: string; progress: number; patience: number; processEnd: number | null };
type GrillSlot = { orderUid: number; startedAt: number } | null;
type MeatState = "raw" | "cooking" | "ready" | "burned";

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

const spriteCells: Record<CookingGameId, Record<string, [number, number]>> = {
  taco: { tortilla: [0, 0], carne: [1, 0], plancha: [2, 0], lechuga: [0, 1], tomate: [1, 1], salsa: [2, 1] },
  pizza: { masa: [0, 0], salsa: [1, 0], queso: [2, 0], pepperoni: [0, 1], vegetales: [1, 1], horno: [2, 1] },
  cafe: { taza: [0, 0], espresso: [1, 0], leche: [2, 0], chocolate: [0, 1], croissant: [1, 1], pastel: [2, 1], cafetera: [0, 0] },
};

function FoodPiece({ game, id, small = false, plate = false, className = "" }: { game: CookingGameId; id: string; small?: boolean; plate?: boolean; className?: string }) {
  const cell = spriteCells[game][id] ?? [0, 0];
  const base = id === "tortilla" || id === "masa" || id === "taza";
  const size = small ? "size-7" : plate ? (base ? "size-36 sm:size-44" : "size-24 sm:size-28") : "size-14 sm:size-16";
  return <span className={`block shrink-0 bg-no-repeat drop-shadow-md ${size} ${className}`} style={{ backgroundImage: `url('/game-assets/${game}-real-sprites.png')`, backgroundSize: "300% 200%", backgroundPosition: `${cell[0] * 50}% ${cell[1] * 100}%` }} />;
}

function CustomerFace({ patience, ready }: { patience: number; ready: boolean }) {
  const mood = ready || patience > 60 ? "happy" : patience > 30 ? "waiting" : "angry";
  return <span className={`cartaya-customer-face cartaya-customer-${mood}`} aria-hidden="true"><i /><i /><b /></span>;
}

function MeatCookingPiece({ state }: { state: MeatState }) {
  const index: Record<MeatState, number> = { raw: 0, cooking: 1, ready: 2, burned: 3 };
  return <span className="block h-14 w-24 bg-no-repeat drop-shadow-lg sm:h-16 sm:w-28" style={{ backgroundImage: "url('/game-assets/taco-meat-states.png')", backgroundSize: "400% 100%", backgroundPosition: `${index[state] * 33.333}% 50%` }} />;
}

function meatState(startedAt: number, now: number): MeatState {
  const elapsed = now - startedAt;
  if (elapsed < 900) return "raw";
  if (elapsed < 3500) return "cooking";
  if (elapsed < 6500) return "ready";
  return "burned";
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
  const [grillSlots, setGrillSlots] = useState<GrillSlot[]>([null, null]);
  const audioRef = useRef<AudioContext | null>(null);
  const finishedRef = useRef(false);
  const scoreRef = useRef(0); const servedRef = useRef(0); const comboRef = useRef(0); const bestComboRef = useRef(0); const timeRef = useRef(SHIFT_SECONDS);
  const recipeMap = useMemo(() => new Map(config.recipes.map((recipe) => [recipe.id, recipe])), [config.recipes]);
  const stationMap = useMemo(() => new Map(config.stations.map((station) => [station.id, station])), [config.stations]);
  const createOrder = useCallback((): Order => {
    uidRef.current += 1;
    const recipe = config.recipes[Math.floor(Math.random() * config.recipes.length)];
    return { uid: uidRef.current, recipeId: recipe.id, progress: 0, patience: 100, processEnd: null };
  }, [config.recipes]);

  function playSound(kind: "sizzle" | "chop" | "success" | "burn") {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = audioRef.current ?? new AudioContextClass(); audioRef.current = context;
    if (context.state === "suspended") void context.resume();
    const gain = context.createGain(); gain.connect(context.destination);
    if (kind === "sizzle") {
      const buffer = context.createBuffer(1, context.sampleRate * 0.55, context.sampleRate);
      const data = buffer.getChannelData(0); for (let i = 0; i < data.length; i += 1) data[i] = (Math.sin(i * 1.73) + Math.sin(i * 0.37)) * 0.45 * (1 - i / data.length);
      const source = context.createBufferSource(); const filter = context.createBiquadFilter(); filter.type = "bandpass"; filter.frequency.value = 2400; source.buffer = buffer; source.connect(filter); filter.connect(gain); gain.gain.setValueAtTime(0.09, context.currentTime); source.start();
      return;
    }
    const oscillator = context.createOscillator(); oscillator.connect(gain);
    const duration = kind === "success" ? 0.32 : 0.12;
    oscillator.type = kind === "burn" ? "sawtooth" : "sine";
    oscillator.frequency.setValueAtTime(kind === "success" ? 620 : kind === "burn" ? 110 : 210, context.currentTime);
    if (kind === "success") oscillator.frequency.exponentialRampToValueAtTime(980, context.currentTime + duration);
    gain.gain.setValueAtTime(0.12, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.start(); oscillator.stop(context.currentTime + duration);
  }

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
        if (expired) {
          const alive = new Set(surviving.map((order) => order.uid));
          setGrillSlots((slots) => slots.map((slot) => slot && alive.has(slot.orderUid) ? slot : null));
        }
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
    if (game === "taco" && station.id === "plancha" && expectedStep === "plancha") {
      const slotIndex = grillSlots.findIndex((slot) => slot?.orderUid === activeOrder.uid);
      if (slotIndex >= 0) {
        const slot = grillSlots[slotIndex]!; const state = meatState(slot.startedAt, now);
        if (state === "raw" || state === "cooking") { setFeedback("La carne todavía está cocinándose"); playSound("sizzle"); return; }
        if (state === "burned") { setFeedback("La carne se quemó; tírala antes de continuar"); playSound("burn"); return; }
        setGrillSlots((slots) => slots.map((item, index) => index === slotIndex ? null : item));
        setOrders((current) => current.map((order) => order.uid === activeOrder.uid ? { ...order, progress: order.progress + 1 } : order));
        setFeedback("Carne asada colocada sobre la tortilla"); playSound("chop"); return;
      }
      const emptySlot = grillSlots.findIndex((slot) => slot === null);
      if (emptySlot < 0) { setFeedback("La plancha está llena; termina o descarta una carne"); return; }
      setGrillSlots((slots) => slots.map((slot, index) => index === emptySlot ? { orderUid: activeOrder.uid, startedAt: now } : slot));
      setFeedback("Carne en la plancha; retírala cuando esté dorada"); playSound("sizzle"); return;
    }
    if (station.processMs && busyStations.has(station.id)) { setFeedback(`${station.label} está ocupada; prepara otro pedido`); return; }
    if (station.id !== expectedStep) {
      comboRef.current = 0; setCombo(0); setFeedback(`Ahora necesitas ${stationMap.get(expectedStep || "")?.label ?? "servir"}`);
      setOrders((current) => current.map((order) => order.uid === activeOrder.uid ? { ...order, patience: Math.max(0, order.patience - 7) } : order));
      return;
    }
    if (station.processMs) {
      setOrders((current) => current.map((order) => order.uid === activeOrder.uid ? { ...order, processEnd: now + station.processMs! } : order));
      setFeedback(`${station.label} encendida; toca otro cliente mientras termina`);
    } else {
      const nextProgress = activeOrder.progress + 1;
      setOrders((current) => current.map((order) => order.uid === activeOrder.uid ? { ...order, progress: nextProgress } : order));
      setFeedback(nextProgress === activeRecipe.steps.length ? "Plato terminado: llévalo al cliente" : "Ingrediente colocado en la mesa");
      if (["lechuga", "tomate", "vegetales"].includes(station.id)) playSound("chop");
    }
  }

  function handleGrillSlot(index: number) {
    const slot = grillSlots[index];
    if (!slot) { setFeedback("Primero elige carne y luego toca la plancha"); return; }
    const state = meatState(slot.startedAt, now); setActiveUid(slot.orderUid);
    if (state === "raw" || state === "cooking") { setFeedback("Déjala cocinar hasta que quede dorada"); playSound("sizzle"); return; }
    if (state === "burned") { setFeedback("Carne quemada: usa el bote de ese espacio"); playSound("burn"); return; }
    setGrillSlots((slots) => slots.map((item, slotIndex) => slotIndex === index ? null : item));
    setOrders((current) => current.map((order) => order.uid === slot.orderUid ? { ...order, progress: order.progress + 1 } : order));
    setFeedback("Carne en su punto colocada sobre la tortilla"); playSound("chop");
  }

  function discardBurned(index: number) {
    const slot = grillSlots[index]; if (!slot) return;
    setGrillSlots((slots) => slots.map((item, slotIndex) => slotIndex === index ? null : item));
    setOrders((current) => current.map((order) => order.uid === slot.orderUid ? { ...order, progress: 1, patience: Math.max(0, order.patience - 8) } : order));
    setActiveUid(slot.orderUid); setFeedback("Carne quemada descartada; toma una porción nueva"); playSound("burn");
  }

  function serveOrder() {
    if (!activeOrder || !activeRecipe || activeOrder.progress < activeRecipe.steps.length || activeOrder.processEnd) return;
    const earned = Math.round(180 + activeOrder.patience * 2 + comboRef.current * 35);
    scoreRef.current += earned; servedRef.current += 1; comboRef.current += 1; bestComboRef.current = Math.max(bestComboRef.current, comboRef.current);
    setScore(scoreRef.current); setServed(servedRef.current); setCombo(comboRef.current); setFeedback(`Pedido servido: +${earned}`);
    playSound("success");
    if (servedRef.current >= TARGET_SERVICES && !finishedRef.current) {
      finishedRef.current = true; onFinish({ score: scoreRef.current, served: servedRef.current, combo: bestComboRef.current, time: Math.ceil(timeRef.current), stars: 3 }); return;
    }
    const replacement = createOrder();
    setOrders((current) => current.map((order) => order.uid === activeOrder.uid ? replacement : order)); setActiveUid(replacement.uid);
  }

  function restartPreparation() {
    if (!activeOrder) return;
    comboRef.current = 0; setCombo(0); setFeedback("Plato descartado; vuelve a prepararlo");
    setGrillSlots((slots) => slots.map((slot) => slot?.orderUid === activeOrder.uid ? null : slot));
    setOrders((current) => current.map((order) => order.uid === activeOrder.uid ? { ...order, progress: 0, processEnd: null, patience: Math.max(0, order.patience - 10) } : order));
  }

  const placedSteps = activeRecipe?.steps.slice(0, activeOrder?.progress ?? 0).filter((step) => !stationMap.get(step)?.processMs && !(game === "taco" && step === "carne" && (activeOrder?.progress ?? 0) <= 2)) ?? [];

  return <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#182536]">
    <div className="relative mx-auto flex min-h-[560px] w-full max-w-6xl flex-1 flex-col overflow-hidden bg-[url('/game-assets/cooking-counter-stage.png')] bg-cover bg-center sm:aspect-[16/9] sm:min-h-[620px]">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/5 via-transparent to-slate-950/35" />
      <section className="relative z-10 grid shrink-0 grid-cols-3 gap-2 px-2 pt-2 sm:gap-4 sm:px-8 sm:pt-4" aria-label="Clientes esperando">
        {orders.map((order, index) => {
          const recipe = recipeMap.get(order.recipeId)!; const selected = order.uid === activeUid; const ready = order.progress >= recipe.steps.length && !order.processEnd;
          return <button key={order.uid} type="button" onClick={() => setActiveUid(order.uid)} className={`relative min-w-0 rounded-2xl border-2 bg-white/95 p-2 text-left shadow-xl backdrop-blur transition active:scale-95 sm:p-3 ${selected ? "border-orange-500 ring-4 ring-orange-400/35" : "border-white/60"}`}>
            <span className={`absolute -bottom-3 left-1/2 size-4 -translate-x-1/2 rotate-45 border-b-2 border-r-2 bg-white ${selected ? "border-orange-500" : "border-white"}`} />
            <div className="flex items-center gap-1.5"><CustomerFace patience={order.patience} ready={ready} /><div className="flex min-w-0 flex-1 items-center justify-center gap-0.5 rounded-xl bg-amber-50 px-1 py-1 sm:gap-1">{recipe.steps.filter((step) => !stationMap.get(step)?.processMs).map((step, stepIndex) => <FoodPiece key={`${step}-${stepIndex}`} game={game} id={step} small />)}</div></div>
            <span className="sr-only">Cliente {index + 1}: {recipe.name}</span>
            <span className={`mt-1 block text-center text-[9px] font-black uppercase ${order.patience > 60 ? "text-emerald-700" : order.patience > 30 ? "text-amber-700" : "text-red-700"}`}>{ready ? "Listo" : order.patience > 60 ? "Contento" : order.patience > 30 ? "Esperando" : "Impaciente"}</span>
          </button>;
        })}
      </section>

      <section className="relative z-10 mt-8 px-2 sm:mt-14 sm:px-8" aria-label="Estante de ingredientes">
        <div className={`mx-auto grid max-w-4xl gap-1.5 rounded-3xl border-4 border-amber-950/45 bg-amber-900/75 p-2 shadow-2xl backdrop-blur-sm ${config.stations.length > 6 ? "grid-cols-4 sm:grid-cols-7" : "grid-cols-3 sm:grid-cols-6"}`}>
          {config.stations.map((station) => {
            const Icon = station.icon; const expected = station.id === expectedStep; const occupied = Boolean(station.processMs && busyStations.has(station.id) && !activeOrder?.processEnd);
            return <button key={station.id} type="button" onClick={() => handleStation(station)} disabled={Boolean(activeOrder?.processEnd)} aria-label={station.label} aria-disabled={occupied} className={`relative flex min-h-16 flex-col items-center justify-center rounded-[45%_45%_30%_30%] border-2 bg-gradient-to-br p-1 shadow-lg transition active:scale-90 sm:min-h-20 ${station.tone} ${expected ? "border-white ring-4 ring-orange-400 animate-pulse" : "border-white/25"} disabled:opacity-50`}>
              {game === "cafe" && station.id === "cafetera" ? <Icon className="size-7 text-white drop-shadow sm:size-9" /> : <FoodPiece game={game} id={station.id} />}
              <span className="mt-0.5 rounded-full bg-slate-950/65 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white sm:text-[10px]">{occupied ? "Ocupada" : station.label}</span>
            </button>;
          })}
        </div>
        {game === "taco" ? <div className="mx-auto mt-2 grid max-w-md grid-cols-2 gap-2" aria-label="Espacios de cocción">
          {grillSlots.map((slot, index) => {
            const state = slot ? meatState(slot.startedAt, now) : null;
            const labels: Record<MeatState, string> = { raw: "Cruda", cooking: "Cocinando", ready: "Lista", burned: "Quemada" };
            return <div key={index} className={`relative overflow-hidden rounded-2xl border-2 p-1.5 shadow-xl ${state === "ready" ? "border-emerald-400 bg-emerald-950" : state === "burned" ? "border-red-500 bg-black" : "border-slate-500 bg-slate-900"}`}>
              <button type="button" onClick={() => handleGrillSlot(index)} className="relative flex h-16 w-full items-center justify-center overflow-hidden rounded-xl bg-[radial-gradient(ellipse,#4b5563,#111827)] active:scale-95" aria-label={state ? `Carne ${labels[state]}` : "Espacio de plancha vacío"}>
                {slot && state ? <MeatCookingPiece state={state} /> : <span className="h-1 w-14 rounded-full bg-white/15" />}
                {state === "raw" || state === "cooking" ? <span className="cartaya-grill-smoke"><i /><i /><i /></span> : null}
                {state ? <span className={`absolute bottom-1 left-2 rounded-full px-2 py-0.5 text-[9px] font-black uppercase text-white ${state === "ready" ? "bg-emerald-600" : state === "burned" ? "bg-red-700" : "bg-slate-950/75"}`}>{labels[state]}</span> : null}
              </button>
              {state === "burned" ? <button type="button" onClick={() => discardBurned(index)} className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-red-600 text-white shadow-lg" aria-label="Tirar carne quemada"><Trash2 className="size-4" /></button> : null}
            </div>;
          })}
        </div> : null}
      </section>

      <section className="relative z-10 flex flex-1 items-end justify-center px-3 pb-4 pt-6 sm:px-10 sm:pb-7" aria-label="Mesa de preparación">
        <div className="relative flex h-48 w-full max-w-3xl items-center justify-center sm:h-60">
          <button type="button" onClick={restartPreparation} className="absolute left-3 top-3 flex size-10 items-center justify-center rounded-full bg-slate-900/75 text-white shadow" aria-label="Descartar preparación"><Trash2 className="size-4" /></button>
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-brand-navy/90 px-3 py-1.5 text-xs font-black text-white"><Timer className="size-3.5" />{time}s</div>
          <div className="relative flex h-40 w-72 items-center justify-center sm:h-48 sm:w-80">
            {placedSteps.length === 0 ? <ChefHat className="size-12 text-slate-300" /> : placedSteps.map((step, index) => <span key={`${activeOrder?.uid}-${step}-${index}`} className="cartaya-food-drop absolute inset-0 flex items-center justify-center" style={{ zIndex: index + 1 }}><FoodPiece game={game} id={step} plate className={game === "taco" && step === "tortilla" ? "scale-x-110" : game === "taco" && step === "salsa" ? "rotate-6 scale-75" : ""} /></span>)}
            {activeOrder?.processEnd ? <span className="absolute inset-4 flex flex-col items-center justify-center rounded-[50%] bg-slate-950/65 text-white backdrop-blur-sm"><Flame className="size-9 animate-bounce text-orange-400" /><strong className="mt-1 text-xl tabular-nums">{Math.max(0, (activeOrder.processEnd - now) / 1000).toFixed(1)}s</strong></span> : null}
          </div>
          <button type="button" onClick={serveOrder} disabled={!activeRecipe || !activeOrder || activeOrder.progress < activeRecipe.steps.length || Boolean(activeOrder.processEnd)} className="absolute bottom-3 right-3 flex min-h-11 items-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white shadow-xl transition active:scale-95 disabled:translate-y-2 disabled:bg-slate-400 disabled:opacity-55 sm:px-6"><ChefHat className="size-5" />{config.serviceLabel}</button>
        </div>
      </section>
      <div role="status" className="relative z-10 mx-auto mb-2 max-w-[92%] rounded-full bg-slate-950/80 px-4 py-2 text-center text-xs font-bold text-white shadow-lg sm:text-sm">{feedback}</div>
    </div>
    <footer className="relative z-20 grid shrink-0 grid-cols-3 bg-brand-navy px-3 py-2 text-center text-white"><div><p className="text-[9px] font-bold uppercase text-white/50">Puntos</p><p className="font-black tabular-nums">{score}</p></div><div><p className="text-[9px] font-bold uppercase text-white/50">Servidos</p><p className="font-black">{served}/{TARGET_SERVICES}</p></div><div><p className="text-[9px] font-bold uppercase text-white/50">Combo</p><p className="font-black">x{combo}</p></div></footer>
  </div>;
}
