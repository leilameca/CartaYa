# CartaYa

CartaYa es una plataforma SaaS multiempresa para restaurantes. Une el menú digital por QR, los pedidos de clientes, la operación de salón y cocina, la gestión de empleados y la administración comercial del producto en una PWA responsive.

Producción: [www.tucartaya.com](https://www.tucartaya.com)

## Alcance actual

- Registro con correo y OTP, inicio de sesión tradicional, recuperación y Google OAuth.
- Creación transaccional de un restaurante y su cuenta propietaria.
- Menú público PWA por restaurante con categorías, fotos, disponibilidad y marca propia.
- QR general y QR permanentes por mesa, descargables en PNG, SVG o ZIP.
- Pedidos desde el menú, confirmación por WhatsApp y actualización en tiempo real.
- Historial de pedidos y Pantalla de Cocina (KDS) con estados y alertas.
- Usuarios internos sin correo visible: `mesero` y `cocina`.
- Solicitudes de asistencia por mesa, aceptación exclusiva y continuidad del mesero asignado.
- Web Push para pedidos, cocina, meseros, propietarios, soporte y superadministración.
- Avisos transaccionales por correo y WhatsApp para solicitudes y activaciones de planes.
- Personalización del menú público desde Plus y del panel interno en Pro.
- Biblioteca de tutoriales administrada por la superadministradora.
- Centro de soporte con tickets, conversación, estados, notas internas y capturas cifradas.
- Panel SaaS para restaurantes, planes, solicitudes, métricas, tutoriales y soporte.
- Minijuegos de cocina disponibles en la experiencia del cliente.
- Páginas públicas de términos, privacidad, cookies y seguridad.

## Planes

La fuente única usada por la landing y el panel está en `src/lib/subscriptions.ts`.

| Capacidad | Gratis | Plus · RD$700/mes | Pro · RD$1,200/mes |
| --- | --- | --- | --- |
| Menú digital PWA | Sí | Sí | Sí |
| Categorías, fotos y disponibilidad | Sí | Sí | Sí |
| Platos | Hasta 20 | Ilimitados | Ilimitados |
| Ofertas en platos y sección promocional | Sí | Sí | Sí |
| QR general | Sí | Sí | Sí |
| Minijuegos, tutoriales y soporte | Sí | Sí | Sí |
| Personalización del menú público | No | Sí | Sí |
| QR por mesa | No | Sí | Sí |
| Pedidos, WhatsApp e historial en vivo | No | Sí | Sí |
| Notificaciones de pedidos al propietario | No | Sí | Sí |
| Pantalla de Cocina y alertas | No | No | Sí |
| Usuarios mesero y cocina | No | No | Sí |
| Pedidos asistidos por meseros | No | No | Sí |
| Solicitudes y asignación de mesas | No | No | Sí |
| Personalización del panel interno | No | No | Sí |

Los cambios de plan no son automáticos. El propietario envía una solicitud y la superadministradora la aprueba o rechaza desde `/admin`. Los límites se aplican en interfaz, servidor y PostgreSQL; ocultar un enlace no constituye el control de autorización.

## Roles y accesos

Todos los usuarios entran por `/login`. Los empleados seleccionan la opción de acceso para equipo y usan restaurante, usuario y contraseña; no necesitan administrar un correo.

| Rol | Acceso principal |
| --- | --- |
| `owner` | Menú, QR, pedidos, plan, personalización, equipo, cocina, tutoriales y soporte según el plan |
| `mesero` | Mesas asignadas, solicitudes, pedidos asistidos y consulta de comandas de otras mesas, tutoriales y soporte en Pro |
| `cocina` | KDS, notificaciones, tutoriales y soporte en Pro |
| `superadmin` | Administración global, planes, tutoriales y soporte con MFA obligatorio |

Rutas principales:

- `/dashboard/menu`: categorías, platos, ofertas, precios y disponibilidad.
- `/dashboard/qr`: códigos QR.
- `/dashboard/pedidos`: historial y gestión desde Plus.
- `/dashboard/configuracion`: marca pública desde Plus y tema interno en Pro.
- `/dashboard/equipo`: empleados Pro.
- `/dashboard/salon`: operación de meseros Pro.
- `/dashboard/cocina`: Pantalla de Cocina Pro.
- `/dashboard/tutoriales`: biblioteca de aprendizaje.
- `/dashboard/soporte`: tickets del restaurante.
- `/dashboard/plan`: comparación y solicitud de cambio.
- `/admin`: panel de la propietaria del SaaS.
- `/admin/tutoriales`: administración de videos y categorías.
- `/admin/soporte`: bandeja global de soporte.

## Arquitectura

- Next.js 16 App Router, React 19 y TypeScript.
- Tailwind CSS y componentes accesibles basados en Radix UI.
- Supabase Auth, PostgreSQL, Row Level Security y Realtime.
- Cloudflare R2 para imágenes y adjuntos cifrados.
- Vercel para construcción y despliegue.
- Service worker, manifest por restaurante y Web Push con VAPID.
- Zod para validación en fronteras de entrada.

La aplicación es multi-tenant: cada registro operativo contiene `restaurant_id`, RLS restringe las consultas autenticadas y los flujos públicos pasan por funciones o endpoints limitados que vuelven a calcular precios en el servidor.

## Flujos principales

### Registro y autenticación

`/registro` crea la identidad en Supabase Auth. El restaurante Gratis y el perfil `owner` se materializan en una transacción después de confirmar el OTP. Google OAuth usa PKCE y `/auth/callback`; una cuenta nueva completa los datos del negocio en `/completar-registro`.

La superadministradora se detecta antes del onboarding de restaurantes y debe alcanzar AAL2 mediante TOTP antes de consultar información global o cambiar planes.

### Menú, QR y PWA

Cada restaurante se publica en `/r/[slug]`. Los QR de mesa usan `/r/[slug]/mesa/[tableId]`. El manifest, colores y nombre se generan por restaurante; el último menú visitado queda disponible para conectividad intermitente.

Las fotos se validan por tipo, tamaño y firma binaria antes de guardarse en `restaurants/{restaurant_id}/menu/`. Los logos usan `restaurants/{restaurant_id}/branding/`.

### Pedidos y operación Pro

Plus y Pro pueden registrar pedidos públicos. El servidor valida restaurante, mesa, horario, disponibilidad, cantidades y plan; PostgreSQL calcula nuevamente precios e inserta el pedido de forma atómica. Plus notifica al propietario y abre el historial; Pro notifica también a cocina y abre el KDS.

En Pro, el primer mesero que acepta una solicitud queda asociado a esa mesa. Los pedidos posteriores de la misma sesión se dirigen al mesero asignado. El mesero también puede crear un pedido para un cliente sin celular.

### Notificaciones

Web Push funciona fuera de la aplicación cuando el navegador y el sistema operativo lo permiten. En iPhone requiere iOS 16.4 o posterior, la PWA agregada a la pantalla de inicio y permiso concedido. Los sonidos dentro de la aplicación necesitan una interacción inicial del usuario debido a las políticas de reproducción de los navegadores.

### Soporte

Los restaurantes crean tickets con categoría, impacto, descripción y captura opcional. Los adjuntos se cifran con AES-256-GCM antes de guardarse en R2 y solo se descifran tras autorizar la sesión. La superadministradora dispone de prioridades, búsqueda, filtros, conversación, notas internas y estados.

## Seguridad

- RLS y separación por restaurante.
- `service_role` exclusiva de módulos de servidor.
- MFA/TOTP obligatoria para superadministración.
- Rate limiting persistente para accesos y acciones públicas sensibles.
- Validación de formularios, archivos y respuestas públicas.
- Cabeceras CSP, HSTS administrado, `nosniff` y bloqueo de iframes.
- Redirecciones internas normalizadas.
- Contraseñas almacenadas únicamente por Supabase Auth.
- Adjuntos de soporte cifrados y descargas con autorización.

Antes de un lanzamiento público amplio todavía se debe ejecutar una restauración real de backups, activar protección anti-bot, integrar monitoreo centralizado, automatizar CI y completar una prueba de penetración independiente. Consulta `docs/security-audit-2026-08-28.md`.

## Puesta en marcha local

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Copia `.env.example` a `.env.local` y configura Supabase, R2, VAPID, la URL canónica y los proveedores transaccionales que vayas a activar. Las claves privadas nunca deben usar el prefijo `NEXT_PUBLIC_`.

3. Enlaza y aplica las migraciones:

   ```bash
   supabase link --project-ref TU_PROJECT_REF
   supabase db push
   ```

4. Configura en Supabase y Google las URLs de callback locales y de producción.

5. Inicia la aplicación:

   ```bash
   npm run dev
   ```

En Next.js 16 la convención anterior de `middleware.ts` se llama `proxy.ts`. `src/proxy.ts` renueva la sesión, protege rutas privadas y conserva la redirección del dominio anterior para QR ya impresos.

## Calidad y verificaciones

```bash
npm run lint
npm run typecheck
npm run build
npm run verify:foundation
npm run verify:menu
npm run verify:pwa
npm run verify:pwa-order
npm run verify:orders-kds
npm run verify:qr-entitlements
supabase test db
supabase db lint --linked
```

Las verificaciones integradas crean tenants temporales y comprueban aislamiento, límites de plan, pedidos, Realtime, KDS y QR sin conservar datos de prueba.

## Documentación del producto

- [Requisitos funcionales y no funcionales](docs/requisitos-del-sistema.md)
- [Guion de presentación para LinkedIn](docs/guion-video-linkedin.md)
- [Auditoría de seguridad](docs/security-audit-2026-08-28.md)
- [Configuración de Cloudflare R2](docs/cloudflare-r2.md)
- [Notificaciones de cambios de plan](docs/notificaciones-planes.md)

## Estado

CartaYa está preparada para una beta controlada con tres restaurantes. El objetivo de esa etapa es validar onboarding, pedidos, notificaciones, estabilidad móvil, soporte, disposición de pago y retención antes del lanzamiento abierto.
