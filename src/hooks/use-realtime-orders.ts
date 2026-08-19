"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { fetchRestaurantOrders } from "@/lib/orders";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import type { DashboardOrder } from "@/types/orders";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

export function useRealtimeOrders({
  initialOrders,
  restaurantId,
  activeOnly = false,
  onInsert,
}: {
  initialOrders: DashboardOrder[];
  restaurantId: string;
  activeOnly?: boolean;
  onInsert?: (order: OrderRow) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState(initialOrders);
  const [connection, setConnection] = useState<"connecting" | "connected" | "error">("connecting");
  const onInsertRef = useRef(onInsert);

  useEffect(() => {
    onInsertRef.current = onInsert;
  }, [onInsert]);

  const refresh = useCallback(async () => {
    const latest = await fetchRestaurantOrders(supabase, restaurantId, { activeOnly });
    setOrders(latest);
  }, [activeOnly, restaurantId, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel(`orders-${restaurantId}-${activeOnly ? "kds" : "list"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload: RealtimePostgresChangesPayload<OrderRow>) => {
          if (payload.eventType === "INSERT") onInsertRef.current?.(payload.new as OrderRow);
          void refresh().catch(() => setConnection("error"));
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnection("connected");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setConnection("error");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeOnly, refresh, restaurantId, supabase]);

  return { orders, setOrders, connection, refresh, supabase };
}

