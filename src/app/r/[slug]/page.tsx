import type { Metadata } from "next";
import { PublicMenuPage, publicMenuMetadata } from "@/components/public-menu/public-menu-page";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return publicMenuMetadata(slug);
}

export default async function RestaurantMenuRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicMenuPage slug={slug} />;
}

