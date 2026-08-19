import { WifiOff } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export default function OfflinePage() {
  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-brand-gray px-6 text-center">
      <section className="max-w-sm">
        <BrandLogo className="mx-auto w-40" priority />
        <WifiOff className="mx-auto mt-10 size-12 text-brand-orange" />
        <h1 className="mt-5 text-2xl font-extrabold text-brand-navy">Estás sin conexión</h1>
        <p className="mt-2 leading-6 text-slate-600">Visita el menú una vez con internet para que CartaYa pueda conservar una copia básica en este dispositivo.</p>
      </section>
    </main>
  );
}

