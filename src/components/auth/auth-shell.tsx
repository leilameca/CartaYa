import Link from "next/link";
import { CheckCircle2, QrCode, Smartphone, UtensilsCrossed } from "lucide-react";
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
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] w-full max-w-7xl overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-2xl shadow-brand-navy/10 sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[minmax(0,0.9fr)_minmax(440px,1.1fr)]">
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

        <aside className="relative hidden overflow-hidden bg-brand-navy p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="absolute -right-24 -top-24 size-80 rounded-full bg-brand-orange/25 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 size-80 rounded-full bg-brand-green/25 blur-3xl" />
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
              <UtensilsCrossed className="size-4 text-brand-orange" />
              Menús digitales hechos para vender
            </span>
            <h2 className="mt-7 max-w-lg text-4xl font-extrabold leading-tight tracking-tight xl:text-5xl">
              Tu restaurante, listo para recibir pedidos.
            </h2>
            <p className="mt-4 max-w-lg text-base leading-7 text-white/70">
              Administra tu menú, comparte tu QR y mantén cada mesa conectada desde un solo lugar.
            </p>
          </div>

          <div className="relative z-10 my-10 flex min-h-72 items-center justify-center">
            <div className="absolute left-[8%] top-[18%] rounded-2xl border border-white/10 bg-white/10 p-4 shadow-xl backdrop-blur-md">
              <QrCode className="size-16 text-white" strokeWidth={1.7} />
            </div>
            <div className="relative w-56 rounded-[2.5rem] border-[7px] border-white/15 bg-brand-gray p-3 shadow-2xl shadow-black/30 xl:w-64">
              <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-brand-navy/20" />
              <div className="rounded-[1.75rem] bg-white p-4 text-brand-navy">
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-brand-orange/15"><UtensilsCrossed className="size-5 text-brand-orange" /></span>
                  <div><p className="text-xs text-slate-400">Menú digital</p><p className="text-sm font-bold">CartaYa</p></div>
                </div>
                {["Especial del chef", "Favoritos", "Bebidas"].map((item, index) => (
                  <div key={item} className="mb-2.5 flex items-center gap-3 rounded-xl bg-brand-gray p-2.5">
                    <span className={`size-9 rounded-lg ${index === 1 ? "bg-brand-green/20" : "bg-brand-orange/20"}`} />
                    <div className="flex-1"><p className="text-xs font-bold">{item}</p><p className="mt-1 h-1 w-12 rounded bg-slate-200" /></div>
                    <CheckCircle2 className="size-4 text-brand-green" />
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute bottom-[12%] right-[5%] flex items-center gap-3 rounded-2xl border border-white/10 bg-white p-4 text-brand-navy shadow-xl">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-green/15"><Smartphone className="size-5 text-brand-green" /></span>
              <div><p className="text-xs text-slate-400">Disponible siempre</p><p className="text-sm font-extrabold">Mobile-first</p></div>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-3 text-center">
            {["QR instantáneo", "Menú editable", "Pedidos ágiles"].map((item) => (
              <div key={item} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs font-semibold text-white/80">{item}</div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
