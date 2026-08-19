import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Recupera tu acceso"
      description="Te enviaremos un código de seguridad de 6 dígitos para crear una contraseña nueva."
      footer={<Link className="font-medium text-brand-orange hover:underline" href="/login">Volver al acceso</Link>}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
