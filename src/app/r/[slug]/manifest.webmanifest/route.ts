import { getPublicMenu } from "@/lib/public-menu-server";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const menu = await getPublicMenu(slug);
  if (!menu) return new Response("Manifest no encontrado", { status: 404 });

  return Response.json({
    id: `/r/${menu.restaurant.slug}`,
    name: `${menu.restaurant.name} — CartaYa`,
    short_name: menu.restaurant.name.slice(0, 30),
    description: `Menú digital de ${menu.restaurant.name}`,
    start_url: `/r/${menu.restaurant.slug}`,
    scope: `/r/${menu.restaurant.slug}`,
    display: "standalone",
    background_color: "#F8F9FA",
    theme_color: menu.restaurant.primary_color,
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }, {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
  });
}

