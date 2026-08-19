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
    <main className="min-h-[100svh] bg-white">
      <div className="grid min-h-[100svh] w-full lg:grid-cols-[minmax(440px,0.82fr)_minmax(0,1.18fr)]">
        <section className="relative order-2 flex min-h-[68svh] items-center justify-center overflow-hidden px-6 py-8 sm:min-h-[62svh] sm:px-10 sm:py-12 lg:order-none lg:min-h-[100svh] lg:px-12 xl:px-20 2xl:px-24">
          <div className="pointer-events-none absolute -left-28 -top-28 size-72 rounded-full bg-brand-green/[0.06] blur-3xl lg:hidden" />
          <div className="pointer-events-none absolute -bottom-32 -right-24 size-80 rounded-full bg-brand-orange/[0.07] blur-3xl lg:hidden" />

          <div className="relative w-full max-w-[460px]">
            <Link href="/" className="mb-7 flex justify-center sm:mb-9 lg:justify-start" aria-label="Ir al inicio de CartaYa">
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

        <aside className="relative order-1 block h-[32svh] min-h-[220px] overflow-hidden bg-brand-navy sm:h-[38svh] lg:order-none lg:h-auto lg:min-h-[100svh]">
          <Image
            src="/login-restaurant-hero.png"
            alt="Restaurante moderno usando el menú digital CartaYa desde un teléfono"
            fill
            priority
            sizes="(min-width: 1024px) 59vw, 100vw"
            className="object-cover object-[62%_center] sm:object-[60%_center] lg:object-[62%_center]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand-navy/15 via-transparent to-brand-orange/5" />
        </aside>
      </div>
    </main>
  );
}
