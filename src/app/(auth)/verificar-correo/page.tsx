import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyCodeForm } from "@/components/auth/verify-code-form";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  if (!email) redirect("/registro");

  return (
    <AuthShell
      title="Confirma tu correo"
      description={`Escribe el código de 6 dígitos que enviamos a ${email}.`}
      footer={<Link className="font-medium text-brand-orange hover:underline" href="/registro">Usar otro correo</Link>}
    >
      <VerifyCodeForm email={email} purpose="signup" />
    </AuthShell>
  );
}
