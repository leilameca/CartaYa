import type { MetadataRoute } from "next";

const baseUrl = "https://www.tucartaya.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/r/", "/privacidad", "/cookies", "/seguridad", "/terminos"],
      disallow: ["/admin", "/api/", "/auth/", "/dashboard", "/completar-registro", "/verificar-"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
