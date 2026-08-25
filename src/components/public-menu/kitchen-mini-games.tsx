"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bike,
  Carrot,
  ChefHat,
  CookingPot,
  Flame,
  Gamepad2,
  PackageCheck,
  Play,
  RotateCcw,
  Sparkles,
  Timer,
  Trophy,
  X,
} from "lucide-react";

type Game = "runner" | "catch" | "delivery";
type Phase = "playing" | "over";

const games: Array<{
  id: Game;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  gradient: string;
}> = [
  { id: "runner", title: "Chef Saltarín", subtitle: "Salta los obstáculos antes de que lleguen a la cocina", icon: <ChefHat />, gradient: "from-orange-600 to-amber-400" },
  { id: "catch", title: "Mundo Cocina", subtitle: "Recoge ingredientes y evita las zonas calientes", icon: <Sparkles />, gradient: "from-emerald-600 to-lime-500" },
  { id: "delivery", title: "Pedido Exprés", subtitle: "Entrega cada pedido en la mesa indicada", icon: <Bike />, gradient: "from-blue-700 to-cyan-500" },
];

const GAME_SECONDS = 25;

export function KitchenMiniGames({ primaryColor }: { primaryColor: string }) {
  const [active, setActive] = useState<Game | null>(null);
  const [phase, setPhase] = useState<Phase>("playing");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const [target, setTarget] = useState(4);
  const [obstacleX, setObstacleX] = useState(100);
  const [jumping, setJumping] = useState(false);
  const jumpingRef = useRef(false);
  const jumpTimer = useRef<number | null>(null);

  const startGame = useCallback((game: Game) => {
    setActive(game);
    setPhase("playing");
    setScore(0);
    setTimeLeft(GAME_SECONDS);
    setTarget(game === "catch" ? 4 : 1);
    setObstacleX(100);
    jumpingRef.current = false;
    setJumping(false);
  }, []);

  const closeGame = useCallback(() => {
    if (jumpTimer.current) window.clearTimeout(jumpTimer.current);
    jumpingRef.current = false;
    setActive(null);
  }, []);

  const jump = useCallback(() => {
    if (active !== "runner" || phase !== "playing" || jumpingRef.current) return;
    jumpingRef.current = true;
    setJumping(true);
    if (jumpTimer.current) window.clearTimeout(jumpTimer.current);
    jumpTimer.current = window.setTimeout(() => {
      jumpingRef.current = false;
      setJumping(false);
    }, 620);
  }, [active, phase]);

  useEffect(() => {
    if (!active || phase !== "playing") return;
    const timer = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          setPhase("over");
          return 0;
        }
        return current - 1;
      });
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [active, phase]);

  useEffect(() => {
    if (active !== "runner" || phase !== "playing") return;
    const loop = window.setInterval(() => {
      setObstacleX((current) => {
        const next = current - Math.min(4, 1.8 + score * 0.08);
        if (next >= 14 && next <= 27 && !jumpingRef.current) {
          setPhase("over");
          return next;
        }
        if (next <= -10) {
          setScore((value) => value + 1);
          return 100;
        }
        return next;
      });
    }, 40);
    return () => window.clearInterval(loop);
  }, [active, phase, score]);

  useEffect(() => {
    if (active !== "runner") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" || event.code === "ArrowUp") {
        event.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, jump]);

  useEffect(() => () => {
    if (jumpTimer.current) window.clearTimeout(jumpTimer.current);
  }, []);

  function selectIngredient(index: number) {
    if (phase !== "playing") return;
    const hazard = (target + 3) % 9;
    if (index === target) {
      setScore((value) => value + 1);
      setTarget((value) => (value + 5) % 9);
    } else if (index === hazard) {
      setScore((value) => Math.max(0, value - 2));
      setTarget((value) => (value + 2) % 9);
    } else {
      setScore((value) => Math.max(0, value - 1));
    }
  }

  function deliverTo(table: number) {
    if (phase !== "playing") return;
    if (table === target) {
      setScore((value) => value + 1);
      setTarget((value) => (value % 3) + 1);
    } else {
      setScore((value) => Math.max(0, value - 1));
    }
  }

  const activeMeta = games.find((game) => game.id === active);

  return (
    <section className="mx-auto mt-4 max-w-7xl px-4 pb-10 sm:px-8">
      <div className="overflow-hidden rounded-[2rem] bg-brand-navy p-5 text-white shadow-xl sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-white/10"><Gamepad2 /></span>
          <div><p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: primaryColor }}>Mientras esperas</p><h2 className="text-2xl font-black">Minijuegos de cocina</h2></div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {games.map((game) => (
            <button key={game.id} type="button" onClick={() => startGame(game.id)} className={`group rounded-2xl bg-gradient-to-br ${game.gradient} p-5 text-left shadow-lg transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50 active:scale-[0.98]`}>
              <span className="flex size-11 items-center justify-center rounded-xl bg-white/20">{game.icon}</span>
              <strong className="mt-8 block text-xl">{game.title}</strong>
              <span className="mt-1 block min-h-10 text-sm text-white/85">{game.subtitle}</span>
              <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-black"><Play className="size-3.5" />Jugar ahora</span>
            </button>
          ))}
        </div>
      </div>

      {active ? (
        <div className="fixed inset-0 z-[80] flex items-end bg-black/65 p-0 sm:items-center sm:justify-center sm:p-5" role="dialog" aria-modal="true" aria-label={activeMeta?.title}>
          <div className="w-full overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:max-w-2xl sm:rounded-[2rem]">
            <header className="flex items-center justify-between bg-brand-navy px-5 py-4 text-white">
              <div><p className="text-xs font-bold uppercase text-white/60">Puntuación {score}</p><h3 className="text-xl font-black">{activeMeta?.title}</h3></div>
              <div className="flex items-center gap-3"><span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-black"><Timer className="size-4" />{timeLeft}s</span><button type="button" onClick={closeGame} className="rounded-full bg-white/10 p-2 hover:bg-white/20" aria-label="Cerrar juego"><X /></button></div>
            </header>

            <div className="relative h-[390px] overflow-hidden bg-gradient-to-b from-sky-100 to-amber-50 p-5 touch-manipulation select-none sm:h-[430px]">
              {active === "runner" ? (
                <div className="relative h-full overflow-hidden rounded-2xl border border-sky-200 bg-white/45">
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-amber-100" />
                  <div className="absolute inset-x-0 bottom-16 h-2 bg-brand-navy" />
                  <div className={`absolute bottom-[4.5rem] left-[16%] flex size-14 items-center justify-center rounded-2xl bg-white text-brand-navy shadow-lg transition-transform duration-[280ms] sm:size-16 ${jumping ? "-translate-y-28 rotate-6" : "translate-y-0"}`}><ChefHat className="size-8 sm:size-10" /></div>
                  <div className="absolute bottom-[4.5rem] flex size-14 items-center justify-center rounded-2xl bg-red-500 text-white shadow-lg" style={{ left: `${obstacleX}%` }}><CookingPot className="size-8" /></div>
                  <div className="absolute inset-x-0 top-5 text-center"><p className="font-black text-brand-navy">Evita las ollas</p><p className="text-sm text-slate-600">Toca la pista o usa Espacio / Flecha arriba</p></div>
                  <button type="button" onPointerDown={jump} className="absolute inset-0" aria-label="Saltar obstáculo" />
                  <button type="button" onClick={jump} className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-brand-navy px-5 py-2.5 text-sm font-black text-white shadow-lg">Saltar</button>
                </div>
              ) : null}

              {active === "catch" ? (
                <div className="grid h-full grid-cols-3 grid-rows-3 gap-3">
                  {Array.from({ length: 9 }, (_, index) => {
                    const hazard = (target + 3) % 9;
                    const isTarget = index === target;
                    const isHazard = index === hazard;
                    return <button key={index} type="button" onClick={() => selectIngredient(index)} aria-label={isTarget ? "Recoger ingrediente" : isHazard ? "Evitar zona caliente" : "Espacio vacío"} className={`flex items-center justify-center rounded-2xl border-2 transition active:scale-90 ${isTarget ? "border-emerald-500 bg-white text-emerald-600 shadow-xl" : isHazard ? "border-red-300 bg-red-50 text-red-500" : "border-dashed border-sky-200 bg-white/25"}`}>{isTarget ? <Carrot className="size-11 sm:size-14" /> : isHazard ? <Flame className="size-10" /> : null}</button>;
                  })}
                </div>
              ) : null}

              {active === "delivery" ? (
                <div className="flex h-full flex-col justify-between">
                  <div className="flex items-center justify-center gap-4 rounded-2xl bg-white p-4 text-center shadow"><PackageCheck className="size-10 text-brand-green" /><div><p className="text-sm font-bold text-slate-500">Entrega pendiente</p><p className="text-2xl font-black text-brand-navy">Mesa {target}</p></div></div>
                  <div className="grid grid-cols-3 gap-3">{[1, 2, 3].map((table) => <button key={table} type="button" onClick={() => deliverTo(table)} className="rounded-2xl bg-brand-navy px-2 py-8 text-lg font-black text-white shadow-lg transition hover:-translate-y-1 active:scale-95 sm:text-xl">Mesa {table}</button>)}</div>
                  <div className="flex items-center justify-center gap-3 text-brand-navy"><Bike className="size-10" /><span className="h-1 w-24 rounded-full bg-brand-orange" /><PackageCheck className="size-9 text-brand-green" /></div>
                </div>
              ) : null}

              {phase === "over" ? (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/95 px-6 text-center">
                  <span className="flex size-20 items-center justify-center rounded-3xl bg-amber-100 text-amber-600"><Trophy className="size-11" /></span>
                  <p className="mt-5 text-sm font-black uppercase tracking-wider text-slate-500">Partida terminada</p>
                  <p className="mt-1 text-4xl font-black text-brand-navy">{score} puntos</p>
                  <div className="mt-6 flex gap-3"><button type="button" onClick={closeGame} className="rounded-xl border px-5 py-3 font-bold text-slate-600">Cerrar</button><button type="button" onClick={() => startGame(active)} className="flex items-center gap-2 rounded-xl px-5 py-3 font-black text-white" style={{ backgroundColor: primaryColor }}><RotateCcw className="size-4" />Jugar otra vez</button></div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
