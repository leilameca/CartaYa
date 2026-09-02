# Especificación de requisitos de CartaYa

Versión: 1.0

Estado: alcance implementado para beta controlada

Producto: SaaS multiempresa de menú, pedidos y operación para restaurantes

## 1. Objetivo

CartaYa debe permitir que restaurantes publiquen un menú digital por QR, reciban pedidos, coordinen cocina y salón, administren empleados y soliciten soporte desde una plataforma web instalable. La propietaria del SaaS debe poder administrar restaurantes, planes, tutoriales y tickets sin mezclar información entre negocios.

## 2. Actores

| Actor | Descripción |
| --- | --- |
| Cliente | Persona que consulta el menú, juega y realiza pedidos o solicita asistencia |
| Propietario | Responsable de configurar y operar un restaurante |
| Mesero | Empleado Pro que acepta mesas y registra pedidos asistidos |
| Cocina | Empleado Pro que visualiza y actualiza pedidos en el KDS |
| Superadministradora | Propietaria de CartaYa con acceso global protegido por MFA |
| Servicios externos | Supabase, Vercel, Cloudflare R2, Web Push, Google OAuth y WhatsApp |

## 3. Requisitos funcionales

### 3.1 Identidad y acceso

- **RF-001.** El sistema debe permitir registrar una cuenta propietaria con nombre, correo, contraseña, teléfono y datos iniciales del restaurante.
- **RF-002.** El sistema debe verificar el correo mediante un código OTP antes de completar el alta.
- **RF-003.** El alta del restaurante y del perfil propietario debe ejecutarse de forma transaccional.
- **RF-004.** El sistema debe permitir iniciar sesión con correo y contraseña.
- **RF-005.** El sistema debe permitir iniciar sesión con Google mediante OAuth y PKCE.
- **RF-006.** Una cuenta de Google nueva debe completar los datos del restaurante antes de entrar al panel.
- **RF-007.** El sistema debe permitir recuperar y restablecer la contraseña mediante OTP.
- **RF-008.** El usuario debe poder elegir entre una sesión persistente y una sesión que finalice al cerrar el navegador.
- **RF-009.** El sistema debe detectar a la superadministradora antes de solicitar la creación de un restaurante.
- **RF-010.** La superadministradora debe completar MFA/TOTP y alcanzar AAL2 para acceder a información global.
- **RF-011.** El sistema debe permitir cerrar la sesión desde los paneles privados.
- **RF-012.** Los empleados deben iniciar sesión con identificador del restaurante, usuario y contraseña, sin utilizar un correo visible.

### 3.2 Restaurantes, tenants y planes

- **RF-013.** Cada cuenta propietaria debe estar asociada a un único restaurante.
- **RF-014.** Todos los datos operativos deben pertenecer explícitamente a un `restaurant_id`.
- **RF-015.** El sistema debe ofrecer los planes Gratis, Plus y Pro.
- **RF-016.** Gratis debe limitar la creación a un máximo de 20 platos.
- **RF-017.** Plus y Pro deben permitir platos ilimitados dentro de los límites razonables de la plataforma.
- **RF-018.** El propietario debe consultar una comparación completa de planes y su plan vigente.
- **RF-019.** El propietario debe solicitar un cambio de plan sin activación automática.
- **RF-020.** La superadministradora debe aprobar o rechazar solicitudes de cambio.
- **RF-021.** Al bajar de plan, los datos restringidos deben conservarse pero dejar de estar disponibles hasta una futura mejora.
- **RF-022.** Los permisos de cada plan deben comprobarse en interfaz, servidor y base de datos cuando corresponda.

### 3.3 Gestión del menú

