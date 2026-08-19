"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
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

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      signup_type: "restaurant_owner",
      full_name: parsed.data.fullName,
      restaurant_name: parsed.data.restaurantName,
      restaurant_slug: parsed.data.slug,
      phone: parsed.data.phone,
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

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (signInError) {
    return { error: "La cuenta fue creada, pero no se pudo iniciar sesión. Entra desde la página de acceso." };
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
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
