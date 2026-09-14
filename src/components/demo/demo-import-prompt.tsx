"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { importDemoAction } from "@/app/dashboard/demo-import/actions";
import { DEMO_STORAGE_KEY, type DemoState } from "@/lib/demo-menu";
import { clearDemoStorage, DEMO_PENDING_KEY } from "@/lib/demo-transfer";
import { Button } from "@/components/ui/button";

export function DemoImportPrompt({ userId }: { userId: string }) {
  const [draft, setDraft] = useState<DemoState | null>(null);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, startTransition] = useTransition();
  const router = useRouter();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        if (localStorage.getItem(DEMO_PENDING_KEY)) setDraft(JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || "null"));
      } catch { setError("No pudimos leer el demo. Vuelve al demo para revisarlo."); }
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  if (!draft) return error ? <p role="alert">{error}</p> : null;
  function backup() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(draft)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "cartaya-demo-respaldo.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function importMenu() {
    if (!draft) return;
    startTransition(async () => {
      try {
        const result = await importDemoAction({
          restaurant: { name: draft.restaurant.name, primaryColor: draft.restaurant.primaryColor, secondaryColor: draft.restaurant.secondaryColor, menuStyle: draft.restaurant.menuStyle },
          categories: draft.categories.map((c) => ({ id: c.id, name: c.name })),
          items: draft.items.map((i) => ({ name: i.name, description: i.description || "", price: i.price, categoryId: i.category_id, isOffer: i.offer_price !== null, offerPrice: i.offer_price, tag: i.tag || "", isAvailable: i.is_available })),
        });
        if (result.error) { setError(result.error); return; }
        try { clearDemoStorage(); localStorage.setItem(`cartaya_import_completed:${userId}`, "true"); } catch { /* Server receipt prevents duplicate imports. */ }
        setDraft(null);
        router.push("/dashboard/menu"); router.refresh();
      } catch { setError("No se pudo importar. Tu demo sigue guardado; inténtalo nuevamente."); }
    });
  }
  return <section className="m-4 rounded-2xl border bg-white p-5 shadow-sm" aria-label="Importar menú demo">
    <h2 className="text-xl font-bold">Encontramos el menú que estabas creando.</h2>
    <p className="mt-2 text-sm">Se importarán categorías, platos, precios, ofertas y disponibilidad. Se publicarán inmediatamente en el restaurante de esta cuenta, conservando su nombre y enlace.</p>
    <p className="mt-2 text-sm">Gratis permite 20 platos; los colores y estilos requieren Plus. Las fotos y el logo deberán subirse nuevamente. Descarga una copia para conservar las imágenes y toda la personalización antes de borrar el demo.</p>
    <div className="mt-3 flex flex-wrap gap-3"><Button variant="outline" onClick={backup}>Descargar copia completa</Button><Link className="underline" href="/demo">Adaptar demo</Link><Link className="underline" href="/dashboard/plan">Ver planes</Link></div>
    <label className="my-4 flex items-start gap-2 text-sm"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />Acepto importar según mi plan y volver a subir las imágenes. Ya conservé lo que necesito.</label>
    {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
    <div className="flex flex-wrap gap-2"><Button disabled={busy || !accepted} onClick={importMenu}>{busy ? "Importando…" : "Importar mi menú"}</Button><Button variant="outline" disabled={busy} onClick={() => { if (confirm("¿Descartar el demo local? No se borrará ningún dato de tu restaurante.")) { try { clearDemoStorage(); setDraft(null); } catch { setError("No pudimos borrar los datos del navegador."); } } }}>Empezar desde cero</Button></div>
  </section>;
}