- **RF-023.** El propietario debe crear, editar, ordenar y eliminar categorías.
- **RF-024.** El propietario debe crear, editar, ordenar y eliminar platos.
- **RF-025.** Cada plato debe admitir nombre, descripción, precio regular, precio de oferta opcional, categoría, etiqueta, imagen y disponibilidad.
- **RF-026.** El propietario debe marcar temporalmente un plato como disponible o no disponible.
- **RF-027.** El sistema debe validar tipo, tamaño y firma binaria de las imágenes.
- **RF-028.** El sistema debe permitir cargar imágenes desde computadora o celular.
- **RF-029.** El sistema debe recalcular los precios desde la base de datos al recibir un pedido.
- **RF-030.** Los clientes solo deben ver platos marcados como disponibles.
- **RF-097.** El propietario debe activar o retirar una oferta individual desde el editor del plato.
- **RF-098.** El precio de oferta debe ser menor que el precio regular y esta regla debe validarse tanto en la aplicación como en PostgreSQL.
- **RF-099.** Los platos rebajados deben mostrar automáticamente la etiqueta `Oferta`, el precio vigente y el precio regular tachado.
- **RF-100.** El menú público debe generar una sección `Ofertas` con todos los platos disponibles que tengan un precio promocional.
- **RF-101.** Los pedidos públicos y asistidos deben cobrar el precio promocional vigente calculado por PostgreSQL.

### 3.4 Personalización

- **RF-031.** Plus y Pro deben permitir configurar nombre público, identificador, teléfono, dirección, logo, colores y estilo del menú.
- **RF-032.** Pro debe permitir configurar colores de la plataforma interna.
- **RF-033.** Gratis no debe acceder a la personalización comercial de Plus o Pro.
- **RF-034.** Al reemplazar un logo almacenado por CartaYa, el sistema debe retirar el archivo anterior cuando sea seguro hacerlo.

### 3.5 Menú público, PWA y QR

- **RF-035.** Cada restaurante debe disponer de una URL pública basada en un identificador único.
- **RF-036.** El menú debe ser responsive y utilizable desde móvil y computadora.
- **RF-037.** El menú debe exponer un manifest PWA con nombre, color e iconografía del restaurante.
- **RF-038.** El sistema debe conservar el último menú visitado para conexiones intermitentes.
- **RF-039.** Todos los planes deben generar un QR general del restaurante.
- **RF-040.** Plus y Pro deben crear QR permanentes asociados a mesas.
- **RF-041.** Los QR deben poder descargarse en PNG y SVG.
- **RF-042.** Los QR por mesa deben poder descargarse en un lote ZIP.
- **RF-043.** El sistema debe redirigir los QR del dominio anterior hacia el dominio canónico.

### 3.6 Pedidos

- **RF-044.** Plus y Pro deben permitir que un cliente construya un carrito desde el menú.
- **RF-045.** El cliente debe poder indicar nombre opcional, cantidades y notas.
- **RF-046.** El servidor debe validar restaurante, mesa, horario, plan, disponibilidad y cantidades.
- **RF-047.** El pedido y sus partidas deben guardarse atómicamente.
- **RF-048.** Después de registrar el pedido, el sistema debe preparar su confirmación por WhatsApp.
- **RF-049.** El propietario debe consultar pedidos e historial desde Plus.
- **RF-050.** Los pedidos deben actualizarse mediante Realtime dentro del restaurante correspondiente.
- **RF-051.** El sistema debe mostrar cliente, mesa, partidas, notas, total, hora y estado.
- **RF-052.** Los pedidos deben admitir los estados operativos nuevo, en preparación y listo.
- **RF-053.** Gratis debe impedir la creación de pedidos públicos sin ocultar el menú.

### 3.7 Cocina y equipo Pro

- **RF-054.** Pro debe ofrecer una Pantalla de Cocina con pedidos activos agrupados por estado.
- **RF-055.** El propietario y el perfil cocina deben poder actualizar el estado desde el KDS.
- **RF-056.** El propietario Pro debe crear empleados con rol mesero o cocina.
- **RF-057.** El propietario debe editar nombre, usuario, rol y contraseña de un empleado.
- **RF-058.** El propietario debe retirar empleados de su restaurante.
- **RF-059.** Un empleado solo debe funcionar mientras el restaurante conserve Pro.
- **RF-060.** Un mesero debe crear pedidos para clientes que no tengan celular.
- **RF-061.** El cliente de una mesa Pro debe solicitar asistencia.
- **RF-062.** El primer mesero que acepte una solicitud debe reclamarla de forma exclusiva.
- **RF-063.** Los demás meseros deben dejar de ver la solicitud como disponible después de ser reclamada.
- **RF-064.** El mesero debe mantener la asignación de la mesa durante la sesión activa.
- **RF-065.** Los pedidos posteriores de esa mesa deben asociarse y notificarse al mesero asignado.
- **RF-066.** Una sesión de mesa debe poder cerrarse al terminar la atención.

