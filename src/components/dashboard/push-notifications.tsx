"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Status = "checking" | "hidden" | "prompt";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(window.atob(base64), (character) => character.charCodeAt(0));
}

function isAppleMobile() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  const appleNavigator = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || appleNavigator.standalone === true;
}

async function readyServiceWorker() {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("SERVICE_WORKER_TIMEOUT")), 12_000)),
  ]);
}

export function PushNotifications({ className }: { className?: string } = {}) {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    let active = true;

    async function inspect() {
      const supported = publicKey
        && "serviceWorker" in navigator
        && "PushManager" in window
        && "Notification" in window;

      if (!supported || (isAppleMobile() && !isStandalone()) || Notification.permission === "denied") {
        if (active) setStatus("hidden");
        return;
      }

      try {
        const registration = await readyServiceWorker();
        const subscription = await registration.pushManager.getSubscription();
        if (!active) return;

        if (!subscription) {
          setStatus("prompt");
          return;
        }

        const response = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        });
        setStatus(response.ok ? "hidden" : "prompt");
      } catch {
        if (active) setStatus("prompt");
      }
    }

    void inspect();
    return () => { active = false; };
  }, [publicKey]);

  async function activate() {
    if (!publicKey) return;
    setBusy(true);

    try {
      const permission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("hidden");
        return;
      }

      const registration = await readyServiceWorker();
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) throw new Error("PUSH_SUBSCRIPTION_FAILED");
      setStatus("hidden");
    } catch {
      setStatus("prompt");
    } finally {
      setBusy(false);
    }
  }

  if (status !== "prompt") return null;

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={activate}
      disabled={busy}
      className={cn("w-full justify-start gap-3 text-slate-600", className)}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Bell className="size-4 text-brand-green" />}
      Activar notificaciones
    </Button>
  );
}
