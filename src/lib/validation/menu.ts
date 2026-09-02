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
  isOffer: z.boolean(),
  offerPrice: z.preprocess(
    (value) => value === "" || value === null ? null : value,
    z.coerce.number().finite().min(0, "El precio de oferta no puede ser negativo.").max(9999999999.99).nullable(),
  ),
  categoryId: categoryIdSchema,
  tag: optionalTag,
  isAvailable: z.boolean(),
}).superRefine((item, context) => {
  if (item.isOffer && item.offerPrice === null) {
    context.addIssue({ code: "custom", path: ["offerPrice"], message: "Escribe el precio de oferta." });
  }
  if (item.isOffer && item.offerPrice !== null && item.offerPrice >= item.price) {
    context.addIssue({ code: "custom", path: ["offerPrice"], message: "El precio de oferta debe ser menor que el precio regular." });
  }
});
