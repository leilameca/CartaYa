"use client";

import { useEffect, useState } from "react";
import { Bike, ChefHat, Gamepad2, Sparkles, Timer, X } from "lucide-react";

type Game = "runner" | "catch" | "delivery";
const games: Array<{ id: Game; title: string; subtitle: string; icon: React.ReactNode; gradient: string }> = [
  { id: "runner", title: "Chef Saltarín", subtitle: "Salta sartenes como un pequeño chef corredor", icon: <ChefHat />, gradient: "from-orange-500 to-amber-400" },
  { id: "catch", title: "Mundo Cocina", subtitle: "Atrapa ingredientes y esquiva el chile picante", icon: <Sparkles />, gradient: "from-emerald-500 to-lime-400" },
  { id: "delivery", title: "Pedido Exprés", subtitle: "Entrega cada orden en la mesa correcta", icon: <Bike />, gradient: "from-blue-600 to-cyan-400" },
];

export function KitchenMiniGames({ primaryColor }: { primaryColor: string }) {
  const [active, setActive] = useState<Game | null>(null);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(20);
  const [target, setTarget] = useState(1);
  const [jumping, setJumping] = useState(false);
  useEffect(() => { if (!active || time <= 0) return; const timer = window.setInterval(() => setTime((value) => value - 1), 1000); return () => window.clearInterval(timer); }, [active, time]);
  function open(game: Game) { setActive(game); setScore(0); setTime(20); setTarget(game === "catch" ? 4 : 1); }
  function point() { if (time <= 0) return; setScore((value) => value + 1); setTarget((value) => active === "catch" ? (value + 4) % 9 : (value % 3) + 1); }
  function jump() { if (time <= 0 || jumping) return; setJumping(true); setScore((value) => value + 1); window.setTimeout(() => setJumping(false), 500); }

  return <section className="mx-auto mt-4 max-w-7xl px-4 pb-10 sm:px-8">
    <div className="overflow-hidden rounded-[2rem] bg-brand-navy p-5 text-white shadow-xl sm:p-8">
      <div className="flex items-center gap-3"><span className="rounded-2xl bg-white/10 p-3"><Gamepad2 /></span><div><p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: primaryColor }}>Mientras esperas</p><h2 className="text-2xl font-black">Minijuegos de cocina</h2></div></div>
      <div className="mt-6 grid gap-3 md:grid-cols-3">{games.map((game) => <button key={game.id} onClick={() => open(game.id)} className={`group rounded-2xl bg-gradient-to-br ${game.gradient} p-5 text-left shadow-lg transition hover:-translate-y-1 active:scale-[0.98]`}><span className="flex size-11 items-center justify-center rounded-xl bg-white/20">{game.icon}</span><strong className="mt-8 block text-xl">{game.title}</strong><span className="mt-1 block text-sm text-white/85">{game.subtitle}</span><span className="mt-4 inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-black">Jugar ahora</span></button>)}</div>
    </div>
    {active ? <div className="fixed inset-0 z-[80] flex items-end bg-black/60 p-0 sm:items-center sm:justify-center sm:p-5"><div className="w-full overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:max-w-2xl sm:rounded-[2rem]"><div className="flex items-center justify-between bg-brand-navy px-5 py-4 text-white"><div><p className="text-xs font-bold uppercase text-white/60">Puntuación {score}</p><h3 className="text-xl font-black">{games.find((game) => game.id === active)?.title}</h3></div><div className="flex items-center gap-3"><span className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-sm font-black"><Timer className="size-4" />{time}s</span><button onClick={() => setActive(null)} className="rounded-full bg-white/10 p-2"><X /></button></div></div>
      <div className="relative h-[360px] overflow-hidden bg-gradient-to-b from-sky-100 to-amber-50 p-5 touch-manipulation select-none">
        {time <= 0 ? <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 text-center"><span className="text-6xl">🏆</span><p className="mt-4 text-3xl font-black text-brand-navy">¡{score} puntos!</p><button onClick={() => open(active)} className="mt-5 rounded-xl px-5 py-3 font-black text-white" style={{ backgroundColor: primaryColor }}>Jugar otra vez</button></div> : null}
        {active === "runner" ? <button onClick={jump} className="absolute inset-0 w-full" aria-label="Saltar"><span className={`absolute bottom-16 left-12 text-6xl transition-transform duration-500 ${jumping ? "-translate-y-28 rotate-6" : ""}`}>👨‍🍳</span><span className="absolute bottom-14 right-10 animate-pulse text-6xl">🍳</span><span className="absolute bottom-8 left-0 h-3 w-full bg-amber-800" /><span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-brand-navy px-4 py-2 text-sm font-black text-white">Toca para saltar</span></button> : null}
        {active === "catch" ? <div className="grid h-full grid-cols-3 grid-rows-3 gap-3">{Array.from({ length: 9 }, (_, index) => <button key={index} onClick={index === target ? point : undefined} className={`rounded-2xl border-2 border-dashed transition active:scale-90 ${index === target ? "border-emerald-400 bg-white text-6xl shadow-xl" : "border-sky-200/60"}`}>{index === target ? (score % 4 === 3 ? "🌶️" : ["🍅", "🥕", "🧀"][score % 3]) : ""}</button>)}</div> : null}
        {active === "delivery" ? <div className="flex h-full flex-col justify-between"><div className="rounded-2xl bg-white p-4 text-center shadow"><p className="text-sm font-bold text-slate-500">Entrega pendiente</p><p className="text-2xl font-black">🍔 → Mesa {target}</p></div><div className="grid grid-cols-3 gap-3">{[1,2,3].map((table) => <button key={table} onClick={() => table === target ? point() : setScore((value) => Math.max(0, value - 1))} className="rounded-2xl bg-brand-navy px-3 py-8 text-xl font-black text-white shadow-lg active:scale-95">Mesa {table}</button>)}</div><p className="text-center text-5xl">🛵💨</p></div> : null}
      </div></div></div> : null}
  </section>;
}
