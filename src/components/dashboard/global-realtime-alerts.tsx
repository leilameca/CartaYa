"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRing, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function GlobalRealtimeAlerts({ restaurantId, role }: { restaurantId: string; role: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [alert, setAlert] = useState<string | null>(null);
  useEffect(() => {
    if (role === "cocina") return;
    const notify = (message: string) => {
      setAlert(message); navigator.vibrate?.([250, 100, 350]);
      const context = new AudioContext(); const oscillator = context.createOscillator(); const gain = context.createGain();
      oscillator.frequency.value = 740; gain.gain.value = 0.08; oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.22);
      window.setTimeout(() => void context.close(), 400);
      window.setTimeout(() => setAlert(null), 6000);
    };
    const channel = supabase.channel(`global-alerts-${restaurantId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` }, () => notify("Nuevo pedido recibido"))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "table_service_requests", filter: `restaurant_id=eq.${restaurantId}` }, () => notify("Una mesa solicita asistencia"))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [restaurantId, role, supabase]);
  return alert ? <div role="status" className="fixed bottom-5 right-4 z-50 flex max-w-sm items-center gap-3 rounded-2xl bg-brand-navy px-4 py-3 text-sm font-bold text-white shadow-2xl"><BellRing className="size-5 text-brand-orange" />{alert}<button onClick={() => setAlert(null)} aria-label="Cerrar alerta"><X className="size-4" /></button></div> : null;
}
