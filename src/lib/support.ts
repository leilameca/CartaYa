import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const supportCategoryLabels: Record<string, string> = {
  cuenta: "Cuenta y acceso",
  menu: "Menú y personalización",
  pedidos: "Pedidos",
  cocina: "Cocina",
  equipo: "Meseros y equipo",
  qr: "Códigos QR",
  notificaciones: "Notificaciones",
  planes: "Facturación y planes",
  seguridad: "Seguridad",
  otro: "Otro",
};

export const supportImpactLabels: Record<string, string> = {
  consulta: "Tengo una duda",
  problema: "Una función presenta problemas",
  bloqueado: "No puedo operar",
};

export const supportStatusLabels: Record<string, string> = {
  abierto: "Abierto",
  en_revision: "En revisión",
  esperando_cliente: "Esperando respuesta",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
};

export function formatTicketNumber(ticketNumber: number, createdAt: string) {
  return `CT-${new Date(createdAt).getFullYear()}-${String(ticketNumber).padStart(6, "0")}`;
}

export async function getRestaurantSupportContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard/soporte");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id, restaurant_id, full_name, role").eq("id", user.id).maybeSingle();
  if (!profile?.restaurant_id || profile.role === "superadmin") redirect("/admin");
  return { user, profile, admin };
}

export async function requireRestaurantTicket(ticketId: string) {
  const context = await getRestaurantSupportContext();
  const { data: ticket } = await context.admin.from("support_tickets").select("*").eq("id", ticketId).maybeSingle();
  if (!ticket || ticket.restaurant_id !== context.profile.restaurant_id) redirect("/dashboard/soporte?error=no_encontrado");
  if (context.profile.role !== "owner" && ticket.created_by !== context.user.id) redirect("/dashboard/soporte?error=sin_permiso");
  return { ...context, ticket };
}
