import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "CartaYa — Menús digitales",
    short_name: "CartaYa",
    description: "Menús digitales por QR para restaurantes.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F8F9FA",
    theme_color: "#FF6B35",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

