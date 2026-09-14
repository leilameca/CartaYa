"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { DEMO_STORAGE_KEY } from "@/lib/demo-menu";
import { DEMO_PENDING_KEY } from "@/lib/demo-transfer";

export function DemoRestaurantName() {
  const [name, setName] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const draft = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || "null");
        if (new URLSearchParams(location.search).get("from") === "demo" && draft) localStorage.setItem(DEMO_PENDING_KEY, "true");
        if (localStorage.getItem(DEMO_PENDING_KEY) && typeof draft?.restaurant?.name === "string") setName((current) => current || draft.restaurant.name);
      } catch {}
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  return <Input id="restaurantName" name="restaurantName" autoComplete="organization" required value={name} onChange={(event) => setName(event.target.value)} />;
}