### 3.8 Notificaciones y alertas

- **RF-067.** El usuario debe activar voluntariamente las notificaciones push.
- **RF-068.** Plus debe notificar nuevos pedidos al propietario y dirigirlo al historial.
- **RF-069.** Pro debe notificar nuevos pedidos a propietario y cocina y dirigirlos al KDS.
- **RF-070.** El sistema debe avisar a los meseros cuando una mesa solicite asistencia.
- **RF-071.** El sistema debe avisar únicamente al mesero asignado cuando su mesa genere actividad posterior.
- **RF-072.** Cocina debe emitir una alerta sonora por pedidos nuevos después de la activación permitida por el navegador.
- **RF-073.** Las notificaciones deben incluir título, cuerpo, destino y etiqueta para evitar duplicados innecesarios.
- **RF-074.** Las suscripciones vencidas deben eliminarse cuando el proveedor informe que ya no existen.

### 3.9 Tutoriales, soporte y experiencia del cliente

- **RF-075.** Los usuarios autenticados deben consultar tutoriales publicados.
- **RF-076.** Los tutoriales deben admitir búsqueda por título, descripción, categoría y palabras clave.
- **RF-077.** La superadministradora debe crear y eliminar categorías de tutoriales.
- **RF-078.** La superadministradora debe registrar videos de YouTube y controlar su publicación.
- **RF-079.** Los usuarios deben crear tickets con categoría, impacto, asunto y descripción.
- **RF-080.** Los tickets deben disponer de número legible, prioridad, estado y conversación.
- **RF-081.** El usuario debe adjuntar opcionalmente capturas JPG, PNG o WebP de hasta 3 MB.
- **RF-082.** El propietario debe consultar los tickets de su restaurante; un empleado solo debe consultar los propios.
- **RF-083.** La superadministradora debe buscar y filtrar tickets por texto, estado, categoría y prioridad.
- **RF-084.** La superadministradora debe responder al restaurante o guardar notas internas.
- **RF-085.** El sistema debe notificar nuevos tickets y respuestas a las personas autorizadas.
- **RF-086.** El cliente del restaurante debe acceder a tres minijuegos de cocina desde el menú.

### 3.10 Superadministración

- **RF-087.** La superadministradora debe consultar restaurantes registrados, teléfono y plan vigente.
- **RF-088.** El panel debe mostrar cantidad de restaurantes por plan, pedidos e ingreso mensual estimado.
- **RF-089.** La superadministradora debe cambiar directamente un plan cuando sea necesario.
- **RF-090.** La superadministradora debe gestionar solicitudes de plan.
- **RF-091.** La superadministradora debe administrar tutoriales y soporte desde secciones independientes.
- **RF-092.** El panel debe mostrar la cantidad de tickets activos.

### 3.11 Información pública y cumplimiento

- **RF-093.** El dominio principal debe mostrar una landing informativa antes del login.
- **RF-094.** La landing debe presentar capacidades, planes, precios y llamadas a registro.
- **RF-095.** El sistema debe publicar términos, privacidad, cookies y seguridad.
- **RF-096.** La plataforma debe utilizar `tucartaya.com` como dominio canónico.

## 4. Requisitos no funcionales

