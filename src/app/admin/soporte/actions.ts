"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSuperadmin } from "@/lib/auth/superadmin";
import { deleteEncryptedSupportAttachment, uploadEncryptedSupportAttachment } from "@/lib/cloudflare/r2";
import { sendRestaurantPush } from "@/lib/push/server";
import { createAdminClient } from "@/lib/supabase/admin";

const replySchema = z.object({ ticketId: z.string().uuid(), body: z.string().trim().min(2).max(4000), internal: z.enum(["on"]).optional() });
const statusSchema = z.object({ ticketId: z.string().uuid(), status: z.enum(["abierto", "en_revision", "esperando_cliente", "resuelto", "cerrado"]) });

async function notifyRestaurant(ticket: { id: string; restaurant_id: string; created_by: string; subject: string }, body: string) {
  const admin = createAdminClient();
  const { data: owners } = await admin.from("profiles").select("id").eq("restaurant_id", ticket.restaurant_id).eq("role", "owner");
  const userIds = [...new Set([ticket.created_by, ...(owners ?? []).map((owner) => owner.id)])];
  await sendRestaurantPush({ restaurantId: ticket.restaurant_id, audience: ["owner", "mesero", "cocina"], onlyUserIds: userIds, title: "Actualización de soporte", body, url: `/dashboard/soporte/${ticket.id}`, tag: `support-${ticket.id}` });
}

export async function adminReplySupportTicketAction(formData: FormData) {
  const parsed = replySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/soporte?error=mensaje");
  const { user } = await requireSuperadmin();
  const admin = createAdminClient();
  const { data: ticket } = await admin.from("support_tickets").select("id, restaurant_id, created_by, subject, status").eq("id", parsed.data.ticketId).maybeSingle();
  if (!ticket) redirect("/admin/soporte?error=no_encontrado");

  const internal = parsed.data.internal === "on";
  const { data: message, error } = await admin.from("support_messages").insert({ ticket_id: ticket.id, author_id: user.id, body: parsed.data.body, is_internal: internal }).select("id").single();
  if (error || !message) redirect(`/admin/soporte/${ticket.id}?error=mensaje`);

  let attachmentFailed = false;
  const file = formData.get("attachment");
  if (file instanceof File && file.size > 0) {
    try {
      const uploaded = await uploadEncryptedSupportAttachment(file, ticket.id);
      const { error: attachmentError } = await admin.from("support_attachments").insert({ ticket_id: ticket.id, message_id: message.id, uploaded_by: user.id, object_key: uploaded.objectKey, encryption_key: uploaded.encryptionKey, encryption_iv: uploaded.encryptionIv, original_name: uploaded.originalName, mime_type: uploaded.mimeType, byte_size: uploaded.byteSize });
      if (attachmentError) { await deleteEncryptedSupportAttachment(uploaded.objectKey); attachmentFailed = true; }
    } catch (uploadError) { console.error("Admin support attachment failed", { ticketId: ticket.id, error: uploadError instanceof Error ? uploadError.message : "unknown" }); attachmentFailed = true; }
  }

  const now = new Date().toISOString();
  await admin.from("support_tickets").update({ ...(!internal ? { status: "esperando_cliente" } : {}), updated_at: now, last_activity_at: now }).eq("id", ticket.id);
  if (!internal) await notifyRestaurant(ticket, `Respondimos el ticket: ${ticket.subject}`);
  revalidatePath(`/admin/soporte/${ticket.id}`);
  revalidatePath(`/dashboard/soporte/${ticket.id}`);
  redirect(`/admin/soporte/${ticket.id}?sent=1${attachmentFailed ? "&attachment=failed" : ""}`);
}

export async function updateSupportTicketStatusAction(formData: FormData) {
  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/soporte?error=estado");
  await requireSuperadmin();
  const admin = createAdminClient();
  const { data: ticket } = await admin.from("support_tickets").select("id, restaurant_id, created_by, subject").eq("id", parsed.data.ticketId).maybeSingle();
  if (!ticket) redirect("/admin/soporte?error=no_encontrado");
  const now = new Date().toISOString();
  const { error } = await admin.from("support_tickets").update({ status: parsed.data.status, updated_at: now, last_activity_at: now, resolved_at: parsed.data.status === "resuelto" ? now : null, closed_at: parsed.data.status === "cerrado" ? now : null }).eq("id", ticket.id);
  if (error) redirect(`/admin/soporte/${ticket.id}?error=estado`);
  await notifyRestaurant(ticket, `El ticket ahora está: ${parsed.data.status.replaceAll("_", " ")}`);
  revalidatePath("/admin/soporte");
  revalidatePath(`/admin/soporte/${ticket.id}`);
  revalidatePath(`/dashboard/soporte/${ticket.id}`);
  redirect(`/admin/soporte/${ticket.id}?status=updated`);
}
