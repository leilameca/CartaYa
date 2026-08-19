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

3. Aplica `supabase/migrations/202608190001_initial_schema.sql` desde Supabase SQL Editor o con Supabase CLI:

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

`/registro` usa `auth.signUp` desde una Server Action y los límites nativos de Supabase Auth. La metadata activa el trigger `handle_new_restaurant_owner`, que crea el restaurante Gratis y el perfil `owner` dentro de la misma transacción que inserta `auth.users`. Si el slug ya existe o cualquier inserción falla, Supabase revierte también el usuario. Como la confirmación de correo está desactivada para esta etapa, Supabase entrega la sesión automáticamente y la aplicación redirige a `/dashboard`.

## Seguridad multi-tenant

RLS está habilitado en las siete tablas. `anon` no tiene permisos sobre ellas. `owner` y `staff` solo pueden acceder al tenant guardado en su propio perfil; `superadmin` puede leer todos los tenants, pero no obtiene escritura por las políticas públicas. La `service_role` sí omite RLS por diseño de Supabase y por eso solo se usa en tareas administrativas controladas, nunca en el flujo público de registro.

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

> En Next.js 16 el archivo antes llamado `middleware.ts` se llama `proxy.ts`. `src/proxy.ts` cumple la misma función: renueva la sesión y protege `/dashboard/*`.

También puedes verificarlo manualmente creando dos cuentas desde `/registro`. En el SQL Editor, copia los UUID de ambos usuarios y usa el impersonador de JWT del panel/API para consultar `restaurants` y `categories`: cada sesión autenticada debe devolver únicamente su propio restaurante.
