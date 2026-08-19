import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ required?: string }> }) {
  const { required } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("restaurants(subscription_tier)")
    .eq("id", user?.id ?? "00000000-0000-0000-0000-000000000000")
    .maybeSingle();
  const relation = profile?.restaurants as unknown as { subscription_tier: "gratis" | "plus" | "pro" } | { subscription_tier: "gratis" | "plus" | "pro" }[] | null;
  const restaurant = Array.isArray(relation) ? relation[0] : relation;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {required === "pro" ? (
        <div className="mb-6 rounded-2xl border border-brand-orange/25 bg-brand-orange/10 px-5 py-4 text-sm font-semibold text-brand-navy">
          La Pantalla de Cocina en tiempo real requiere el plan Pro. Mejora tu plan para acceder al KDS.
        </div>
      ) : null}
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-green">Suscripción</p>
      <h1 className="mt-2 text-3xl font-bold text-brand-navy">Mi plan</h1>
      <div className="mt-8 max-w-xl rounded-3xl border border-brand-orange/20 bg-white p-8 shadow-sm">
        <span className="rounded-full bg-brand-orange/10 px-3 py-1 text-xs font-bold uppercase text-brand-orange">Plan {restaurant?.subscription_tier ?? "gratis"}</span>
        <h2 className="mt-5 text-2xl font-bold text-brand-navy">Tu suscripción actual</h2>
        <p className="mt-2 text-slate-600">La gestión y contratación de planes estará disponible en la etapa de pagos.</p>
        <div className="mt-6 flex items-center gap-2 text-sm font-medium text-brand-green"><CheckCircle2 className="h-5 w-5" />La protección de límites ya está activa</div>
      </div>
    </main>
  );
}
