import { z } from "zod";
import { categorySchema, menuItemSchema } from "@/lib/validation/menu";

export const DEMO_PENDING_KEY = "cartaya_demo_import_pending";
export const demoImportSchema = z.object({
  restaurant: z.object({ name: z.string().trim().min(2).max(120), primaryColor: z.string().regex(/^#[0-9a-f]{6}$/i), secondaryColor: z.string().regex(/^#[0-9a-f]{6}$/i), menuStyle: z.enum(["moderno", "clasico", "calido"]) }).strict(),
  categories: z.array(categorySchema.extend({ id: z.string().uuid() }).strict()).min(1).max(100),
  items: z.array(menuItemSchema).min(1).max(500),
}).strict().superRefine((value, ctx) => {
  const ids = new Set(value.categories.map((c) => c.id));
  if (ids.size !== value.categories.length || new Set(value.categories.map((c) => c.name)).size !== value.categories.length || value.items.some((i) => !ids.has(i.categoryId))) ctx.addIssue({ code: "custom", message: "Revisa las categorías y sus productos." });
});

export function clearDemoStorage() {
  for (const storage of [localStorage, sessionStorage]) {
    for (const key of Object.keys(storage)) if (key.startsWith("cartaya_demo_")) storage.removeItem(key);
  }
}
