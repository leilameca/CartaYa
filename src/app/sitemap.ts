import type { MetadataRoute } from "next";

const baseUrl = "https://www.tucartaya.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: baseUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/privacidad`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/cookies`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/seguridad`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/terminos`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
