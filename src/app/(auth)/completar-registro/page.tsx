import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { RestaurantOnboardingForm } from "@/components/auth/restaurant-onboarding-form";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function CompleteRegistrationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id, role").eq("id", user.id).maybeSingle();
  if (profile?.role === "superadmin") redirect("/admin");
  if (profile) redirect("/dashboard");

  return (
    <AuthShell
      title="Completa tu restaurante"
      description="Tu cuenta de Google ya está verificada. Solo faltan los datos públicos de tu restaurante."
    >
      <RestaurantOnboardingForm />
    </AuthShell>
  );
}
