import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const endpointSchema = z.object({ endpoint: z.string().url().max(2048) });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const parsed = endpointSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Endpoint inválido." }, { status: 400 });
  const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", parsed.data.endpoint);
  if (error) return NextResponse.json({ error: "No se pudo desactivar la suscripción." }, { status: 500 });
  return NextResponse.json({ ok: true });
}