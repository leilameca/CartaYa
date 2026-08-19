import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthDivider, GoogleAuthButton } from "@/components/auth/google-auth-button";
import { LoginForm } from "@/components/auth/login-form";
import { FormMessage } from "@/components/auth/form-message";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}) {
  const { redirectTo, error } = await searchParams;
  return (
    <AuthShell
      title="Bienvenida de vuelta"
      description="Entra para gestionar tu restaurante."
      footer={
        <>
          ¿Aún no tienes cuenta? <Link className="font-medium text-brand-orange hover:underline" href="/registro">Regístrate</Link>
        </>
      }
    >
      {error === "google" ? <FormMessage error="No se pudo iniciar con Google. Verifica la configuración del proveedor." /> : null}
      <GoogleAuthButton label="Entrar con Google" />
      <AuthDivider />
      <LoginForm redirectTo={redirectTo} />
    </AuthShell>
  );
}
