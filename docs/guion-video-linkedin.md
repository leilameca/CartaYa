# Guion para presentar CartaYa en LinkedIn

Duración recomendada: 4 minutos 30 segundos

Formato: 16:9, 1080p, grabación de pantalla con cámara opcional

Audiencia: reclutadores, desarrolladores, restaurantes y posibles aliados

Objetivo: demostrar producto, criterio técnico, aprendizaje y visión comercial

## 1. Preparación

- Utiliza un restaurante de demostración, no información de clientes reales.
- Prepara un menú con seis platos, tres categorías y fotografías consistentes.
- Crea dos mesas y cuentas de prueba para mesero y cocina.
- Deja abiertas cuatro sesiones: cliente, propietario, cocina y superadministradora.
- Activa previamente notificaciones y sonido.
- Oculta correos, teléfonos personales, identificadores internos y secretos.
- Graba primero la pantalla y después la voz; así podrás repetir la narración sin rehacer la demostración.
- Añade subtítulos. Muchas personas consumen LinkedIn sin sonido.
- Mantén el cursor quieto mientras hablas y amplía únicamente las zonas importantes.

## 2. Estructura visual

| Tiempo | Imagen principal | Propósito |
| --- | --- | --- |
| 0:00–0:15 | Tú en cámara y logo | Presentación y gancho |
| 0:15–0:40 | Landing y planes | Problema y propuesta |
| 0:40–1:20 | Menú, PWA, QR y personalización | Experiencia del cliente |
| 1:20–2:00 | Carrito, pedido y WhatsApp | Flujo comercial |
| 2:00–2:40 | KDS, sonido y push | Operación de cocina |
| 2:40–3:15 | Mesero y solicitud de mesa | Atención en salón |
| 3:15–3:45 | Tutoriales, soporte y superadmin | Gestión del SaaS |
| 3:45–4:15 | Arquitectura y seguridad | Profundidad técnica |
| 4:15–4:30 | Tú en cámara | Aprendizaje y cierre |

## 3. Guion completo

### 0:00–0:15 — Gancho

**Imagen:** tú en cámara. Después aparece el logo de CartaYa y una vista rápida del panel.

**Narración:**

> Soy Leilany, estudiante de Ingeniería de Software, y durante estas últimas semanas he estado construyendo CartaYa: una plataforma SaaS multiempresa que conecta el menú, los pedidos, los meseros y la cocina de un restaurante en tiempo real.

**Texto en pantalla:**

`CartaYa · SaaS para restaurantes · tucartaya.com`

### 0:15–0:40 — Problema y solución

**Imagen:** landing, sección de operación y comparación de planes.

**Narración:**

> La idea nació de un problema sencillo: muchos restaurantes tienen un menú QR, pero los pedidos, las llamadas de las mesas y la comunicación con cocina siguen ocurriendo en herramientas separadas. CartaYa busca unir todo ese recorrido sin obligar al cliente a descargar una aplicación.

> El producto está organizado en tres niveles. Gratis permite publicar el menú; Plus añade pedidos, QR por mesa y personalización; y Pro coordina cocina, meseros, solicitudes y notificaciones operativas.

### 0:40–1:20 — Menú, PWA y QR

**Imagen:** panel de menú, carga de un plato, menú público móvil, personalización y QR.

**Narración:**

> Desde el panel, el propietario crea categorías y platos, agrega precios, fotografías, etiquetas y disponibilidad. El plan Gratis admite hasta veinte platos, mientras Plus y Pro permiten un menú ilimitado.

> Cada restaurante obtiene su propia dirección, identidad visual y PWA instalable. El sistema genera un QR general y, desde Plus, códigos permanentes por mesa que pueden descargarse en PNG, SVG o en un archivo ZIP.

> El cliente abre el menú desde cualquier celular, consulta únicamente los productos disponibles y también puede acceder a minijuegos de cocina mientras espera.

**Texto en pantalla:**

`Menú PWA · Marca propia · QR general y por mesa`

### 1:20–2:00 — Pedido del cliente

**Imagen:** agregar platos al carrito, colocar nombre y notas, enviar y mostrar confirmación.

**Narración:**

> En Plus y Pro, el cliente prepara su pedido, indica cantidades, nombre y notas para cocina. Al enviarlo, CartaYa no confía en los precios del navegador: el servidor vuelve a consultar el menú, valida disponibilidad, horario, mesa y plan, y calcula el total desde la base de datos.

> El pedido queda registrado de forma atómica, aparece en tiempo real dentro del restaurante y se prepara una confirmación por WhatsApp. En Plus, el propietario recibe la notificación y abre su historial de pedidos.

**Texto en pantalla:**

`Validación en servidor · Precios protegidos · Realtime`

### 2:00–2:40 — Cocina Pro

**Imagen:** llegada del pedido al KDS, alerta, movimiento entre estados y notificación en teléfono.

**Narración:**

> En Pro, el pedido llega además a la Pantalla de Cocina. Cocina ve la mesa, el cliente, las partidas y las notas, y puede mover la comanda entre Nuevo, En preparación y Listo.

> Los pedidos nuevos generan una alerta sonora dentro de la aplicación y una notificación push cuando el dispositivo y el sistema operativo lo permiten. La PWA está preparada para computadora, Android y iPhone; en iOS se instala desde la pantalla de inicio.

