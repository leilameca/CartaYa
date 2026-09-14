"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const steps = [
  ["welcome", "Bienvenido a CartaYa", "Crea y personaliza tu menú digital en minutos."],
  ["identity", "La identidad de tu negocio", "Tu nombre identifica el restaurante. Puedes cambiar logo e identidad desde Personalización (Plus)."],
  ["categories", "Organiza tu menú", "Crea categorías como Entradas, Bebidas y Postres para organizar tus platos."],
  ["products", "Agrega tus platos", "Incluye fotos, descripciones, precios, ofertas y disponibilidad."],
  ["appearance", "Dale tu estilo", "Prueba colores y estilos. La personalización del menú real está disponible desde Plus."],
  ["preview", "Vista del cliente", "En el demo puedes abrir la vista del cliente. En tu cuenta, usa el enlace del menú de la barra superior."],
  ["publish", "Publica y comparte", "En demo, Guardar y publicar te permite crear una cuenta e importar. En tu cuenta los cambios se publican al guardar; comparte el enlace o QR."],
];

export function ProductTour({ userId, prepare }: { userId?: string; prepare?: () => void }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const key = userId ? `cartaya_onboarding_completed:${userId}` : "cartaya_demo_onboarding_completed";
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (!localStorage.getItem(key)) {
          if (userId && localStorage.getItem("cartaya_demo_import_pending")) return;
          if (userId && pathname !== "/dashboard/menu") { router.push("/dashboard/menu"); return; }
          setOpen(true);
        }
      } catch { /* Manual help remains available when storage is blocked. */ }
    }, 500);
    return () => clearTimeout(timer);
  }, [key, pathname, router, userId]);
  useEffect(() => {
    if (!open) return;
    const targets = [...document.querySelectorAll<HTMLElement>(`[data-tour="${steps[index][0]}"]`)];
    const target = targets.find((node) => node.getClientRects().length > 0);
    if (!target) return;
    target.scrollIntoView({ block: "center", behavior: "instant" });
    const previous = target.style.outline;
    target.style.outline = "3px solid #FF6B35";
    return () => { target.style.outline = previous; };
  }, [index, open, pathname]);
  function close() { setOpen(false); try { localStorage.setItem(key, "true"); } catch {} }
  return <>
    <Button size="sm" variant="ghost" onClick={() => { prepare?.(); if (userId && pathname !== "/dashboard/menu") router.push("/dashboard/menu"); setIndex(0); setOpen(true); }}>Ayuda → Ver recorrido</Button>
    <Dialog open={open} onOpenChange={(value) => { if (!value) close(); }}>
      <DialogContent className="top-auto bottom-4 max-h-[45dvh] translate-y-0 sm:bottom-6" aria-describedby="tour-description">
        <p className="text-xs font-bold text-brand-green">Paso {index + 1} de {steps.length}</p>
        <DialogTitle>{steps[index][1]}</DialogTitle>
        <DialogDescription id="tour-description">{steps[index][2]}</DialogDescription>
        <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={index === 0} onClick={() => setIndex(index - 1)}>Anterior</Button><Button onClick={() => index === steps.length - 1 ? close() : setIndex(index + 1)}>{index === steps.length - 1 ? "Finalizar" : "Siguiente"}</Button><Button variant="ghost" onClick={close}>Saltar recorrido</Button></div>
      </DialogContent>
    </Dialog>
  </>;
}
