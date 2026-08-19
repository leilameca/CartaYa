import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <AuthShell
      title="Crea tu restaurante"
      description="Empieza con el plan Gratis y publica hasta 20 platos."
      footer={
        <>
          ¿Ya tienes cuenta? <Link className="font-medium text-brand-orange hover:underline" href="/login">Entra aquí</Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
