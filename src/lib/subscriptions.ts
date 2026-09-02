export type SubscriptionTier = "gratis" | "plus" | "pro";

export const tierRank: Record<SubscriptionTier, number> = {
  gratis: 0,
  plus: 1,
  pro: 2,
};

export function hasTier(current: SubscriptionTier, required: SubscriptionTier) {
  return tierRank[current] >= tierRank[required];
}

export const planNames: Record<SubscriptionTier, string> = {
  gratis: "Gratis",
  plus: "Plus",
  pro: "Pro",
};

export const planOrder: SubscriptionTier[] = ["gratis", "plus", "pro"];

export const planCatalog: Record<SubscriptionTier, {
  name: string;
  price: number;
  description: string;
  featuredBenefits: string[];
}> = {
  gratis: {
    name: "Gratis",
    price: 0,
    description: "Para publicar y validar tu primer menú digital",
    featuredBenefits: ["Hasta 20 platos", "Menú PWA y QR general", "Minijuegos, tutoriales y soporte"],
  },
  plus: {
    name: "Plus",
    price: 700,
    description: "Para recibir pedidos e identificar cada mesa",
    featuredBenefits: ["Platos y QR por mesa ilimitados", "Pedidos, WhatsApp e historial en vivo", "Personalización de la experiencia del cliente"],
  },
  pro: {
    name: "Pro",
    price: 1200,
    description: "Para coordinar salón, cocina y equipo en tiempo real",
    featuredBenefits: ["Pantalla de Cocina con alertas", "Usuarios mesero y cocina", "Solicitudes de mesa y operación completa"],
  },
};

export const planComparisonFeatures: Array<{
  label: string;
  gratis: boolean | string;
  plus: boolean | string;
  pro: boolean | string;
}> = [
  { label: "Menú digital PWA", gratis: true, plus: true, pro: true },
  { label: "Categorías, fotos y disponibilidad", gratis: true, plus: true, pro: true },
  { label: "Cantidad de platos", gratis: "Hasta 20", plus: "Ilimitados", pro: "Ilimitados" },
  { label: "Ofertas y precios promocionales", gratis: true, plus: true, pro: true },
  { label: "QR general", gratis: true, plus: true, pro: true },
  { label: "Minijuegos para clientes", gratis: true, plus: true, pro: true },
  { label: "Tutoriales y centro de soporte", gratis: true, plus: true, pro: true },
  { label: "Personalización del menú público", gratis: false, plus: true, pro: true },
  { label: "QR permanentes por mesa", gratis: false, plus: true, pro: true },
  { label: "Pedidos desde el menú + WhatsApp", gratis: false, plus: true, pro: true },
  { label: "Historial y pedidos en tiempo real", gratis: false, plus: true, pro: true },
  { label: "Notificaciones de pedidos al propietario", gratis: false, plus: true, pro: true },
  { label: "Pantalla de Cocina (KDS)", gratis: false, plus: false, pro: true },
  { label: "Alertas sonoras y push para cocina", gratis: false, plus: false, pro: true },
  { label: "Usuarios mesero y cocina", gratis: false, plus: false, pro: true },
  { label: "Pedidos asistidos por meseros", gratis: false, plus: false, pro: true },
  { label: "Solicitudes y asignación de mesas", gratis: false, plus: false, pro: true },
  { label: "Personalización de la plataforma interna", gratis: false, plus: false, pro: true },
];
