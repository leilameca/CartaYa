"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { Apple, Carrot, ChefHat, Cherry, CircleDot, CookingPot, Fish, Gamepad2, PackageCheck, Plane, Play, RotateCcw, Sparkles, Timer, Trophy, X } from "lucide-react";

type Game = "runner" | "match" | "delivery";
type Ingredient = 0 | 1 | 2 | 3 | 4;
type Scores = Record<Game, number>;

const SIZE = 6;
const SECONDS = 30;
const ingredientTypes: Array<{ icon: ComponentType<{ className?: string }>; style: string; name: string }> = [
  { icon: Carrot, style: "bg-orange-100 text-orange-600", name: "zanahoria" },
  { icon: Apple, style: "bg-red-100 text-red-600", name: "manzana" },
  { icon: Fish, style: "bg-sky-100 text-sky-600", name: "pescado" },
  { icon: Cherry, style: "bg-pink-100 text-pink-600", name: "cereza" },
  { icon: CircleDot, style: "bg-amber-100 text-amber-700", name: "plato" },
];
const games: Array<{ id: Game; title: string; subtitle: string; icon: ComponentType<{ className?: string }>; gradient: string }> = [
  { id: "runner", title: "Chef al Rescate", subtitle: "Corre, salta utensilios y mantén la cocina en marcha", icon: ChefHat, gradient: "from-orange-600 via-orange-500 to-amber-400" },
  { id: "match", title: "Sazón al Tres", subtitle: "Une tres ingredientes iguales y crea combos", icon: Sparkles, gradient: "from-emerald-700 via-emerald-600 to-lime-500" },
  { id: "delivery", title: "Pedido Volador", subtitle: "Lleva el pedido caliente entre puertas y obstáculos", icon: Plane, gradient: "from-blue-800 via-blue-700 to-cyan-500" },
];

function newBoard(): Ingredient[] {
  return Array.from({ length: SIZE * SIZE }, (_, i) => ((Math.floor(i / SIZE) * 2 + (i % SIZE) + Math.floor((i % SIZE) / 2)) % 5) as Ingredient);
}

function findMatches(board: Ingredient[]) {
  const found = new Set<number>();
  for (let row = 0; row < SIZE; row += 1) {
    let start = 0;
    for (let column = 1; column <= SIZE; column += 1) {
      if (column < SIZE && board[row * SIZE + column] === board[row * SIZE + start]) continue;
      if (column - start >= 3) for (let n = start; n < column; n += 1) found.add(row * SIZE + n);
      start = column;
    }
  }
  for (let column = 0; column < SIZE; column += 1) {
    let start = 0;
    for (let row = 1; row <= SIZE; row += 1) {
      if (row < SIZE && board[row * SIZE + column] === board[start * SIZE + column]) continue;
      if (row - start >= 3) for (let n = start; n < row; n += 1) found.add(n * SIZE + column);
      start = row;
    }
  }
  return found;
}

function collapse(board: Ingredient[], matches: Set<number>) {
  const next = [...board];
  for (let column = 0; column < SIZE; column += 1) {
    const kept: Ingredient[] = [];
    for (let row = SIZE - 1; row >= 0; row -= 1) if (!matches.has(row * SIZE + column)) kept.push(board[row * SIZE + column]);
    for (let row = SIZE - 1, offset = 0; row >= 0; row -= 1, offset += 1) next[row * SIZE + column] = kept[offset] ?? (Math.floor(Math.random() * 5) as Ingredient);
  }
  return next;
}

function resolveBoard(board: Ingredient[]) {
  let next = [...board];
  let removed = 0;
  for (let combo = 0; combo < 8; combo += 1) {
    const matches = findMatches(next);
    if (!matches.size) break;
    removed += matches.size * (combo + 1);
    next = collapse(next, matches);
  }
  return { board: next, removed };
}

