import type { PublicMenuData } from "@/types/public-menu";
import type { Tables } from "@/types/database";

export const DEMO_STORAGE_KEY = "cartaya_demo_menu_v1";
export const DEMO_RESTAURANT_ID = "00000000-0000-4000-8000-000000000001";

export type DemoState = {
  version: 1;
  restaurant: {
    name: string;
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    menuStyle: "moderno" | "clasico" | "calido";
  };
  categories: Tables<"categories">[];
  items: Tables<"menu_items">[];
};

const category = (id: number, name: string, displayOrder: number): Tables<"categories"> => ({
  id: `10000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
  restaurant_id: DEMO_RESTAURANT_ID,
  name,
  display_order: displayOrder,
});

const item = (
  id: number,
  categoryId: number,
  name: string,
  description: string,
  price: number,
  imageUrl: string | null,
  displayOrder: number,
  options: Partial<Pick<Tables<"menu_items">, "offer_price" | "tag">> = {},
): Tables<"menu_items"> => ({
  id: `20000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
  restaurant_id: DEMO_RESTAURANT_ID,
  category_id: `10000000-0000-4000-8000-${String(categoryId).padStart(12, "0")}`,
  name,
  description,
  price,
  offer_price: options.offer_price ?? null,
  image_url: imageUrl,
  is_available: true,
  tag: options.tag ?? null,
  display_order: displayOrder,
});

export function createDemoSeed(): DemoState {
  return {
    version: 1,
    restaurant: {
      name: "Sabores del Caribe",
      logoUrl: null,
      primaryColor: "#FF6B35",
      secondaryColor: "#00A86B",
      menuStyle: "calido",
    },
    categories: [
      category(1, "Entradas", 0),
      category(2, "Platos principales", 1),
      category(3, "Bebidas", 2),
      category(4, "Postres", 3),
    ],
    items: [
      item(1, 1, "Tostones con ajo", "Crujientes tostones con mojo de ajo y cilantro.", 225, "/landing/chimi-artesanal.webp", 0, { tag: "popular" }),
      item(2, 2, "Mofongo de camarones", "Mofongo de plátano verde con camarones en salsa criolla.", 625, "/landing/mofongo-camarones.webp", 0, { tag: "popular" }),
      item(3, 2, "Churrasco con yuca", "Churrasco a la parrilla acompañado de yuca frita.", 895, "/landing/churrasco-yuca.webp", 1),
      item(4, 2, "Pasta de pollo", "Pasta cremosa con pollo sazonado y queso parmesano.", 495, "/landing/pasta-pollo.webp", 2, { offer_price: 425 }),
      item(5, 3, "Limonada de coco", "Limonada cremosa preparada al momento.", 195, null, 0, { tag: "nuevo" }),
      item(6, 4, "Tres leches", "Bizcocho suave bañado en tres leches.", 250, null, 0),
    ],
  };
}

export function createEmptyDemo(): DemoState {
  return {
    version: 1,
    restaurant: {
      name: "Mi restaurante",
      logoUrl: null,
      primaryColor: "#FF6B35",
      secondaryColor: "#00A86B",
      menuStyle: "moderno",
    },
    categories: [],
    items: [],
  };
}

export function isDemoState(value: unknown): value is DemoState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DemoState>;
  return candidate.version === 1 && Boolean(candidate.restaurant) && Array.isArray(candidate.categories) && Array.isArray(candidate.items);
}

export function toPublicMenu(state: DemoState): PublicMenuData {
  return {
    restaurant: {
      id: DEMO_RESTAURANT_ID,
      name: state.restaurant.name,
      slug: "demo",
      logo_url: state.restaurant.logoUrl,
      primary_color: state.restaurant.primaryColor,
      secondary_color: state.restaurant.secondaryColor,
      menu_style: state.restaurant.menuStyle,
      phone: null,
      address: "Santiago, República Dominicana",
      opening_hours: {},
      subscription_tier: "pro",
    },
    table: { id: "30000000-0000-4000-8000-000000000001", label: "Demo" },
    table_valid: true,
    categories: state.categories.map((entry) => ({
      id: entry.id,
      name: entry.name,
      display_order: entry.display_order,
      items: state.items
        .filter((dish) => dish.category_id === entry.id && dish.is_available)
        .sort((a, b) => a.display_order - b.display_order)
        .map((dish) => ({
          id: dish.id,
          category_id: dish.category_id,
          name: dish.name,
          description: dish.description,
          price: Number(dish.price),
          offer_price: dish.offer_price === null ? null : Number(dish.offer_price),
          image_url: dish.image_url,
          tag: dish.tag,
          display_order: dish.display_order,
        })),
    })),
  };
}
