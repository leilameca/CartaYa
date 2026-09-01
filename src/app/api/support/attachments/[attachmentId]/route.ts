import { NextResponse } from "next/server";
import { z } from "zod";
import { downloadEncryptedSupportAttachment } from "@/lib/cloudflare/r2";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ attachmentId: string }> }) {
  const id = z.string().uuid().safeParse((await params).attachmentId);
  if (!id.success) return NextResponse.json({ error: "Archivo no encontrado." }, { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const admin = createAdminClient();
  const [{ data: profile }, { data: attachment }] = await Promise.all([
    admin.from("profiles").select("restaurant_id, role").eq("id", user.id).maybeSingle(),
    admin.from("support_attachments").select("id, object_key, encryption_key, encryption_iv, original_name, mime_type, ticket:support_tickets(restaurant_id, created_by), message:support_messages(is_internal)").eq("id", id.data).maybeSingle(),
  ]);
  if (!profile || !attachment) return NextResponse.json({ error: "Archivo no encontrado." }, { status: 404 });

  const ticketRelation = attachment.ticket as unknown as { restaurant_id: string; created_by: string } | { restaurant_id: string; created_by: string }[] | null;
  const ticket = Array.isArray(ticketRelation) ? ticketRelation[0] : ticketRelation;
  const messageRelation = attachment.message as unknown as { is_internal: boolean } | { is_internal: boolean }[] | null;
  const message = Array.isArray(messageRelation) ? messageRelation[0] : messageRelation;
  if (!ticket) return NextResponse.json({ error: "Archivo no encontrado." }, { status: 404 });

  let authorized = false;
  if (profile.role === "superadmin") {
    const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    authorized = assurance?.currentLevel === "aal2";
  } else {
    authorized = profile.restaurant_id === ticket.restaurant_id && (profile.role === "owner" || ticket.created_by === user.id) && !message?.is_internal;
  }
  if (!authorized) return NextResponse.json({ error: "No tienes permiso para abrir este archivo." }, { status: 403 });

  try {
    const decrypted = await downloadEncryptedSupportAttachment({ objectKey: attachment.object_key, encryptionKey: attachment.encryption_key, encryptionIv: attachment.encryption_iv });
    return new NextResponse(new Uint8Array(decrypted), {
      headers: {
        "Content-Type": attachment.mime_type,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(attachment.original_name)}`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Support attachment download failed", { attachmentId: attachment.id, error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "No pudimos abrir el archivo." }, { status: 500 });
  }
}
