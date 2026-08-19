"use client";

import { useActionState } from "react";
import {
  resendRegistrationCodeAction,
  verifyRecoveryCodeAction,
  verifyRegistrationCodeAction,
} from "@/app/(auth)/actions";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function VerifyCodeForm({ email, purpose }: { email: string; purpose: "signup" | "recovery" }) {
  const verifyAction = purpose === "signup" ? verifyRegistrationCodeAction : verifyRecoveryCodeAction;
  const resendAction = purpose === "signup" ? resendRegistrationCodeAction : undefined;
  const [state, action] = useActionState(verifyAction, {});
  const [resendState, resend] = useActionState(resendAction ?? resendRegistrationCodeAction, {});

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        <input type="hidden" name="email" value={email} />
        <div className="space-y-2">
          <Label htmlFor="token">Código de seguridad</Label>
          <Input
            id="token"
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="000000"
            className="text-center text-xl tracking-[0.45em]"
            required
            autoFocus
          />
        </div>
        <FormMessage {...state} />
        <SubmitButton pendingText="Verificando…">Verificar código</SubmitButton>
      </form>

      {purpose === "signup" ? (
        <form action={resend} className="space-y-3 text-center">
          <input type="hidden" name="email" value={email} />
          <FormMessage {...resendState} />
          <Button type="submit" variant="ghost" className="text-brand-navy">Reenviar código</Button>
        </form>
      ) : null}
    </div>
  );
}
