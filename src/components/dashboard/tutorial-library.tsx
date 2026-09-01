"use client";

import { useMemo, useState } from "react";
import { BookOpen, Play, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type TutorialVideo = {
  id: string;
  title: string;
  description: string | null;
  youtubeVideoId: string;
  keywords: string[];
  category: { id: string; name: string };
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function relevance(video: TutorialVideo, query: string) {
  if (!query) return 0;
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const title = normalize(video.title);
  const category = normalize(video.category.name);
  const keywords = normalize(video.keywords.join(" "));
  const description = normalize(video.description ?? "");
  return words.reduce((score, word) => score
    + (title === word ? 20 : 0)
    + (title.startsWith(word) ? 10 : title.includes(word) ? 7 : 0)
    + (category.includes(word) ? 5 : 0)
    + (keywords.includes(word) ? 4 : 0)
    + (description.includes(word) ? 2 : 0), 0);
}

export function TutorialLibrary({ videos }: { videos: TutorialVideo[] }) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [selectedId, setSelectedId] = useState(videos[0]?.id ?? "");
  const categories = useMemo(() => [...new Map(videos.map((video) => [video.category.id, video.category])).values()], [videos]);
  const filtered = useMemo(() => {
    const normalizedQuery = normalize(query);
    return videos
      .map((video, index) => ({ video, index, score: relevance(video, normalizedQuery) }))
      .filter(({ video, score }) => (categoryId === "all" || video.category.id === categoryId) && (!normalizedQuery || score > 0))
      .sort((left, right) => normalizedQuery ? right.score - left.score || left.index - right.index : left.index - right.index)
      .map(({ video }) => video);
  }, [categoryId, query, videos]);
  const selected = filtered.find((video) => video.id === selectedId) ?? filtered[0];

  if (!videos.length) return <section className="rounded-3xl border bg-white px-6 py-14 text-center shadow-sm"><BookOpen className="mx-auto size-9 text-slate-300" /><h2 className="mt-4 text-xl font-black text-brand-navy">Los tutoriales estarán disponibles pronto</h2><p className="mt-2 text-sm text-slate-500">Estamos preparando guías para ayudarte a aprovechar CartaYa.</p></section>;

  return <div className="space-y-6">
    <section className="rounded-3xl border bg-white p-4 shadow-sm sm:p-5">
      <div className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busca por tarea: crear menú, QR, pedidos, cocina…" className="h-12 rounded-2xl pl-12 pr-12" aria-label="Buscar tutoriales" />{query ? <button type="button" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-navy" aria-label="Limpiar búsqueda"><X className="size-4" /></button> : null}</div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar por categoría"><button type="button" onClick={() => setCategoryId("all")} className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-bold", categoryId === "all" ? "bg-brand-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>Todos</button>{categories.map((category) => <button key={category.id} type="button" onClick={() => setCategoryId(category.id)} className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-bold", categoryId === category.id ? "bg-brand-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>{category.name}</button>)}</div>
    </section>

    {selected ? <section className="overflow-hidden rounded-3xl border bg-white shadow-sm"><div className="aspect-video bg-brand-navy"><iframe key={selected.youtubeVideoId} src={`https://www.youtube-nocookie.com/embed/${selected.youtubeVideoId}?rel=0`} title={selected.title} className="h-full w-full" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div><div className="p-5 sm:p-7"><p className="text-xs font-black uppercase tracking-[0.14em] text-brand-green">{selected.category.name}</p><h2 className="mt-2 text-2xl font-black tracking-tight text-brand-navy">{selected.title}</h2>{selected.description ? <p className="mt-3 leading-7 text-slate-600">{selected.description}</p> : null}</div></section> : <section className="rounded-3xl border bg-white px-6 py-12 text-center shadow-sm"><Search className="mx-auto size-8 text-slate-300" /><h2 className="mt-4 text-lg font-black text-brand-navy">No encontramos ese tutorial</h2><p className="mt-2 text-sm text-slate-500">Prueba con menos palabras o selecciona otra categoría.</p></section>}

    {filtered.length ? <section><div className="mb-4 flex items-end justify-between"><div><h2 className="text-xl font-black text-brand-navy">Explora los tutoriales</h2><p className="mt-1 text-sm text-slate-500">{filtered.length} resultado{filtered.length === 1 ? "" : "s"}</p></div></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((video) => <button key={video.id} type="button" onClick={() => { setSelectedId(video.id); window.scrollTo({ top: 0, behavior: "smooth" }); }} className={cn("overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md", selected?.id === video.id && "border-brand-orange ring-2 ring-brand-orange/15")}><div className="relative aspect-video bg-cover bg-center" style={{ backgroundImage: `linear-gradient(rgba(15,23,42,.12),rgba(15,23,42,.3)),url(https://i.ytimg.com/vi/${video.youtubeVideoId}/hqdefault.jpg)` }}><span className="absolute inset-0 flex items-center justify-center"><span className="flex size-12 items-center justify-center rounded-full bg-white/95 text-brand-orange shadow-lg"><Play className="ml-0.5 size-5 fill-current" /></span></span></div><div className="p-4"><p className="text-[11px] font-black uppercase tracking-wider text-brand-green">{video.category.name}</p><h3 className="mt-1 line-clamp-2 font-black leading-6 text-brand-navy">{video.title}</h3>{video.description ? <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-500">{video.description}</p> : null}</div></button>)}</div></section> : null}
  </div>;
}
