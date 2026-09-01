"use client";

import { useActionState } from "react";
import { createSupportTicketAction } from "@/app/dashboard/soporte/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function NewTicketForm({ attachmentsEnabled }: { attachmentsEnabled: boolean }) {
  const [state, action] = useActionState(createSupportTicketAction, {});
  return <form action={action} className="grid gap-5 sm:grid-cols-2">
    <div className="space-y-2"><Label htmlFor="support-category">Área afectada</Label><select id="support-category" name="category" className="flex h-11 w-full rounded-xl border border-input bg-white px-3 text-sm" required defaultValue=""><option value="" disabled>Selecciona una categoría</option><option value="cuenta">Cuenta y acceso</option><option value="menu">Menú y personalización</option><option value="pedidos">Pedidos</option><option value="cocina">Cocina</option><option value="equipo">Meseros y equipo</option><option value="qr">Códigos QR</option><option value="notificaciones">Notificaciones</option><option value="planes">Facturación y planes</option><option value="seguridad">Seguridad</option><option value="otro">Otro</option></select></div>
    <div className="space-y-2"><Label htmlFor="support-impact">Impacto</Label><select id="support-impact" name="impact" className="flex h-11 w-full rounded-xl border border-input bg-white px-3 text-sm" required defaultValue="problema"><option value="consulta">Tengo una duda</option><option value="problema">Una función presenta problemas</option><option value="bloqueado">No puedo operar</option></select></div>
    <div className="space-y-2 sm:col-span-2"><Label htmlFor="support-subject">Título</Label><Input id="support-subject" name="subject" placeholder="Describe el problema en una frase" minLength={5} maxLength={140} required /></div>
    <div className="space-y-2 sm:col-span-2"><Label htmlFor="support-description">¿Qué ocurrió?</Label><Textarea id="support-description" name="description" placeholder="Cuéntanos qué intentabas hacer, qué resultado esperabas y qué apareció en pantalla." minLength={20} maxLength={4000} className="min-h-36" required /><p className="text-xs text-slate-500">No compartas contraseñas, códigos de acceso ni información bancaria.</p></div>
    <input type="hidden" name="appVersion" value="CartaYa Web 0.1.0" />
    <div className="space-y-2 sm:col-span-2"><Label htmlFor="support-attachment">Captura opcional</Label><Input id="support-attachment" name="attachment" type="file" accept="image/jpeg,image/png,image/webp" disabled={!attachmentsEnabled} className="h-auto py-2" /><p className="text-xs text-slate-500">JPG, PNG o WebP, máximo 3 MB. La captura se cifra antes de almacenarse.{!attachmentsEnabled ? " La carga está temporalmente deshabilitada." : ""}</p></div>
    {state.error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 sm:col-span-2">{state.error}</p> : null}
    <SubmitButton pendingText="Enviando ticket…" className="h-11 bg-brand-orange sm:col-span-2">Enviar a soporte</SubmitButton>
  </form>;
}
