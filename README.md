# CartaYa

Fundación técnica del SaaS multi-tenant de menús digitales por QR para restaurantes en República Dominicana.

Producción de esta etapa: [cartaya-seven.vercel.app](https://cartaya-seven.vercel.app)

Proyecto Supabase Cloud: `tiyikulmmbdehkpqevfk` (`us-east-1`).

## Stack

- Next.js 16 (App Router), TypeScript y Tailwind CSS
- shadcn/ui (configurado en `components.json`)
- Supabase Auth, Postgres, RLS y Realtime
- Vercel para la app y Cloudflare R2 para las fotos de platos

Web Push usa VAPID y el service worker de la PWA. La clave privada solo se configura en servidor; la pública puede llegar al navegador.

## Accesos del panel

Todos los usuarios entran por `/login`. Después de iniciar sesión, el acceso depende del rol:

- `/dashboard`: panel del dueño del restaurante.
- `/dashboard/equipo`: creación y administración de usuarios `mesero` y `cocina` (solo Pro).
- `/dashboard/configuracion`: personalización del restaurante (solo Pro).
- `/dashboard/menu`, `/dashboard/qr` y `/dashboard/plan`: funciones reservadas al dueño.
- `/dashboard/pedidos`: pedidos e historial para el dueño y el mesero, desde Plus.
- `/dashboard/cocina`: KDS para el dueño y cocina, desde Pro.
- `/admin`: panel del SaaS, reservado al perfil `superadmin`.

El dueño crea las cuentas de sus empleados directamente con nombre, correo, contraseña y rol. También puede editar nombre y rol, cambiar la contraseña o eliminar la cuenta. Las credenciales se administran exclusivamente en acciones de servidor mediante Supabase Auth Admin; no se guardan contraseñas en la tabla `profiles`.

## Puesta en marcha

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Copia `.env.example` a `.env.local` y completa las tres claves de Supabase. La `SUPABASE_SERVICE_ROLE_KEY` es exclusivamente de servidor y se reserva para tareas administrativas y el script de verificación; nunca debe llevar el prefijo `NEXT_PUBLIC_`.

   Completa también `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT`. Genera el par una sola vez con:

   ```bash
   npx web-push generate-vapid-keys
   ```

   La clave privada debe existir únicamente en `.env.local` y en las variables server-only de Vercel. Nunca la subas a GitHub.

3. Aplica todas las migraciones con Supabase CLI:

   ```bash
   supabase link --project-ref TU_PROJECT_REF
   supabase db push
   ```

4. En **Authentication > URL Configuration** agrega:

   - Site URL: `http://localhost:3000` (producción: tu dominio de Vercel)
   - Redirect URL: `http://localhost:3000/auth/callback`

   El proyecto Cloud enlazado ya incluye también `https://cartaya-seven.vercel.app/auth/callback`.

5. Inicia la aplicación:

   ```bash
   npm run dev
   ```

## Flujo de registro

`/registro` usa `auth.signUp` y envía un OTP de 6 dígitos con la plantilla de CartaYa. El restaurante Gratis y el perfil `owner` se crean en una sola transacción únicamente cuando Supabase confirma el correo. El código vence en 60 minutos y se puede reenviar con el límite nativo de Auth.

La recuperación de contraseña también usa un OTP de 6 dígitos: después de verificarlo se crea una sesión de recuperación y `/restablecer-contrasena` permite guardar la clave nueva.

En `/login`, **Recordarme** conserva las cookies de sesión entre cierres del navegador. Si se desmarca, CartaYa emite cookies de sesión sin `Max-Age` y el middleware mantiene ese mismo modo durante las renovaciones del token.

Google OAuth usa PKCE y vuelve por `/auth/callback`. Si el usuario ya tiene perfil, entra al dashboard; si es nuevo, `/completar-registro` solicita los datos del restaurante y ejecuta la función transaccional `complete_restaurant_owner_onboarding`. Para habilitar el proveedor en otro proyecto, crea un cliente Web en Google Auth Platform, autoriza `https://tiyikulmmbdehkpqevfk.supabase.co/auth/v1/callback` y guarda el Client ID y Client Secret en **Supabase > Authentication > Providers > Google**.

El archivo de marca oficial `logo.png` se importa como imagen estática optimizada en las pantallas de autenticación y el dashboard.

## Seguridad multi-tenant

RLS está habilitado en las siete tablas. `anon` no tiene permisos sobre ellas. `owner`, `mesero` y `cocina` solo pueden acceder al tenant guardado en su propio perfil; `superadmin` puede leer todos los tenants, pero no obtiene escritura por las políticas públicas. La `service_role` sí omite RLS por diseño de Supabase y por eso solo se usa en tareas administrativas controladas, creación de usuarios del equipo y en el endpoint de servidor que valida pedidos públicos; nunca llega al navegador.

La migración `202608200001_staff_roles_and_order_identity.sql` agrega los roles `mesero` y `cocina`. La migración `202608200002_convert_staff_to_waiters.sql` convierte las cuentas antiguas `staff` a `mesero`, agrega `customer_name` y `created_by_waiter_id` a los pedidos, y aplica las funciones de autorización actualizadas.

Los propietarios tampoco pueden modificar `subscription_tier`, `role` ni `restaurant_id` vía API. Para promover tu cuenta desde SQL Editor:

```sql
update public.profiles
set role = 'superadmin'
where id = (select id from auth.users where email = 'TU_CORREO');
```

## Verificación RLS

Con Supabase CLI y Docker disponibles:

```bash
supabase start
supabase db reset
supabase test db
```

La prueba `supabase/tests/database/rls_isolation.test.sql` crea dos restaurantes, dos owners y una superadmin; demuestra que cada owner solo lee/escribe su tenant y que la superadmin puede leer ambos.

Para verificar la fundación completa contra el proyecto Cloud enlazado, sin conservar los datos temporales:

```bash
npm run verify:foundation
```

## Gestor de menú

`/dashboard/menu` incluye CRUD de categorías y platos, reordenamiento, disponibilidad, etiquetas y el límite Gratis en interfaz, acciones de servidor y Postgres. El dueño selecciona las fotos directamente desde la computadora o el celular con un campo de archivo; no necesita pegar enlaces. Las fotos se validan, se comprimen cuando es necesario y se suben al servidor bajo `restaurants/{restaurant_id}/menu/`.

La personalización de `/dashboard/configuracion` permite seleccionar también el logo desde la computadora o el celular. Los logos se guardan bajo `restaurants/{restaurant_id}/branding/`; al reemplazar un logo, el anterior se elimina de R2. El dueño también puede cambiar nombre, identificador del menú, teléfono, dirección y color principal. Consulta [docs/cloudflare-r2.md](docs/cloudflare-r2.md) para crear el bucket y configurar las cinco variables necesarias.

## Menú público y PWA

Cada restaurante se publica en `/r/[slug]`; los QR de mesa usan `/r/[slug]/mesa/[tableId]`. La PWA aplica color y logo por tenant, muestra únicamente platos disponibles, conserva el último menú visitado para conexiones intermitentes y expone un manifest instalable con el nombre del restaurante.

Las tablas continúan completamente cerradas para `anon`. `get_public_menu` es la única lectura pública y limita el resultado al slug solicitado. Los pedidos Plus/Pro entran por `/api/public/orders`; el servidor valida horario, mesa, plan, disponibilidad y cantidades, y PostgreSQL recalcula precios e inserta `orders` + `order_items` atómicamente. El plan Gratis nunca crea registros.

Para ejecutar la verificación de permisos contra Supabase Cloud:

```bash
npm run verify:pwa
```

## Pedidos y Pantalla de Cocina

`/dashboard/pedidos` muestra el historial del tenant con filtros, detalle de partidas y actualización en vivo. `/dashboard/cocina` es el KDS exclusivo del plan Pro: organiza los pedidos activos en Nuevo, En preparación y Listo, permite avanzar su estado y emite una alerta sonora tras activarla en el navegador.

El checkout público solicita opcionalmente el nombre del cliente y lo guarda en `orders.customer_name`. Los pedidos creados por un mesero pueden guardar `orders.created_by_waiter_id`, manteniendo la atribución dentro del mismo restaurante. El nombre del cliente se muestra en el historial y en el KDS.

Ambas pantallas se suscriben a `orders` mediante Supabase Realtime con filtro por `restaurant_id`; RLS vuelve a validar cada evento antes de entregarlo. La prueba integrada crea un tenant temporal, mide la llegada Realtime, cambia un estado y comprueba el bloqueo de planes no Pro:

```bash
npm run verify:orders-kds
```

El KDS conserva la alerta sonora dentro del navegador y ahora también puede recibir Web Push aunque la PWA esté cerrada, siempre que el dispositivo esté encendido y conectado a internet. Desde el dashboard, pulsa **Activar notificaciones** y acepta el permiso del navegador. Los pedidos nuevos envían avisos a `cocina` y `owner`; la misma infraestructura queda lista para las futuras llamadas de mesa a `mesero`.

En Android funciona con la PWA instalada o desde el navegador compatible. En iPhone requiere iOS 16.4 o superior y la PWA agregada a la pantalla de inicio. Un teléfono completamente apagado no puede recibir el aviso hasta volver a encenderse.

## QR y niveles de suscripción

`/dashboard/qr` genera un QR general para Gratis y QR permanentes por mesa para Plus/Pro. Cada código se descarga en PNG o SVG; el lote completo se genera en el navegador como ZIP, sin enviar los enlaces a un servicio externo. La pantalla también incluye una vista previa de parador de mesa.

Los límites se aplican en tres capas: navegación y mensajes del dashboard, acciones del servidor y políticas RLS/privilegios de PostgreSQL. Gratis conserva el menú y un QR general (máximo 20 platos); Plus añade mesas, pedidos automáticos e historial; Pro añade KDS y cambios de estado. Al bajar un restaurante a Gratis, sus mesas se conservan para una futura mejora de plan, pero dejan de ser visibles por API y los QR antiguos ya no preseleccionan mesa.

`/dashboard/plan` incluye la comparación completa. Durante esta etapa sin pagos, el propietario puede simular Gratis/Plus/Pro; el cambio real se guarda en Supabase y se refleja al recargar. Esta acción usa la clave de servidor únicamente después de validar la sesión y el rol `owner`.

Después de aplicar las migraciones y desplegar, la prueba integrada valida RLS por nivel, QR de mesa, PNG/SVG/ZIP y bloqueo de URLs directas:

```bash
npm run verify:qr-entitlements
```

> En Next.js 16 el archivo antes llamado `middleware.ts` se llama `proxy.ts`. `src/proxy.ts` cumple la misma función: renueva la sesión y protege `/dashboard/*`.

También puedes verificarlo manualmente creando dos cuentas desde `/registro`. En el SQL Editor, copia los UUID de ambos usuarios y usa el impersonador de JWT del panel/API para consultar `restaurants` y `categories`: cada sesión autenticada debe devolver únicamente su propio restaurante.
