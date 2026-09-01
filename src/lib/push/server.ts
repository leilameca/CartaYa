import "server-only";

import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";

const vapidSubject = process.env.VAPID_SUBJECT;
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

function isConfigured() {
  return Boolean(vapidSubject && vapidPublicKey && vapidPrivateKey);
}

function configure() {
  if (!isConfigured()) return false;
  webpush.setVapidDetails(vapidSubject!, vapidPublicKey!, vapidPrivateKey!);
  return true;
}

export type PushAudience = "owner" | "mesero" | "cocina";

async function sendToSubscriptions(subscriptions: { id: string; endpoint: string; p256dh: string; auth: string }[], payload: string) {
  const admin = createAdminClient();
  let sent = 0;
  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload, { TTL: 300, urgency: "high" });
      sent += 1;
    } catch (error) {
      const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? error.statusCode : undefined;
      if (statusCode === 404 || statusCode === 410) await admin.from("push_subscriptions").delete().eq("id", subscription.id);
      else console.error("Web Push delivery failed", { subscriptionId: subscription.id, statusCode });
    }
  }));
  return sent;
}

export async function sendSuperadminPush({ title, body, url, tag }: { title: string; body: string; url: string; tag: string }) {
  if (!configure()) return { sent: 0, skipped: true };
  const admin = createAdminClient();
  const { data: profiles } = await admin.from("profiles").select("id").eq("role", "superadmin");
  if (!profiles?.length) return { sent: 0, skipped: false };
  const { data: subscriptions } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").in("user_id", profiles.map((profile) => profile.id));
  if (!subscriptions?.length) return { sent: 0, skipped: false };
  const navigate = new URL(url, getSiteUrl()).toString();
  const payload = JSON.stringify({ web_push: 8030, notification: { title, body, navigate, silent: false, app_badge: "1", tag }, title, body, url: navigate, tag });
  return { sent: await sendToSubscriptions(subscriptions, payload), skipped: false };
}

export async function sendRestaurantPush({
  restaurantId,
  audience,
  title,
  body,
  url = "/dashboard",
  tag = "cartaya-update",
  onlyUserIds,
}: {
  restaurantId: string;
  audience: PushAudience[];
  title: string;
  body: string;
  url?: string;
  tag?: string;
  onlyUserIds?: string[];
}) {
  if (!configure()) return { sent: 0, skipped: true };

  const admin = createAdminClient();
  let profilesQuery = admin
    .from("profiles")
    .select("id, role")
    .eq("restaurant_id", restaurantId)
    .in("role", audience);
  if (onlyUserIds?.length) profilesQuery = profilesQuery.in("id", onlyUserIds);
  const { data: profiles, error: profilesError } = await profilesQuery;
  if (profilesError || !profiles?.length) return { sent: 0, skipped: false };

  const userIds = profiles.map((profile) => profile.id);
  const { data: subscriptions, error: subscriptionsError } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("restaurant_id", restaurantId)
    .in("user_id", userIds);
  if (subscriptionsError || !subscriptions?.length) return { sent: 0, skipped: false };

  const navigate = new URL(url, getSiteUrl()).toString();
  const payload = JSON.stringify({
    web_push: 8030,
    notification: { title, body, navigate, silent: false, app_badge: "1", tag },
    title,
    body,
    url: navigate,
    tag,
  });
  return { sent: await sendToSubscriptions(subscriptions, payload), skipped: false };
}
