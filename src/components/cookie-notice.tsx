"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "cartaya-cookie-notice-v1";

export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setVisible(window.localStorage.getItem(STORAGE_KEY) !== "acknowledged");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!visible) return null;

  return (
    <aside className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/20 sm:bottom-5 sm:flex sm:items-center sm:gap-5 sm:p-5" aria-label="Información sobre cookies">
      <div className="min-w-0 flex-1">
        <p className="font-black text-brand-navy">CartaYa usa solo cookies necesarias</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">Sirven para iniciar sesión, mantener la cuenta segura y recordar preferencias esenciales. No usamos cookies publicitarias.</p>
        <Link href="/cookies" className="mt-1 inline-block text-sm font-bold text-brand-orange hover:underline">Ver política de cookies</Link>
      </div>
      <button type="button" onClick={() => { window.localStorage.setItem(STORAGE_KEY, "acknowledged"); setVisible(false); }} className="mt-4 h-11 w-full rounded-xl bg-brand-navy px-5 text-sm font-black text-white sm:mt-0 sm:w-auto">Entendido</button>
    </aside>
  );
}
