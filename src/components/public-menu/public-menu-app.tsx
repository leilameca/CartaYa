/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  Check,
  ChefHat,
  ChevronDown,
  MapPin,
  Minus,
  Plus,
  ReceiptText,
  ShoppingBag,
  Trash2,
  Utensils,
  WifiOff,
  X,
} from "lucide-react";
import { isRestaurantOpen } from "@/lib/opening-hours";
import type { PublicMenuData, PublicMenuItem, PublicOrderResult } from "@/types/public-menu";
import { KitchenMiniGames } from "@/components/public-menu/kitchen-mini-games";

const currency = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  minimumFractionDigits: 2,
});

type Cart = Record<string, number>;
type OrderState = { loading?: boolean; error?: string; orderId?: string };

function rgba(hex: string, alpha: number) {
  const safe = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#FF6B35";
  const number = Number.parseInt(safe.slice(1), 16);
  return `rgba(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`;
}

function normalizeWhatsAppPhone(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10) digits = `1${digits}`;
  return digits;
}

function quantityButtonLabel(item: PublicMenuItem, direction: "add" | "remove") {
  return `${direction === "add" ? "Agregar" : "Quitar"} una unidad de ${item.name}`;
}

function effectivePrice(item: PublicMenuItem) {
  return typeof item.offer_price === "number" ? item.offer_price : item.price;
}

function hasOffer(item: PublicMenuItem) {
  return typeof item.offer_price === "number";
}

