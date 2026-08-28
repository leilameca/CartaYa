"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BellRing, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function GlobalRealtimeAlerts({ restaurantId, role }: { restaurantId: string; role: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [alert, setAlert] = useState<string | null>(null);
  const audioContext = useRef<AudioContext | null>(null);

  useEffect(() => {
    const unlockAudio = () => {
      const context = audioContext.current ?? new AudioContext();
      audioContext.current = context;
      if (context.state === "suspended") void context.resume();
    };

    window.addEventListener("pointerdown", unlockAudio, { once: true });
    return () => window.removeEventListener("pointerdown", unlockAudio);
  }, []);

  useEffect(() => {
    if (role === "cocina") return;
    const notify = (message: string) => {
      setAlert(message);
      navigator.vibrate?.([250, 100, 350]);

      const context = audioContext.current;
      if (context?.state === "running") {
        [0, 0.18, 0.36].forEach((delay, index) => {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.frequency.value = [660, 820, 980][index];
          gain.gain.setValueAtTime(0.0001, context.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + delay + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + delay + 0.15);
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start(context.currentTime + delay);
          oscillator.stop(context.currentTime + delay + 0.16);
        });
      }

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
