import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "Seguridad | CartaYa",
  description: "Controles de seguridad y canal para reportar vulnerabilidades en CartaYa.",
};

export default function SecurityPage() {
  return <LegalShell eyebrow="Seguridad" title="La seguridad forma parte de la operación." description="Protegemos las cuentas y los datos del restaurante con controles técnicos, acceso limitado y una respuesta responsable ante incidentes.">
    <section><h2>1. Controles principales</h2><ul><li>Aislamiento de datos por restaurante mediante políticas de acceso en la base de datos.</li><li>Conexiones cifradas mediante HTTPS y sesiones administradas por Supabase Auth.</li><li>Validación en el servidor, límites de frecuencia y permisos por rol.</li><li>Encabezados de seguridad, protección de rutas internas y registro de eventos operativos.</li><li>Dependencias revisadas y verificaciones automáticas antes de cada despliegue.</li></ul></section>
    <section><h2>2. Responsabilidad compartida</h2><p>Los propietarios deben usar una contraseña única, proteger el acceso a su correo y retirar de inmediato a empleados que ya no formen parte del equipo. Cada empleado debe utilizar únicamente su usuario asignado y cerrar sesión en dispositivos compartidos.</p></section>
    <section><h2>3. Notificaciones y dispositivos</h2><p>Las notificaciones web requieren autorización del usuario y dependen del navegador, el sistema operativo y la conexión. No deben utilizarse como único mecanismo para emergencias o situaciones que impliquen riesgo físico.</p></section>
    <section><h2>4. Reportar una vulnerabilidad</h2><p>Si encuentras un posible problema de seguridad, escribe a <a href="mailto:seguridad@tucartaya.com">seguridad@tucartaya.com</a> con una descripción, pasos para reproducirlo y la URL afectada. No accedas a datos ajenos, no interrumpas el servicio y no publiques detalles antes de que podamos investigar.</p></section>
    <section><h2>5. Alcance</h2><p>Esta página describe nuestros controles de forma general y no constituye una certificación. CartaYa continuará reforzando autenticación, monitoreo, copias de seguridad y respuesta a incidentes conforme avance el lanzamiento.</p></section>
  </LegalShell>;
}
