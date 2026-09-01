"use client";

import { useActionState } from "react";
import { replyToSupportTicketAction } from "@/app/dashboard/soporte/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function TicketReplyForm({ ticketId, attachmentsEnabled }: { ticketId: string; attachmentsEnabled: boolean }) {
  const [state, action] = useActionState(replyToSupportTicketAction, {});
  return <form action={action} className="space-y-4"><input type="hidden" name="ticketId" value={ticketId} /><div className="space-y-2"><Label htmlFor="support-reply">Tu respuesta</Label><Textarea id="support-reply" name="body" minLength={2} maxLength={4000} className="min-h-28" placeholder="Agrega información o responde la pregunta de soporte." required /></div><div className="space-y-2"><Label htmlFor="support-reply-attachment">Nueva captura opcional</Label><Input id="support-reply-attachment" name="attachment" type="file" accept="image/jpeg,image/png,image/webp" disabled={!attachmentsEnabled} className="h-auto py-2" /></div>{state.error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{state.error}</p> : null}<SubmitButton pendingText="Enviando…" className="bg-brand-orange">Enviar respuesta</SubmitButton></form>;
}
