"use client";

import { useCallback, useState, type ComponentType } from "react";
import { ChefHat, Check, Footprints, Gamepad2, Heart, PackageCheck, Play, RotateCcw, Timer, Trophy, X } from "lucide-react";
import { CanvasKitchenGame, type GameResult, type GameSnapshot, type KitchenGameId } from "@/components/public-menu/canvas-kitchen-game";

type Phase = "ready" | "playing" | "finished";
type Scores = Record<KitchenGameId, number>;

const games: Array<{ id: KitchenGameId; title: string; subtitle: string; goal: string; controls: string; icon: ComponentType<{ className?: string }>; position: string; overlay: string }> = [
  { id: "runner", title: "Chef a Toda Marcha", subtitle: "Un corredor de precisión dentro de la cocina", goal: "Reúne ocho ingredientes antes de que termine el turno. Salta las ollas, calcula los ingredientes elevados y conserva tus tres oportunidades.", controls: "Un toque para saltar. En computadora también funciona Espacio o Flecha arriba.", icon: ChefHat, position: "left center", overlay: "from-orange-950/95 via-orange-900/55 to-transparent" },
  { id: "platform", title: "Misión: Mise en Place", subtitle: "Plataformas, exploración y una estación por completar", goal: "Recorre la cocina, recoge los tres ingredientes y llega a la estación naranja. Los derrames te devuelven al inicio.", controls: "Mantén izquierda o derecha para moverte y pulsa Saltar. También admite teclado.", icon: Footprints, position: "center center", overlay: "from-emerald-950/95 via-emerald-900/55 to-transparent" },
  { id: "delivery", title: "Servicio de Mesa", subtitle: "Una ruta de atención con riesgo y prioridad", goal: "Recoge cada plato en la cocina y entrégalo en la mesa resaltada. Completa tres servicios evitando los derrames.", controls: "Mantén las flechas para caminar libremente en cualquier dirección.", icon: PackageCheck, position: "right center", overlay: "from-blue-950/95 via-blue-950/55 to-transparent" },
];

const emptySnapshot: GameSnapshot = { score: 0, lives: 3, time: 0, objective: "" };

function storedScores(): Scores {
  if (typeof window === "undefined") return { runner: 0, platform: 0, delivery: 0 };
  try { return { runner: 0, platform: 0, delivery: 0, ...JSON.parse(window.localStorage.getItem("cartaya-canvas-games") || "{}") }; }
  catch { return { runner: 0, platform: 0, delivery: 0 }; }
}

