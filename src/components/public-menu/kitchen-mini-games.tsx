"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { Apple, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Carrot, ChefHat, Check, CircleDot, CookingPot, Fish, Footprints, Gamepad2, Heart, PackageCheck, Play, RotateCcw, Soup, Timer, Trophy, X } from "lucide-react";

type Game = "runner" | "platform" | "delivery";
type Ingredient = 0 | 1 | 2;
type RunnerObject = { kind: "ingredient" | "hazard"; ingredient: Ingredient };
type Scores = Record<Game, number>;

const SECONDS = 45;
const ingredientIcons = [Carrot, Apple, Fish] as const;
const gameMeta: Array<{ id: Game; title: string; subtitle: string; goal: string; icon: ComponentType<{ className?: string }>; position: string; overlay: string }> = [
  { id: "runner", title: "Chef a Toda Marcha", subtitle: "Completa platos mientras recorres la cocina", goal: "Recoge 6 ingredientes y salta las ollas. Cada ingrediente suma al plato.", icon: ChefHat, position: "left center", overlay: "from-orange-950/95 via-orange-800/60 to-transparent" },
  { id: "platform", title: "Misión: Mise en Place", subtitle: "Explora las plataformas y prepara la estación", goal: "Muévete, salta, recoge los 3 ingredientes y llega a la olla encendida.", icon: Footprints, position: "center center", overlay: "from-emerald-950/95 via-emerald-800/60 to-transparent" },
  { id: "delivery", title: "Servicio de Mesa", subtitle: "Recoge el plato y atiende la mesa correcta", goal: "Ve a la cocina, recoge el pedido y llévalo a la mesa señalada sin pisar derrames.", icon: PackageCheck, position: "right center", overlay: "from-blue-950/95 via-blue-900/60 to-transparent" },
];

const platformCounters = [
  { x: 20, width: 21, y: 20 },
  { x: 46, width: 20, y: 38 },
  { x: 72, width: 20, y: 20 },
];
const platformIngredients = [
  { x: 29, y: 26, type: 0 as Ingredient },
  { x: 55, y: 44, type: 1 as Ingredient },
  { x: 81, y: 26, type: 2 as Ingredient },
];

function randomRunnerObject(): RunnerObject {
  return Math.random() < 0.64
    ? { kind: "ingredient", ingredient: Math.floor(Math.random() * 3) as Ingredient }
    : { kind: "hazard", ingredient: 0 };
}

function randomSpills() {
  const cells = new Set<string>();
  for (let row = 1; row <= 3; row += 1) cells.add(`${row}-${Math.floor(Math.random() * 3)}`);
  return cells;
}

