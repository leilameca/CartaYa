"use client";

/* R2 serves immutable public assets directly; avoiding Next's proxy keeps image delivery on Cloudflare. */
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, ReactNode, useMemo, useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChefHat,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import {
  createCategoryAction,
  createMenuItemAction,
  deleteCategoryAction,
  deleteMenuItemAction,
  moveCategoryAction,
  renameCategoryAction,
  setMenuItemAvailabilityAction,
  updateMenuItemAction,
  type MenuActionResult,
} from "@/app/dashboard/menu/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MAX_MENU_IMAGE_BYTES, MENU_IMAGE_ACCEPT } from "@/lib/menu-images";
import type { Tables } from "@/types/database";

type Category = Tables<"categories">;
type MenuItem = Tables<"menu_items">;
type Tier = "gratis" | "plus" | "pro";

const FREE_PLAN_LIMIT_MESSAGE = "Llegaste al límite del plan Gratis — mejora tu plan para agregar más";

function ActionMessage({ result }: { result: MenuActionResult | null }) {
  if (!result?.error && !result?.success) return null;
  return (
    <p role="status" className={`rounded-lg px-3 py-2 text-sm ${result.error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
      {result.error ?? result.success}
    </p>
  );
}

async function compressLargeImage(file: File) {
  if (file.size <= MAX_MENU_IMAGE_BYTES) return file;

  const bitmap = await createImageBitmap(file);
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No pudimos procesar la foto.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  if (!blob || blob.size > MAX_MENU_IMAGE_BYTES) throw new Error("La foto es demasiado grande. Elige una de 3 MB o menos.");
  return new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
}

function CategoryDialog({ category, trigger }: { category?: Category; trigger: ReactNode }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<MenuActionResult | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (category) formData.set("categoryId", category.id);
    startTransition(async () => {
      const response = category ? await renameCategoryAction(formData) : await createCategoryAction(formData);
      setResult(response);
      if (response.success) {
        formRef.current?.reset();
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (value) setResult(null); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Renombrar categoría" : "Nueva categoría"}</DialogTitle>
          <DialogDescription>Las categorías ayudan a organizar los platos del menú.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`category-name-${category?.id ?? "new"}`}>Nombre</Label>
            <Input id={`category-name-${category?.id ?? "new"}`} name="name" defaultValue={category?.name} placeholder="Ej. Entradas" maxLength={80} autoFocus required />
          </div>
          <ActionMessage result={result} />
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
            <Button type="submit" disabled={pending}>{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{category ? "Guardar nombre" : "Crear categoría"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirm({
  trigger,
  title,
  description,
  action,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  action: () => Promise<MenuActionResult>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<MenuActionResult | null>(null);

  return (
    <AlertDialog open={open} onOpenChange={(value) => { setOpen(value); if (value) setResult(null); }}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <ActionMessage result={result} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              startTransition(async () => {
                const response = await action();
                setResult(response);
                if (response.success) {
                  setOpen(false);
                  router.refresh();
                }
              });
            }}
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sí, eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DishDialog({
  item,
  categories,
  r2Configured,
  trigger,
}: {
  item?: MenuItem;
  categories: Category[];
  r2Configured: boolean;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState(item?.is_available ?? true);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<MenuActionResult | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    startTransition(async () => {
      try {
        const formData = new FormData(form);
        formData.set("isAvailable", String(available));
        if (item) formData.set("menuItemId", item.id);

        const image = formData.get("image");
        if (image instanceof File && image.size > 0) {
          const processed = await compressLargeImage(image);
          formData.set("image", processed, processed.name);
        }

        const response = item ? await updateMenuItemAction(formData) : await createMenuItemAction(formData);
        setResult(response);
        if (response.success) {
          formRef.current?.reset();
          setOpen(false);
          router.refresh();
        }
      } catch (error) {
        setResult({ error: error instanceof Error ? error.message : "No pudimos procesar la foto." });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (value) { setResult(null); setAvailable(item?.is_available ?? true); } }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item ? "Editar plato" : "Agregar plato"}</DialogTitle>
          <DialogDescription>Completa la información que verán tus clientes en el menú.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`dish-name-${item?.id ?? "new"}`}>Nombre del plato</Label>
              <Input id={`dish-name-${item?.id ?? "new"}`} name="name" defaultValue={item?.name} maxLength={120} placeholder="Ej. Mofongo de camarones" required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`dish-description-${item?.id ?? "new"}`}>Descripción</Label>
              <Textarea id={`dish-description-${item?.id ?? "new"}`} name="description" defaultValue={item?.description ?? ""} maxLength={500} placeholder="Ingredientes o una breve descripción" />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`dish-price-${item?.id ?? "new"}`}>Precio (RD$)</Label>
              <Input id={`dish-price-${item?.id ?? "new"}`} name="price" type="number" min="0" max="9999999999.99" step="0.01" defaultValue={item?.price ?? ""} placeholder="450.00" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`dish-category-${item?.id ?? "new"}`}>Categoría</Label>
              <select id={`dish-category-${item?.id ?? "new"}`} name="categoryId" defaultValue={item?.category_id ?? categories[0]?.id} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`dish-tag-${item?.id ?? "new"}`}>Etiqueta opcional</Label>
              <select id={`dish-tag-${item?.id ?? "new"}`} name="tag" defaultValue={item?.tag ?? ""} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Sin etiqueta</option>
                <option value="popular">Popular</option>
                <option value="nuevo">Nuevo</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`dish-image-${item?.id ?? "new"}`}>Foto del plato</Label>
              <Input id={`dish-image-${item?.id ?? "new"}`} name="image" type="file" accept={MENU_IMAGE_ACCEPT} disabled={!r2Configured} />
              <p className="text-xs text-muted-foreground">JPG, PNG, WebP o AVIF. Máximo 3 MB.</p>
            </div>
          </div>

          {!r2Configured && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Configura Cloudflare R2 para habilitar la carga de fotos. Puedes guardar el plato sin foto.</p>}
          {item?.image_url && <div className="flex items-center gap-3 rounded-xl border bg-slate-50 p-3"><img src={item.image_url} alt={`Foto actual de ${item.name}`} className="h-14 w-14 rounded-lg object-cover" /><p className="text-sm text-slate-600">La foto actual se conservará si no eliges una nueva.</p></div>}

          <div className="flex items-center justify-between rounded-xl border bg-slate-50 p-4">
            <div>
              <Label htmlFor={`dish-available-${item?.id ?? "new"}`}>Disponible</Label>
              <p className="mt-1 text-xs text-muted-foreground">Desactívalo para mostrar el plato como agotado.</p>
            </div>
            <Switch id={`dish-available-${item?.id ?? "new"}`} checked={available} onCheckedChange={setAvailable} />
          </div>

          <ActionMessage result={result} />
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
            <Button type="submit" disabled={pending}>{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{item ? "Guardar cambios" : "Agregar plato"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AvailabilityToggle({ item }: { item: MenuItem }) {
  const router = useRouter();
  const [checked, setChecked] = useState(item.is_available);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold ${checked ? "text-brand-green" : "text-slate-500"}`}>{checked ? "Disponible" : "Agotado"}</span>
        <Switch
          checked={checked}
          disabled={pending}
          aria-label={`Marcar ${item.name} como ${checked ? "agotado" : "disponible"}`}
          onCheckedChange={(value) => {
            const previous = checked;
            setChecked(value);
            setError(null);
            startTransition(async () => {
              const response = await setMenuItemAvailabilityAction(item.id, value);
              if (response.error) { setChecked(previous); setError(response.error); } else router.refresh();
            });
          }}
        />
      </div>
      {error && <span className="max-w-44 text-right text-[11px] text-red-600">{error}</span>}
    </div>
  );
}

