"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, CheckCircle2, Loader2, Send, Share, Smartphone, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "checking" | "needs-install" | "unsupported" | "prompt" | "denied" | "enabled" | "error";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(window.atob(base64), (character) => character.charCodeAt(0));
}

function isAppleMobile() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
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

export function PushNotifications() {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    let active = true;
    async function inspect() {
      if (isAppleMobile() && !isStandalone()) {
        if (active) setStatus("needs-install");
        return;
      }
      if (!publicKey || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        if (active) setStatus("unsupported");
        return;
      }
      try {
        const registration = await readyServiceWorker();
        const subscription = await registration.pushManager.getSubscription();
        if (!active) return;
        if (subscription) {
          const response = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON()) });
          setStatus(response.ok ? "enabled" : "error");
        } else {
          setStatus(Notification.permission === "denied" ? "denied" : "prompt");
        }
      } catch {
        if (active) setStatus("error");
      }
    }
    void inspect();
    return () => { active = false; };
  }, [publicKey]);

  async function activate() {
    if (!publicKey) return;
    setBusy(true);
    setMessage("");
    try {
      const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        setMessage("El permiso quedó bloqueado. Actívalo en Ajustes > Notificaciones > CartaYa.");
        return;
      }
      const registration = await readyServiceWorker();
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      const response = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON()) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "No se pudo registrar este dispositivo.");
      setStatus("enabled");
      setMessage("Este dispositivo quedó registrado. Enviaremos una prueba ahora.");
      await sendTest();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error && error.message !== "SERVICE_WORKER_TIMEOUT" ? error.message : "No se pudo preparar CartaYa en este dispositivo. Cierra la app, ábrela desde su icono e inténtalo otra vez.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/push/test", { method: "POST" });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "No pudimos enviar la prueba.");
      setMessage("Prueba enviada. Bloquea el iPhone unos segundos para comprobarla.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No pudimos enviar la prueba.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const registration = await readyServiceWorker();
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint }) });
        await subscription.unsubscribe();
      }
      setStatus("prompt");
      setMessage("Notificaciones desactivadas en este dispositivo.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "checking") return <div className="flex items-center gap-3 px-4 py-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" />Comprobando avisos</div>;

  if (status === "needs-install") return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">
      <button type="button" onClick={() => setShowGuide((value) => !value)} className="flex w-full items-center gap-3 text-left font-black"><Smartphone className="size-5 shrink-0 text-blue-700" /><span className="flex-1">Activar avisos en iPhone</span></button>
      {showGuide ? <ol className="mt-3 space-y-2 border-t border-blue-200 pt-3 text-xs font-semibold leading-relaxed"><li className="flex gap-2"><Share className="mt-0.5 size-4 shrink-0" />1. Abre CartaYa en Safari y toca Compartir.</li><li>2. Elige “Agregar a pantalla de inicio”.</li><li>3. Cierra Safari, abre CartaYa desde el nuevo icono e inicia sesión.</li><li>4. Toca “Activar notificaciones” y luego “Permitir”.</li></ol> : null}
    </div>
  );

  if (status === "unsupported") return <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-900"><TriangleAlert className="size-4 shrink-0" />Este navegador no ofrece notificaciones web. En iPhone usa iOS 16.4 o posterior y abre CartaYa desde la pantalla de inicio.</div>;

  return (
    <div className="space-y-2">
      {status === "enabled" ? <div className="flex gap-2"><Button type="button" variant="ghost" onClick={sendTest} disabled={busy} className="min-w-0 flex-1 justify-start gap-3 text-slate-600">{busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4 text-brand-green" />}Enviar notificación de prueba</Button><Button type="button" variant="ghost" size="icon" onClick={disable} disabled={busy} aria-label="Desactivar notificaciones"><BellOff className="size-4" /></Button></div> : <Button type="button" variant="ghost" onClick={activate} disabled={busy || status === "denied"} className="w-full justify-start gap-3 text-slate-600">{busy ? <Loader2 className="size-4 animate-spin" /> : status === "denied" ? <BellOff className="size-4 text-red-500" /> : <Bell className="size-4 text-brand-green" />}{status === "denied" ? "Permiso bloqueado en el dispositivo" : "Activar notificaciones"}</Button>}
      {message ? <p role="status" className={`flex items-start gap-2 px-3 text-xs font-semibold ${status === "error" || status === "denied" ? "text-red-700" : "text-emerald-700"}`}>{status === "enabled" ? <CheckCircle2 className="size-4 shrink-0" /> : <TriangleAlert className="size-4 shrink-0" />}{message}</p> : null}
    </div>
  );
}
