import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre de la categoría.").max(80, "Usa 80 caracteres o menos."),
});

export const categoryIdSchema = z.string().uuid("La categoría no es válida.");
export const menuItemIdSchema = z.string().uuid("El plato no es válido.");

const optionalDescription = z
  .string()
  .trim()
  .max(500, "La descripción debe tener 500 caracteres o menos.")
  .transform((value) => value || null);

const optionalTag = z
  .union([z.enum(["popular", "nuevo"]), z.literal("")])
  .transform((value) => value || null);

export const menuItemSchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre del plato.").max(120),
  description: optionalDescription,
  price: z.coerce.number().finite().min(0, "El precio no puede ser negativo.").max(9999999999.99),
  categoryId: categoryIdSchema,
  tag: optionalTag,
  isAvailable: z.boolean(),
});
