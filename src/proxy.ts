import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 renamed the middleware file convention to `proxy`.
export async function proxy(request: NextRequest) {
  if (request.nextUrl.hostname === "cartaya-seven.vercel.app") {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.protocol = "https";
    canonicalUrl.hostname = "www.tucartaya.com";
    canonicalUrl.port = "";
    return NextResponse.redirect(canonicalUrl, 308);
  }

  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/r/") || pathname.startsWith("/api/public/") || pathname === "/offline") {
    return NextResponse.next();
  }
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)"],
};
