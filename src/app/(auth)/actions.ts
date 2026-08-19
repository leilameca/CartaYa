"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";

export type ActionState = { error?: string; success?: string };

function firstError(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Revisa los datos del formulario.";
}

export async function loginAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) return { error: "Correo o contraseña incorrectos." };

  const redirectTo = formData.get("redirectTo");
  redirect(typeof redirectTo === "string" && redirectTo.startsWith("/") ? redirectTo : "/dashboard");
}

export async function registerAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        signup_type: "restaurant_owner",
        full_name: parsed.data.fullName,
        restaurant_name: parsed.data.restaurantName,
        restaurant_slug: parsed.data.slug,
        phone: parsed.data.phone,
      },
    },
  });

  if (error || !data.user) {
    if (error?.message.toLowerCase().includes("database")) {
      return { error: "No se pudo crear el restaurante. Comprueba que el identificador no esté en uso." };
    }
    if (error?.message.toLowerCase().includes("registered")) {
      return { error: "Ya existe una cuenta con este correo." };
    }
    return { error: "No se pudo completar el registro. Inténtalo de nuevo." };
  }

  if (!data.session) {
    return { error: "La cuenta fue creada, pero Supabase requiere confirmación de correo. Revisa la configuración Auth." };
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function forgotPasswordAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000");
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/callback?next=/restablecer-contrasena`,
  });

  if (error) return { error: "No se pudo enviar el enlace. Inténtalo nuevamente." };
  return { success: "Si el correo existe, recibirás un enlace para restablecer tu contraseña." };
}

export async function resetPasswordAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "El enlace venció o no se pudo cambiar la contraseña." };

  redirect("/dashboard");
}