### 2:40–3:15 — Meseros y continuidad de atención

**Imagen:** login de empleado, cliente solicitando asistencia, mesero aceptando y creando un pedido asistido.

**Narración:**

> Pro también permite crear usuarios de cocina y mesero sin pedirles un correo. Si un cliente solicita asistencia, todos los meseros disponibles reciben el aviso, pero solo el primero puede aceptar la mesa.

> Desde ese momento, la sesión permanece asignada al mismo mesero. Si esa mesa genera otro pedido, se le notifica directamente. El mesero también puede registrar el pedido de una persona que no tenga celular.

**Texto en pantalla:**

`Primer mesero acepta · Asignación exclusiva · Pedido asistido`

### 3:15–3:45 — Tutoriales, soporte y superadministración

**Imagen:** buscador de tutoriales, creación de ticket y bandeja del superadmin.

**Narración:**

> La plataforma incluye una biblioteca de tutoriales con categorías y búsqueda. Los restaurantes también pueden abrir tickets, conversar con soporte y adjuntar capturas cifradas.

> Como propietaria del SaaS, tengo un panel protegido con verificación en dos pasos. Desde ahí puedo consultar restaurantes, teléfonos y planes, aprobar solicitudes, administrar videos y responder tickets con notas internas.

### 3:45–4:15 — Arquitectura y seguridad

**Imagen:** diagrama sencillo con Next.js, Supabase, R2, Vercel y Web Push. No mostrar variables de entorno.

**Narración:**

> Técnicamente, CartaYa utiliza Next.js y TypeScript en la aplicación, Supabase para autenticación, PostgreSQL, políticas RLS y eventos en tiempo real, Cloudflare R2 para archivos y Vercel para despliegue.

> La arquitectura es multiempresa: cada restaurante está aislado por políticas de base de datos. También implementé validación del servidor, límites de frecuencia, MFA para superadministración, redirecciones seguras y cifrado AES-256-GCM para los adjuntos de soporte.

**Texto en pantalla:**

`Next.js · TypeScript · PostgreSQL · RLS · Realtime · PWA`

### 4:15–4:30 — Cierre

**Imagen:** tú en cámara; alternar con una última vista del producto en móvil y escritorio.

**Narración:**

> CartaYa está entrando en una beta controlada con tres restaurantes. Este proyecto me ha enseñado que desarrollar software no es solamente programar pantallas: también significa comprender usuarios, diseñar permisos, proteger datos, desplegar y validar un modelo de negocio.

> Me encantaría conocer sus comentarios y conectar con personas interesadas en ingeniería de producto, SaaS y tecnología para restaurantes.

**Texto final:**

`CartaYa · Construido desde República Dominicana`

## 4. Versión corta de 60 segundos

> Soy Leilany, estudiante de Ingeniería de Software, y estoy construyendo CartaYa, un SaaS multiempresa para restaurantes.

> Cada negocio puede publicar su menú PWA, cargar platos y generar QR. En Plus, los clientes realizan pedidos desde la mesa y el propietario los recibe en tiempo real. En Pro, cocina trabaja con un KDS, los meseros aceptan solicitudes de forma exclusiva y cada mesa mantiene al mismo mesero durante su visita.

> También desarrollé roles sin correo para empleados, notificaciones push, personalización, tutoriales, tickets con adjuntos cifrados y un panel de superadministración protegido con MFA.

> La plataforma utiliza Next.js, TypeScript, Supabase, PostgreSQL, RLS, Realtime, Cloudflare R2 y Vercel. Ahora está entrando en una beta con tres restaurantes.

> Este proyecto me permitió trabajar no solo en código, sino también en producto, seguridad, experiencia de usuario y modelo SaaS. Pueden conocerlo en tucartaya.com.

## 5. Texto sugerido para la publicación

Durante las últimas semanas he estado construyendo CartaYa, una plataforma SaaS multiempresa para restaurantes.

El proyecto comenzó como una idea de menú digital y evolucionó hasta integrar pedidos por mesa, PWA, códigos QR, Pantalla de Cocina, usuarios mesero y cocina, asignación de mesas, Web Push, personalización, tutoriales, soporte y un panel de superadministración.

Tecnologías principales: Next.js, TypeScript, Supabase Auth, PostgreSQL, RLS, Realtime, Cloudflare R2 y Vercel.

Uno de mis mayores aprendizajes fue entender que un producto real no termina cuando la interfaz funciona. También hay que diseñar permisos, aislamiento de datos, recuperación, notificaciones, soporte, seguridad y una experiencia coherente para cada rol.

CartaYa está entrando ahora en una beta controlada con tres restaurantes. Agradezco comentarios de personas que trabajen en ingeniería de producto, SaaS o tecnología para restaurantes.

Producto: https://www.tucartaya.com

## 6. Recomendaciones de edición

- Abre con el resultado, no con el editor de código.
- Cambia de pantalla cada cinco a ocho segundos.
- Usa acercamientos suaves para mostrar interacciones pequeñas.
- Mantén música instrumental muy baja para no competir con la voz.
- Coloca subtítulos grandes, con máximo dos líneas simultáneas.
- No muestres el panel del superadmin con datos reales.
- Termina con tu nombre, carrera, rol en el proyecto y enlace.
- Publica la versión completa y reutiliza la versión de 60 segundos como avance.
