import type { Json } from "@/types/database";

export type PublicMenuItem = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  tag: "popular" | "nuevo" | null;
  display_order: number;
};

export type PublicMenuCategory = {
  id: string;
  name: string;
  display_order: number;
  items: PublicMenuItem[];
};

export type PublicMenuData = {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    primary_color: string;
    phone: string | null;
    address: string | null;
    opening_hours: Json;
    subscription_tier: "gratis" | "plus" | "pro";
  };
  table: { id: string; label: string } | null;
  table_valid: boolean;
  categories: PublicMenuCategory[];
};

export type PublicOrderResult = {
  order_id: string;
  total: number;
  phone: string | null;
  table_label: string | null;
};

