"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSuperadmin } from "@/lib/auth/superadmin";
import { createAdminClient } from "@/lib/supabase/admin";

const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).optional(),
  displayOrder: z.coerce.number().int().min(0).max(9999),
});

const videoSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().max(1000).optional(),
  youtubeUrl: z.string().trim().url().max(500),
  keywords: z.string().trim().max(500).optional(),
  displayOrder: z.coerce.number().int().min(0).max(9999),
  isPublished: z.enum(["on"]).optional(),
});

function youtubeVideoId(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    let id = "";
    if (hostname === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      if (url.pathname === "/watch") id = url.searchParams.get("v") ?? "";
      else if (/^\/(?:shorts|embed)\//.test(url.pathname)) id = url.pathname.split("/")[2] ?? "";
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function refreshTutorials() {
  revalidatePath("/admin/tutoriales");
  revalidatePath("/dashboard/tutoriales");
}

export async function createTutorialCategoryAction(formData: FormData) {
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/tutoriales?error=categoria");
  await requireSuperadmin();

  const admin = createAdminClient();
  const { error } = await admin.from("tutorial_categories").insert({
    name: parsed.data.name,
    description: parsed.data.description || null,
    display_order: parsed.data.displayOrder,
  });
  if (error) redirect(`/admin/tutoriales?error=${error.code === "23505" ? "categoria_repetida" : "categoria"}`);
  refreshTutorials();
  redirect("/admin/tutoriales?success=categoria");
}

export async function deleteTutorialCategoryAction(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("categoryId"));
  if (!id.success) redirect("/admin/tutoriales?error=categoria");
  await requireSuperadmin();

  const admin = createAdminClient();
  const { error } = await admin.from("tutorial_categories").delete().eq("id", id.data);
  if (error) redirect(`/admin/tutoriales?error=${error.code === "23503" ? "categoria_con_videos" : "categoria"}`);
  refreshTutorials();
  redirect("/admin/tutoriales?success=categoria_eliminada");
}

export async function createTutorialVideoAction(formData: FormData) {
  const parsed = videoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/tutoriales?error=video");
  const videoId = youtubeVideoId(parsed.data.youtubeUrl);
  if (!videoId) redirect("/admin/tutoriales?error=youtube");
  await requireSuperadmin();

  const keywords = [...new Set((parsed.data.keywords ?? "").split(",").map((keyword) => keyword.trim().toLowerCase()).filter(Boolean))].slice(0, 20);
  const admin = createAdminClient();
  const { error } = await admin.from("tutorial_videos").insert({
    category_id: parsed.data.categoryId,
    title: parsed.data.title,
    description: parsed.data.description || null,
    youtube_video_id: videoId,
    youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
    keywords,
    display_order: parsed.data.displayOrder,
    is_published: parsed.data.isPublished === "on",
  });
  if (error) redirect(`/admin/tutoriales?error=${error.code === "23505" ? "video_repetido" : "video"}`);
  refreshTutorials();
  redirect("/admin/tutoriales?success=video");
}

export async function setTutorialVideoPublishedAction(formData: FormData) {
  const parsed = z.object({ videoId: z.string().uuid(), published: z.enum(["true", "false"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/tutoriales?error=video");
  await requireSuperadmin();
  const admin = createAdminClient();
  const { error } = await admin.from("tutorial_videos").update({ is_published: parsed.data.published === "true", updated_at: new Date().toISOString() }).eq("id", parsed.data.videoId);
  if (error) redirect("/admin/tutoriales?error=video");
  refreshTutorials();
  redirect("/admin/tutoriales?success=estado");
}

export async function deleteTutorialVideoAction(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("videoId"));
  if (!id.success) redirect("/admin/tutoriales?error=video");
  await requireSuperadmin();
  const admin = createAdminClient();
  const { error } = await admin.from("tutorial_videos").delete().eq("id", id.data);
  if (error) redirect("/admin/tutoriales?error=video");
  refreshTutorials();
  redirect("/admin/tutoriales?success=video_eliminado");
}
