export function getSiteUrl() {
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  const fallback = process.env.NODE_ENV === "production"
    ? "https://www.tucartaya.com"
    : vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000";
  const value = process.env.NEXT_PUBLIC_SITE_URL ?? fallback;
  return value.replace(/\/$/, "");
}
