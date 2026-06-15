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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      accidents: {
        Row: {
          cause: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          latitude: number
          location_name: string | null
          longitude: number
          num_casualties: number | null
          num_vehicles: number | null
          reported_by: string | null
          severity: string
          time: string | null
          updated_at: string
          vehicle_type: string
          weather: string | null
        }
        Insert: {
          cause?: string | null
          created_at?: string
          date: string
          description?: string | null
          id?: string
          latitude: number
          location_name?: string | null
          longitude: number
          num_casualties?: number | null
          num_vehicles?: number | null
          reported_by?: string | null
          severity: string
          time?: string | null
          updated_at?: string
          vehicle_type: string
          weather?: string | null
        }
        Update: {
          cause?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          latitude?: number
          location_name?: string | null
          longitude?: number
          num_casualties?: number | null
          num_vehicles?: number | null
          reported_by?: string | null
          severity?: string
          time?: string | null
          updated_at?: string
          vehicle_type?: string
          weather?: string | null
        }
        Relationships: []
      }
      alerts: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          risk_zone_id: string | null
          severity: string
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          risk_zone_id?: string | null
          severity: string
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          risk_zone_id?: string | null
          severity?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_risk_zone_id_fkey"
            columns: ["risk_zone_id"]
            isOneToOne: false
            referencedRelation: "risk_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      city_accident_stats: {
        Row: {
          accidents_per_lakh: number | null
          city_name: string
          created_at: string | null
          fatalities_per_lakh: number | null
          id: string
          last_updated: string | null
          latitude: number
          longitude: number
          monthly_trend: Json | null
          population: number | null
          source: string | null
          state: string
          top_causes: Json | null
          total_accidents: number | null
          total_fatalities: number | null
          total_injuries: number | null
          year: number
        }
        Insert: {
          accidents_per_lakh?: number | null
          city_name: string
          created_at?: string | null
          fatalities_per_lakh?: number | null
          id?: string
          last_updated?: string | null
          latitude: number
          longitude: number
          monthly_trend?: Json | null
          population?: number | null
          source?: string | null
          state: string
          top_causes?: Json | null
          total_accidents?: number | null
          total_fatalities?: number | null
          total_injuries?: number | null
          year?: number
        }
        Update: {
          accidents_per_lakh?: number | null
          city_name?: string
          created_at?: string | null
          fatalities_per_lakh?: number | null
          id?: string
          last_updated?: string | null
          latitude?: number
          longitude?: number
          monthly_trend?: Json | null
          population?: number | null
          source?: string | null
          state?: string
          top_causes?: Json | null
          total_accidents?: number | null
          total_fatalities?: number | null
          total_injuries?: number | null
          year?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      risk_zones: {
        Row: {
          accident_count: number
          avg_severity: number | null
          created_at: string
          factors: Json | null
          id: string
          last_calculated: string
          latitude: number
          longitude: number
          radius_km: number
          risk_score: number
          zone_name: string | null
        }
        Insert: {
          accident_count?: number
          avg_severity?: number | null
          created_at?: string
          factors?: Json | null
          id?: string
          last_calculated?: string
          latitude: number
          longitude: number
          radius_km?: number
          risk_score: number
          zone_name?: string | null
        }
        Update: {
          accident_count?: number
          avg_severity?: number | null
          created_at?: string
          factors?: Json | null
          id?: string
          last_calculated?: string
          latitude?: number
          longitude?: number
          radius_km?: number
          risk_score?: number
          zone_name?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "authority" | "planner" | "public_user"
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
      app_role: ["authority", "planner", "public_user"],
    },
  },
} as const
