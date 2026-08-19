import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyCodeForm } from "@/components/auth/verify-code-form";

export default async function VerifyRecoveryPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  if (!email) redirect("/recuperar-contrasena");

  return (
    <AuthShell
      title="Verifica tu identidad"
      description={`Escribe el código de 6 dígitos que enviamos a ${email}.`}
      footer={<Link className="font-medium text-brand-orange hover:underline" href="/recuperar-contrasena">Solicitar otro código</Link>}
    >
      <VerifyCodeForm email={email} purpose="recovery" />
    </AuthShell>
  );
}
