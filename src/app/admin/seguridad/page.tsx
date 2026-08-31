import { redirect } from "next/navigation";
import { logoutAction } from "@/app/(auth)/actions";
import { SuperadminMfa } from "@/components/auth/superadmin-mfa";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { requireSuperadmin } from "@/lib/auth/superadmin";

export default async function SuperadminSecurityPage() {
  const { assurance } = await requireSuperadmin({ requireAal2: false });
  if (assurance.currentLevel === "aal2") redirect("/admin");

  return <main className="min-h-screen bg-[#fafaf8] px-4 py-8 sm:py-14"><div className="mx-auto max-w-lg">
    <div className="mb-7 flex items-center justify-between"><BrandLogo className="w-36" priority /><form action={logoutAction}><Button type="submit" variant="outline">Salir</Button></form></div>
    <section className="rounded-3xl border bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-green">Seguridad del superadministrador</p>
      <h1 className="mt-3 text-3xl font-black tracking-tight text-brand-navy">Verificación en dos pasos</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">CartaYa exige un código temporal antes de mostrar información global o permitir cambios de plan.</p>
      <div className="mt-7"><SuperadminMfa /></div>
    </section>
  </div></main>;
}
