import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export function LegalShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#fafaf8] text-brand-navy">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/"><BrandLogo className="w-32" priority /></Link>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-brand-orange"><ArrowLeft className="size-4" />Volver al inicio</Link>
        </div>
      </header>
      <section className="border-b bg-white px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-brand-green"><ShieldCheck className="size-4" />{eyebrow}</p>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">{description}</p>
          <p className="mt-5 text-sm font-semibold text-slate-400">Última actualización: 31 de agosto de 2026</p>
        </div>
      </section>
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="space-y-10 text-[15px] leading-7 text-slate-700 [&_a]:font-bold [&_a]:text-brand-orange [&_a]:underline-offset-4 hover:[&_a]:underline [&_h2]:text-2xl [&_h2]:font-black [&_h2]:tracking-tight [&_h2]:text-brand-navy [&_h3]:text-lg [&_h3]:font-black [&_h3]:text-brand-navy [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:space-y-2">
          {children}
        </div>
      </article>
      <footer className="border-t bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-6 gap-y-3 px-4 py-8 text-sm font-bold text-slate-500 sm:px-6">
          <Link href="/privacidad">Privacidad</Link><Link href="/cookies">Cookies</Link><Link href="/seguridad">Seguridad</Link><Link href="/terminos">Términos</Link>
        </div>
      </footer>
    </main>
  );
}