export function KitchenMiniGames({ primaryColor }: { primaryColor: string }) {
  const [active, setActive] = useState<KitchenGameId | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [session, setSession] = useState(0);
  const [snapshot, setSnapshot] = useState<GameSnapshot>(emptySnapshot);
  const [result, setResult] = useState<GameResult | null>(null);
  const [best, setBest] = useState<Scores>(storedScores);

  const open = useCallback((game: KitchenGameId) => {
    setActive(game); setPhase("ready"); setSnapshot(emptySnapshot); setResult(null);
  }, []);
  const begin = useCallback(() => { setSession((value) => value + 1); setSnapshot(emptySnapshot); setResult(null); setPhase("playing"); }, []);
  const close = useCallback(() => setActive(null), []);
  const finish = useCallback((gameResult: GameResult) => {
    setResult(gameResult); setSnapshot(gameResult); setPhase("finished");
    if (!active) return;
    setBest((current) => {
      if (gameResult.score <= current[active]) return current;
      const next = { ...current, [active]: gameResult.score };
      try { window.localStorage.setItem("cartaya-canvas-games", JSON.stringify(next)); } catch {}
      return next;
    });
  }, [active]);

  const meta = games.find((game) => game.id === active);
  const ActiveIcon = meta?.icon ?? Gamepad2;
  const shownScore = result?.score ?? snapshot.score;
  const shownLives = result?.lives ?? snapshot.lives;

  return <section className="mx-auto mt-4 max-w-7xl px-4 pb-10 sm:px-8">
    <div className="overflow-hidden rounded-[2rem] bg-brand-navy p-5 text-white shadow-xl sm:p-8">
      <div className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-2xl bg-white/10"><Gamepad2 /></span><div><p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: primaryColor }}>Mientras esperas</p><h2 className="text-2xl font-black">Juegos de restaurante</h2></div></div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">{games.map((game) => { const Icon = game.icon; return <button key={game.id} type="button" onClick={() => open(game.id)} style={{ backgroundImage: "url('/game-assets/chef-arcade-worlds.png')", backgroundSize: "300% 100%", backgroundPosition: game.position }} className="group relative min-h-64 overflow-hidden rounded-3xl p-5 text-left shadow-lg transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50"><span className={`absolute inset-0 bg-gradient-to-t ${game.overlay}`} /><span className="relative flex size-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur"><Icon /></span><div className="absolute inset-x-5 bottom-5"><strong className="block text-xl">{game.title}</strong><span className="mt-1 block text-sm text-white/80">{game.subtitle}</span><span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-black backdrop-blur"><Play className="size-3.5" />Abrir juego</span></div></button>; })}</div>
    </div>

    {active && meta ? <div className="fixed inset-0 z-[80] bg-slate-950/85 backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:p-5" role="dialog" aria-modal="true" aria-label={meta.title}><div className="flex h-[100svh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[94svh] sm:max-w-4xl sm:rounded-[2rem]">
      <header className="flex shrink-0 items-center justify-between bg-brand-navy px-4 py-3 text-white sm:px-5 sm:py-4"><div className="flex min-w-0 items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10"><ActiveIcon className="size-5" /></span><div className="min-w-0"><p className="truncate text-xs font-bold uppercase text-white/55">{phase === "playing" ? snapshot.objective || "Preparando partida" : `Récord ${best[active]} puntos`}</p><h3 className="truncate text-lg font-black sm:text-xl">{meta.title}</h3></div></div><div className="flex items-center gap-2">{phase === "playing" ? <><span className="hidden items-center gap-1 rounded-full bg-red-500/20 px-2 py-1.5 sm:flex">{Array.from({ length: shownLives }, (_, index) => <Heart key={index} className="size-3.5 fill-red-400 text-red-400" />)}</span><span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1.5 text-sm font-black"><Timer className="size-4" />{snapshot.time}s</span></> : null}<button type="button" onClick={close} className="rounded-full bg-white/10 p-2 hover:bg-white/20" aria-label="Cerrar juego"><X /></button></div></header>

      {phase === "ready" ? <div style={{ backgroundImage: `linear-gradient(rgba(3,12,25,.8),rgba(3,12,25,.94)),url('/game-assets/chef-arcade-worlds.png')`, backgroundSize: "300% 100%", backgroundPosition: meta.position }} className="flex min-h-0 flex-1 flex-col items-center justify-center px-7 py-10 text-center text-white sm:min-h-[520px]"><span className="flex size-20 items-center justify-center rounded-3xl bg-white/10"><ActiveIcon className="size-10 text-brand-orange" /></span><h4 className="mt-6 text-2xl font-black sm:text-3xl">Una misión con principio y final</h4><p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">{meta.goal}</p><div className="mt-5 max-w-xl rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-semibold text-white/85">{meta.controls}</div><button type="button" onClick={begin} className="mt-7 flex min-h-14 items-center gap-2 rounded-2xl bg-brand-orange px-9 py-3 font-black shadow-xl"><Play className="size-5 fill-current" />Comenzar partida</button></div> : null}

      {phase === "playing" ? <CanvasKitchenGame game={active} session={session} onUpdate={setSnapshot} onFinish={finish} /> : null}

      {phase === "finished" && result ? <div style={{ backgroundImage: `linear-gradient(rgba(255,255,255,.93),rgba(255,255,255,.98)),url('/game-assets/chef-arcade-worlds.png')`, backgroundSize: "300% 100%", backgroundPosition: meta.position }} className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10 text-center sm:min-h-[520px]"><span className={`flex size-20 items-center justify-center rounded-3xl ${result.won ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>{result.won ? <Check className="size-11" /> : <Trophy className="size-11" />}</span><p className="mt-5 text-sm font-black uppercase tracking-wider text-slate-500">{result.won ? "Misión cumplida" : "Turno terminado"}</p><p className="mt-1 text-4xl font-black text-brand-navy">{shownScore} puntos</p><p className="mt-2 text-sm font-bold text-slate-500">{result.objective} · Récord {Math.max(best[active], shownScore)}</p><div className="mt-7 flex gap-3"><button type="button" onClick={close} className="rounded-xl border bg-white px-5 py-3 font-bold text-slate-600">Cerrar</button><button type="button" onClick={begin} className="flex items-center gap-2 rounded-xl px-5 py-3 font-black text-white" style={{ backgroundColor: primaryColor }}><RotateCcw className="size-4" />Jugar otra vez</button></div></div> : null}
    </div></div> : null}
  </section>;
}
