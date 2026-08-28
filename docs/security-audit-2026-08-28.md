# Auditoría de seguridad previa al lanzamiento de CartaYa

Fecha: 28 de agosto de 2026

## Dictamen

CartaYa tiene una base técnica sólida para una beta controlada: autenticación administrada por Supabase, autorización repetida en el servidor, aislamiento multi-tenant mediante RLS, validación de entradas, subida de imágenes limitada y secretos fuera del repositorio.

No recomiendo un lanzamiento comercial abierto hasta completar los tres puntos marcados como pendientes de prioridad alta: MFA obligatorio para el superadministrador, protección anti-bot en registro/recuperación y confirmación documentada de copias de seguridad con una prueba de restauración.

## Alcance revisado

- Next.js 16, Server Actions, Route Handlers y configuración de producción.
- Supabase Auth, funciones `security definer`, permisos, RLS y migraciones remotas.
- Separación entre restaurantes, roles owner/mesero/cocina/superadmin y cambios de plan.
- Pedidos públicos, solicitudes de asistencia, Web Push y subida de imágenes a R2.
- Dependencias npm, secretos versionados, cabeceras HTTPS y flujo OAuth.

Esta fue una auditoría de código, configuración y base remota con pruebas funcionales automatizadas. No sustituye una prueba de penetración independiente, una revisión contractual del proveedor ni una restauración real de backups.

## Hallazgos corregidos

| Prioridad | Hallazgo | Corrección |
| --- | --- | --- |
| Alta | El parámetro de retorno del login y OAuth aceptaba valores como `//dominio-externo`, creando una redirección abierta. | Normalización centralizada y aceptación exclusiva de rutas del mismo origen. |
| Alta | Pedidos, solicitudes de mesa e intentos de acceso de empleados no tenían un límite persistente de frecuencia. | Rate limiting atómico en PostgreSQL por IP y recurso, con respuesta `429` y almacenamiento únicamente de hashes. |
| Media | Faltaban cabeceras defensivas y se publicaba `X-Powered-By`. | CSP básica, bloqueo de iframes, `nosniff`, política de referer y permisos del navegador; se eliminó `X-Powered-By`. |
| Media | Algunos errores internos de PostgreSQL podían devolverse al cliente. | Mensajes públicos genéricos; los detalles ya no cruzan la frontera del servidor. |
| Media | Las nuevas claves de empleados aceptaban seis caracteres. | Mínimo de ocho caracteres para nuevas cuentas y cambios de clave. |
| Baja | El navegador sugería correos guardados al crear empleados sin correo. | Se separó el nombre técnico del campo, se desactivó el autocompletado del formulario y se marcó la clave como nueva. |

## Controles verificados

- Las doce migraciones anteriores estaban sincronizadas y la migración de seguridad nueva se aplicó correctamente en la base remota.
- El auditor oficial `supabase db lint --linked` no encontró errores de esquema.
- RLS está activo en las tablas de negocio y las políticas limitan el acceso por `restaurant_id`.
- La `service_role` permanece exclusivamente en módulos de servidor y no hay archivos `.env` versionados.
- La creación de pedidos calcula precios desde la base de datos; el cliente no decide el total.
- Los uploads aceptan tipos concretos, verifican firma binaria, limitan el tamaño y generan nombres aleatorios.
- `npm audit` reportó cero vulnerabilidades conocidas en dependencias de producción y desarrollo.
- Producción usa HTTPS y HSTS administrado por Vercel.
- Las seis suites funcionales pasaron: fundación/RLS, menú, PWA pública, pedido público, pedidos/cocina y permisos QR por plan.
- El limitador persistente se probó con tres llamadas: permitió las dos configuradas y bloqueó la tercera.

## Pendientes antes del lanzamiento abierto

### Prioridad alta

1. Exigir MFA/TOTP al superadministrador y preparar códigos de recuperación. TOTP está habilitado en la configuración, pero la aplicación aún no obliga a enrolarlo ni verifica un nivel AAL2 antes de cambiar planes.
2. Añadir protección anti-bot al registro, recuperación de contraseña y, si aparece abuso real, a acciones públicas sensibles. El rate limiting reduce fuerza bruta, pero no sustituye un desafío administrado.
3. Confirmar el plan de copias de seguridad de Supabase, definir RPO/RTO y ejecutar una restauración de prueba antes de aceptar datos reales.

### Prioridad media

1. Crear un registro de auditoría inmutable para cambios directos de plan, altas/bajas de empleados y acciones del superadministrador.
2. Integrar monitoreo de errores y alertas de tasa de `401`, `403`, `429` y `5xx`; actualmente predominan logs de plataforma.
3. Definir retención y eliminación para nombres/notas de clientes, suscripciones push y cuentas de restaurantes cerrados.
4. Ejecutar automáticamente lint, typecheck, build y pruebas RLS en CI antes de cada despliegue.
5. Revisar trimestralmente dependencias, llaves de R2, `service_role`, VAPID y accesos de administradores.

## Checklist al conectar el dominio

1. Configurar `NEXT_PUBLIC_SITE_URL` con el dominio HTTPS definitivo.
2. Añadir el callback exacto `https://DOMINIO/auth/callback` en Google OAuth y en la lista de redirecciones de Supabase.
3. Cambiar `site_url` de Supabase y conservar temporalmente la URL de Vercel durante la transición.
4. Actualizar `VAPID_SUBJECT` a un correo operativo del dominio.
5. Usar un subdominio propio para R2, por ejemplo `imagenes.DOMINIO`, y restringir la llave al bucket necesario.
6. Probar alta, login Google, recuperación, pedido, llamada de mesa y notificación push desde iPhone y Android fuera de la aplicación.
7. Publicar términos, privacidad, contacto de seguridad y procedimiento de respuesta a incidentes.

## Criterio de salida

- Beta privada: apta después de desplegar estas correcciones y validar los flujos críticos.
- Lanzamiento público: condicionado a MFA del superadministrador, respaldo/restauración y configuración completa del dominio.

## Referencias técnicas

- [Next.js: Data Security](https://nextjs.org/docs/app/guides/data-security)
- [Next.js: Content Security Policy](https://nextjs.org/docs/app/guides/content-security-policy)
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase: Multi-Factor Authentication](https://supabase.com/docs/guides/auth/auth-mfa)
- [OWASP API Security Top 10](https://owasp.org/API-Security/)
