import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicMenu } from "@/lib/public-menu-server";
import { PublicMenuApp } from "@/components/public-menu/public-menu-app";

export async function publicMenuMetadata(slug: string, tableId?: string | null): Promise<Metadata> {
  const menu = await getPublicMenu(slug, tableId);
  if (!menu) return { title: "Restaurante no encontrado | CartaYa" };

  return {
    title: `${menu.restaurant.name} | Menú digital`,
    description: `Consulta el menú digital de ${menu.restaurant.name} y arma tu pedido.`,
    manifest: `/r/${encodeURIComponent(menu.restaurant.slug)}/manifest.webmanifest`,
    themeColor: menu.restaurant.primary_color,
    appleWebApp: { capable: true, statusBarStyle: "default", title: menu.restaurant.name },
  };
}

export async function PublicMenuPage({ slug, tableId }: { slug: string; tableId?: string | null }) {
  const menu = await getPublicMenu(slug, tableId);
  if (!menu) notFound();

  return <PublicMenuApp initialMenu={menu} />;
}

