import "server-only";

type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
};

type WhatsAppTemplateMessage = {
  to: string;
  templateName: string;
  bodyParameters: string[];
};

export type NotificationResult = {
  channel: "email" | "whatsapp";
  status: "sent" | "skipped" | "failed";
  detail?: string;
};

const REQUEST_TIMEOUT_MS = 10_000;

function normalizeWhatsAppNumber(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  // CartaYa opera inicialmente en República Dominicana. Los números locales
  // de diez dígitos necesitan el prefijo internacional 1 para Meta.
  if (digits.length === 10) digits = `1${digits}`;
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

async function readError(response: Response) {
  const body = await response.text();
  return body.slice(0, 300) || `HTTP ${response.status}`;
}

export async function sendTransactionalEmail(message: EmailMessage): Promise<NotificationResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.TRANSACTIONAL_EMAIL_FROM?.trim();
  if (!apiKey || !from || !message.to.trim()) {
    return { channel: "email", status: "skipped", detail: "Correo no configurado" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": message.idempotencyKey.slice(0, 256),
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        reply_to: process.env.TRANSACTIONAL_EMAIL_REPLY_TO?.trim() || undefined,
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      return { channel: "email", status: "failed", detail: await readError(response) };
    }
    return { channel: "email", status: "sent" };
  } catch (error) {
    return { channel: "email", status: "failed", detail: error instanceof Error ? error.message : "Error desconocido" };
  }
}

export async function sendWhatsAppTemplate(message: WhatsAppTemplateMessage): Promise<NotificationResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || "v25.0";
  const languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || "es";
  const to = normalizeWhatsAppNumber(message.to);

  if (!token || !phoneNumberId || !message.templateName || !to) {
    return { channel: "whatsapp", status: "skipped", detail: "WhatsApp no configurado o número inválido" };
  }

  try {
    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template: {
          name: message.templateName,
          language: { code: languageCode },
          components: [{
            type: "body",
            parameters: message.bodyParameters.map((text) => ({ type: "text", text })),
          }],
        },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      return { channel: "whatsapp", status: "failed", detail: await readError(response) };
    }
    return { channel: "whatsapp", status: "sent" };
  } catch (error) {
    return { channel: "whatsapp", status: "failed", detail: error instanceof Error ? error.message : "Error desconocido" };
  }
}
