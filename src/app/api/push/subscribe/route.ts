import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({ p256dh: z.string().min(1).max(300), auth: z.string().min(1).max(300) }),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Suscripción inválida." }, { status: 400 }); }
  const parsed = subscriptionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Suscripción inválida." }, { status: 400 });

  const { data: profile } = await supabase.from("profiles").select("restaurant_id").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Perfil no encontrado." }, { status: 403 });
  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: user.id,
    restaurant_id: profile.restaurant_id,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,endpoint" });
  if (error) return NextResponse.json({ error: "No se pudo guardar la suscripción." }, { status: 500 });
  return NextResponse.json({ ok: true });
}