export function PublicMenuApp({ initialMenu }: { initialMenu: PublicMenuData }) {
  const cacheKey = `cartaya:menu:${initialMenu.restaurant.slug}:${initialMenu.table?.id ?? "general"}`;
  const [menu, setMenu] = useState<PublicMenuData>(() => {
    if (typeof window === "undefined" || window.navigator.onLine) return initialMenu;
    try {
      const rawCached = window.localStorage.getItem(cacheKey);
      const parsed = rawCached ? JSON.parse(rawCached) as { menu?: PublicMenuData } : null;
      return parsed?.menu ?? initialMenu;
    } catch {
      return initialMenu;
    }
  });
  const [cart, setCart] = useState<Cart>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [now, setNow] = useState(() => new Date());
  const [notes, setNotes] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [orderState, setOrderState] = useState<OrderState>({});
  const [serviceState, setServiceState] = useState<{ loading?: boolean; success?: string; error?: string }>({});

  useEffect(() => {
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

    try {
      if (isOnline) {
        localStorage.setItem(cacheKey, JSON.stringify({ menu: initialMenu, cachedAt: new Date().toISOString() }));
      }
    } catch {
      // Private browsing or storage limits must not block menu usage.
    }

    const handleOnline = () => {
      setOnline(true);
      setMenu(initialMenu);
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ menu: initialMenu, cachedAt: new Date().toISOString() }));
      } catch {}
    };

    const handleOffline = () => {
      setOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [cacheKey, initialMenu]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const categories = useMemo(() => menu.categories.filter((category) => category.items.length > 0), [menu]);
  const displayCategories = useMemo(() => {
    const offers = categories.flatMap((category) => category.items).filter(hasOffer);
    return offers.length > 0
      ? [{ id: "offers", name: "Ofertas", display_order: -1, items: offers }, ...categories]
      : categories;
  }, [categories]);
  const itemMap = useMemo(
    () => new Map(menu.categories.flatMap((category) => category.items).map((item) => [item.id, item])),
    [menu],
  );
  const cartItems = useMemo(
    () => Object.entries(cart).flatMap(([id, quantity]) => {
      const item = itemMap.get(id);
      return item && quantity > 0 ? [{ item, quantity }] : [];
    }),
    [cart, itemMap],
  );
  const itemCount = cartItems.reduce((total, entry) => total + entry.quantity, 0);
  const subtotal = cartItems.reduce((total, entry) => total + effectivePrice(entry.item) * entry.quantity, 0);
  const restaurantOpen = isRestaurantOpen(menu.restaurant.opening_hours, now);
  const canOrder = restaurantOpen && menu.table_valid;
  const primaryColor = menu.restaurant.primary_color || "#FF6B35";
  const secondaryColor = menu.restaurant.secondary_color || "#00A86B";
  const menuStyle = menu.restaurant.menu_style || "moderno";

  function changeQuantity(itemId: string, delta: number) {
    setOrderState({});
    setCart((current) => {
      const quantity = Math.max(0, (current[itemId] ?? 0) + delta);
      const next = { ...current };
      if (quantity === 0) delete next[itemId];
      else next[itemId] = quantity;
      return next;
    });
  }

  function scrollToCategory(categoryId: string) {
    document.getElementById(`category-${categoryId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function confirmOrder() {
    if (!canOrder || cartItems.length === 0 || menu.restaurant.subscription_tier === "gratis") return;
    setOrderState({ loading: true });

    try {
      const response = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: menu.restaurant.slug,
          tableId: menu.table?.id ?? null,
          customerName,
          notes,
          items: cartItems.map(({ item, quantity }) => ({ menu_item_id: item.id, quantity, notes: "" })),
        }),
      });
      const result = await response.json() as PublicOrderResult & { error?: string };
      if (!response.ok) throw new Error(result.error || "No se pudo enviar el pedido.");

      setOrderState({ orderId: result.order_id });
      const lines = cartItems.map(({ item, quantity }) =>
        `${quantity}× ${item.name} — ${currency.format(effectivePrice(item) * quantity)}`,
      );
      const tableText = result.table_label ? `Mesa: ${result.table_label}` : "Pedido desde el menú general";
      const message = [
        `Hola, quiero confirmar el pedido #${result.order_id.slice(0, 8).toUpperCase()}`,
        tableText,
        "",
        ...lines,
        "",
        `Total: ${currency.format(result.total)}`,
        notes ? `Notas: ${notes}` : "",
      ].filter(Boolean).join("\n");
      const phone = normalizeWhatsAppPhone(result.phone ?? menu.restaurant.phone ?? "");
      window.location.href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    } catch (error) {
      setOrderState({ error: error instanceof Error ? error.message : "No se pudo enviar el pedido." });
    }
  }

  async function requestWaiter() {
    if (!menu.table) return;
    setServiceState({ loading: true });
    try {
      const response = await fetch("/api/public/service-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: menu.restaurant.slug, tableId: menu.table.id }) });
      const result = await response.json() as { error?: string; alreadyPending?: boolean };
      if (!response.ok) throw new Error(result.error ?? "No pudimos avisar al mesero.");
      setServiceState({ success: result.alreadyPending ? "Tu solicitud ya está en espera." : "¡Listo! Un mesero aceptará tu mesa enseguida." });
      navigator.vibrate?.(120);
    } catch (error) { setServiceState({ error: error instanceof Error ? error.message : "No pudimos avisar al mesero." }); }
  }

  const freePlanPhone = menu.restaurant.phone ? `tel:${menu.restaurant.phone.replace(/[^\d+]/g, "")}` : undefined;

  return (
    <main className={`min-h-[100svh] pb-32 text-brand-navy ${menuStyle === "calido" ? "bg-amber-50" : menuStyle === "clasico" ? "bg-stone-50" : "bg-[#f7f8fa]"}`}>
      {!online ? (
        <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-400 px-4 py-2 text-center text-xs font-bold text-amber-950">
          <WifiOff className="size-4" /> Sin conexión — estás viendo el último menú guardado
        </div>
      ) : null}

      <header
        className="relative overflow-hidden px-5 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))] text-white sm:px-8 lg:px-12"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor} 62%, #1A2530)` }}
      >
        <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full border-[42px] border-white/10" />
        <div className="relative mx-auto flex w-full max-w-7xl items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="mb-6 flex size-20 items-center justify-center overflow-hidden rounded-2xl border border-white/30 bg-white p-2 shadow-xl shadow-black/10 sm:size-24">
              {menu.restaurant.logo_url ? (
                <img src={menu.restaurant.logo_url} alt={`Logo de ${menu.restaurant.name}`} className="size-full object-contain" />
              ) : (
                <ChefHat className="size-10" style={{ color: primaryColor }} />
              )}
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">Menú digital</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{menu.restaurant.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/85">
              {menu.table ? <span className="rounded-full bg-white/15 px-3 py-1 font-bold">Mesa {menu.table.label}</span> : null}
              {menu.restaurant.address ? <span className="flex items-center gap-1.5"><MapPin className="size-4" />{menu.restaurant.address}</span> : null}
            </div>
          </div>
          <div className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold ${restaurantOpen ? "bg-emerald-400 text-emerald-950" : "bg-white text-red-600"}`}>
            {restaurantOpen ? "Abierto" : "Cerrado"}
          </div>
        </div>
      </header>

      {!menu.table_valid ? (
        <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-center text-sm font-semibold text-red-700">
          Este código QR no corresponde a una mesa válida. Puedes consultar el menú, pero no enviar pedidos.
        </div>
      ) : !restaurantOpen ? (
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-center text-sm font-semibold text-amber-800">
          Ahora mismo estamos fuera de horario. Puedes consultar el menú y volver cuando estemos abiertos.
        </div>
      ) : null}

      {menu.table && menu.restaurant.subscription_tier === "pro" ? (
        <section className="mx-auto w-full max-w-7xl px-4 pt-5 sm:px-8">
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: secondaryColor }}><BellRing className="size-5" /></span>
              <div>
                <p className="font-black text-brand-navy">¿Necesitas ayuda en la mesa?</p>
                <p className="mt-0.5 text-sm text-slate-500">Avisa al equipo; el primer mesero que acepte quedará a cargo de tu mesa.</p>
                {serviceState.success ? <p className="mt-2 text-sm font-bold text-emerald-600">{serviceState.success}</p> : null}
                {serviceState.error ? <p className="mt-2 text-sm font-bold text-red-600">{serviceState.error}</p> : null}
              </div>
            </div>
            <button onClick={requestWaiter} disabled={serviceState.loading || Boolean(serviceState.success)} className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 font-black text-white disabled:opacity-60" style={{ backgroundColor: secondaryColor }}>
              <BellRing className="size-5" />{serviceState.loading ? "Avisando…" : "Llamar a un mesero"}
            </button>
          </div>
        </section>
      ) : null}

      {categories.length > 0 ? (
        <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur" aria-label="Categorías del menú">
          <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] sm:px-8 [&::-webkit-scrollbar]:hidden">
            {displayCategories.map((category, index) => (
              <button
                key={category.id}
                onClick={() => scrollToCategory(category.id)}
                className="shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition active:scale-95"
                style={index === 0 ? { backgroundColor: primaryColor, borderColor: primaryColor, color: "white" } : { borderColor: rgba(primaryColor, 0.24), color: primaryColor }}
              >
                {category.name}
              </button>
            ))}
          </div>
        </nav>
      ) : null}

      <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-8 sm:py-10">
        {categories.length === 0 ? (
          <section className="py-20 text-center">
            <Utensils className="mx-auto size-12 text-slate-300" />
            <h2 className="mt-5 text-2xl font-bold">El menú estará disponible pronto</h2>
            <p className="mt-2 text-slate-500">Este restaurante todavía no tiene platos disponibles.</p>
          </section>
        ) : displayCategories.map((category) => (
          <section key={category.id} id={`category-${category.id}`} className="scroll-mt-20 pb-10">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{category.name}</h2>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500 shadow-sm">{category.items.length}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {category.items.map((item) => {
                const quantity = cart[item.id] ?? 0;
                return (
                  <article key={item.id} className="group grid min-h-36 grid-cols-[112px_1fr] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:grid-cols-[136px_1fr]">
                    <div
                      className="flex min-h-full items-center justify-center bg-slate-100 bg-cover bg-center"
                      style={item.image_url ? { backgroundImage: `url("${item.image_url.replaceAll('"', "%22")}")` } : undefined}
                      role={item.image_url ? "img" : undefined}
                      aria-label={item.image_url ? `Foto de ${item.name}` : undefined}
                    >
                      {!item.image_url ? <Utensils className="size-8 text-slate-300" /> : null}
                    </div>
                    <div className="flex min-w-0 flex-col p-4">
                      <div className="flex flex-wrap items-start gap-2">
                        <h3 className="font-extrabold leading-5">{item.name}</h3>
                        {item.tag ? (
                          <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase" style={{ backgroundColor: rgba(primaryColor, 0.1), color: primaryColor }}>
                            {item.tag === "nuevo" ? "Nuevo" : "Popular"}
                          </span>
                        ) : null}
                        {hasOffer(item) ? (
                          <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-extrabold uppercase text-red-600">Oferta</span>
                        ) : null}
                      </div>
                      {item.description ? <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-slate-500">{item.description}</p> : null}
                      <div className="mt-auto flex items-end justify-between gap-3 pt-3">
                        <div className="flex flex-col">
                          <p className="font-extrabold" style={{ color: primaryColor }}>{currency.format(effectivePrice(item))}</p>
                          {hasOffer(item) ? <p className="text-xs text-slate-400 line-through">{currency.format(item.price)}</p> : null}
                        </div>
                        {quantity > 0 ? (
                          <div className="flex items-center rounded-full border border-slate-200 bg-white p-0.5 shadow-sm">
                            <button onClick={() => changeQuantity(item.id, -1)} className="flex size-8 items-center justify-center rounded-full text-slate-600" aria-label={quantityButtonLabel(item, "remove")}><Minus className="size-4" /></button>
                            <span className="w-7 text-center text-sm font-extrabold">{quantity}</span>
                            <button onClick={() => changeQuantity(item.id, 1)} className="flex size-8 items-center justify-center rounded-full text-white" style={{ backgroundColor: primaryColor }} aria-label={quantityButtonLabel(item, "add")}><Plus className="size-4" /></button>
                          </div>
                        ) : (
                          <button
                            onClick={() => changeQuantity(item.id, 1)}
                            disabled={!canOrder}
                            className="flex size-10 items-center justify-center rounded-full text-white shadow-md transition active:scale-90 disabled:cursor-not-allowed disabled:bg-slate-300"
                            style={canOrder ? { backgroundColor: primaryColor, boxShadow: `0 8px 18px ${rgba(primaryColor, 0.25)}` } : undefined}
                            aria-label={`Agregar ${item.name} al pedido`}
                          >
                            <Plus className="size-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <KitchenMiniGames primaryColor={primaryColor} />

      {itemCount > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8">
          <button
            onClick={() => setDrawerOpen(true)}
            className="mx-auto flex w-full max-w-xl items-center justify-between rounded-2xl px-5 py-4 text-left font-bold text-white shadow-2xl transition active:scale-[0.98]"
            style={{ backgroundColor: primaryColor, boxShadow: `0 16px 36px ${rgba(primaryColor, 0.36)}` }}
          >
            <span className="flex items-center gap-3"><span className="flex size-8 items-center justify-center rounded-full bg-white/20 text-sm">{itemCount}</span> Ver mi pedido</span>
            <span>{currency.format(subtotal)}</span>
          </button>
        </div>
      ) : null}

      {drawerOpen ? (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Resumen del pedido">
          <button className="absolute inset-0 bg-brand-navy/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} aria-label="Cerrar resumen" />
          <section className="animate-in slide-in-from-bottom absolute inset-x-0 bottom-0 max-h-[88svh] overflow-y-auto rounded-t-[2rem] bg-white pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl duration-300">
            <div className="sticky top-0 z-10 border-b bg-white px-5 pb-4 pt-3 sm:px-8">
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
              <div className="mx-auto flex max-w-2xl items-center justify-between">
                <div><p className="text-xs font-bold uppercase tracking-wider" style={{ color: primaryColor }}>Tu selección</p><h2 className="mt-1 text-2xl font-extrabold">Resumen del pedido</h2></div>
                <button onClick={() => setDrawerOpen(false)} className="flex size-10 items-center justify-center rounded-full bg-slate-100" aria-label="Cerrar"><X className="size-5" /></button>
              </div>
            </div>
            <div className="mx-auto max-w-2xl px-5 py-5 sm:px-8">
              <div className="space-y-4">
                {cartItems.map(({ item, quantity }) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1"><p className="truncate font-bold">{item.name}</p><p className="text-sm text-slate-500">{currency.format(effectivePrice(item))} c/u</p></div>
                    <div className="flex items-center rounded-full border p-0.5">
                      <button onClick={() => changeQuantity(item.id, -1)} className="flex size-8 items-center justify-center rounded-full" aria-label={quantityButtonLabel(item, "remove")}><Minus className="size-4" /></button>
                      <span className="w-7 text-center text-sm font-bold">{quantity}</span>
                      <button onClick={() => changeQuantity(item.id, 1)} className="flex size-8 items-center justify-center rounded-full text-white" style={{ backgroundColor: primaryColor }} aria-label={quantityButtonLabel(item, "add")}><Plus className="size-4" /></button>
                    </div>
                    <p className="w-24 text-right font-extrabold">{currency.format(effectivePrice(item) * quantity)}</p>
                    <button onClick={() => changeQuantity(item.id, -quantity)} className="text-slate-400 hover:text-red-500" aria-label={`Eliminar ${item.name}`}><Trash2 className="size-4" /></button>
                  </div>
                ))}
              </div>

              <label className="mt-6 block text-sm font-bold" htmlFor="order-notes">Notas para cocina</label>
              <textarea id="order-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} rows={2} placeholder="Ej.: sin cebolla, alergias…" className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2" style={{ "--tw-ring-color": primaryColor } as React.CSSProperties} />

              <label className="mt-5 block text-sm font-bold" htmlFor="customer-name">¿A nombre de quién va este pedido?</label>
              <input id="customer-name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} maxLength={100} placeholder="Ej.: Ana" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2" style={{ "--tw-ring-color": primaryColor } as React.CSSProperties} />

              <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                <div className="flex justify-between text-sm text-slate-500"><span>Artículos</span><span>{itemCount}</span></div>
                <div className="mt-2 flex justify-between text-lg font-extrabold"><span>Total</span><span>{currency.format(subtotal)}</span></div>
              </div>

              {orderState.error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{orderState.error}</p> : null}
              {orderState.orderId ? <p role="status" className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"><Check className="size-4" />Pedido registrado. Abriendo WhatsApp…</p> : null}

              {menu.restaurant.subscription_tier === "gratis" ? (
                <a
                  href={freePlanPhone}
                  aria-disabled={!freePlanPhone}
                  className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-4 text-center font-extrabold text-white ${freePlanPhone ? "" : "pointer-events-none opacity-60"}`}
                  style={{ backgroundColor: primaryColor }}
                >
                  <ReceiptText className="size-5" /> Llama al mesero para ordenar
                </a>
              ) : (
                <button
                  onClick={confirmOrder}
                  disabled={orderState.loading || !canOrder || !online}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-4 font-extrabold text-white shadow-lg disabled:cursor-not-allowed disabled:bg-slate-300"
                  style={!orderState.loading && canOrder && online ? { backgroundColor: primaryColor } : undefined}
                >
                  <ShoppingBag className="size-5" /> {orderState.loading ? "Enviando pedido…" : "Enviar pedido a cocina"}
                </button>
              )}
              {!online && menu.restaurant.subscription_tier !== "gratis" ? <p className="mt-2 text-center text-xs text-slate-500">Conéctate a internet para enviar el pedido.</p> : null}
            </div>
          </section>
        </div>
      ) : null}

      <footer className="px-5 pb-4 text-center text-xs font-medium text-slate-400">
        Menú digital impulsado por <a href="https://tucartaya.com" className="font-extrabold text-brand-navy underline-offset-4 hover:underline">CartaYa</a>
        <ChevronDown className="mx-auto mt-1 size-4" />
      </footer>
    </main>
  );
}
