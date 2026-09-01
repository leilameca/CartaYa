import { NextResponse } from "next/server";
import { getSafeInternalPath } from "@/lib/security/redirect";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = getSafeInternalPath(url.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const admin = createAdminClient();
        const { data: profile } = await admin.from("profiles").select("id, role").eq("id", user.id).maybeSingle();
        if (!profile) return NextResponse.redirect(new URL("/completar-registro", url.origin));
        if (profile.role === "superadmin") return NextResponse.redirect(new URL("/admin", url.origin));
      }
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=callback", url.origin));
}
