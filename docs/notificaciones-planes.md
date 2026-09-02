# Notificaciones de cambios de plan

CartaYa tiene dos automatizaciones transaccionales:

1. Cuando el propietario solicita otro plan, la superadministradora recibe un aviso por WhatsApp. Opcionalmente también puede recibirlo por correo.
2. Cuando la superadministradora aprueba, rechaza o asigna directamente un plan, el propietario recibe un correo. También recibe WhatsApp si autorizó ese canal y el restaurante tiene un teléfono válido.

Un fallo del proveedor de mensajes no revierte la solicitud ni la activación. CartaYa registra el error en los logs del servidor sin incluir las credenciales.

## Correo con Resend

1. Crea una cuenta en Resend.
2. Agrega y verifica preferiblemente el subdominio `updates.tucartaya.com`.
3. Copia exactamente en el DNS los registros SPF y DKIM que entregue Resend.
4. Crea una API key con permiso de envío.
5. Configura en Vercel las variables `RESEND_API_KEY`, `TRANSACTIONAL_EMAIL_FROM` y `TRANSACTIONAL_EMAIL_REPLY_TO`.
6. Para recibir también las solicitudes por correo, configura `PLAN_NOTIFICATIONS_ADMIN_EMAIL`.

Los alias de reenvío `soporte@`, `contacto@` y `seguridad@` pueden recibir mensajes, pero el reenvío por sí solo no permite a la aplicación enviarlos. El remitente debe pertenecer al dominio o subdominio verificado en Resend.

## WhatsApp Business Platform

1. Crea o usa un portafolio empresarial en Meta Business.
2. Añade la aplicación de WhatsApp Business Platform y un número remitente.
3. Obtén el identificador del número y crea un token permanente de usuario del sistema con los permisos mínimos necesarios.
4. Crea y envía a aprobación estas plantillas de utilidad en español. Los nombres y la cantidad de variables deben coincidir:

### `cartaya_plan_solicitado`

```text
{{1}} solicitó cambiar el restaurante {{2}} del plan {{3}} al plan {{4}}. Revisa la solicitud en {{5}}.
```

### `cartaya_plan_actualizado`

```text
Hola {{1}}. La gestión del plan de {{2}} fue {{3}}. Tu plan actual es {{4}}. Consulta los detalles en {{5}}.
```

5. Configura en Vercel `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `PLAN_NOTIFICATIONS_ADMIN_WHATSAPP` y las demás variables indicadas en `.env.example`.
6. Guarda los teléfonos en formato internacional, por ejemplo `1809XXXXXXX`, sin el signo `+`.

Los mensajes iniciados por CartaYa requieren plantillas aprobadas. Para propietarios de restaurantes, la aplicación solo usa WhatsApp si el propietario marca la autorización al solicitar el plan; el correo transaccional sigue funcionando aunque no autorice WhatsApp.

## Prueba antes de producción

1. Solicita Plus o Pro desde una cuenta propietaria.
2. Confirma que aparece en `/admin` y llega el WhatsApp de administración.
3. Aprueba la solicitud con una sesión superadministradora AAL2.
4. Confirma el correo del propietario y, si autorizó el canal, su WhatsApp.
5. Revisa los logs de Vercel, Resend y Meta si falta un canal.

Nunca guardes tokens de Meta o Resend en variables `NEXT_PUBLIC_*`, archivos versionados, capturas o mensajes de soporte.
