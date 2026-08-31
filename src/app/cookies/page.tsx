import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = { title: "Política de cookies | CartaYa", description: "Cookies y almacenamiento local utilizados por CartaYa." };

export default function CookiesPage() {
  return <LegalShell eyebrow="Cookies" title="Solo lo necesario para que CartaYa funcione." description="No utilizamos cookies publicitarias ni vendemos información de navegación.">
    <section><h2>1. Qué es una cookie</h2><p>Una cookie es un pequeño dato que un sitio guarda en el navegador. También existe almacenamiento local, que permite recordar una preferencia sin enviarla automáticamente en cada solicitud.</p></section>
    <section><h2>2. Cookies estrictamente necesarias</h2><ul><li><strong>Sesión de Supabase:</strong> mantiene la autenticación, renueva de forma segura la sesión y permite acceder al restaurante correcto.</li><li><strong>Modo de sesión CartaYa:</strong> recuerda si el usuario eligió mantener la sesión o cerrarla al terminar.</li><li><strong>Seguridad y entrega:</strong> nuestros proveedores de infraestructura pueden usar datos técnicos temporales para proteger y entregar el servicio.</li></ul><p>Estas cookies son indispensables para prestar una función solicitada. Desactivarlas desde el navegador puede impedir iniciar sesión, recibir notificaciones o utilizar el panel.</p></section>
    <section><h2>3. Almacenamiento local</h2><p>Guardamos en el dispositivo la confirmación de que viste el aviso de cookies. La PWA también puede almacenar archivos estáticos y páginas del menú para mejorar velocidad y funcionamiento con conexión inestable.</p></section>
    <section><h2>4. Turnstile y protección anti-bot</h2><p>Cuando se active Cloudflare Turnstile en registro y recuperación, procesará señales técnicas estrictamente necesarias para impedir bots. No se utilizará con fines publicitarios. Puedes consultar el <a href="https://www.cloudflare.com/turnstile-privacy-policy/" target="_blank" rel="noreferrer">aviso de privacidad de Turnstile</a>.</p></section>
    <section><h2>5. Analítica y publicidad</h2><p>Actualmente CartaYa no instala cookies de analítica, perfiles publicitarios ni seguimiento entre sitios. Si esto cambia, separaremos las categorías opcionales y solicitaremos una elección antes de activarlas cuando corresponda.</p></section>
    <section><h2>6. Cómo administrarlas</h2><p>Puedes borrar o bloquear cookies desde la configuración de Safari, Chrome o tu navegador. Al cerrar sesión, CartaYa elimina la sesión activa; algunos archivos de la PWA pueden permanecer hasta que borres los datos del sitio o desinstales la aplicación.</p></section>
  </LegalShell>;
}
