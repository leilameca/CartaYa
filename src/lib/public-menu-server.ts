import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { PublicMenuData } from "@/types/public-menu";

export const getPublicMenu = cache(async (slug: string, tableId?: string | null) => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_menu", {
    p_slug: slug,
    p_table_id: tableId ?? null,
  });

  if (error) throw new Error(`No se pudo cargar el menú público: ${error.message}`);
  return data as PublicMenuData | null;
});

