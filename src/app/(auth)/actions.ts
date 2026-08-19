"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  restaurantOnboardingSchema,
  resetPasswordSchema,
  verifyEmailCodeSchema,
} from "@/lib/validation/auth";

export type ActionState = { error?: string; success?: string };

function firstError(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Revisa los datos del formulario.";
}

function getSiteUrl() {
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  const value = process.env.NEXT_PUBLIC_SITE_URL ?? (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000");
  return value.replace(/\/$/, "");
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

  if (!data.session) redirect(`/verificar-correo?email=${encodeURIComponent(parsed.data.email)}`);

  redirect("/dashboard");
}

export async function verifyRegistrationCodeAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = verifyEmailCodeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.token,
    type: "email",
  });

  if (error) return { error: "El código es incorrecto o ya venció. Solicita uno nuevo." };
  redirect("/dashboard");
}

export async function resendRegistrationCodeAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email: parsed.data.email });
  if (error) return { error: "Espera un momento antes de solicitar otro código." };
  return { success: "Enviamos un código nuevo a tu correo." };
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
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getSiteUrl()}/restablecer-contrasena`,
  });

  if (error) return { error: "No se pudo enviar el código. Inténtalo nuevamente." };
  redirect(`/verificar-recuperacion?email=${encodeURIComponent(parsed.data.email)}`);
}

export async function verifyRecoveryCodeAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = verifyEmailCodeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.token,
    type: "recovery",
  });

  if (error) return { error: "El código es incorrecto o ya venció. Solicita uno nuevo." };
  redirect("/restablecer-contrasena");
}

export async function signInWithGoogleAction() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${getSiteUrl()}/auth/callback?next=/dashboard` },
  });

  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}

export async function completeRestaurantOnboardingAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = restaurantOnboardingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_restaurant_owner_onboarding", {
    p_phone: parsed.data.phone,
    p_restaurant_name: parsed.data.restaurantName,
    p_restaurant_slug: parsed.data.slug,
  });

  if (error) {
    if (error.code === "23505" || error.message.toLowerCase().includes("slug")) {
      return { error: "Ese identificador de menú ya está en uso." };
    }
    return { error: "No se pudo crear el restaurante. Revisa los datos e inténtalo otra vez." };
  }

  redirect("/dashboard");
}

export async function resetPasswordAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "El enlace venció o no se pudo cambiar la contraseña." };

  redirect("/dashboard");
}
