"use client";

import { useActionState } from "react";
import { registerAction } from "@/app/(auth)/actions";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, {});

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Tu nombre</Label>
        <Input id="fullName" name="fullName" autoComplete="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="restaurantName">Nombre del restaurante</Label>
        <Input id="restaurantName" name="restaurantName" autoComplete="organization" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">Identificador del menú</Label>
        <div className="flex rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
          <span className="flex items-center pl-3 text-sm text-muted-foreground">cartaya.do/</span>
          <Input id="slug" name="slug" className="border-0 pl-1 focus-visible:ring-0" placeholder="mi-restaurante" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">WhatsApp / teléfono</Label>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="8095551234" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <FormMessage {...state} />
      <SubmitButton pendingText="Creando restaurante…">Crear mi restaurante</SubmitButton>
    </form>
  );
}
