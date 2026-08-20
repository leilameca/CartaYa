"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(window.atob(base64), (character) => character.charCodeAt(0));
}

export function PushNotifications() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const supported = Boolean(publicKey && typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window);

  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.ready.then((registration) => registration.pushManager.getSubscription().then((subscription) => setEnabled(Boolean(subscription))));
  }, [supported]);

  async function toggle() {
    if (!publicKey || !supported) return;
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await fetch("/api/push/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: existing.endpoint }) });
        await existing.unsubscribe();
        setEnabled(false);
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;
        const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
        const response = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON()) });
        if (!response.ok) throw new Error("No se pudo activar la suscripción.");
        setEnabled(true);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;
  return <Button type="button" variant="ghost" onClick={toggle} disabled={busy} className="w-full justify-start gap-3 text-slate-600">{busy ? <Loader2 className="size-4 animate-spin" /> : enabled ? <Bell className="size-4 text-brand-green" /> : <BellOff className="size-4" />}{enabled ? "Notificaciones activas" : "Activar notificaciones"}</Button>;
}