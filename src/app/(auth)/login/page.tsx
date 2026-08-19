import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;
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
      <LoginForm redirectTo={redirectTo} />
      <Link className="mt-4 block text-center text-sm text-brand-navy hover:underline" href="/recuperar-contrasena">
        ¿Olvidaste tu contraseña?
      </Link>
    </AuthShell>
  );
}
