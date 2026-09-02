import { redirect } from "next/navigation";
import { Check, Crown, LockKeyhole, Sparkles, X } from "lucide-react";
import { requestPlanChangeAction } from "@/app/dashboard/plan/actions";
import { Button } from "@/components/ui/button";
import { planCatalog, planComparisonFeatures, planNames, planOrder, type SubscriptionTier } from "@/lib/subscriptions";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const plans = planOrder.map((id) => ({ id, ...planCatalog[id], accent: id === "gratis" ? "border-slate-200" : id === "plus" ? "border-brand-orange" : "border-brand-green" }));

function FeatureValue({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="mx-auto size-5 text-brand-green" aria-label="Incluido" />;
  if (value === false) return <X className="mx-auto size-5 text-slate-300" aria-label="No incluido" />;
  return <span className="text-xs font-bold text-brand-navy sm:text-sm">{value}</span>;
}

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ required?: string; requested?: string; error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role, restaurants(subscription_tier, plan_notifications_whatsapp)").eq("id", user.id).single();
  if (!profile) redirect("/completar-registro");
  const relation = profile.restaurants as unknown as { subscription_tier: SubscriptionTier; plan_notifications_whatsapp: boolean } | { subscription_tier: SubscriptionTier; plan_notifications_whatsapp: boolean }[] | null;
  const restaurant = Array.isArray(relation) ? relation[0] : relation;
  const current = restaurant?.subscription_tier ?? "gratis";

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      {params.required === "pro" ? <PlanAlert icon={<Crown className="size-5" />} text="Cocina, usuarios del equipo, meseros y solicitudes de mesa requieren el plan Pro." /> : null}
      {params.required === "plus" ? <PlanAlert icon={<LockKeyhole className="size-5" />} text="La personalización pública, los pedidos, su historial y los QR por mesa requieren Plus o Pro." /> : null}
      {params.requested ? <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">Solicitud enviada. Revisaremos el cambio y te contactaremos antes de activarlo.</div> : null}
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
              <p className="mt-2 text-2xl font-black text-brand-orange">RD$ {plan.price.toLocaleString("es-DO")}<span className="text-xs font-semibold text-slate-400"> / mes</span></p>
              <p className="mt-2 min-h-10 text-sm text-slate-500">{plan.description}</p>
              <ul className="mt-4 min-h-28 space-y-2">{plan.featuredBenefits.map((benefit) => <li key={benefit} className="flex items-start gap-2 text-xs font-bold text-slate-600"><Check className="mt-0.5 size-3.5 shrink-0 text-brand-green" />{benefit}</li>)}</ul>
              {active ? (
                <Button disabled className="mt-6 w-full rounded-xl bg-brand-green">Plan actual</Button>
              ) : profile.role === "owner" ? (
                <form action={requestPlanChangeAction} className="mt-6">
                  <input type="hidden" name="tier" value={plan.id} />
                  <label className="mb-3 flex items-start gap-2 text-xs font-semibold leading-5 text-slate-600">
                    <input name="notifyWhatsApp" type="checkbox" defaultChecked={restaurant?.plan_notifications_whatsapp ?? false} className="mt-0.5 size-4 rounded border-slate-300 accent-brand-green" />
                    Avisarme también por WhatsApp al número registrado del restaurante.
                  </label>
                  <Button className={cn("w-full gap-2 rounded-xl", plan.id === "pro" ? "bg-brand-green hover:bg-brand-green/90" : "bg-brand-orange hover:bg-brand-orange/90")}><Sparkles className="size-4" />Solicitar {planNames[plan.id]}</Button>
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
            <tbody>{planComparisonFeatures.map((feature) => <tr key={feature.label} className="border-t"><th className="px-5 py-4 text-sm font-semibold text-slate-600 sm:px-7">{feature.label}</th>{plans.map((plan) => <td key={plan.id} className={cn("px-4 py-4 text-center", current === plan.id && "bg-brand-orange/[0.04]")}><FeatureValue value={feature[plan.id]} /></td>)}</tr>)}</tbody>
          </table>
        </div>
      </section>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-900 sm:flex-row sm:items-center sm:justify-between"><span><strong>Activación manual:</strong> tu plan no cambia hasta que aprobemos la solicitud. La solicitud llega directamente al panel de CartaYa.</span>{process.env.NEXT_PUBLIC_SALES_WHATSAPP ? <a className="rounded-xl bg-brand-navy px-4 py-2 text-center font-bold text-white" href={`https://wa.me/${process.env.NEXT_PUBLIC_SALES_WHATSAPP}`} target="_blank" rel="noreferrer">Contactar por WhatsApp</a> : null}</div>
    </main>
  );
}

function PlanAlert({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="mb-6 flex items-center gap-3 rounded-2xl border border-brand-orange/25 bg-brand-orange/10 px-5 py-4 text-sm font-semibold text-brand-navy"><span className="text-brand-orange">{icon}</span>{text} Mejora tu plan para acceder.</div>;
}
