"use client";

/* Demo images are local data URLs or existing public assets and must bypass Next's optimizer. */
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye, FlaskConical, Palette, RotateCcw, UtensilsCrossed } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { MenuManager, type MenuEditorOperations } from "@/components/dashboard/menu-manager";
import { PublicMenuApp } from "@/components/public-menu/public-menu-app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ProductTour } from "@/components/demo/product-tour";
import { DEMO_PENDING_KEY } from "@/lib/demo-transfer";
import { createDemoSeed, createEmptyDemo, DEMO_RESTAURANT_ID, DEMO_STORAGE_KEY, isDemoState, toPublicMenu, type DemoState } from "@/lib/demo-menu";

const LOCAL_IMAGE_LIMIT = 1_500_000;

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function imageFrom(formData: FormData, current: string | null) {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { value: current };
  if (!file.type.startsWith("image/")) return { error: "Selecciona una imagen válida." };
  if (file.size > LOCAL_IMAGE_LIMIT) return { error: "En el demo, usa una foto de 1.5 MB o menos." };
  const value = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No pudimos leer la imagen."));
    reader.readAsDataURL(file);
  });
  return { value };
}

export function DemoWorkspace() {
  const router = useRouter();
  const [state, setState] = useState<DemoState>(() => {
    try {
      const saved = window.localStorage.getItem(DEMO_STORAGE_KEY);
      const parsed: unknown = saved ? JSON.parse(saved) : null;
      return isDemoState(parsed) ? parsed : createDemoSeed();
    } catch {
      return createDemoSeed();
    }
  });
  const [view, setView] = useState<"editor" | "preview">("editor");
  const [storageError, setStorageError] = useState<string | null>(null);
  const [conversion, setConversion] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage quotas or private browsing must not block the in-memory demo.
    }
  }, [state]);

  const operations = useMemo<MenuEditorOperations>(() => ({
    async createCategory(formData) {
      const name = textValue(formData, "name");
      if (!name) return { error: "Escribe el nombre de la categoría." };
      if (state.categories.some((entry) => entry.name.toLocaleLowerCase("es") === name.toLocaleLowerCase("es"))) return { error: "Ya existe una categoría con ese nombre." };
      setState((current) => ({ ...current, categories: [...current.categories, { id: crypto.randomUUID(), restaurant_id: DEMO_RESTAURANT_ID, name, display_order: current.categories.length }] }));
      return { success: "Categoría creada en el demo." };
    },
    async renameCategory(formData) {
      const id = textValue(formData, "categoryId");
      const name = textValue(formData, "name");
      if (!name) return { error: "Escribe el nombre de la categoría." };
      if (state.categories.some((entry) => entry.id !== id && entry.name.toLocaleLowerCase("es") === name.toLocaleLowerCase("es"))) return { error: "Ya existe una categoría con ese nombre." };
      setState((current) => ({ ...current, categories: current.categories.map((entry) => entry.id === id ? { ...entry, name } : entry) }));
      return { success: "Categoría actualizada en el demo." };
    },
    async moveCategory(categoryId, direction) {
      const index = state.categories.findIndex((entry) => entry.id === categoryId);
      const target = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= state.categories.length) return { success: "Orden actualizado." };
      const reordered = [...state.categories];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      setState((current) => ({ ...current, categories: reordered.map((entry, position) => ({ ...entry, display_order: position })) }));
      return { success: "Orden actualizado en el demo." };
    },
    async deleteCategory(categoryId, confirmationId) {
      if (categoryId !== confirmationId) return { error: "No se pudo confirmar la categoría." };
      setState((current) => ({
        ...current,
        categories: current.categories.filter((entry) => entry.id !== categoryId).map((entry, position) => ({ ...entry, display_order: position })),
        items: current.items.filter((entry) => entry.category_id !== categoryId),
      }));
      return { success: "Categoría eliminada del demo." };
    },
    async createMenuItem(formData) {
      const values = parseDish(formData);
      if ("error" in values) return values;
      const image = await imageFrom(formData, null);
      if (image.error) return { error: image.error };
      const order = state.items.filter((entry) => entry.category_id === values.categoryId).length;
      setState((current) => ({
        ...current,
        items: [...current.items, {
          id: crypto.randomUUID(), restaurant_id: DEMO_RESTAURANT_ID, category_id: values.categoryId,
          name: values.name, description: values.description, price: values.price, offer_price: values.offerPrice,
          image_url: image.value ?? null, is_available: values.isAvailable, tag: values.tag, display_order: order,
        }],
      }));
      return { success: "Plato agregado al demo." };
    },
    async updateMenuItem(formData) {
      const id = textValue(formData, "menuItemId");
      const currentItem = state.items.find((entry) => entry.id === id);
      if (!currentItem) return { error: "El plato ya no existe." };
      const values = parseDish(formData);
      if ("error" in values) return values;
      const image = await imageFrom(formData, currentItem.image_url);
      if (image.error) return { error: image.error };
      setState((current) => ({
        ...current,
        items: current.items.map((entry) => entry.id === id ? {
          ...entry, category_id: values.categoryId, name: values.name, description: values.description,
          price: values.price, offer_price: values.offerPrice, image_url: image.value ?? null,
          is_available: values.isAvailable, tag: values.tag,
        } : entry),
      }));
      return { success: "Plato actualizado en el demo." };
    },
    async setMenuItemAvailability(menuItemId, isAvailable) {
      setState((current) => ({ ...current, items: current.items.map((entry) => entry.id === menuItemId ? { ...entry, is_available: isAvailable } : entry) }));
      return { success: "Disponibilidad actualizada en el demo." };
    },
    async deleteMenuItem(menuItemId, confirmationId) {
      if (menuItemId !== confirmationId) return { error: "No se pudo confirmar el plato." };
      setState((current) => ({ ...current, items: current.items.filter((entry) => entry.id !== menuItemId) }));
      return { success: "Plato eliminado del demo." };
    },
  }), [state]);

  const publicMenu = useMemo(() => toPublicMenu(state), [state]);

  async function updateLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > LOCAL_IMAGE_LIMIT) {
      setStorageError("Usa un logo válido de 1.5 MB o menos en el demo.");
      return;
    }
    const formData = new FormData();
    formData.set("image", file);
    const image = await imageFrom(formData, null);
    if (image.value) setState((current) => ({ ...current, restaurant: { ...current.restaurant, logoUrl: image.value ?? null } }));
  }

  function startFromScratch() {
    if (!window.confirm("¿Empezar desde cero? Se eliminarán los datos guardados de este demo en el navegador.")) return;
    window.localStorage.removeItem(DEMO_STORAGE_KEY);
    setState(createEmptyDemo());
    setView("editor");
  }

  return (
    <div className="min-h-screen bg-brand-gray text-brand-navy" style={{ "--brand-orange": state.restaurant.primaryColor, "--brand-green": state.restaurant.secondaryColor } as React.CSSProperties}>
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
        <div className="flex flex-wrap items-center justify-center gap-2 p-2" data-tour="welcome">
          <ProductTour prepare={() => setView("editor")} />
          <Button data-tour="publish" onClick={() => setConversion(true)}>Guardar y publicar</Button>
          <span className="text-xs text-slate-500">Tu demo aún no está publicado.</span>
        </div>
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3"><Link href="/" aria-label="Volver al inicio"><BrandLogo className="w-28" priority /></Link><span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-brand-orange"><FlaskConical className="size-3.5" />Modo demo</span></div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={startFromScratch} className="gap-2"><RotateCcw className="size-4" />Empezar desde cero</Button>
            <Button asChild variant="outline" size="sm"><Link href="/"><ArrowLeft className="mr-2 size-4" />Salir</Link></Button>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3 sm:px-6 lg:px-8">
          <Button type="button" size="sm" variant={view === "editor" ? "default" : "outline"} onClick={() => setView("editor")} className="shrink-0 gap-2"><UtensilsCrossed className="size-4" />Editar menú</Button>
          <Button data-tour="preview" type="button" size="sm" variant={view === "preview" ? "default" : "outline"} onClick={() => setView("preview")} className="shrink-0 gap-2"><Eye className="size-4" />Vista del cliente</Button>
        </div>
      </header>

      {storageError ? <p role="alert" className="mx-auto mt-4 max-w-7xl px-4 text-sm font-semibold text-amber-800 sm:px-6 lg:px-8">{storageError}</p> : null}

      {view === "editor" ? (
        <>
          <section data-tour="identity" className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
            <div className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2"><Palette className="size-5 text-brand-orange" /><h1 className="text-lg font-black">Identidad del restaurante</h1><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase text-brand-green">Pro desbloqueado</span></div>
              <div data-tour="appearance" className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <label className="text-sm font-bold lg:col-span-2">Nombre<Input value={state.restaurant.name} maxLength={120} onChange={(event) => setState((current) => ({ ...current, restaurant: { ...current.restaurant, name: event.target.value } }))} className="mt-2" /></label>
                <label className="text-sm font-bold">Color principal<input type="color" value={state.restaurant.primaryColor} onChange={(event) => setState((current) => ({ ...current, restaurant: { ...current.restaurant, primaryColor: event.target.value } }))} className="mt-2 block h-10 w-full cursor-pointer rounded-md border p-1" /></label>
                <label className="text-sm font-bold">Color secundario<input type="color" value={state.restaurant.secondaryColor} onChange={(event) => setState((current) => ({ ...current, restaurant: { ...current.restaurant, secondaryColor: event.target.value } }))} className="mt-2 block h-10 w-full cursor-pointer rounded-md border p-1" /></label>
                <label className="text-sm font-bold">Estilo<select value={state.restaurant.menuStyle} onChange={(event) => setState((current) => ({ ...current, restaurant: { ...current.restaurant, menuStyle: event.target.value as DemoState["restaurant"]["menuStyle"] } }))} className="mt-2 h-10 w-full rounded-md border bg-white px-3"><option value="moderno">Moderno</option><option value="clasico">Clásico</option><option value="calido">Cálido</option></select></label>
              </div>
              <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center"><div><Label htmlFor="demo-logo">Logo temporal</Label><Input id="demo-logo" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={updateLogo} className="mt-2 max-w-sm" /></div>{state.restaurant.logoUrl ? <img src={state.restaurant.logoUrl} alt="Logo temporal" className="size-16 rounded-xl border object-contain" /> : null}<p className="text-xs text-slate-500">Se guarda solo en este navegador. Máximo 1.5 MB.</p></div>
            </div>
          </section>
          <MenuManager restaurantName={state.restaurant.name || "Mi restaurante"} tier="pro" categories={state.categories} items={state.items} r2Configured operations={operations} />
        </>
      ) : (
        <div className="relative">
          <div className="sticky top-[7.25rem] z-40 border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-xs font-bold text-emerald-800">Vista simulada · pedidos, meseros y WhatsApp no contactan servicios reales</div>
          <PublicMenuApp initialMenu={publicMenu} mode="demo" />
        </div>
      )}
      <Dialog open={conversion} onOpenChange={setConversion}><DialogContent><DialogTitle>Tu menú está listo</DialogTitle><DialogDescription>Crea una cuenta gratis para guardarlo y publicarlo.</DialogDescription><Button onClick={() => {
        try { localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state)); localStorage.setItem(DEMO_PENDING_KEY, "true"); router.push("/registro?from=demo"); }
        catch { setConversion(false); setStorageError("No pudimos guardar el demo. Reduce las imágenes o habilita el almacenamiento antes de registrarte."); }
      }}>Crear cuenta</Button><Button variant="outline" onClick={() => setConversion(false)}>Seguir probando</Button></DialogContent></Dialog>
    </div>
  );
}

function parseDish(formData: FormData) {
  const name = textValue(formData, "name");
  const categoryId = textValue(formData, "categoryId");
  const price = Number(textValue(formData, "price"));
  const isOffer = formData.get("isOffer") === "true";
  const offerValue = textValue(formData, "offerPrice");
  const offerPrice = isOffer ? Number(offerValue) : null;
  const tagValue = textValue(formData, "tag");
  if (!name) return { error: "Escribe el nombre del plato." } as const;
  if (!categoryId) return { error: "Selecciona una categoría." } as const;
  if (!Number.isFinite(price) || price < 0) return { error: "Escribe un precio válido." } as const;
  if (isOffer && (offerPrice === null || !Number.isFinite(offerPrice) || offerPrice >= price)) return { error: "El precio de oferta debe ser menor que el precio regular." } as const;
  return {
    name,
    categoryId,
    price,
    description: textValue(formData, "description") || null,
    offerPrice,
    tag: tagValue === "popular" || tagValue === "nuevo" ? tagValue as "popular" | "nuevo" : null,
    isAvailable: formData.get("isAvailable") !== "false",
  };
}
