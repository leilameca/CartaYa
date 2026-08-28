import "server-only";

import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export function getClientAddress(headers: Headers) {
  const forwarded = headers.get("x-vercel-forwarded-for")
    ?? headers.get("x-forwarded-for")
    ?? headers.get("x-real-ip");
  return forwarded?.split(",")[0]?.trim().slice(0, 128) || "unknown";
}

export async function consumeRateLimit({
  scope,
  identifier,
  maxRequests,
  windowSeconds,
}: {
  scope: string;
  identifier: string;
  maxRequests: number;
  windowSeconds: number;
}) {
  const keyHash = createHash("sha256").update(`${scope}:${identifier}`).digest("hex");
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_rate_limit", {
    p_key_hash: keyHash,
    p_max_requests: maxRequests,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error("Rate limit check failed", { scope, code: error.code });
    return false;
  }

  return data === true;
}
