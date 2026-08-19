# Configurar Cloudflare R2 para las fotos de CartaYa

CartaYa usa un bucket **R2 Standard**. El almacenamiento administrado de Cloudflare Images requiere un plan de pago, mientras R2 incluye una cuota mensual gratuita adecuada para esta etapa. Las fotos se guardan bajo `restaurants/{restaurant_id}/menu/` y nunca se exponen las credenciales al navegador.

## 1. Crear el bucket

1. Entra a Cloudflare Dashboard.
2. Ve a **Storage & databases > R2 > Overview**.
3. Activa R2 si la cuenta todavía no lo tiene habilitado.
4. Crea un bucket llamado `cartaya-menu-images` con clase **Standard**.

## 2. Dar acceso público de lectura

En el bucket, abre **Settings > Public access**:

- Para pruebas puedes activar la URL `r2.dev`.
- Para producción conecta un dominio propio, por ejemplo `images.cartaya.do`. Es la opción recomendada porque permite usar la caché de Cloudflare.

Copia la URL pública sin una barra final.

## 3. Crear credenciales limitadas al bucket

1. En **R2 > Overview**, busca **API Tokens** y selecciona **Manage**.
2. Crea un token de cuenta o usuario.
3. Selecciona **Object Read & Write**.
4. Limita el token únicamente al bucket `cartaya-menu-images`.
5. Copia de inmediato el **Access Key ID** y el **Secret Access Key**. Cloudflare no vuelve a mostrar el secreto.
6. Copia también el **Account ID** de la página de R2.

Documentación oficial: [credenciales S3 para R2](https://developers.cloudflare.com/r2/get-started/s3/) y [buckets públicos](https://developers.cloudflare.com/r2/buckets/public-buckets/).

## 4. Variables necesarias

Agrega estas cinco variables tanto a `.env.local` como a **Vercel > CartaYa > Settings > Environment Variables**:

```dotenv
CLOUDFLARE_R2_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_BUCKET_NAME=cartaya-menu-images
CLOUDFLARE_R2_PUBLIC_BASE_URL=https://images.cartaya.do
```

Las tres credenciales son solo de servidor: nunca deben llevar el prefijo `NEXT_PUBLIC_`, copiarse en un chat ni subirse a GitHub.

## 5. Aplicar la configuración

Después de guardar las variables en Vercel, crea un nuevo despliegue. La advertencia amarilla de `/dashboard/menu` desaparecerá y el campo **Foto del plato** quedará habilitado.

Prueba final:

1. Crea una categoría.
2. Agrega un plato con una foto JPG, PNG, WebP o AVIF de hasta 3 MB.
3. Abre `menu_items` en Supabase y comprueba que `image_url` contiene el dominio público de R2.
4. Abre esa URL en una ventana privada.
