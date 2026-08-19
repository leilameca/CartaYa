import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { DashboardOrder, OrderStatus } from "@/types/orders";

export const ORDER_SELECT = `
  id,
  restaurant_id,
  table_id,
  status,
  total,
  notes,
  created_at,
  table:tables(label),
  items:order_items(
    id,
    menu_item_id,
    quantity,
    unit_price,
    notes,
    menu_item:menu_items(name)
  )
`;

type RawOrder = {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  status: OrderStatus;
  total: number;
  notes: string | null;
  created_at: string;
  table: { label: string } | { label: string }[] | null;
  items: Array<{
    id: string;
    menu_item_id: string;
    quantity: number;
    unit_price: number;
    notes: string | null;
    menu_item: { name: string } | { name: string }[] | null;
  }> | null;
};

function firstRelation<T>(relation: T | T[] | null) {
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

export function normalizeOrder(raw: RawOrder): DashboardOrder {
  return {
    id: raw.id,
    restaurantId: raw.restaurant_id,
    tableId: raw.table_id,
    tableLabel: firstRelation(raw.table)?.label ?? null,
    status: raw.status,
    total: Number(raw.total),
    notes: raw.notes,
    createdAt: raw.created_at,
    items: (raw.items ?? []).map((item) => ({
      id: item.id,
      menuItemId: item.menu_item_id,
      name: firstRelation(item.menu_item)?.name ?? "Plato eliminado",
      quantity: item.quantity,
      unitPrice: Number(item.unit_price),
      notes: item.notes,
    })),
  };
}

export async function fetchRestaurantOrders(
  supabase: SupabaseClient<Database>,
  restaurantId: string,
  { activeOnly = false }: { activeOnly?: boolean } = {},
) {
  let query = supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(250);

  if (activeOnly) query = query.in("status", ["nuevo", "en_preparacion", "listo"]);
  const { data, error } = await query;
  if (error) throw new Error(`No se pudieron cargar los pedidos: ${error.message}`);
  return (data as unknown as RawOrder[]).map(normalizeOrder);
}

