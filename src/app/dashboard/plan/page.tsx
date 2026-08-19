import { redirect } from "next/navigation";
import { Check, Crown, LockKeyhole, Sparkles, X } from "lucide-react";
import { changeDemoPlanAction } from "@/app/dashboard/plan/actions";
import { Button } from "@/components/ui/button";
import { planNames, type SubscriptionTier } from "@/lib/subscriptions";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const plans: Array<{ id: SubscriptionTier; description: string; accent: string }> = [
  { id: "gratis", description: "Para publicar tu primer menú digital", accent: "border-slate-200" },
  { id: "plus", description: "Para recibir y organizar pedidos por mesa", accent: "border-brand-orange" },
  { id: "pro", description: "Para operar cocina y salón en tiempo real", accent: "border-brand-green" },
];

const features = [
  { label: "Menú digital PWA", gratis: true, plus: true, pro: true },
  { label: "Cantidad de platos", gratis: "Hasta 20", plus: "Ilimitados", pro: "Ilimitados" },
  { label: "QR general", gratis: true, plus: true, pro: true },
  { label: "QR por mesa", gratis: false, plus: true, pro: true },
  { label: "Pedidos automáticos + WhatsApp", gratis: false, plus: true, pro: true },
  { label: "Historial y gestión de pedidos", gratis: false, plus: true, pro: true },
  { label: "Pantalla de Cocina (KDS)", gratis: false, plus: false, pro: true },
  { label: "Reportes avanzados", gratis: false, plus: false, pro: true },
] as const;

function FeatureValue({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="mx-auto size-5 text-brand-green" aria-label="Incluido" />;
  if (value === false) return <X className="mx-auto size-5 text-slate-300" aria-label="No incluido" />;
  return <span className="text-xs font-bold text-brand-navy sm:text-sm">{value}</span>;
}

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ required?: string; changed?: string; error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role, restaurants(subscription_tier)").eq("id", user.id).single();
  if (!profile) redirect("/completar-registro");
  const relation = profile.restaurants as unknown as { subscription_tier: SubscriptionTier } | { subscription_tier: SubscriptionTier }[] | null;
  const restaurant = Array.isArray(relation) ? relation[0] : relation;
  const current = restaurant?.subscription_tier ?? "gratis";

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      {params.required === "pro" ? <PlanAlert icon={<Crown className="size-5" />} text="La Pantalla de Cocina en tiempo real requiere el plan Pro." /> : null}
      {params.required === "plus" ? <PlanAlert icon={<LockKeyhole className="size-5" />} text="Los pedidos automáticos, su historial y los QR por mesa requieren Plus o Pro." /> : null}
      {params.changed ? <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">Plan cambiado a {planNames[current]}. Los permisos ya están actualizados.</div> : null}
      {params.error ? <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">No se pudo cambiar el plan. Solo la cuenta propietaria puede hacerlo.</div> : null}

      <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-green">Suscripción</p>
      <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><h1 className="text-3xl font-black tracking-tight text-brand-navy sm:text-4xl">Elige cómo crecer</h1><p className="mt-2 max-w-2xl text-slate-600">Los permisos se aplican en el panel, las acciones del servidor y la base de datos.</p></div>
        <span className="w-fit rounded-full bg-brand-navy px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-white">Plan actual: {planNames[current]}</span>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const active = plan.id === current;
          return (
            <article key={plan.id} className={cn("relative overflow-hidden rounded-3xl border-2 bg-white p-6 shadow-sm", active ? "border-brand-orange ring-4 ring-brand-orange/10" : plan.accent)}>
              {plan.id === "pro" ? <Crown className="absolute right-5 top-5 size-6 text-amber-500" /> : null}
              <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-brand-green">Plan</p>
              <h2 className="mt-2 text-3xl font-black text-brand-navy">{planNames[plan.id]}</h2>
              <p className="mt-2 min-h-10 text-sm text-slate-500">{plan.description}</p>
              {active ? (
                <Button disabled className="mt-6 w-full rounded-xl bg-brand-green">Plan actual</Button>
              ) : profile.role === "owner" ? (
                <form action={changeDemoPlanAction} className="mt-6">
                  <input type="hidden" name="tier" value={plan.id} />
                  <Button className={cn("w-full gap-2 rounded-xl", plan.id === "pro" ? "bg-brand-green hover:bg-brand-green/90" : "bg-brand-orange hover:bg-brand-orange/90")}><Sparkles className="size-4" />Cambiar a {planNames[plan.id]}</Button>
                </form>
              ) : <Button disabled className="mt-6 w-full rounded-xl">Solo el propietario</Button>}
            </article>
          );
        })}
      </div>

      <section className="mt-8 overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="border-b px-5 py-5 sm:px-7"><h2 className="text-xl font-black text-brand-navy">Comparación completa</h2><p className="mt-1 text-sm text-slate-500">Lo que incluye cada nivel de CartaYa.</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left">
            <thead><tr className="bg-slate-50"><th className="px-5 py-4 text-sm font-bold text-brand-navy sm:px-7">Función</th>{plans.map((plan) => <th key={plan.id} className={cn("px-4 py-4 text-center text-sm font-black", current === plan.id ? "bg-brand-orange/10 text-brand-orange" : "text-brand-navy")}>{planNames[plan.id]}{current === plan.id ? <span className="ml-2 rounded-full bg-brand-orange px-2 py-0.5 text-[9px] text-white">ACTUAL</span> : null}</th>)}</tr></thead>
            <tbody>{features.map((feature) => <tr key={feature.label} className="border-t"><th className="px-5 py-4 text-sm font-semibold text-slate-600 sm:px-7">{feature.label}</th>{plans.map((plan) => <td key={plan.id} className={cn("px-4 py-4 text-center", current === plan.id && "bg-brand-orange/[0.04]")}><FeatureValue value={feature[plan.id]} /></td>)}</tr>)}</tbody>
          </table>
        </div>
      </section>

      <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-900"><strong>Modo de prueba:</strong> estos botones cambian el nivel real en Supabase sin realizar un cobro. Se reemplazarán por la pasarela de pago antes del lanzamiento comercial.</div>
    </main>
  );
}

function PlanAlert({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="mb-6 flex items-center gap-3 rounded-2xl border border-brand-orange/25 bg-brand-orange/10 px-5 py-4 text-sm font-semibold text-brand-navy"><span className="text-brand-orange">{icon}</span>{text} Mejora tu plan para acceder.</div>;
}
