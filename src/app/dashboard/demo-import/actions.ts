"use server";

import { revalidatePath } from "next/cache";
import { demoImportSchema } from "@/lib/demo-transfer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function importDemoAction(payload: unknown): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Inicia sesión para importar tu menú." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "owner") return { error: "Solo el propietario puede importar." };
  const parsed = demoImportSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Menú inválido." };
  const admin = createAdminClient();
  const { error } = await admin.rpc("import_demo_menu", { p_user_id: user.id, p_menu: parsed.data });
  if (error) {
    if (error.message.includes("DEMO_EXISTS")) return { error: "Tu restaurante ya tiene un menú o categorías personalizadas. No se reemplazó ningún dato." };
    if (error.message.includes("DEMO_LIMIT")) return { error: "Gratis permite 20 platos. Vuelve al demo para adaptar el menú o mejora tu plan. Conservamos tu demo." };
    return { error: "No se pudo importar. Conservamos tu demo; verifica que la migración esté aplicada e inténtalo de nuevo." };
  }
  revalidatePath("/dashboard", "layout");
  return { success: true };
}
