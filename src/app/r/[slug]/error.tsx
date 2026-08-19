"use client";

import { WifiOff } from "lucide-react";

export default function PublicMenuError({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-brand-gray px-6 text-center">
      <section className="max-w-sm">
        <WifiOff className="mx-auto size-12 text-brand-orange" />
        <h1 className="mt-5 text-2xl font-bold text-brand-navy">No pudimos cargar el menú</h1>
        <p className="mt-2 text-slate-600">Comprueba tu conexión. Si ya visitaste este menú, CartaYa intentará mostrar la última versión guardada.</p>
        <button onClick={reset} className="mt-6 rounded-xl bg-brand-orange px-5 py-3 font-bold text-white">Intentar otra vez</button>
      </section>
    </main>
  );
}

