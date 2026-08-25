import { NextResponse } from "next/server";
import { sendRestaurantPush, type PushAudience } from "@/lib/push/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Tu sesión venció." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("restaurant_id, role").eq("id", user.id).maybeSingle();
  if (!profile || !["owner", "mesero", "cocina"].includes(profile.role)) return NextResponse.json({ error: "Este perfil no admite avisos operativos." }, { status: 403 });

  const result = await sendRestaurantPush({
    restaurantId: profile.restaurant_id,
    audience: [profile.role as PushAudience],
    onlyUserIds: [user.id],
    title: "CartaYa está conectado",
    body: "Las notificaciones de pedidos y solicitudes ya pueden llegar a este dispositivo.",
    url: "/dashboard",
    tag: `push-test-${user.id}`,
  });
  if (!result.sent) return NextResponse.json({ error: "El dispositivo todavía no aparece registrado. Abre CartaYa desde el icono de inicio y vuelve a activar los avisos." }, { status: 409 });
  return NextResponse.json({ ok: true, sent: result.sent });
}
