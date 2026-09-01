"use client";

import { useState } from "react";
import { adminReplySupportTicketAction } from "@/app/admin/soporte/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AdminTicketReplyForm({ ticketId, attachmentsEnabled }: { ticketId: string; attachmentsEnabled: boolean }) {
  const [internal, setInternal] = useState(false);

  return (
    <form action={adminReplySupportTicketAction} className="space-y-4">
      <input type="hidden" name="ticketId" value={ticketId} />
      <div className="space-y-2">
        <Label htmlFor="admin-support-reply">{internal ? "Nota interna" : "Respuesta al cliente"}</Label>
        <Textarea
          id="admin-support-reply"
          name="body"
          minLength={2}
          maxLength={4000}
          className="min-h-32"
          placeholder={internal ? "Esta nota solo será visible para el equipo de CartaYa." : "Escribe una respuesta clara con los próximos pasos."}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin-support-attachment">Captura opcional</Label>
        <Input id="admin-support-attachment" name="attachment" type="file" accept="image/jpeg,image/png,image/webp" disabled={!attachmentsEnabled} className="h-auto py-2" />
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-slate-50 p-3 text-sm text-slate-700">
        <input type="checkbox" name="internal" className="mt-1 size-4 accent-brand-orange" checked={internal} onChange={(event) => setInternal(event.target.checked)} />
        <span><strong className="block text-brand-navy">Guardar como nota interna</strong>El restaurante no verá esta nota ni recibirá una notificación.</span>
      </label>
      <SubmitButton pendingText="Guardando…" className={internal ? "bg-brand-navy" : "bg-brand-orange"}>
        {internal ? "Guardar nota" : "Enviar respuesta"}
      </SubmitButton>
    </form>
  );
}
