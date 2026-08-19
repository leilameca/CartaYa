import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export default function RestaurantNotFound() {
  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-brand-gray px-6 py-12">
      <section className="w-full max-w-md text-center">
        <BrandLogo className="mx-auto w-40" priority />
        <div className="mx-auto mt-10 flex size-16 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange">
          <UtensilsCrossed className="size-8" />
        </div>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-brand-navy">Menú no encontrado</h1>
        <p className="mt-3 leading-7 text-slate-600">Revisa que el enlace o el código QR pertenezca a un restaurante activo en CartaYa.</p>
        <Link href="/" className="mt-7 inline-flex rounded-xl bg-brand-orange px-5 py-3 font-bold text-white">Ir a CartaYa</Link>
      </section>
    </main>
  );
}

