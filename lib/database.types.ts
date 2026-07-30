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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      dog_heats: {
        Row: {
          created_at: string
          date: string
          dog_id: string
          farm_id: string
          id: string
        }
        Insert: {
          created_at?: string
          date: string
          dog_id: string
          farm_id: string
          id?: string
        }
        Update: {
          created_at?: string
          date?: string
          dog_id?: string
          farm_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dog_heats_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dog_heats_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      dogs: {
        Row: {
          acquired_date: string
          breed: string
          created_at: string
          farm_id: string
          id: string
          name: string
          pedigree: string | null
          price: number
          sex: string
          source: string
        }
        Insert: {
          acquired_date: string
          breed: string
          created_at?: string
          farm_id: string
          id?: string
          name: string
          pedigree?: string | null
          price?: number
          sex: string
          source: string
        }
        Update: {
          acquired_date?: string
          breed?: string
          created_at?: string
          farm_id?: string
          id?: string
          name?: string
          pedigree?: string | null
          price?: number
          sex?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "dogs_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      egg_records: {
        Row: {
          count: number
          created_at: string
          date: string
          farm_id: string
          id: string
        }
        Insert: {
          count: number
          created_at?: string
          date: string
          farm_id: string
          id?: string
        }
        Update: {
          count?: number
          created_at?: string
          date?: string
          farm_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "egg_records_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      farms: {
        Row: {
          created_at: string
          currency: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      finance_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          description: string
          farm_id: string
          id: string
          qty: number | null
          source_ref_id: string | null
          source_type: string | null
          type: string
          unit_label: string | null
          unit_price: number | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          date: string
          description: string
          farm_id: string
          id?: string
          qty?: number | null
          source_ref_id?: string | null
          source_type?: string | null
          type: string
          unit_label?: string | null
          unit_price?: number | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string
          farm_id?: string
          id?: string
          qty?: number | null
          source_ref_id?: string | null
          source_type?: string | null
          type?: string
          unit_label?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_transactions_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      incubations: {
        Row: {
          count: number
          created_at: string
          date: string
          farm_id: string
          id: string
        }
        Insert: {
          count: number
          created_at?: string
          date: string
          farm_id: string
          id?: string
        }
        Update: {
          count?: number
          created_at?: string
          date?: string
          farm_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incubations_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      poultry_batches: {
        Row: {
          breed: string
          count: number
          created_at: string
          deploy_date: string
          farm_id: string
          id: string
          name: string
          source: string
          unit_price: number
        }
        Insert: {
          breed: string
          count: number
          created_at?: string
          deploy_date: string
          farm_id: string
          id?: string
          name: string
          source: string
          unit_price?: number
        }
        Update: {
          breed?: string
          count?: number
          created_at?: string
          deploy_date?: string
          farm_id?: string
          id?: string
          name?: string
          source?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "poultry_batches_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      poultry_health: {
        Row: {
          affected: number
          batch_id: string | null
          batch_name: string
          created_at: string
          date: string
          farm_id: string
          id: string
          issue: string
          mortality: number
          photo_url: string | null
          rx: string | null
        }
        Insert: {
          affected?: number
          batch_id?: string | null
          batch_name: string
          created_at?: string
          date?: string
          farm_id: string
          id?: string
          issue: string
          mortality?: number
          photo_url?: string | null
          rx?: string | null
        }
        Update: {
          affected?: number
          batch_id?: string | null
          batch_name?: string
          created_at?: string
          date?: string
          farm_id?: string
          id?: string
          issue?: string
          mortality?: number
          photo_url?: string | null
          rx?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poultry_health_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "poultry_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poultry_health_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      rabbit_pairings: {
        Row: {
          buck_id: string
          created_at: string
          date: string
          doe_id: string
          farm_id: string
          id: string
        }
        Insert: {
          buck_id: string
          created_at?: string
          date: string
          doe_id: string
          farm_id: string
          id?: string
        }
        Update: {
          buck_id?: string
          created_at?: string
          date?: string
          doe_id?: string
          farm_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rabbit_pairings_buck_id_fkey"
            columns: ["buck_id"]
            isOneToOne: false
            referencedRelation: "rabbits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rabbit_pairings_doe_id_fkey"
            columns: ["doe_id"]
            isOneToOne: false
            referencedRelation: "rabbits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rabbit_pairings_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      rabbits: {
        Row: {
          acquired_date: string
          breed: string
          created_at: string
          farm_id: string
          id: string
          price: number
          sex: string
          source: string
          tag_id: string
        }
        Insert: {
          acquired_date: string
          breed: string
          created_at?: string
          farm_id: string
          id?: string
          price?: number
          sex: string
          source: string
          tag_id: string
        }
        Update: {
          acquired_date?: string
          breed?: string
          created_at?: string
          farm_id?: string
          id?: string
          price?: number
          sex?: string
          source?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rabbits_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          farm_id: string
          id: string
          name: string | null
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          farm_id: string
          id: string
          name?: string | null
          role?: string
        }
        Update: {
          created_at?: string
          email?: string
          farm_id?: string
          id?: string
          name?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      vegetable_health: {
        Row: {
          affected: number
          batch_name: string
          created_at: string
          date: string
          farm_id: string
          id: string
          issue: string
          loss: number
          photo_url: string | null
          rx: string | null
          unit_id: string | null
        }
        Insert: {
          affected?: number
          batch_name: string
          created_at?: string
          date?: string
          farm_id: string
          id?: string
          issue: string
          loss?: number
          photo_url?: string | null
          rx?: string | null
          unit_id?: string | null
        }
        Update: {
          affected?: number
          batch_name?: string
          created_at?: string
          date?: string
          farm_id?: string
          id?: string
          issue?: string
          loss?: number
          photo_url?: string | null
          rx?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vegetable_health_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vegetable_health_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "vegetable_units"
            referencedColumns: ["id"]
          },
        ]
      }
      vegetable_units: {
        Row: {
          created_at: string
          crop_type: string
          deploy_date: string
          farm_id: string
          id: string
          price_per_stem: number
          source: string
          stems: number
          units: number
        }
        Insert: {
          created_at?: string
          crop_type: string
          deploy_date: string
          farm_id: string
          id?: string
          price_per_stem?: number
          source: string
          stems: number
          units: number
        }
        Update: {
          created_at?: string
          crop_type?: string
          deploy_date?: string
          farm_id?: string
          id?: string
          price_per_stem?: number
          source?: string
          stems?: number
          units?: number
        }
        Relationships: [
          {
            foreignKeyName: "vegetable_units_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      farm_id: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
