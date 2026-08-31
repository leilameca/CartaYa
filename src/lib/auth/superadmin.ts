import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function requireSuperadmin({ requireAal2 = true }: { requireAal2?: boolean } = {}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/admin");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "superadmin") redirect("/dashboard");

  const { data: assurance, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !assurance) redirect("/login?redirectTo=/admin");
  if (requireAal2 && assurance.currentLevel !== "aal2") redirect("/admin/seguridad");

  return { user, supabase, assurance };
}
