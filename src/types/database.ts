export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          display_order: number
          id: string
          name: string
          restaurant_id: string
        }
        Insert: {
          display_order?: number
          id?: string
          name: string
          restaurant_id: string
        }
        Update: {
          display_order?: number
          id?: string
          name?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category_id: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          price: number
          restaurant_id: string
          tag: Database["public"]["Enums"]["menu_item_tag"] | null
        }
        Insert: {
          category_id: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          price: number
          restaurant_id: string
          tag?: Database["public"]["Enums"]["menu_item_tag"] | null
        }
        Update: {
          category_id?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          price?: number
          restaurant_id?: string
          tag?: Database["public"]["Enums"]["menu_item_tag"] | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_tenant_fk"
            columns: ["category_id", "restaurant_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "restaurant_id"]
          },
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          restaurant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          restaurant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          restaurant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          menu_item_id: string
          notes: string | null
          order_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          id?: string
          menu_item_id: string
          notes?: string | null
          order_id: string
          quantity: number
          unit_price: number
        }
        Update: {
          id?: string
          menu_item_id?: string
          notes?: string | null
          order_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          assigned_waiter_id: string | null
          created_by_waiter_id: string | null
          customer_name: string | null
          created_at: string
          id: string
          notes: string | null
          restaurant_id: string
          status: Database["public"]["Enums"]["order_status"]
          table_id: string | null
          total: number
        }
        Insert: {
          assigned_waiter_id?: string | null
          created_by_waiter_id?: string | null
          customer_name?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          restaurant_id: string
          status?: Database["public"]["Enums"]["order_status"]
          table_id?: string | null
          total?: number
        }
        Update: {
          assigned_waiter_id?: string | null
          created_by_waiter_id?: string | null
          customer_name?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          restaurant_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          table_id?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_tenant_fk"
            columns: ["table_id", "restaurant_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id", "restaurant_id"]
          },
          {
            foreignKeyName: "orders_created_by_waiter_tenant_fk"
            columns: ["created_by_waiter_id", "restaurant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "restaurant_id"]
          },
          {
            foreignKeyName: "orders_assigned_waiter_tenant_fk"
            columns: ["assigned_waiter_id", "restaurant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "restaurant_id"]
          },
        ]
      }
      profiles: {
        Row: {
          full_name: string
          id: string
          restaurant_id: string
          role: Database["public"]["Enums"]["profile_role"]
          staff_email: string | null
          staff_username: string | null
        }
        Insert: {
          full_name: string
          id: string
          restaurant_id: string
          role?: Database["public"]["Enums"]["profile_role"]
          staff_email?: string | null
          staff_username?: string | null
        }
        Update: {
          full_name?: string
          id?: string
          restaurant_id?: string
          role?: Database["public"]["Enums"]["profile_role"]
          staff_email?: string | null
          staff_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          opening_hours: Json
          phone: string | null
          primary_color: string
          secondary_color: string
          menu_style: string
          internal_primary_color: string
          internal_secondary_color: string
          slug: string
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          opening_hours?: Json
          phone?: string | null
          primary_color?: string
          secondary_color?: string
          menu_style?: string
          internal_primary_color?: string
          internal_secondary_color?: string
          slug: string
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          opening_hours?: Json
          phone?: string | null
          primary_color?: string
          secondary_color?: string
          menu_style?: string
          internal_primary_color?: string
          internal_secondary_color?: string
          slug?: string
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
        }
        Relationships: []
      }
      tables: {
        Row: {
          id: string
          label: string
          qr_code_url: string | null
          restaurant_id: string
        }
        Insert: {
          id?: string
          label: string
          qr_code_url?: string | null
          restaurant_id: string
        }
        Update: {
          id?: string
          label?: string
          qr_code_url?: string | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      table_service_requests: {
        Row: { id: string; restaurant_id: string; table_id: string; status: string; claimed_by: string | null; created_at: string; claimed_at: string | null; resolved_at: string | null }
        Insert: { id?: string; restaurant_id: string; table_id: string; status?: string; claimed_by?: string | null; created_at?: string; claimed_at?: string | null; resolved_at?: string | null }
        Update: { id?: string; restaurant_id?: string; table_id?: string; status?: string; claimed_by?: string | null; created_at?: string; claimed_at?: string | null; resolved_at?: string | null }
        Relationships: []
      }
      table_service_sessions: {
        Row: { id: string; restaurant_id: string; table_id: string; waiter_id: string; status: string; claimed_at: string; last_activity_at: string; closed_at: string | null }
        Insert: { id?: string; restaurant_id: string; table_id: string; waiter_id: string; status?: string; claimed_at?: string; last_activity_at?: string; closed_at?: string | null }
        Update: { id?: string; restaurant_id?: string; table_id?: string; waiter_id?: string; status?: string; claimed_at?: string; last_activity_at?: string; closed_at?: string | null }
        Relationships: []
      }
      plan_change_requests: {
        Row: { id: string; restaurant_id: string; requested_by: string; current_tier: Database["public"]["Enums"]["subscription_tier"]; requested_tier: Database["public"]["Enums"]["subscription_tier"]; note: string | null; status: string; created_at: string; reviewed_at: string | null; reviewed_by: string | null }
        Insert: { id?: string; restaurant_id: string; requested_by: string; current_tier: Database["public"]["Enums"]["subscription_tier"]; requested_tier: Database["public"]["Enums"]["subscription_tier"]; note?: string | null; status?: string; created_at?: string; reviewed_at?: string | null; reviewed_by?: string | null }
        Update: { id?: string; restaurant_id?: string; requested_by?: string; current_tier?: Database["public"]["Enums"]["subscription_tier"]; requested_tier?: Database["public"]["Enums"]["subscription_tier"]; note?: string | null; status?: string; created_at?: string; reviewed_at?: string | null; reviewed_by?: string | null }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_rate_limit: {
        Args: {
          p_key_hash: string
          p_max_requests: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      can_access_order: { Args: { target_order_id: string }; Returns: boolean }
      can_access_restaurant: {
        Args: { target_restaurant_id: string }
        Returns: boolean
      }
      can_manage_order: { Args: { target_order_id: string }; Returns: boolean }
      can_manage_restaurant: {
        Args: { target_restaurant_id: string }
        Returns: boolean
      }
      can_use_kds: {
        Args: { target_restaurant_id: string }
        Returns: boolean
      }
      can_use_orders: {
        Args: { target_restaurant_id: string }
        Returns: boolean
      }
      can_use_table_qr: {
        Args: { target_restaurant_id: string }
        Returns: boolean
      }
      claim_table_service_request: { Args: { p_request_id: string }; Returns: Json }
      close_table_service_session: { Args: { p_session_id: string }; Returns: boolean }
      complete_restaurant_owner_onboarding: {
        Args: {
          p_phone: string
          p_restaurant_name: string
          p_restaurant_slug: string
        }
        Returns: string
      }
      create_public_order: {
        Args: {
          p_items: Json
          p_notes?: string | null
          p_slug: string
          p_table_id: string | null
        }
        Returns: Json
      }
      create_public_order_with_customer: {
        Args: {
          p_customer_name?: string | null
          p_items: Json
          p_notes?: string | null
          p_slug: string
          p_table_id: string | null
        }
        Returns: Json
      }
      get_public_menu: {
        Args: { p_slug: string; p_table_id?: string | null }
        Returns: Json
      }
      is_superadmin: { Args: never; Returns: boolean }
      reorder_categories: {
        Args: { p_ordered_ids: string[] }
        Returns: undefined
      }
    }
    Enums: {
      menu_item_tag: "popular" | "nuevo"
      order_status: "nuevo" | "en_preparacion" | "listo" | "entregado"
      profile_role: "owner" | "staff" | "mesero" | "cocina" | "superadmin"
      subscription_tier: "gratis" | "plus" | "pro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      menu_item_tag: ["popular", "nuevo"],
      order_status: ["nuevo", "en_preparacion", "listo", "entregado"],
      profile_role: ["owner", "staff", "mesero", "cocina", "superadmin"],
      subscription_tier: ["gratis", "plus", "pro"],
    },
  },
} as const
