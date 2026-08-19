import { z } from "zod";

const email = z.string().trim().email("Escribe un correo válido.");
const password = z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(72);

export const loginSchema = z.object({ email, password });

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Escribe tu nombre completo.").max(100),
  restaurantName: z.string().trim().min(2, "Escribe el nombre del restaurante.").max(120),
  slug: z
    .string()
    .trim()
    .min(3, "El identificador debe tener al menos 3 caracteres.")
    .max(63)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usa solo minúsculas, números y guiones."),
  phone: z.string().trim().min(10, "Escribe un teléfono válido.").max(20),
  email,
  password,
});

export const forgotPasswordSchema = z.object({ email });
export const verifyEmailCodeSchema = z.object({
  email,
  token: z
    .string()
    .transform((value) => value.replace(/\D/g, ""))
    .pipe(z.string().length(6, "Escribe el código de 6 dígitos.")),
});

export const restaurantOnboardingSchema = z.object({
  restaurantName: z.string().trim().min(2, "Escribe el nombre del restaurante.").max(120),
  slug: z
    .string()
    .trim()
    .min(3, "El identificador debe tener al menos 3 caracteres.")
    .max(63)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usa solo minúsculas, números y guiones."),
  phone: z.string().trim().min(10, "Escribe un teléfono válido.").max(20),
});

export const resetPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });
