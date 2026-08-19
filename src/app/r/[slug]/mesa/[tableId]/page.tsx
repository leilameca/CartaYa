import type { Metadata } from "next";
import { PublicMenuPage, publicMenuMetadata } from "@/components/public-menu/public-menu-page";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; tableId: string }> }): Promise<Metadata> {
  const { slug, tableId } = await params;
  return publicMenuMetadata(slug, tableId);
}

export default async function TableMenuRoute({ params }: { params: Promise<{ slug: string; tableId: string }> }) {
  const { slug, tableId } = await params;
  return <PublicMenuPage slug={slug} tableId={tableId} />;
}

