import type { Database } from "@/types/database";

export type OrderStatus = Database["public"]["Enums"]["order_status"];

export type DashboardOrderItem = {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  notes: string | null;
};

export type DashboardOrder = {
  id: string;
  restaurantId: string;
  tableId: string | null;
  tableLabel: string | null;
  status: OrderStatus;
  total: number;
  notes: string | null;
  customerName: string | null;
  createdByWaiterId: string | null;
  createdAt: string;
  items: DashboardOrderItem[];
};

