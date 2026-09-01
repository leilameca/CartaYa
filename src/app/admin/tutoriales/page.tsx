import Link from "next/link";
import { ArrowLeft, BookOpen, ExternalLink, FolderPlus, Trash2, Video } from "lucide-react";
import {
  createTutorialCategoryAction,
  createTutorialVideoAction,
  deleteTutorialCategoryAction,
  deleteTutorialVideoAction,
  setTutorialVideoPublishedAction,
} from "@/app/admin/tutoriales/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireSuperadmin } from "@/lib/auth/superadmin";
import { createAdminClient } from "@/lib/supabase/admin";

const errors: Record<string, string> = {
  categoria: "No se pudo guardar la categoría.",
  categoria_repetida: "Ya existe una categoría con ese nombre.",
  categoria_con_videos: "Mueve o elimina sus videos antes de borrar esta categoría.",
  video: "No se pudo guardar el tutorial.",
  youtube: "Usa un enlace válido de YouTube, YouTube Shorts o youtu.be.",
  video_repetido: "Ese video de YouTube ya está agregado.",
};

export default async function AdminTutorialsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  await requireSuperadmin();
  const admin = createAdminClient();
  const [{ data: categories }, { data: videos }] = await Promise.all([
    admin.from("tutorial_categories").select("id, name, description, display_order").order("display_order").order("name"),
    admin.from("tutorial_videos").select("id, title, description, youtube_url, youtube_video_id, keywords, display_order, is_published, category:tutorial_categories(id, name)").order("display_order").order("created_at", { ascending: false }),
  ]);

  return <main className="min-h-screen bg-brand-gray px-4 py-8 sm:px-8 lg:px-12">
    <header className="mx-auto flex max-w-7xl flex-col gap-4 rounded-2xl bg-brand-navy px-5 py-5 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">Biblioteca de ayuda</p><h1 className="mt-1 text-2xl font-black">Tutoriales de CartaYa</h1></div>
      <Button asChild variant="ghost" className="justify-start gap-2 text-white hover:bg-white/10 hover:text-white"><Link href="/admin"><ArrowLeft className="size-4" />Volver al panel</Link></Button>
    </header>
    {params.success ? <p className="mx-auto mt-5 max-w-7xl rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">Cambio guardado correctamente.</p> : null}
    {params.error ? <p className="mx-auto mt-5 max-w-7xl rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{errors[params.error] ?? "No se pudo completar la operación."}</p> : null}

    <div className="mx-auto mt-6 grid max-w-7xl gap-6 xl:grid-cols-[0.72fr_1.28fr]">
      <div className="space-y-6">
        <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><FolderPlus className="size-5 text-brand-green" /><div><h2 className="font-black text-brand-navy">Nueva categoría</h2><p className="text-sm text-slate-500">Organiza los videos por tarea.</p></div></div>
          <form action={createTutorialCategoryAction} className="mt-5 space-y-4">
            <div className="space-y-2"><Label htmlFor="category-name">Nombre</Label><Input id="category-name" name="name" placeholder="Primeros pasos" maxLength={80} required /></div>
            <div className="space-y-2"><Label htmlFor="category-description">Descripción</Label><Textarea id="category-description" name="description" placeholder="Configuración inicial y publicación del menú" maxLength={240} /></div>
            <div className="space-y-2"><Label htmlFor="category-order">Orden</Label><Input id="category-order" name="displayOrder" type="number" min={0} max={9999} defaultValue={0} required /></div>
            <Button type="submit" className="w-full bg-brand-green">Crear categoría</Button>
          </form>
        </section>

        <section className="rounded-3xl border bg-white shadow-sm"><div className="border-b px-5 py-4"><h2 className="font-black text-brand-navy">Categorías</h2></div><div className="divide-y">
          {categories?.length ? categories.map((category) => <div key={category.id} className="flex items-start justify-between gap-4 px-5 py-4"><div><p className="font-bold text-brand-navy">{category.name}</p><p className="mt-1 text-xs text-slate-500">Orden {category.display_order}{category.description ? ` · ${category.description}` : ""}</p></div><form action={deleteTutorialCategoryAction}><input type="hidden" name="categoryId" value={category.id} /><Button type="submit" size="icon" variant="ghost" aria-label={`Eliminar ${category.name}`} className="text-red-600 hover:bg-red-50 hover:text-red-700"><Trash2 className="size-4" /></Button></form></div>) : <p className="px-5 py-7 text-sm text-slate-500">Crea la primera categoría para agregar videos.</p>}
        </div></section>
      </div>

      <div className="space-y-6">
        <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><Video className="size-5 text-brand-orange" /><div><h2 className="font-black text-brand-navy">Nuevo video</h2><p className="text-sm text-slate-500">Acepta enlaces normales, Shorts y youtu.be.</p></div></div>
          <form action={createTutorialVideoAction} className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="video-title">Título</Label><Input id="video-title" name="title" placeholder="Cómo crear tu menú" maxLength={140} required /></div>
            <div className="space-y-2"><Label htmlFor="video-category">Categoría</Label><select id="video-category" name="categoryId" className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm" required defaultValue=""><option value="" disabled>Selecciona una categoría</option>{categories?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="video-url">Enlace de YouTube</Label><Input id="video-url" name="youtubeUrl" type="url" placeholder="https://youtu.be/..." required /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="video-description">Descripción</Label><Textarea id="video-description" name="description" placeholder="Explica qué aprenderá el usuario." maxLength={1000} /></div>
            <div className="space-y-2"><Label htmlFor="video-keywords">Palabras de búsqueda</Label><Input id="video-keywords" name="keywords" placeholder="menú, platos, precios, fotos" maxLength={500} /><p className="text-xs text-slate-500">Separadas por comas.</p></div>
            <div className="space-y-2"><Label htmlFor="video-order">Orden</Label><Input id="video-order" name="displayOrder" type="number" min={0} max={9999} defaultValue={0} required /></div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 sm:col-span-2"><input type="checkbox" name="isPublished" defaultChecked className="size-4 accent-brand-green" />Publicar inmediatamente</label>
            <Button type="submit" disabled={!categories?.length} className="bg-brand-orange sm:col-span-2">Agregar tutorial</Button>
          </form>
        </section>

        <section className="rounded-3xl border bg-white shadow-sm"><div className="flex items-center gap-3 border-b px-5 py-4"><BookOpen className="size-5 text-brand-orange" /><div><h2 className="font-black text-brand-navy">Videos cargados</h2><p className="text-sm text-slate-500">{videos?.length ?? 0} tutoriales</p></div></div><div className="divide-y">
          {videos?.length ? videos.map((video) => { const relation = video.category as unknown as { id: string; name: string } | { id: string; name: string }[] | null; const category = Array.isArray(relation) ? relation[0] : relation; return <article key={video.id} className="px-5 py-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="font-bold text-brand-navy">{video.title}</p><p className="mt-1 text-xs font-bold uppercase tracking-wide text-brand-green">{category?.name ?? "Sin categoría"} · Orden {video.display_order}</p>{video.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{video.description}</p> : null}<a href={video.youtube_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand-orange hover:underline">Abrir en YouTube <ExternalLink className="size-3" /></a></div><div className="flex shrink-0 gap-2"><form action={setTutorialVideoPublishedAction}><input type="hidden" name="videoId" value={video.id} /><input type="hidden" name="published" value={video.is_published ? "false" : "true"} /><Button type="submit" size="sm" variant="outline">{video.is_published ? "Ocultar" : "Publicar"}</Button></form><form action={deleteTutorialVideoAction}><input type="hidden" name="videoId" value={video.id} /><Button type="submit" size="icon" variant="ghost" aria-label={`Eliminar ${video.title}`} className="text-red-600 hover:bg-red-50 hover:text-red-700"><Trash2 className="size-4" /></Button></form></div></div></article>; }) : <p className="px-5 py-8 text-sm text-slate-500">Todavía no hay videos.</p>}
        </div></section>
      </div>
    </div>
  </main>;
}
