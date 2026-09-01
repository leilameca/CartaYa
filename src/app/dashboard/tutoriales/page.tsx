import { BookOpen } from "lucide-react";
import { TutorialLibrary, type TutorialVideo } from "@/components/dashboard/tutorial-library";
import { createClient } from "@/lib/supabase/server";

export default async function TutorialsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("tutorial_videos").select("id, title, description, youtube_video_id, keywords, category:tutorial_categories(id, name)").order("display_order").order("created_at");
  const videos: TutorialVideo[] = (data ?? []).flatMap((video) => {
    const relation = video.category as unknown as { id: string; name: string } | { id: string; name: string }[] | null;
    const category = Array.isArray(relation) ? relation[0] : relation;
    return category ? [{ id: video.id, title: video.title, description: video.description, youtubeVideoId: video.youtube_video_id, keywords: video.keywords, category }] : [];
  });

  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8"><header className="mb-7"><p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-brand-green"><BookOpen className="size-4" />Centro de aprendizaje</p><h1 className="mt-3 text-3xl font-black tracking-tight text-brand-navy sm:text-4xl">Tutoriales de CartaYa</h1><p className="mt-3 max-w-2xl leading-7 text-slate-600">Encuentra rápidamente la guía correcta para configurar tu menú, administrar pedidos y trabajar con tu equipo.</p></header><TutorialLibrary videos={videos} /></main>;
}
