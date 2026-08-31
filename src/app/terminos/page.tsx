import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "Términos de servicio | CartaYa",
  description: "Condiciones generales para utilizar CartaYa.",
};

export default function TermsPage() {
  return <LegalShell eyebrow="Términos" title="Reglas claras para usar CartaYa." description="Estas condiciones regulan el acceso a la plataforma por restaurantes, propietarios y miembros de su equipo.">
    <section><h2>1. El servicio</h2><p>CartaYa es un servicio operado por Leilany Moran, con domicilio en Santiago, República Dominicana. La plataforma permite publicar menús digitales, generar códigos QR, recibir pedidos y organizar parte de la operación de un restaurante. Algunas funciones dependen del plan activo, del dispositivo, del navegador y de servicios de terceros.</p></section>
    <section><h2>2. Cuenta y acceso</h2><p>El propietario es responsable de mantener actualizados sus datos, proteger sus credenciales y administrar los usuarios de su equipo. No se permite compartir una cuenta para evitar controles de rol, suplantar a otra persona ni intentar acceder a otro restaurante.</p></section>
    <section><h2>3. Contenido y operación del restaurante</h2><p>El restaurante es responsable de precios, fotografías, disponibilidad, alérgenos, impuestos, preparación, entrega, cobro y cumplimiento de las reglas aplicables a su actividad. Debe tener autorización para publicar el contenido que cargue.</p></section>
    <section><h2>4. Planes y pagos</h2><p>El plan Gratis no tiene cargo mensual. Plus cuesta RD$700 al mes y Pro RD$1,200 al mes. Solicitar un plan no lo activa automáticamente: CartaYa confirmará la activación, la fecha de inicio y el medio de pago. Los precios podrán cambiar para períodos futuros con aviso previo.</p></section>
    <section><h2>5. Uso permitido</h2><p>No se permite usar CartaYa para fraude, contenido ilegal, ataques, extracción automatizada abusiva, envío de mensajes no solicitados o actividades que dañen el servicio o a terceros. Podemos limitar o suspender accesos para proteger la plataforma mientras investigamos un abuso.</p></section>
    <section><h2>6. Disponibilidad y cambios</h2><p>Trabajamos para mantener el servicio disponible, pero pueden existir mantenimientos, fallos de red o interrupciones de proveedores. Podemos mejorar o modificar funciones procurando no eliminar sin aviso una capacidad esencial de un plan pagado.</p></section>
    <section><h2>7. Cancelación y datos</h2><p>El propietario puede solicitar la cancelación y eliminación de su cuenta. Antes de eliminar datos verificaremos identidad, obligaciones pendientes y períodos de conservación legal u operativa. Consulta la <a href="/privacidad">política de privacidad</a>.</p></section>
    <section><h2>8. Contacto y ley aplicable</h2><p>Para consultas sobre estos términos escribe a <a href="mailto:soporte@tucartaya.com">soporte@tucartaya.com</a>. Estos términos se interpretan conforme a las normas aplicables de la República Dominicana.</p></section>
  </LegalShell>;
}
