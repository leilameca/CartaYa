# CartaYa

Fundación técnica del SaaS multi-tenant de menús digitales por QR para restaurantes en República Dominicana.

Producción de esta etapa: [cartaya-seven.vercel.app](https://cartaya-seven.vercel.app)

Proyecto Supabase Cloud: `tiyikulmmbdehkpqevfk` (`us-east-1`).

## Stack

- Next.js 16 (App Router), TypeScript y Tailwind CSS
- shadcn/ui (configurado en `components.json`)
- Supabase Auth, Postgres, RLS y Realtime
- Preparado para Vercel; Cloudflare Images/R2 se conectará en una fase posterior

## Puesta en marcha

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Copia `.env.example` a `.env.local` y completa las tres claves de Supabase. La `SUPABASE_SERVICE_ROLE_KEY` es exclusivamente de servidor y se reserva para tareas administrativas y el script de verificación; nunca debe llevar el prefijo `NEXT_PUBLIC_`.

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

RLS está habilitado en las siete tablas. `anon` no tiene permisos sobre ellas. `owner` y `staff` solo pueden acceder al tenant guardado en su propio perfil; `superadmin` puede leer todos los tenants, pero no obtiene escritura por las políticas públicas. La `service_role` sí omite RLS por diseño de Supabase y por eso solo se usa en tareas administrativas controladas y en el endpoint de servidor que valida pedidos públicos; nunca llega al navegador.

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

`/dashboard/menu` incluye CRUD de categorías y platos, reordenamiento, disponibilidad, etiquetas y el límite Gratis en interfaz, acciones de servidor y Postgres. Las fotos usan Cloudflare R2; consulta [docs/cloudflare-r2.md](docs/cloudflare-r2.md) para crear el bucket y configurar las cinco variables necesarias.

## Menú público y PWA

Cada restaurante se publica en `/r/[slug]`; los QR de mesa usan `/r/[slug]/mesa/[tableId]`. La PWA aplica color y logo por tenant, muestra únicamente platos disponibles, conserva el último menú visitado para conexiones intermitentes y expone un manifest instalable con el nombre del restaurante.

Las tablas continúan completamente cerradas para `anon`. `get_public_menu` es la única lectura pública y limita el resultado al slug solicitado. Los pedidos Plus/Pro entran por `/api/public/orders`; el servidor valida horario, mesa, plan, disponibilidad y cantidades, y PostgreSQL recalcula precios e inserta `orders` + `order_items` atómicamente. El plan Gratis nunca crea registros.

Para ejecutar la verificación de permisos contra Supabase Cloud:

```bash
npm run verify:pwa
```

> En Next.js 16 el archivo antes llamado `middleware.ts` se llama `proxy.ts`. `src/proxy.ts` cumple la misma función: renueva la sesión y protege `/dashboard/*`.

También puedes verificarlo manualmente creando dos cuentas desde `/registro`. En el SQL Editor, copia los UUID de ambos usuarios y usa el impersonador de JWT del panel/API para consultar `restaurants` y `categories`: cada sesión autenticada debe devolver únicamente su propio restaurante.
