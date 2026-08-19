import type { OrderStatus } from "@/types/orders";

export const ORDER_STATUS: Record<OrderStatus, { label: string; className: string }> = {
  nuevo: { label: "Nuevo", className: "bg-orange-100 text-orange-700" },
  en_preparacion: { label: "En preparación", className: "bg-blue-100 text-blue-700" },
  listo: { label: "Listo", className: "bg-emerald-100 text-emerald-700" },
  entregado: { label: "Entregado", className: "bg-slate-100 text-slate-600" },
};

export const dopCurrency = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  minimumFractionDigits: 2,
});

export function shortOrderId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

export function orderTime(value: string) {
  return new Intl.DateTimeFormat("es-DO", {
    timeZone: "America/Santo_Domingo",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function orderDate(value: string) {
  return new Intl.DateTimeFormat("es-DO", {
    timeZone: "America/Santo_Domingo",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function orderDateKey(value: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santo_Domingo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

