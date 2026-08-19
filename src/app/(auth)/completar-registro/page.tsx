import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { RestaurantOnboardingForm } from "@/components/auth/restaurant-onboarding-form";
import { createClient } from "@/lib/supabase/server";

export default async function CompleteRegistrationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
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
