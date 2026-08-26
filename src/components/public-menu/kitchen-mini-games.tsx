"use client";

import { useCallback, useState, type ComponentType } from "react";
import { Check, ChefHat, Coffee, Flame, Gamepad2, Play, RotateCcw, Star, Trophy, X } from "lucide-react";
import { CookingRushGame, type CookingGameId, type CookingResult, type CookingSnapshot } from "@/components/public-menu/cooking-rush-game";

type Phase = "ready" | "playing" | "finished";
type Scores = Record<CookingGameId, number>;

const games: Array<{ id: CookingGameId; title: string; subtitle: string; description: string; icon: ComponentType<{ className?: string }>; position: string; overlay: string }> = [
  { id: "taco", title: "Taco Express", subtitle: "Plancha, ingredientes y pedidos bajo presión", description: "Selecciona una comanda, arma cada taco en el orden indicado y aprovecha el tiempo de la plancha para adelantar otros pedidos.", icon: ChefHat, position: "left center", overlay: "from-orange-950/95 via-orange-900/55 to-transparent" },
  { id: "pizza", title: "Pizzería CartaYa", subtitle: "Monta, hornea y sirve sin perder clientes", description: "Prepara pizzas diferentes, controla el horno y cambia de cliente mientras una pizza termina de cocinarse.", icon: Flame, position: "center center", overlay: "from-red-950/95 via-red-900/55 to-transparent" },
  { id: "cafe", title: "Café Rush", subtitle: "Bebidas, postres y varias comandas a la vez", description: "Coordina la cafetera, combina cada bebida con su acompañante y crea cadenas de servicios correctos.", icon: Coffee, position: "right center", overlay: "from-blue-950/95 via-blue-950/55 to-transparent" },
];

const empty: CookingSnapshot = { score: 0, served: 0, combo: 0, time: 80 };

function readBest(): Scores {
  if (typeof window === "undefined") return { taco: 0, pizza: 0, cafe: 0 };
  try { return { taco: 0, pizza: 0, cafe: 0, ...JSON.parse(window.localStorage.getItem("cartaya-cooking-rush") || "{}") }; }
  catch { return { taco: 0, pizza: 0, cafe: 0 }; }
}

