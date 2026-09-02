import "server-only";
import { planNames, type SubscriptionTier } from "@/lib/subscriptions";
import { sendTransactionalEmail, sendWhatsAppTemplate, type NotificationResult } from "@/lib/notifications/channels";

type PlanRequestNotification = {
  requestId: string;
  restaurantName: string;
  ownerName: string;
  currentTier: SubscriptionTier;
  requestedTier: SubscriptionTier;
};

type PlanDecisionNotification = {
  eventId: string;
  restaurantName: string;
  ownerName: string;
  ownerEmail?: string | null;
  ownerPhone?: string | null;
  requestedTier: SubscriptionTier;
  activeTier: SubscriptionTier;
  decision: "approved" | "rejected" | "updated";
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

function reportFailures(context: string, results: NotificationResult[]) {
  const failures = results.filter((result) => result.status === "failed");
  if (failures.length > 0) {
    console.error(`[plan-notifications] ${context}`, failures.map(({ channel, detail }) => ({ channel, detail })));
  }
}

export async function notifyAdminOfPlanRequest(input: PlanRequestNotification) {
  const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.tucartaya.com"}/admin`;
  const adminPhone = process.env.PLAN_NOTIFICATIONS_ADMIN_WHATSAPP?.trim();
  const adminEmail = process.env.PLAN_NOTIFICATIONS_ADMIN_EMAIL?.trim();
  const summary = `${input.ownerName} solicitó cambiar ${input.restaurantName} del plan ${planNames[input.currentTier]} al plan ${planNames[input.requestedTier]}.`;
  const tasks: Promise<NotificationResult>[] = [];

  if (adminPhone) {
    tasks.push(sendWhatsAppTemplate({
      to: adminPhone,
      templateName: process.env.WHATSAPP_PLAN_REQUEST_TEMPLATE?.trim() || "cartaya_plan_solicitado",
      bodyParameters: [input.ownerName, input.restaurantName, planNames[input.currentTier], planNames[input.requestedTier], adminUrl],
    }));
  }
  if (adminEmail) {
    tasks.push(sendTransactionalEmail({
      to: adminEmail,
      subject: `Nueva solicitud de plan: ${input.restaurantName}`,
      text: `${summary}\n\nRevisar solicitud: ${adminUrl}`,
      html: `<div style="font-family:Arial,sans-serif;color:#17212b;line-height:1.6"><h1 style="font-size:22px">Nueva solicitud de plan</h1><p>${escapeHtml(summary)}</p><p><a href="${escapeHtml(adminUrl)}">Revisar en CartaYa</a></p></div>`,
      idempotencyKey: `plan-request-${input.requestId}-admin`,
    }));
  }

  const results = await Promise.all(tasks);
  reportFailures(`solicitud ${input.requestId}`, results);
  return results;
}

export async function notifyOwnerOfPlanDecision(input: PlanDecisionNotification) {
  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.tucartaya.com"}/dashboard/plan`;
  const statusText = input.decision === "approved"
    ? "aprobada y activada"
    : input.decision === "rejected"
      ? "rechazada"
      : "actualizada por administración";
  const summary = `La gestión del plan ${planNames[input.requestedTier]} para ${input.restaurantName} fue ${statusText}. Tu plan actual es ${planNames[input.activeTier]}.`;
  const tasks: Promise<NotificationResult>[] = [];

  if (input.ownerEmail) {
    tasks.push(sendTransactionalEmail({
      to: input.ownerEmail,
      subject: `Actualización de tu plan CartaYa: ${planNames[input.activeTier]}`,
      text: `Hola ${input.ownerName},\n\n${summary}\n\nConsulta tu plan: ${dashboardUrl}`,
      html: `<div style="font-family:Arial,sans-serif;color:#17212b;line-height:1.6"><h1 style="font-size:22px">Actualización de tu plan</h1><p>Hola ${escapeHtml(input.ownerName)},</p><p>${escapeHtml(summary)}</p><p><a href="${escapeHtml(dashboardUrl)}">Consultar mi plan</a></p></div>`,
      idempotencyKey: `plan-decision-${input.eventId}-${input.decision}`,
    }));
  }
  if (input.ownerPhone) {
    tasks.push(sendWhatsAppTemplate({
      to: input.ownerPhone,
      templateName: process.env.WHATSAPP_PLAN_DECISION_TEMPLATE?.trim() || "cartaya_plan_actualizado",
      bodyParameters: [input.ownerName, input.restaurantName, statusText, planNames[input.activeTier], dashboardUrl],
    }));
  }

  const results = await Promise.all(tasks);
  reportFailures(`decisión ${input.eventId}`, results);
  return results;
}