function DishCard({ item, categories, r2Configured }: { item: MenuItem; categories: Category[]; r2Configured: boolean }) {
  return (
    <article className={`grid gap-4 rounded-2xl border bg-white p-4 shadow-sm transition sm:grid-cols-[88px_1fr_auto] ${item.is_available ? "" : "opacity-70"}`}>
      <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded-xl bg-slate-100 sm:h-20 sm:w-20">
        {item.image_url ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" loading="lazy" /> : <ImageIcon className="h-7 w-7 text-slate-300" />}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-brand-navy">{item.name}</h3>
          {item.tag && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${item.tag === "popular" ? "bg-brand-orange/10 text-brand-orange" : "bg-brand-green/10 text-brand-green"}`}>{item.tag === "popular" ? "Popular" : "Nuevo"}</span>}
        </div>
        {item.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.description}</p>}
        <p className="mt-2 font-bold text-brand-navy">RD$ {Number(item.price).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      </div>
      <div className="flex items-start justify-between gap-2 sm:flex-col sm:items-end">
        <AvailabilityToggle item={item} />
        <div className="flex gap-1">
          <DishDialog item={item} categories={categories} r2Configured={r2Configured} trigger={<Button type="button" variant="ghost" size="icon" aria-label={`Editar ${item.name}`}><Pencil className="h-4 w-4" /></Button>} />
          <DeleteConfirm
            title="¿Eliminar este plato?"
            description={`“${item.name}” desaparecerá del menú. Esta acción no se puede deshacer.`}
            action={() => deleteMenuItemAction(item.id, item.id)}
            trigger={<Button type="button" variant="ghost" size="icon" className="text-red-600 hover:bg-red-50 hover:text-red-700" aria-label={`Eliminar ${item.name}`}><Trash2 className="h-4 w-4" /></Button>}
          />
        </div>
      </div>
    </article>
  );
}

function CategorySection({
  category,
  items,
  visibleItems,
  categories,
  index,
  total,
  r2Configured,
}: {
  category: Category;
  items: MenuItem[];
  visibleItems: MenuItem[];
  categories: Category[];
  index: number;
  total: number;
  r2Configured: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function move(direction: "up" | "down") {
    setError(null);
    startTransition(async () => {
      const response = await moveCategoryAction(category.id, direction);
      if (response.error) setError(response.error);
      else router.refresh();
    });
  }

  return (
    <section className="rounded-3xl border bg-slate-50/70 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-brand-navy">{category.name}</h2>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 shadow-sm">{items.length} {items.length === 1 ? "plato" : "platos"}</span>
          </div>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" disabled={pending || index === 0} onClick={() => move("up")} aria-label={`Subir ${category.name}`}><ArrowUp className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="icon" disabled={pending || index === total - 1} onClick={() => move("down")} aria-label={`Bajar ${category.name}`}><ArrowDown className="h-4 w-4" /></Button>
          <CategoryDialog category={category} trigger={<Button type="button" variant="ghost" size="icon" aria-label={`Renombrar ${category.name}`}><Pencil className="h-4 w-4" /></Button>} />
          <DeleteConfirm
            title="¿Eliminar esta categoría?"
            description={items.length > 0 ? `La categoría “${category.name}” contiene ${items.length} ${items.length === 1 ? "plato" : "platos"}. También se eliminarán esos platos y sus fotos.` : `La categoría “${category.name}” se eliminará permanentemente.`}
            action={() => deleteCategoryAction(category.id, category.id)}
            trigger={<Button type="button" variant="ghost" size="icon" className="text-red-600 hover:bg-red-50 hover:text-red-700" aria-label={`Eliminar ${category.name}`}><Trash2 className="h-4 w-4" /></Button>}
          />
        </div>
      </div>
      {visibleItems.length > 0 ? <div className="grid gap-3 2xl:grid-cols-2">{visibleItems.map((item) => <DishCard key={item.id} item={item} categories={categories} r2Configured={r2Configured} />)}</div> : <div className="rounded-2xl border border-dashed bg-white px-5 py-8 text-center text-sm text-slate-500">{items.length > 0 ? "No hay platos que coincidan con la búsqueda." : "Todavía no hay platos en esta categoría."}</div>}
    </section>
  );
}

export function MenuManager({
  restaurantName,
  tier,
  categories,
  items,
  r2Configured,
}: {
  restaurantName: string;
  tier: Tier;
  categories: Category[];
  items: MenuItem[];
  r2Configured: boolean;
}) {
  const [search, setSearch] = useState("");
  const limitReached = tier === "gratis" && items.length >= 20;
  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    if (!query) return items;
    return items.filter((item) => item.name.toLocaleLowerCase("es").includes(query) || item.description?.toLocaleLowerCase("es").includes(query));
  }, [items, search]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-green">{restaurantName}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-navy">Gestor de menú</h1>
          <p className="mt-2 text-slate-600">Organiza tus categorías, platos, precios y disponibilidad.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CategoryDialog trigger={<Button type="button" variant="outline" className="gap-2"><Plus className="h-4 w-4" />Nueva categoría</Button>} />
          {limitReached ? (
            <Button type="button" disabled className="gap-2"><Plus className="h-4 w-4" />Agregar plato</Button>
          ) : categories.length === 0 ? (
            <Button type="button" disabled className="gap-2"><Plus className="h-4 w-4" />Agregar plato</Button>
          ) : (
            <DishDialog categories={categories} r2Configured={r2Configured} trigger={<Button type="button" className="gap-2"><Plus className="h-4 w-4" />Agregar plato</Button>} />
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="rounded-xl bg-brand-orange/10 p-2.5 text-brand-orange"><UtensilsCrossed className="h-5 w-5" /></span><div><p className="text-2xl font-bold text-brand-navy">{items.length}</p><p className="text-xs text-slate-500">Platos creados{tier === "gratis" ? " de 20" : ""}</p></div></div></div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="rounded-xl bg-brand-green/10 p-2.5 text-brand-green"><ChefHat className="h-5 w-5" /></span><div><p className="text-2xl font-bold text-brand-navy">{items.filter((item) => item.is_available).length}</p><p className="text-xs text-slate-500">Disponibles ahora</p></div></div></div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="rounded-xl bg-brand-navy/10 p-2.5 text-brand-navy"><ImageIcon className="h-5 w-5" /></span><div><p className="text-2xl font-bold text-brand-navy">{categories.length}</p><p className="text-xs text-slate-500">Categorías</p></div></div></div>
      </div>

      {limitReached && (
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-brand-orange/30 bg-orange-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-brand-orange" /><div><p className="font-semibold text-brand-navy">{FREE_PLAN_LIMIT_MESSAGE}</p><p className="mt-1 text-sm text-slate-600">Tus platos existentes siguen funcionando normalmente.</p></div></div>
          <Button asChild className="shrink-0"><Link href="/dashboard/plan">Ver planes</Link></Button>
        </div>
      )}

      {!r2Configured && (
        <div className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <ImageIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <div><p className="font-semibold">Falta conectar Cloudflare R2 para las fotos</p><p className="mt-1 text-sm">El CRUD de texto está activo. Al completar las variables R2, el selector de fotos se habilitará automáticamente.</p></div>
        </div>
      )}

      {categories.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed bg-white px-6 py-16 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange"><UtensilsCrossed className="h-7 w-7" /></span>
          <h2 className="mt-5 text-xl font-bold text-brand-navy">Crea tu primera categoría</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Empieza con categorías como Entradas, Platos fuertes o Bebidas; luego podrás agregar sus platos.</p>
          <CategoryDialog trigger={<Button type="button" className="mt-5 gap-2"><Plus className="h-4 w-4" />Crear categoría</Button>} />
        </div>
      ) : (
        <>
          <div className="relative mt-8 max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="bg-white pl-9" placeholder="Buscar platos…" aria-label="Buscar platos" /></div>
          <div className="mt-5 space-y-5">
            {categories.map((category, index) => (
              <CategorySection key={category.id} category={category} items={items.filter((item) => item.category_id === category.id)} visibleItems={filteredItems.filter((item) => item.category_id === category.id)} categories={categories} index={index} total={categories.length} r2Configured={r2Configured} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
