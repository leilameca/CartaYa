"use client";

import Link from "next/link";
import { Building2, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useActionState, useState } from "react";
import { employeeLoginAction, loginAction } from "@/app/(auth)/actions";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, action] = useActionState(loginAction, {});
  const [employeeState, employeeAction] = useActionState(employeeLoginAction, {});
  const [showPassword, setShowPassword] = useState(false);
  const [employeeMode, setEmployeeMode] = useState(false);

  return (
    <>
      <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Tipo de acceso">
        <button type="button" onClick={() => setEmployeeMode(false)} className={`rounded-lg px-3 py-2 text-sm font-bold ${!employeeMode ? "bg-white text-brand-navy shadow-sm" : "text-slate-500"}`}>Propietario</button>
        <button type="button" onClick={() => setEmployeeMode(true)} className={`rounded-lg px-3 py-2 text-sm font-bold ${employeeMode ? "bg-white text-brand-navy shadow-sm" : "text-slate-500"}`}>Soy empleado</button>
      </div>
      {employeeMode ? (
        <form action={employeeAction} className="space-y-5">
          <div className="space-y-2.5"><Label htmlFor="restaurant" className="text-brand-navy">Identificador del restaurante</Label><div className="relative"><Building2 className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-brand-green" /><Input id="restaurant" name="restaurant" placeholder="ej. cafe-central" className="h-12 rounded-xl pl-11" required /></div></div>
          <div className="space-y-2.5"><Label htmlFor="username" className="text-brand-navy">Usuario</Label><div className="relative"><UserRound className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-brand-green" /><Input id="username" name="username" autoComplete="username" placeholder="Tu usuario" className="h-12 rounded-xl pl-11" required /></div></div>
          <div className="space-y-2.5"><Label htmlFor="employee-password" className="text-brand-navy">Clave</Label><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-brand-green" /><Input id="employee-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" minLength={6} className="h-12 rounded-xl px-11" required /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400" aria-label="Mostrar u ocultar clave">{showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</button></div></div>
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" name="rememberMe" defaultChecked className="size-4 accent-brand-green" />Recordarme</label>
          <FormMessage {...employeeState} />
          <SubmitButton pendingText="Entrando…" className="h-12 rounded-xl bg-brand-orange text-base font-bold">Entrar como empleado</SubmitButton>
        </form>
      ) : <form action={action} className="space-y-5">
      {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}
      <div className="space-y-2.5">
        <Label htmlFor="email" className="text-brand-navy">Correo electrónico</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-brand-green" aria-hidden="true" />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nombre@correo.com"
            className="h-12 rounded-xl border-slate-200 bg-white pl-11 shadow-sm transition-shadow focus-visible:border-brand-orange focus-visible:ring-brand-orange/20"
            required
          />
        </div>
      </div>
      <div className="space-y-2.5">
        <Label htmlFor="password" className="text-brand-navy">Contraseña</Label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-brand-green" aria-hidden="true" />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Tu contraseña"
            minLength={8}
            className="h-12 rounded-xl border-slate-200 bg-white px-11 shadow-sm transition-shadow focus-visible:border-brand-orange focus-visible:ring-brand-orange/20"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 text-sm">
        <label className="flex cursor-pointer items-center gap-2 text-slate-600">
          <input
            type="checkbox"
            name="rememberMe"
            defaultChecked
            className="size-4 rounded border-slate-300 accent-brand-green focus:ring-brand-green"
          />
          Recordarme
        </label>
        <Link className="font-semibold text-brand-navy transition-colors hover:text-brand-orange" href="/recuperar-contrasena">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
      <FormMessage {...state} />
      <SubmitButton
        pendingText="Entrando…"
        className="h-12 rounded-xl bg-brand-orange text-base font-bold shadow-lg shadow-brand-orange/20 transition-all hover:-translate-y-0.5 hover:bg-[#e95a27] hover:shadow-xl"
      >
        Entrar a CartaYa
      </SubmitButton>
      </form>}
    </>
  );
}