export function KitchenMiniGames({ primaryColor }: { primaryColor: string }) {
  const [active, setActive] = useState<CookingGameId | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [session, setSession] = useState(0);
  const [snapshot, setSnapshot] = useState<CookingSnapshot>(empty);
  const [result, setResult] = useState<CookingResult | null>(null);
  const [best, setBest] = useState<Scores>(readBest);

  const open = useCallback((game: CookingGameId) => { setActive(game); setPhase("ready"); setSnapshot(empty); setResult(null); }, []);
  const begin = useCallback(() => { setSession((value) => value + 1); setSnapshot(empty); setResult(null); setPhase("playing"); }, []);
  const close = useCallback(() => setActive(null), []);
  const finish = useCallback((gameResult: CookingResult) => {
    setResult(gameResult); setSnapshot(gameResult); setPhase("finished");
    if (!active) return;
    setBest((current) => {
      if (gameResult.score <= current[active]) return current;
      const next = { ...current, [active]: gameResult.score };
      try { window.localStorage.setItem("cartaya-cooking-rush", JSON.stringify(next)); } catch {}
      return next;
    });
  }, [active]);

  const meta = games.find((game) => game.id === active);
  const ActiveIcon = meta?.icon ?? Gamepad2;

  return <section className="mx-auto mt-4 max-w-7xl px-4 pb-10 sm:px-8">
    <div className="overflow-hidden rounded-[2rem] bg-brand-navy p-5 text-white shadow-xl sm:p-8"><div className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-2xl bg-white/10"><Gamepad2 /></span><div><p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: primaryColor }}>Mientras esperas</p><h2 className="text-2xl font-black">Cocina contra reloj</h2></div></div><div className="mt-6 grid gap-4 md:grid-cols-3">{games.map((game) => { const Icon = game.icon; return <button key={game.id} type="button" onClick={() => open(game.id)} style={{ backgroundImage: "url('/game-assets/chef-arcade-worlds.png')", backgroundSize: "300% 100%", backgroundPosition: game.position }} className="group relative min-h-64 overflow-hidden rounded-3xl p-5 text-left shadow-lg transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50"><span className={`absolute inset-0 bg-gradient-to-t ${game.overlay}`} /><span className="relative flex size-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur"><Icon /></span><div className="absolute inset-x-5 bottom-5"><strong className="block text-xl">{game.title}</strong><span className="mt-1 block text-sm text-white/80">{game.subtitle}</span><span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-black backdrop-blur"><Play className="size-3.5" />Jugar</span></div></button>; })}</div></div>

    {active && meta ? <div className="fixed inset-0 z-[80] bg-slate-950/85 backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:p-5" role="dialog" aria-modal="true" aria-label={meta.title}><div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-h-[94dvh] sm:max-w-6xl sm:rounded-[2rem]">
      <header className="cartaya-game-header flex shrink-0 items-center justify-between bg-brand-navy px-3 py-2 text-white sm:px-5 sm:py-4"><div className="flex min-w-0 items-center gap-2 sm:gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 sm:size-10 sm:rounded-xl"><ActiveIcon className="size-4 sm:size-5" /></span><div className="min-w-0"><p className="truncate text-[10px] font-bold uppercase text-white/55 sm:text-xs">{phase === "playing" ? `${snapshot.served} clientes · combo x${snapshot.combo}` : `Récord ${best[active]} puntos`}</p><h3 className="truncate text-base font-black sm:text-xl">{meta.title}</h3></div></div><button type="button" onClick={close} className="rounded-full bg-white/10 p-2 hover:bg-white/20" aria-label="Cerrar juego"><X className="size-5" /></button></header>

      {phase === "ready" ? <div style={{ backgroundImage: `linear-gradient(rgba(3,12,25,.78),rgba(3,12,25,.95)),url('/game-assets/chef-arcade-worlds.png')`, backgroundSize: "300% 100%", backgroundPosition: meta.position }} className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-7 py-10 text-center text-white"><span className="flex size-20 shrink-0 items-center justify-center rounded-3xl bg-white/10"><ActiveIcon className="size-10 text-brand-orange" /></span><h4 className="mt-6 text-2xl font-black sm:text-3xl">{meta.title}</h4><p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">{meta.description}</p><div className="mt-5 grid max-w-2xl gap-2 text-left text-sm font-semibold text-white/85 sm:grid-cols-3"><span className="rounded-2xl border border-white/10 bg-white/5 p-4">Dos comandas amplias con paciencia independiente.</span><span className="rounded-2xl border border-white/10 bg-white/5 p-4">Procesos con tiempo real para gestionar en paralelo.</span><span className="rounded-2xl border border-white/10 bg-white/5 p-4">Combos y propinas por servir rápido y sin errores.</span></div><button type="button" onClick={begin} className="mt-7 flex min-h-14 shrink-0 items-center gap-2 rounded-2xl bg-brand-orange px-9 py-3 font-black shadow-xl"><Play className="size-5 fill-current" />Abrir restaurante</button></div> : null}
      {phase === "playing" ? <CookingRushGame key={`${active}-${session}`} game={active} onUpdate={setSnapshot} onFinish={finish} /> : null}
      {phase === "finished" && result ? <div style={{ backgroundImage: `linear-gradient(rgba(255,255,255,.94),rgba(255,255,255,.98)),url('/game-assets/chef-arcade-worlds.png')`, backgroundSize: "300% 100%", backgroundPosition: meta.position }} className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-10 text-center"><span className={`flex size-20 shrink-0 items-center justify-center rounded-3xl ${result.stars >= 2 ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>{result.stars >= 2 ? <Check className="size-11" /> : <Trophy className="size-11" />}</span><div className="mt-5 flex gap-1">{Array.from({ length: 3 }, (_, index) => <Star key={index} className={`size-7 ${index < result.stars ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />)}</div><p className="mt-3 text-sm font-black uppercase tracking-wider text-slate-500">Turno terminado</p><p className="mt-1 text-4xl font-black text-brand-navy">{result.score} puntos</p><p className="mt-2 text-sm font-bold text-slate-500">{result.served} clientes servidos · mejor combo x{result.combo}</p><div className="mt-7 flex gap-3"><button type="button" onClick={close} className="rounded-xl border bg-white px-5 py-3 font-bold text-slate-600">Cerrar</button><button type="button" onClick={begin} className="flex items-center gap-2 rounded-xl px-5 py-3 font-black text-white" style={{ backgroundColor: primaryColor }}><RotateCcw className="size-4" />Nuevo turno</button></div></div> : null}
    </div></div> : null}
  </section>;
}
