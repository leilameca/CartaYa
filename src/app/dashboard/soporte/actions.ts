"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { deleteEncryptedSupportAttachment, uploadEncryptedSupportAttachment } from "@/lib/cloudflare/r2";
import { sendSuperadminPush } from "@/lib/push/server";
import { consumeRateLimit, getClientAddress } from "@/lib/security/rate-limit";
import { getRestaurantSupportContext, requireRestaurantTicket } from "@/lib/support";

export type SupportActionState = { error?: string };

const ticketSchema = z.object({
  category: z.enum(["cuenta", "menu", "pedidos", "cocina", "equipo", "qr", "notificaciones", "planes", "seguridad", "otro"]),
  impact: z.enum(["consulta", "problema", "bloqueado"]),
  subject: z.string().trim().min(5).max(140),
  description: z.string().trim().min(20).max(4000),
  pageUrl: z.string().trim().max(1000).optional(),
  appVersion: z.string().trim().max(80).optional(),
});

const replySchema = z.object({ ticketId: z.string().uuid(), body: z.string().trim().min(2).max(4000) });

async function saveAttachment({ file, ticketId, messageId, userId, admin }: { file: FormDataEntryValue | null; ticketId: string; messageId?: string; userId: string; admin: Awaited<ReturnType<typeof getRestaurantSupportContext>>["admin"] }) {
  if (!(file instanceof File) || file.size === 0) return null;
  const uploaded = await uploadEncryptedSupportAttachment(file, ticketId);
  const { error } = await admin.from("support_attachments").insert({
    ticket_id: ticketId,
    message_id: messageId ?? null,
    uploaded_by: userId,
    object_key: uploaded.objectKey,
    encryption_key: uploaded.encryptionKey,
    encryption_iv: uploaded.encryptionIv,
    original_name: uploaded.originalName,
    mime_type: uploaded.mimeType,
    byte_size: uploaded.byteSize,
  });
  if (error) {
    await deleteEncryptedSupportAttachment(uploaded.objectKey);
    throw new Error("ATTACHMENT_DATABASE_ERROR");
  }
  return uploaded;
}

function attachmentError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "ATTACHMENT_SIZE_INVALID") return "La captura debe pesar menos de 3 MB.";
  if (message === "ATTACHMENT_TYPE_INVALID") return "La captura debe ser JPG, PNG o WebP.";
  if (message === "R2_NOT_CONFIGURED") return "La carga de capturas no está disponible temporalmente.";
  return "No pudimos guardar la captura. Puedes enviar el ticket sin ella.";
}

export async function createSupportTicketAction(_state: SupportActionState, formData: FormData): Promise<SupportActionState> {
  const parsed = ticketSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Revisa la categoría, el impacto, el título y la descripción." };
  const context = await getRestaurantSupportContext();
  const requestHeaders = await headers();
  const allowed = await consumeRateLimit({ scope: "support-ticket-create", identifier: `${context.user.id}:${getClientAddress(requestHeaders)}`, maxRequests: 8, windowSeconds: 3600 });
  if (!allowed) return { error: "Has creado varios reportes recientemente. Espera antes de enviar otro." };

  const ticketId = randomUUID();
  const { data: ticket, error } = await context.admin.from("support_tickets").insert({
    id: ticketId,
    restaurant_id: context.profile.restaurant_id,
    created_by: context.user.id,
    category: parsed.data.category,
    impact: parsed.data.impact,
    subject: parsed.data.subject,
    description: parsed.data.description,
    page_url: parsed.data.pageUrl || requestHeaders.get("referer")?.slice(0, 1000) || null,
    user_agent: requestHeaders.get("user-agent")?.slice(0, 500) ?? null,
    app_version: parsed.data.appVersion || null,
  }).select("id, ticket_number, created_at").single();
  if (error || !ticket) return { error: "No pudimos crear el ticket. Inténtalo nuevamente." };

  let attachmentFailed = false;
  try { await saveAttachment({ file: formData.get("attachment"), ticketId, userId: context.user.id, admin: context.admin }); }
  catch (uploadError) { console.error("Support attachment upload failed", { ticketId, reason: attachmentError(uploadError) }); attachmentFailed = true; }

  await sendSuperadminPush({ title: "Nuevo ticket de soporte", body: parsed.data.subject, url: `/admin/soporte/${ticketId}`, tag: `support-${ticketId}` });
  revalidatePath("/dashboard/soporte");
  revalidatePath("/admin/soporte");
  redirect(`/dashboard/soporte/${ticketId}?created=1${attachmentFailed ? "&attachment=failed" : ""}`);
}

export async function replyToSupportTicketAction(_state: SupportActionState, formData: FormData): Promise<SupportActionState> {
  const parsed = replySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Escribe un mensaje de al menos dos caracteres." };
  const context = await requireRestaurantTicket(parsed.data.ticketId);
  if (context.ticket.status === "cerrado") return { error: "Este ticket está cerrado. Crea uno nuevo si el problema continúa." };

  const requestHeaders = await headers();
  const allowed = await consumeRateLimit({ scope: "support-ticket-reply", identifier: `${context.user.id}:${parsed.data.ticketId}:${getClientAddress(requestHeaders)}`, maxRequests: 20, windowSeconds: 3600 });
  if (!allowed) return { error: "Has enviado varios mensajes. Espera un momento antes de continuar." };

  const now = new Date().toISOString();
  const { data: message, error } = await context.admin.from("support_messages").insert({ ticket_id: parsed.data.ticketId, author_id: context.user.id, body: parsed.data.body }).select("id").single();
  if (error || !message) return { error: "No pudimos enviar el mensaje." };
  await context.admin.from("support_tickets").update({ status: "abierto", updated_at: now, last_activity_at: now, resolved_at: null, closed_at: null }).eq("id", parsed.data.ticketId);

  let attachmentFailed = false;
  try { await saveAttachment({ file: formData.get("attachment"), ticketId: parsed.data.ticketId, messageId: message.id, userId: context.user.id, admin: context.admin }); }
  catch (uploadError) { console.error("Support reply attachment upload failed", { ticketId: parsed.data.ticketId, reason: attachmentError(uploadError) }); attachmentFailed = true; }

  await sendSuperadminPush({ title: "Respuesta en ticket de soporte", body: context.ticket.subject, url: `/admin/soporte/${parsed.data.ticketId}`, tag: `support-${parsed.data.ticketId}` });
  revalidatePath(`/dashboard/soporte/${parsed.data.ticketId}`);
  revalidatePath("/admin/soporte");
  redirect(`/dashboard/soporte/${parsed.data.ticketId}?sent=1${attachmentFailed ? "&attachment=failed" : ""}`);
}
