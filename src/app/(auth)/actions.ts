"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { REMEMBER_ME_MAX_AGE, SESSION_MODE_COOKIE } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
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

async function isRestaurantSlugTaken(slug: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from("restaurants").select("id").eq("slug", slug).maybeSingle();

  if (error) {
    console.error("Unable to validate restaurant slug availability", {
      code: error.code,
      message: error.message,
    });
    return null;
  }

  return Boolean(data);
}

export async function loginAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const rememberMe = formData.get("rememberMe") === "on";
  const cookieStore = await cookies();
  cookieStore.set(SESSION_MODE_COOKIE, rememberMe ? "persistent" : "session", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(rememberMe ? { maxAge: REMEMBER_ME_MAX_AGE } : {}),
  });

  const supabase = await createClient({ sessionOnly: !rememberMe });
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) return { error: "Correo o contraseña incorrectos." };

  const redirectTo = formData.get("redirectTo");
  redirect(typeof redirectTo === "string" && redirectTo.startsWith("/") ? redirectTo : "/dashboard");
}

const employeeLoginSchema = z.object({
  restaurant: z.string().trim().toLowerCase().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  username: z.string().trim().toLowerCase().min(3).max(30).regex(/^[a-z0-9._-]+$/),
  password: z.string().min(6).max(72),
});

export async function employeeLoginAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = employeeLoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Revisa el restaurante, usuario y clave." };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("staff_email, role, restaurants!inner(slug, subscription_tier)")
    .ilike("staff_username", parsed.data.username)
    .eq("restaurants.slug", parsed.data.restaurant)
    .in("role", ["mesero", "cocina"])
    .maybeSingle();
  const relation = profile?.restaurants as unknown as { subscription_tier: string } | { subscription_tier: string }[] | null;
  const restaurant = Array.isArray(relation) ? relation[0] : relation;
  if (!profile?.staff_email || restaurant?.subscription_tier !== "pro") return { error: "Acceso de empleado incorrecto o plan Pro inactivo." };

  const rememberMe = formData.get("rememberMe") === "on";
  const cookieStore = await cookies();
  cookieStore.set(SESSION_MODE_COOKIE, rememberMe ? "persistent" : "session", {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/",
    ...(rememberMe ? { maxAge: REMEMBER_ME_MAX_AGE } : {}),
  });
  const supabase = await createClient({ sessionOnly: !rememberMe });
  const { error } = await supabase.auth.signInWithPassword({ email: profile.staff_email, password: parsed.data.password });
  if (error) return { error: "Restaurante, usuario o clave incorrectos." };
  redirect("/dashboard");
}

export async function registerAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const slugTaken = await isRestaurantSlugTaken(parsed.data.slug);
  if (slugTaken === true) return { error: "Ese identificador de menú ya está en uso. Elige uno diferente." };
  if (slugTaken === null) return { error: "No pudimos validar el identificador. Inténtalo nuevamente." };

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

  if (error) {
    console.error("Registration OTP verification failed", {
      code: error.code,
      status: error.status,
      message: error.message,
    });

    if (error.message.toLowerCase().includes("database")) {
      return {
        error:
          "El código coincide, pero no pudimos crear el restaurante porque su identificador ya está en uso. Vuelve al registro y elige otro.",
      };
    }

    return { error: "El código no es válido. Usa únicamente el código más reciente que recibiste." };
  }
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
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_MODE_COOKIE);
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

  if (error) return { error: "El código no es válido. Usa únicamente el código más reciente que recibiste." };
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