export function KitchenMiniGames({ primaryColor }: { primaryColor: string }) {
  const [active, setActive] = useState<Game | null>(null);
  const [playing, setPlaying] = useState(false);
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [time, setTime] = useState(SECONDS);
  const [best, setBest] = useState<Scores>(() => {
    if (typeof window === "undefined") return { runner: 0, platform: 0, delivery: 0 };
    try { return { runner: 0, platform: 0, delivery: 0, ...JSON.parse(window.localStorage.getItem("cartaya-kitchen-games-v2") || "{}") }; }
    catch { return { runner: 0, platform: 0, delivery: 0 }; }
  });

  const [runnerX, setRunnerX] = useState(105);
  const [runnerObject, setRunnerObject] = useState<RunnerObject>(randomRunnerObject);
  const [jumping, setJumping] = useState(false);
  const jumpingRef = useRef(false);
  const runnerHandledRef = useRef(false);
  const jumpTimerRef = useRef<number | null>(null);
  const [dishProgress, setDishProgress] = useState(0);

  const [platformX, setPlatformX] = useState(7);
  const platformXRef = useRef(7);
  const [platformY, setPlatformY] = useState(0);
  const platformYRef = useRef(0);
  const platformVelocityRef = useRef(0);
  const platformDirectionRef = useRef(0);
  const groundedRef = useRef(true);
  const [collected, setCollected] = useState<boolean[]>([false, false, false]);

  const [waiterLane, setWaiterLane] = useState(1);
  const [waiterRow, setWaiterRow] = useState(3);
  const [carrying, setCarrying] = useState(false);
  const [targetTable, setTargetTable] = useState(1);
  const [plateLane, setPlateLane] = useState(1);
  const [spills, setSpills] = useState<Set<string>>(randomSpills);
  const [deliveryMessage, setDeliveryMessage] = useState("Ve a la cocina por el pedido");

  const saveBest = useCallback((game: Game, points: number) => {
    setBest((current) => {
      if (points <= current[game]) return current;
      const next = { ...current, [game]: points };
      try { window.localStorage.setItem("cartaya-kitchen-games-v2", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const finish = useCallback((success = false) => {
    setWon(success); setPlaying(false); setOver(true);
  }, []);

  const reset = useCallback((game: Game) => {
    setActive(game); setPlaying(false); setOver(false); setWon(false); setScore(0); setLives(3); setTime(SECONDS);
    setRunnerX(105); setRunnerObject(randomRunnerObject()); setDishProgress(0); runnerHandledRef.current = false; jumpingRef.current = false; setJumping(false);
    platformXRef.current = 7; platformYRef.current = 0; platformVelocityRef.current = 0; platformDirectionRef.current = 0; groundedRef.current = true; setPlatformX(7); setPlatformY(0); setCollected([false, false, false]);
    setWaiterLane(1); setWaiterRow(3); setCarrying(false); setTargetTable(Math.floor(Math.random() * 3)); setPlateLane(Math.floor(Math.random() * 3)); setSpills(randomSpills()); setDeliveryMessage("Ve a la cocina por el pedido");
  }, []);

  const close = useCallback(() => {
    if (jumpTimerRef.current) window.clearTimeout(jumpTimerRef.current);
    platformDirectionRef.current = 0; setActive(null);
  }, []);

  useEffect(() => {
    if (!active || !playing || over) return;
    const id = window.setInterval(() => setTime((value) => {
      if (value <= 1) { finish(active === "runner" ? dishProgress >= 6 : active === "delivery" ? score >= 75 : false); return 0; }
      return value - 1;
    }), 1_000);
    return () => window.clearInterval(id);
  }, [active, dishProgress, finish, over, playing, score]);

  const jump = useCallback(() => {
    if (active !== "runner" || !playing || jumpingRef.current) return;
    jumpingRef.current = true; setJumping(true);
    if (jumpTimerRef.current) window.clearTimeout(jumpTimerRef.current);
    jumpTimerRef.current = window.setTimeout(() => { jumpingRef.current = false; setJumping(false); }, 620);
  }, [active, playing]);

  useEffect(() => {
    if (active !== "runner" || !playing || over) return;
    const id = window.setInterval(() => setRunnerX((current) => {
      const next = current - Math.min(4.5, 1.7 + score * 0.015);
      if (next < 28 && next > 12 && !runnerHandledRef.current) {
        runnerHandledRef.current = true;
        if (runnerObject.kind === "ingredient" && !jumpingRef.current) {
          const progress = dishProgress + 1, points = score + 15;
          setDishProgress(progress); setScore(points); saveBest("runner", points);
          if (progress >= 6) finish(true);
        } else if (runnerObject.kind === "hazard" && !jumpingRef.current) {
          if (lives > 1) setLives(lives - 1); else finish(false);
        }
      }
      if (next <= -12) { runnerHandledRef.current = false; setRunnerObject(randomRunnerObject()); return 105; }
      return next;
    }), 40);
    return () => window.clearInterval(id);
  }, [active, dishProgress, finish, lives, over, playing, runnerObject.kind, saveBest, score]);

  const platformJump = useCallback(() => {
    if (active !== "platform" || !playing || !groundedRef.current) return;
    groundedRef.current = false; platformVelocityRef.current = 3.7;
  }, [active, playing]);

  useEffect(() => {
    if (active !== "platform" || !playing || over) return;
    const id = window.setInterval(() => {
      const oldY = platformYRef.current;
      platformXRef.current = Math.max(2, Math.min(94, platformXRef.current + platformDirectionRef.current * 1.4));
      platformVelocityRef.current -= 0.22;
      let nextY = oldY + platformVelocityRef.current;
      let landing = 0;
      if (platformVelocityRef.current <= 0) {
        for (const counter of platformCounters) {
          const withinX = platformXRef.current + 3 > counter.x && platformXRef.current < counter.x + counter.width;
          if (withinX && oldY >= counter.y && nextY <= counter.y) landing = Math.max(landing, counter.y);
        }
      }
      if (nextY <= landing) { nextY = landing; platformVelocityRef.current = 0; groundedRef.current = true; }
      platformYRef.current = nextY; setPlatformX(platformXRef.current); setPlatformY(nextY);
      const nextCollected = collected.map((value, index) => value || (Math.abs(platformXRef.current - platformIngredients[index].x) < 7 && Math.abs(nextY - platformIngredients[index].y) < 9));
      if (nextCollected.some((value, index) => value !== collected[index])) {
        const points = nextCollected.filter(Boolean).length * 25;
        setCollected(nextCollected); setScore(points); saveBest("platform", points);
      }
      if (nextCollected.every(Boolean) && platformXRef.current > 88 && nextY < 8) {
        setScore(100); saveBest("platform", 100); finish(true);
      }
    }, 32);
    return () => window.clearInterval(id);
  }, [active, collected, finish, over, playing, saveBest]);

  const moveDelivery = useCallback((laneDelta: number, rowDelta: number) => {
    if (active !== "delivery" || !playing || over) return;
    const lane = Math.max(0, Math.min(2, waiterLane + laneDelta));
    const row = Math.max(0, Math.min(4, waiterRow + rowDelta));
    if (spills.has(`${row}-${lane}`)) {
      setDeliveryMessage("Derrame: vuelve a intentarlo desde el pasillo");
      if (lives > 1) { setLives(lives - 1); setWaiterLane(1); setWaiterRow(3); }
      else finish(false);
      return;
    }
    setWaiterLane(lane); setWaiterRow(row);
    if (row === 4 && lane === plateLane && !carrying) { setCarrying(true); setDeliveryMessage(`Pedido recogido: llévalo a la mesa ${targetTable + 1}`); }
    if (row === 0 && carrying) {
      if (lane === targetTable) {
        const points = score + 25; setScore(points); saveBest("delivery", points);
        setCarrying(false); setWaiterRow(3); setWaiterLane(1); setTargetTable(Math.floor(Math.random() * 3)); setPlateLane(Math.floor(Math.random() * 3)); setSpills(randomSpills()); setDeliveryMessage("Entrega correcta. Busca el siguiente pedido");
        if (points >= 75) finish(true);
      } else setDeliveryMessage(`Esa no es la mesa. El pedido va a la mesa ${targetTable + 1}`);
    }
  }, [active, carrying, finish, lives, over, plateLane, playing, saveBest, score, spills, targetTable, waiterLane, waiterRow]);

  useEffect(() => {
    if (!active) return;
    const down = (event: KeyboardEvent) => {
      if (active === "runner" && ["Space", "ArrowUp"].includes(event.code)) { event.preventDefault(); jump(); }
      if (active === "platform") {
        if (event.code === "ArrowLeft") platformDirectionRef.current = -1;
        if (event.code === "ArrowRight") platformDirectionRef.current = 1;
        if (["Space", "ArrowUp"].includes(event.code)) { event.preventDefault(); platformJump(); }
      }
      if (active === "delivery") {
        const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
        if (moves[event.code]) { event.preventDefault(); moveDelivery(...moves[event.code]); }
      }
    };
    const up = (event: KeyboardEvent) => { if (active === "platform" && ["ArrowLeft", "ArrowRight"].includes(event.code)) platformDirectionRef.current = 0; };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [active, jump, moveDelivery, platformJump]);

  useEffect(() => () => { if (jumpTimerRef.current) window.clearTimeout(jumpTimerRef.current); }, []);

  const meta = gameMeta.find((game) => game.id === active);
  const ActiveIcon = meta?.icon ?? Gamepad2;
  const record = active ? Math.max(best[active], score) : 0;
  const RunnerIcon = runnerObject.kind === "hazard" ? CookingPot : ingredientIcons[runnerObject.ingredient];

  return <section className="mx-auto mt-4 max-w-7xl px-4 pb-10 sm:px-8">
    <div className="overflow-hidden rounded-[2rem] bg-brand-navy p-5 text-white shadow-xl sm:p-8">
      <div className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-2xl bg-white/10"><Gamepad2 /></span><div><p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: primaryColor }}>Mientras esperas</p><h2 className="text-2xl font-black">Juegos de restaurante</h2></div></div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">{gameMeta.map((game) => { const Icon = game.icon; return <button key={game.id} type="button" onClick={() => reset(game.id)} style={{ backgroundImage: "url('/game-assets/chef-arcade-worlds.png')", backgroundSize: "300% 100%", backgroundPosition: game.position }} className="group relative min-h-64 overflow-hidden rounded-3xl p-5 text-left shadow-lg transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50"><span className={`absolute inset-0 bg-gradient-to-t ${game.overlay}`} /><span className="relative flex size-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur"><Icon /></span><div className="absolute inset-x-5 bottom-5"><strong className="block text-xl">{game.title}</strong><span className="mt-1 block text-sm text-white/80">{game.subtitle}</span><span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-black backdrop-blur"><Play className="size-3.5" />Jugar</span></div></button>; })}</div>
    </div>

    {active ? <div className="fixed inset-0 z-[80] flex items-end bg-slate-950/80 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5" role="dialog" aria-modal="true" aria-label={meta?.title}><div className="w-full overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:max-w-3xl sm:rounded-[2rem]">
      <header className="flex items-center justify-between bg-brand-navy px-4 py-4 text-white sm:px-5"><div className="flex min-w-0 items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10"><ActiveIcon className="size-5" /></span><div className="min-w-0"><p className="truncate text-xs font-bold uppercase text-white/60">Puntos {score} · Récord {record}</p><h3 className="truncate text-lg font-black sm:text-xl">{meta?.title}</h3></div></div><div className="flex items-center gap-2"><span className="hidden items-center gap-1 rounded-full bg-red-500/20 px-2 py-1.5 sm:flex">{Array.from({ length: lives }, (_, index) => <Heart key={index} className="size-3.5 fill-red-400 text-red-400" />)}</span><span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1.5 text-sm font-black"><Timer className="size-4" />{time}s</span><button type="button" onClick={close} className="rounded-full bg-white/10 p-2" aria-label="Cerrar juego"><X /></button></div></header>
      <div className="relative h-[470px] overflow-hidden bg-slate-100 p-3 touch-manipulation select-none sm:h-[520px] sm:p-5">
        {active === "runner" ? <div style={{ backgroundImage: "linear-gradient(rgba(4,18,36,.08),rgba(4,18,36,.2)),url('/game-assets/chef-arcade-worlds.png')", backgroundSize: "300% 100%", backgroundPosition: "left center" }} className="relative h-full overflow-hidden rounded-2xl bg-slate-800"><div className="absolute left-4 top-4 rounded-2xl bg-slate-950/75 px-4 py-3 text-white backdrop-blur"><p className="text-xs font-bold text-white/60">PLATO EN PREPARACIÓN</p><div className="mt-2 flex gap-1.5">{Array.from({ length: 6 }, (_, index) => <span key={index} className={`size-3 rounded-full ${index < dishProgress ? "bg-emerald-400" : "bg-white/25"}`} />)}</div></div><div className="absolute inset-x-0 bottom-16 h-2 bg-orange-400/80" /><div className={`absolute bottom-[4.5rem] left-[16%] flex size-16 items-center justify-center rounded-2xl border-2 border-white/80 bg-white/90 text-brand-navy shadow-2xl transition-transform duration-300 ${jumping ? "-translate-y-32 rotate-6" : "translate-y-0"}`}><ChefHat className="size-10" /></div><div className={`absolute bottom-[4.5rem] flex size-14 items-center justify-center rounded-2xl border-2 shadow-2xl ${runnerObject.kind === "hazard" ? "border-red-200 bg-red-600 text-white" : "border-emerald-200 bg-white text-emerald-700"}`} style={{ left: `${runnerX}%` }}><RunnerIcon className="size-8" /></div><button type="button" onPointerDown={jump} className="absolute inset-0" aria-label="Saltar" /><button type="button" onClick={jump} className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-brand-orange px-10 py-3 font-black text-white shadow-xl">Saltar</button></div> : null}

        {active === "platform" ? <div style={{ backgroundImage: "linear-gradient(rgba(4,18,36,.12),rgba(4,18,36,.18)),url('/game-assets/chef-arcade-worlds.png')", backgroundSize: "300% 100%", backgroundPosition: "center center" }} className="relative h-full overflow-hidden rounded-2xl bg-slate-900">{platformCounters.map((counter) => <span key={counter.x} className="absolute h-3 rounded-full bg-orange-300 shadow-lg" style={{ left: `${counter.x}%`, width: `${counter.width}%`, bottom: `${counter.y + 15}%` }} />)}{platformIngredients.map((item, index) => { const Icon = ingredientIcons[item.type]; return !collected[index] ? <span key={item.x} className="absolute flex size-11 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-white shadow-xl" style={{ left: `${item.x}%`, bottom: `${item.y + 17}%` }}><Icon className="size-6" /></span> : null; })}<span className="absolute bottom-[15%] right-[3%] flex size-16 items-center justify-center rounded-2xl border-2 border-orange-200 bg-orange-600 text-white shadow-2xl"><Soup className="size-9" /></span><span className="absolute flex size-14 items-center justify-center rounded-2xl border-2 border-white bg-white/95 text-brand-navy shadow-2xl" style={{ left: `${platformX}%`, bottom: `${platformY + 15}%` }}><ChefHat className="size-8" /></span><div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2"><button type="button" onPointerDown={() => { platformDirectionRef.current = -1; }} onPointerUp={() => { platformDirectionRef.current = 0; }} onPointerCancel={() => { platformDirectionRef.current = 0; }} className="flex size-12 items-center justify-center rounded-2xl bg-white text-brand-navy shadow-xl" aria-label="Mover a la izquierda"><ArrowLeft /></button><button type="button" onClick={platformJump} className="flex h-12 items-center gap-2 rounded-2xl bg-brand-orange px-5 font-black text-white shadow-xl"><ArrowUp />Saltar</button><button type="button" onPointerDown={() => { platformDirectionRef.current = 1; }} onPointerUp={() => { platformDirectionRef.current = 0; }} onPointerCancel={() => { platformDirectionRef.current = 0; }} className="flex size-12 items-center justify-center rounded-2xl bg-white text-brand-navy shadow-xl" aria-label="Mover a la derecha"><ArrowRight /></button></div></div> : null}

        {active === "delivery" ? <div style={{ backgroundImage: "linear-gradient(rgba(4,18,36,.08),rgba(4,18,36,.08)),url('/game-assets/chef-arcade-worlds.png')", backgroundSize: "300% 100%", backgroundPosition: "right center" }} className="relative mx-auto h-full max-w-xl overflow-hidden rounded-2xl bg-slate-900"><div className="absolute inset-x-3 top-3 rounded-xl bg-slate-950/75 px-3 py-2 text-center text-sm font-bold text-white backdrop-blur">{deliveryMessage}</div><div className="absolute inset-x-[9%] bottom-[12%] top-[17%] grid grid-cols-3 grid-rows-5 gap-1">{Array.from({ length: 15 }, (_, index) => { const row = Math.floor(index / 3), lane = index % 3, hasWaiter = row === waiterRow && lane === waiterLane, hasPlate = row === 4 && lane === plateLane && !carrying, hasSpill = spills.has(`${row}-${lane}`), isTable = row === 0; return <span key={index} className={`relative flex items-center justify-center rounded-xl border ${isTable && lane === targetTable ? "border-emerald-300 bg-emerald-400/25" : "border-white/10"}`}>{isTable ? <span className="absolute top-0 text-[10px] font-black text-white">Mesa {lane + 1}</span> : null}{hasSpill ? <span className="size-8 rounded-full border-2 border-sky-200 bg-sky-500/70 shadow" /> : null}{hasPlate ? <span className="flex size-10 items-center justify-center rounded-full bg-white text-brand-orange shadow-xl"><CircleDot /></span> : null}{hasWaiter ? <span className="z-10 flex size-12 items-center justify-center rounded-2xl border-2 border-white bg-brand-navy text-white shadow-2xl">{carrying ? <PackageCheck /> : <ChefHat />}</span> : null}</span>; })}</div><div className="absolute bottom-2 left-1/2 grid -translate-x-1/2 grid-cols-3 gap-1"><span /><button type="button" onClick={() => moveDelivery(0, -1)} className="flex size-10 items-center justify-center rounded-xl bg-white shadow" aria-label="Avanzar"><ArrowUp /></button><span /><button type="button" onClick={() => moveDelivery(-1, 0)} className="flex size-10 items-center justify-center rounded-xl bg-white shadow" aria-label="Ir a la izquierda"><ArrowLeft /></button><button type="button" onClick={() => moveDelivery(0, 1)} className="flex size-10 items-center justify-center rounded-xl bg-white shadow" aria-label="Retroceder"><ArrowDown /></button><button type="button" onClick={() => moveDelivery(1, 0)} className="flex size-10 items-center justify-center rounded-xl bg-white shadow" aria-label="Ir a la derecha"><ArrowRight /></button></div></div> : null}

        {!playing && !over ? <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-brand-navy/95 px-8 text-center text-white backdrop-blur-sm"><span className="flex size-20 items-center justify-center rounded-3xl bg-white/10"><ActiveIcon className="size-10 text-brand-orange" /></span><h4 className="mt-5 text-2xl font-black">{meta?.title}</h4><p className="mt-3 max-w-md text-sm leading-relaxed text-white/75">{meta?.goal}</p><button type="button" onClick={() => setPlaying(true)} className="mt-7 flex min-h-12 items-center gap-2 rounded-2xl bg-brand-orange px-8 py-3 font-black shadow-xl"><Play className="size-5 fill-current" />Comenzar</button></div> : null}
        {over ? <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/95 px-6 text-center backdrop-blur-sm"><span className={`flex size-20 items-center justify-center rounded-3xl ${won ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>{won ? <Check className="size-11" /> : <Trophy className="size-11" />}</span><p className="mt-5 text-sm font-black uppercase tracking-wider text-slate-500">{won ? "Misión cumplida" : "Fin de la partida"}</p><p className="mt-1 text-4xl font-black text-brand-navy">{score} puntos</p><div className="mt-6 flex gap-3"><button type="button" onClick={close} className="rounded-xl border px-5 py-3 font-bold text-slate-600">Cerrar</button><button type="button" onClick={() => reset(active)} className="flex items-center gap-2 rounded-xl px-5 py-3 font-black text-white" style={{ backgroundColor: primaryColor }}><RotateCcw className="size-4" />Otra partida</button></div></div> : null}
      </div>
    </div></div> : null}
  </section>;
}