export function KitchenMiniGames({ primaryColor }: { primaryColor: string }) {
  const [active, setActive] = useState<Game | null>(null);
  const [over, setOver] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<Scores>(() => {
    if (typeof window === "undefined") return { runner: 0, match: 0, delivery: 0 };
    try {
      const saved = window.localStorage.getItem("cartaya-mini-game-scores");
      return saved ? { runner: 0, match: 0, delivery: 0, ...JSON.parse(saved) } : { runner: 0, match: 0, delivery: 0 };
    } catch {
      return { runner: 0, match: 0, delivery: 0 };
    }
  });
  const [time, setTime] = useState(SECONDS);
  const [obstacleX, setObstacleX] = useState(105);
  const [jumping, setJumping] = useState(false);
  const jumpingRef = useRef(false);
  const jumpTimer = useRef<number | null>(null);
  const [board, setBoard] = useState<Ingredient[]>(newBoard);
  const [selected, setSelected] = useState<number | null>(null);
  const [matchHint, setMatchHint] = useState("Selecciona dos ingredientes vecinos");
  const [deliveryY, setDeliveryY] = useState(45);
  const deliveryYRef = useRef(45);
  const velocityRef = useRef(0);
  const [doorX, setDoorX] = useState(105);
  const doorXRef = useRef(105);
  const [doorGap, setDoorGap] = useState(48);
  const doorGapRef = useRef(48);

  const saveBest = useCallback((game: Game, points: number) => {
    setBest((current) => {
      if (points <= current[game]) return current;
      const next = { ...current, [game]: points };
      try { window.localStorage.setItem("cartaya-mini-game-scores", JSON.stringify(next)); } catch { /* Keep playing without persistence. */ }
      return next;
    });
  }, []);

  const start = useCallback((game: Game) => {
    setActive(game); setOver(false); setScore(0); setTime(SECONDS); setObstacleX(105);
    jumpingRef.current = false; setJumping(false); setBoard(resolveBoard(newBoard()).board);
    setSelected(null); setMatchHint("Selecciona dos ingredientes vecinos");
    deliveryYRef.current = 45; velocityRef.current = 0; doorXRef.current = 105; doorGapRef.current = 48;
    setDeliveryY(45); setDoorX(105); setDoorGap(48);
  }, []);

  const close = useCallback(() => {
    if (jumpTimer.current) window.clearTimeout(jumpTimer.current);
    jumpingRef.current = false; setActive(null);
  }, []);

  const jump = useCallback(() => {
    if (active !== "runner" || over || jumpingRef.current) return;
    jumpingRef.current = true; setJumping(true);
    if (jumpTimer.current) window.clearTimeout(jumpTimer.current);
    jumpTimer.current = window.setTimeout(() => { jumpingRef.current = false; setJumping(false); }, 600);
  }, [active, over]);

  const flap = useCallback(() => {
    if (active === "delivery" && !over) velocityRef.current = -3.25;
  }, [active, over]);

  useEffect(() => {
    if (!active || over) return;
    const id = window.setInterval(() => setTime((value) => {
      if (value <= 1) { setOver(true); return 0; }
      return value - 1;
    }), 1_000);
    return () => window.clearInterval(id);
  }, [active, over]);

  useEffect(() => {
    if (active !== "runner" || over) return;
    const id = window.setInterval(() => setObstacleX((value) => {
      const next = value - Math.min(4.8, 1.9 + score * 0.09);
      if (next >= 13 && next <= 27 && !jumpingRef.current) { setOver(true); return next; }
      if (next <= -12) { const points = score + 1; setScore(points); saveBest("runner", points); return 105; }
      return next;
    }), 40);
    return () => window.clearInterval(id);
  }, [active, over, saveBest, score]);

  useEffect(() => {
    if (active !== "delivery" || over) return;
    const id = window.setInterval(() => {
      velocityRef.current += 0.24;
      deliveryYRef.current += velocityRef.current;
      doorXRef.current -= Math.min(3.2, 1.35 + score * 0.04);
      if (doorXRef.current < -15) {
        const points = score + 1;
        doorXRef.current = 108; doorGapRef.current = 28 + Math.random() * 44; setScore(points); saveBest("delivery", points);
      }
      const y = deliveryYRef.current, x = doorXRef.current;
      if (y < 4 || y > 88 || (x > 14 && x < 29 && (y < doorGapRef.current - 15 || y > doorGapRef.current + 15))) setOver(true);
      setDeliveryY(y); setDoorX(x); setDoorGap(doorGapRef.current);
    }, 40);
    return () => window.clearInterval(id);
  }, [active, over, saveBest, score]);

  useEffect(() => {
    if (!active) return;
    const key = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.code !== "ArrowUp") return;
      event.preventDefault();
      if (active === "runner") jump();
      if (active === "delivery") flap();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [active, flap, jump]);

  useEffect(() => () => { if (jumpTimer.current) window.clearTimeout(jumpTimer.current); }, []);

  function chooseTile(index: number) {
    if (over) return;
    if (selected === null) { setSelected(index); setMatchHint("Ahora elige un ingrediente vecino"); return; }
    if (selected === index) { setSelected(null); setMatchHint("Selección cancelada"); return; }
    const adjacent = Math.abs(Math.floor(selected / SIZE) - Math.floor(index / SIZE)) + Math.abs((selected % SIZE) - (index % SIZE)) === 1;
    if (!adjacent) { setSelected(index); setMatchHint("Deben estar uno al lado del otro"); return; }
    const swapped = [...board];
    [swapped[selected], swapped[index]] = [swapped[index], swapped[selected]];
    const result = resolveBoard(swapped);
    setSelected(null);
    if (!result.removed) { setMatchHint("Ese cambio no forma una línea de tres"); return; }
    const points = score + result.removed * 10;
    setBoard(result.board); setScore(points); saveBest("match", points);
    setMatchHint(result.removed > 5 ? `Combo de ${result.removed} ingredientes` : "Combinación servida");
  }

  const meta = games.find((game) => game.id === active);
  const ActiveIcon = meta?.icon ?? Gamepad2;
  const record = active ? Math.max(best[active], score) : 0;

  return (
    <section className="mx-auto mt-4 max-w-7xl px-4 pb-10 sm:px-8">
      <div className="relative overflow-hidden rounded-[2rem] bg-brand-navy p-5 text-white shadow-xl sm:p-8">
        <div className="absolute -right-16 -top-20 size-64 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-2xl bg-white/10"><Gamepad2 /></span><div><p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: primaryColor }}>Mientras esperas</p><h2 className="text-2xl font-black">Arcade de cocina</h2></div></div>
        <div className="relative mt-6 grid gap-3 md:grid-cols-3">
          {games.map((game) => { const Icon = game.icon; return <button key={game.id} type="button" onClick={() => start(game.id)} className={`group rounded-2xl bg-gradient-to-br ${game.gradient} p-5 text-left shadow-lg transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50 active:scale-[0.98]`}><span className="flex size-11 items-center justify-center rounded-xl bg-white/20"><Icon /></span><strong className="mt-8 block text-xl">{game.title}</strong><span className="mt-1 block min-h-10 text-sm text-white/85">{game.subtitle}</span><span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-black"><Play className="size-3.5" />Jugar ahora</span></button>; })}
        </div>
      </div>

      {active ? <div className="fixed inset-0 z-[80] flex items-end bg-slate-950/75 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5" role="dialog" aria-modal="true" aria-label={meta?.title}>
        <div className="w-full overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:max-w-2xl sm:rounded-[2rem]">
          <header className="flex items-center justify-between bg-brand-navy px-4 py-4 text-white sm:px-5"><div className="flex min-w-0 items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10"><ActiveIcon className="size-5" /></span><div className="min-w-0"><p className="truncate text-xs font-bold uppercase text-white/60">Puntos {score} · Récord {record}</p><h3 className="truncate text-lg font-black sm:text-xl">{meta?.title}</h3></div></div><div className="flex items-center gap-2"><span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1.5 text-sm font-black"><Timer className="size-4" />{time}s</span><button type="button" onClick={close} className="rounded-full bg-white/10 p-2 hover:bg-white/20" aria-label="Cerrar juego"><X /></button></div></header>
          <div className="relative h-[430px] overflow-hidden bg-gradient-to-b from-sky-100 to-amber-50 p-3 touch-manipulation select-none sm:h-[480px] sm:p-5">
            {active === "runner" ? <div className="relative h-full overflow-hidden rounded-2xl border border-sky-200 bg-sky-100"><span className="absolute left-[12%] top-20 h-5 w-16 rounded-full bg-white/80" /><span className="absolute right-[16%] top-28 h-5 w-20 rounded-full bg-white/70" /><div className="absolute inset-x-0 bottom-0 h-24 bg-amber-100" /><div className="absolute inset-x-0 bottom-20 h-3 bg-brand-navy" /><div className={`absolute bottom-[5.4rem] left-[16%] flex size-14 items-center justify-center rounded-2xl bg-white text-brand-navy shadow-xl transition-transform duration-300 sm:size-16 ${jumping ? "-translate-y-32 rotate-6" : "translate-y-0"}`}><ChefHat className="size-9" /></div><div className="absolute bottom-[5.4rem] flex size-14 items-center justify-center rounded-2xl bg-red-500 text-white shadow-xl" style={{ left: `${obstacleX}%` }}><CookingPot className="size-8" /></div><div className="absolute inset-x-0 top-5 px-4 text-center"><p className="font-black text-brand-navy">Salta antes de tocar los utensilios</p><p className="text-sm text-slate-600">Toca la pista o usa Espacio / Flecha arriba</p></div><button type="button" onPointerDown={jump} className="absolute inset-0" aria-label="Saltar obstáculo" /><button type="button" onClick={jump} className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-brand-navy px-7 py-3 text-sm font-black text-white shadow-lg">Saltar</button></div> : null}
            {active === "match" ? <div className="mx-auto flex h-full max-w-md flex-col justify-center"><div className="mb-3 rounded-xl bg-white/80 px-4 py-2 text-center text-sm font-bold text-brand-navy shadow-sm">{matchHint}</div><div className="grid grid-cols-6 gap-1.5 rounded-2xl bg-brand-navy/10 p-2.5 shadow-inner sm:gap-2 sm:p-3">{board.map((ingredient, index) => { const item = ingredientTypes[ingredient], Icon = item.icon; return <button key={index} type="button" onClick={() => chooseTile(index)} aria-label={`${selected === index ? "Seleccionado: " : ""}${item.name}`} className={`aspect-square rounded-xl border-2 transition active:scale-90 ${item.style} ${selected === index ? "scale-105 border-brand-navy shadow-lg ring-2 ring-white" : "border-white/60 shadow-sm"}`}><Icon className="mx-auto size-6 sm:size-8" /></button>; })}</div><p className="mt-3 text-center text-xs font-semibold text-slate-500">Intercambia dos casillas vecinas para formar líneas de tres o más.</p></div> : null}
            {active === "delivery" ? <div className="relative h-full overflow-hidden rounded-2xl border border-blue-200 bg-[linear-gradient(#dff3ff_0_72%,#eed1a3_72%)]"><div className="absolute left-[18%] flex size-14 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-xl" style={{ top: `${deliveryY}%`, transform: "translateY(-50%) rotate(-4deg)" }}><PackageCheck className="size-8" /></div><div className="absolute inset-y-0 w-16 sm:w-20" style={{ left: `${doorX}%` }}><div className="absolute inset-x-0 top-0 rounded-b-xl bg-brand-navy shadow-xl" style={{ height: `${Math.max(0, doorGap - 15)}%` }} /><div className="absolute inset-x-0 bottom-0 rounded-t-xl bg-brand-navy shadow-xl" style={{ height: `${Math.max(0, 100 - doorGap - 15)}%` }} /><div className="absolute left-1/2 size-4 -translate-x-1/2 rounded-full bg-brand-orange" style={{ top: `${doorGap}%`, transform: "translate(-50%, -50%)" }} /></div><div className="absolute inset-x-0 top-5 px-4 text-center"><p className="font-black text-brand-navy">Mantén el pedido en el aire</p><p className="text-sm text-slate-600">Cada toque lo impulsa hacia arriba</p></div><button type="button" onPointerDown={flap} className="absolute inset-0" aria-label="Impulsar pedido hacia arriba" /><div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/85 px-5 py-2 text-sm font-black text-brand-navy shadow">Toca para volar</div></div> : null}
            {over ? <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/95 px-6 text-center backdrop-blur-sm"><span className="flex size-20 items-center justify-center rounded-3xl bg-amber-100 text-amber-600"><Trophy className="size-11" /></span><p className="mt-5 text-sm font-black uppercase tracking-wider text-slate-500">Partida terminada</p><p className="mt-1 text-4xl font-black text-brand-navy">{score} puntos</p><p className="mt-1 text-sm font-bold text-slate-500">Tu récord: {record}</p><div className="mt-6 flex gap-3"><button type="button" onClick={close} className="rounded-xl border px-5 py-3 font-bold text-slate-600">Cerrar</button><button type="button" onClick={() => start(active)} className="flex items-center gap-2 rounded-xl px-5 py-3 font-black text-white" style={{ backgroundColor: primaryColor }}><RotateCcw className="size-4" />Jugar otra vez</button></div></div> : null}
          </div>
        </div>
      </div> : null}
    </section>
  );
}