| ID | Requisito verificable | Estado beta |
| --- | --- | --- |
| RNF-001 | La interfaz debe adaptarse desde 320 px hasta escritorio sin pérdida de funciones críticas. | Implementado; requiere prueba formal multidispositivo |
| RNF-002 | Los controles táctiles principales deben ser utilizables sin precisión de puntero. | Implementado parcialmente |
| RNF-003 | La navegación privada debe requerir una sesión validada por Supabase. | Implementado |
| RNF-004 | Ningún restaurante debe leer o modificar datos pertenecientes a otro tenant. | Implementado y cubierto por pruebas RLS |
| RNF-005 | La `service_role`, claves de R2 y VAPID privada nunca deben enviarse al navegador. | Implementado |
| RNF-006 | Los cambios globales de la superadministradora deben requerir AAL2. | Implementado |
| RNF-007 | Las entradas externas deben validarse en el servidor con límites explícitos. | Implementado |
| RNF-008 | Los endpoints sensibles deben limitar frecuencia y devolver `429` ante abuso. | Implementado |
| RNF-009 | Los archivos deben validarse por contenido y no solo por extensión. | Implementado |
| RNF-010 | Los adjuntos de soporte deben almacenarse cifrados con autenticación de integridad. | Implementado con AES-256-GCM |
| RNF-011 | El tráfico de producción debe utilizar HTTPS y HSTS. | Implementado por Vercel |
| RNF-012 | Las respuestas privadas y adjuntos no deben almacenarse en cachés públicas. | Implementado |
| RNF-013 | La PWA debe conservar una experiencia mínima con conectividad intermitente. | Implementado para el último menú visitado |
| RNF-014 | Los pedidos deben mantener consistencia mediante transacciones y cálculo de servidor. | Implementado |
| RNF-015 | Los eventos Realtime deben respetar el mismo aislamiento que las consultas normales. | Implementado mediante RLS |
| RNF-016 | La aplicación debe compilar sin errores TypeScript ni ESLint antes de producción. | Proceso manual implementado |
| RNF-017 | Lint, tipos, build y pruebas RLS deben ejecutarse automáticamente antes de desplegar. | Pendiente CI |
| RNF-018 | Debe existir un entorno de staging independiente de producción. | Pendiente |
| RNF-019 | Los errores `401`, `403`, `429` y `5xx` deben generar métricas y alertas. | Pendiente monitoreo centralizado |
| RNF-020 | Debe definirse un objetivo de disponibilidad y un procedimiento de incidentes. | Pendiente operativo |
| RNF-021 | Deben definirse RPO y RTO y probarse una restauración de backups. | Pendiente operativo |
| RNF-022 | Las acciones sensibles deben conservar un registro de auditoría inmutable. | Pendiente ampliación |
| RNF-023 | Registro y recuperación deben incorporar protección anti-bot administrada. | Pendiente Turnstile |
| RNF-024 | La interfaz debe aproximarse a WCAG 2.2 AA en contraste, foco, etiquetas y teclado. | Parcial; requiere auditoría |
| RNF-025 | Los secretos y accesos administrativos deben rotarse con una periodicidad documentada. | Pendiente procedimiento |
| RNF-026 | Las dependencias deben revisarse periódicamente y no presentar vulnerabilidades críticas conocidas. | Revisión manual |
| RNF-027 | La plataforma debe poder desplegarse de forma reproducible desde Git y migraciones versionadas. | Implementado |
| RNF-028 | Los QR ya impresos deben sobrevivir a cambios del dominio de despliegue. | Implementado mediante redirección canónica |
| RNF-029 | Los mensajes de error públicos no deben revelar SQL, secretos ni detalles internos. | Implementado |
| RNF-030 | Debe ejecutarse una prueba de penetración independiente antes de una expansión comercial amplia. | Pendiente |

## 5. Fuera del alcance actual

Estas capacidades no deben presentarse como terminadas:

- Cobro automático, facturación, vencimientos y renovación de suscripciones.
- Reportes avanzados y analítica comercial del restaurante.
- Inventario y recetas.
- Integración con impresoras, POS o facturación fiscal.
- Programación automática de ofertas por fecha u horario.
- Aplicaciones nativas publicadas en App Store y Google Play.
- Operación sin conexión para crear pedidos.
- Acuerdos formales de disponibilidad o soporte 24/7.

## 6. Criterio de aceptación para la beta

La beta con tres restaurantes se considera aceptable cuando cada negocio pueda:

1. Crear y publicar su menú sin intervención técnica.
2. Generar y utilizar sus QR.
3. Completar pedidos de principio a fin según su plan.
4. Recibir notificaciones en al menos un dispositivo operativo.
5. Utilizar los roles Pro sin mezclar datos entre restaurantes.
6. Reportar problemas mediante el centro de soporte.
7. Operar durante el piloto sin pérdida de pedidos confirmados.

Los resultados deben registrarse por restaurante: tiempo de configuración, pedidos creados, pedidos completados, notificaciones fallidas, tickets, errores, satisfacción y disposición de pago.
