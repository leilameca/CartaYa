import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-brand-gray p-3 sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] w-full max-w-[1440px] overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-2xl shadow-brand-navy/10 sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[minmax(0,0.82fr)_minmax(520px,1.18fr)]">
        <section className="flex items-center justify-center px-6 py-9 sm:px-10 lg:px-14 xl:px-20">
          <div className="w-full max-w-md">
            <Link href="/" className="mb-8 flex justify-center lg:justify-start" aria-label="Ir al inicio de CartaYa">
              <BrandLogo className="w-40 sm:w-44" priority />
            </Link>
            <div>
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-brand-green">Panel de restaurantes</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">{title}</h1>
              <p className="mt-3 text-[15px] leading-6 text-slate-500">{description}</p>
              <div className="mt-8">{children}</div>
              {footer ? <div className="mt-7 text-center text-sm text-slate-500">{footer}</div> : null}
            </div>
          </div>
        </section>

        <aside className="relative hidden min-h-full overflow-hidden bg-brand-navy lg:block">
          <Image
            src="/login-restaurant-hero.png"
            alt="Restaurante moderno usando el menú digital CartaYa desde un teléfono"
            fill
            priority
            sizes="(min-width: 1280px) 58vw, 52vw"
            className="object-cover object-[58%_center]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand-navy/10 via-transparent to-brand-orange/5" />
        </aside>
      </div>
    </main>
  );
}
