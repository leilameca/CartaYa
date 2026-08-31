"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "loading" | "enroll" | "challenge";

export function SuperadminMfa() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("loading");
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function prepare() {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (!active) return;
      if (factorsError || !factors) {
        setError("No pudimos consultar el segundo factor. Vuelve a iniciar sesión.");
        setMode("challenge");
        return;
      }

      const verifiedFactor = factors.totp[0];
      if (verifiedFactor) {
        setFactorId(verifiedFactor.id);
        setMode("challenge");
        return;
      }

      for (const pending of factors.all.filter((factor) => factor.factor_type === "totp" && factor.status === "unverified")) {
        await supabase.auth.mfa.unenroll({ factorId: pending.id });
      }

      const { data: enrollment, error: enrollmentError } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "CartaYa Superadmin" });
      if (!active) return;
      if (enrollmentError || !enrollment) {
        setError("No pudimos preparar el autenticador. Recarga la página para intentarlo nuevamente.");
        setMode("enroll");
        return;
      }

      setFactorId(enrollment.id);
      setQrCode(enrollment.totp.qr_code);
      setSecret(enrollment.totp.secret);
      setMode("enroll");
    }

    void prepare();
    return () => { active = false; };
  }, []);

  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code) || !factorId) {
      setError("Escribe el código de seis dígitos de tu aplicación autenticadora.");
      return;
    }

    setSubmitting(true);
    setError("");
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (verifyError) {
      setError("El código no es válido o ya venció. Espera el siguiente código e inténtalo otra vez.");
      setSubmitting(false);
      return;
    }
    router.replace("/admin?success=mfa");
    router.refresh();
  }

  if (mode === "loading") {
    return <div className="flex min-h-52 items-center justify-center text-slate-500"><LoaderCircle className="mr-3 size-5 animate-spin" />Preparando seguridad…</div>;
  }

  return <div className="space-y-6">
    {mode === "enroll" && qrCode ? <div className="space-y-5">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900"><p className="font-black">Configura tu aplicación autenticadora</p><p className="mt-1">Abre Google Authenticator, Microsoft Authenticator o 1Password, elige agregar una cuenta y escanea este QR.</p></div>
      <div className="flex justify-center rounded-2xl border bg-white p-5">
        {/* Supabase genera este SVG exclusivamente desde el secreto TOTP de la sesión autenticada. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrCode} alt="Código QR para configurar el autenticador de CartaYa" className="size-52 max-w-full" />
      </div>
      <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Clave manual</p><code className="mt-2 block overflow-x-auto rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-brand-navy">{secret}</code><p className="mt-2 text-xs leading-5 text-slate-500">Guárdala temporalmente en un lugar privado hasta verificar el código. No la envíes por correo ni mensajería.</p></div>
    </div> : null}

    {mode === "challenge" ? <div className="flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900"><ShieldCheck className="mt-0.5 size-5 shrink-0" /><div><p className="font-black">Confirma que eres tú</p><p>Abre tu aplicación autenticadora y escribe el código actual de CartaYa.</p></div></div> : null}

    <form onSubmit={verify} className="space-y-4">
      <div className="space-y-2"><Label htmlFor="totp-code">Código de seguridad</Label><div className="relative"><KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-brand-green" /><Input id="totp-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" className="h-12 pl-11 text-center text-lg font-black tracking-[0.35em]" required /></div></div>
      {error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
      <Button type="submit" disabled={submitting || !factorId} className="h-12 w-full bg-brand-orange text-base font-black hover:bg-brand-orange/90">{submitting ? "Verificando…" : mode === "enroll" ? "Activar y entrar" : "Verificar y entrar"}</Button>
    </form>
  </div>;
}
