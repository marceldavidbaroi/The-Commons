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
      allowed_members: {
        Row: {
          added_by: number | null
          created_at: string
          email: string
          id: number
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          added_by?: number | null
          created_at?: string
          email: string
          id?: number
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          added_by?: number | null
          created_at?: string
          email?: string
          id?: number
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "allowed_members_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      diaries: {
        Row: {
          cover_color: string | null
          created_at: string
          description: string | null
          id: number
          is_archived: boolean
          is_favorite: boolean
          metadata: Json
          name: string
          sort_order: number
          theme: string
          updated_at: string
          user_id: number
        }
        Insert: {
          cover_color?: string | null
          created_at?: string
          description?: string | null
          id?: number
          is_archived?: boolean
          is_favorite?: boolean
          metadata?: Json
          name: string
          sort_order?: number
          theme?: string
          updated_at?: string
          user_id: number
        }
        Update: {
          cover_color?: string | null
          created_at?: string
          description?: string | null
          id?: number
          is_archived?: boolean
          is_favorite?: boolean
          metadata?: Json
          name?: string
          sort_order?: number
          theme?: string
          updated_at?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "diaries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      diary_entries: {
        Row: {
          created_at: string
          date_str: string
          day_of_week: string
          description: string
          diary_id: number
          end_time: string | null
          energy_level: number
          entry_date: string
          gratitude: string[]
          id: number
          is_hearted: boolean
          metadata: Json
          mood: string
          page_number: number
          start_time: string | null
          tag_ids: number[]
          tag_slugs: string[]
          tags: string[]
          title: string
          updated_at: string
          user_id: number
          weather: string
          word_count: number
          year_str: string
        }
        Insert: {
          created_at?: string
          date_str: string
          day_of_week: string
          description?: string
          diary_id: number
          end_time?: string | null
          energy_level?: number
          entry_date?: string
          gratitude?: string[]
          id?: number
          is_hearted?: boolean
          metadata?: Json
          mood?: string
          page_number?: number
          start_time?: string | null
          tag_ids?: number[]
          tag_slugs?: string[]
          tags?: string[]
          title?: string
          updated_at?: string
          user_id: number
          weather?: string
          word_count?: number
          year_str: string
        }
        Update: {
          created_at?: string
          date_str?: string
          day_of_week?: string
          description?: string
          diary_id?: number
          end_time?: string | null
          energy_level?: number
          entry_date?: string
          gratitude?: string[]
          id?: number
          is_hearted?: boolean
          metadata?: Json
          mood?: string
          page_number?: number
          start_time?: string | null
          tag_ids?: number[]
          tag_slugs?: string[]
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: number
          weather?: string
          word_count?: number
          year_str?: string
        }
        Relationships: [
          {
            foreignKeyName: "diary_entries_diary_id_fkey"
            columns: ["diary_id"]
            isOneToOne: false
            referencedRelation: "diaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diary_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          achieved_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: number
          parent_id: number | null
          priority: Database["public"]["Enums"]["goal_priority"]
          start_date: string | null
          status: Database["public"]["Enums"]["goal_status"]
          tag_ids: number[]
          tag_slugs: string[]
          title: string
          type: Database["public"]["Enums"]["goal_type"]
          updated_at: string
          user_id: number
        }
        Insert: {
          achieved_at?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: number
          parent_id?: number | null
          priority?: Database["public"]["Enums"]["goal_priority"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["goal_status"]
          tag_ids?: number[]
          tag_slugs?: string[]
          title: string
          type?: Database["public"]["Enums"]["goal_type"]
          updated_at?: string
          user_id: number
        }
        Update: {
          achieved_at?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: number
          parent_id?: number | null
          priority?: Database["public"]["Enums"]["goal_priority"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["goal_status"]
          tag_ids?: number[]
          tag_slugs?: string[]
          title?: string
          type?: Database["public"]["Enums"]["goal_type"]
          updated_at?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "goals_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_settings: Json
          email: string
          email_preferences: Json
          full_name: string | null
          id: number
          metadata: Json
          role: string
          sort_preferences: Json
          updated_at: string
          username: string | null
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_settings?: Json
          email: string
          email_preferences?: Json
          full_name?: string | null
          id?: number
          metadata?: Json
          role?: string
          sort_preferences?: Json
          updated_at?: string
          username?: string | null
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_settings?: Json
          email?: string
          email_preferences?: Json
          full_name?: string | null
          id?: number
          metadata?: Json
          role?: string
          sort_preferences?: Json
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      tag_groups: {
        Row: {
          color: string
          created_at: string
          display_order: number
          feature: string
          icon: string
          id: number
          is_system: boolean
          name: string
          schema_blueprint: Json
          slug: string
          updated_at: string
          user_id: number
        }
        Insert: {
          color?: string
          created_at?: string
          display_order?: number
          feature?: string
          icon?: string
          id?: number
          is_system?: boolean
          name: string
          schema_blueprint?: Json
          slug: string
          updated_at?: string
          user_id: number
        }
        Update: {
          color?: string
          created_at?: string
          display_order?: number
          feature?: string
          icon?: string
          id?: number
          is_system?: boolean
          name?: string
          schema_blueprint?: Json
          slug?: string
          updated_at?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "tag_groups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_categories: {
        Row: {
          color: string
          created_at: string
          display_order: number
          feature: string
          group_id: number | null
          id: number
          is_system: boolean
          name: string
          schema_blueprint: Json
          slug: string
          updated_at: string
          user_id: number
        }
        Insert: {
          color?: string
          created_at?: string
          display_order?: number
          feature?: string
          group_id?: number | null
          id?: number
          is_system?: boolean
          name: string
          schema_blueprint?: Json
          slug: string
          updated_at?: string
          user_id: number
        }
        Update: {
          color?: string
          created_at?: string
          display_order?: number
          feature?: string
          group_id?: number | null
          id?: number
          is_system?: boolean
          name?: string
          schema_blueprint?: Json
          slug?: string
          updated_at?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "tag_categories_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "tag_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          category_id: number
          color: string | null
          created_at: string
          id: number
          is_system: boolean
          name: string
          slug: string
          updated_at: string
          user_id: number
        }
        Insert: {
          category_id: number
          color?: string | null
          created_at?: string
          id?: number
          is_system?: boolean
          name: string
          slug: string
          updated_at?: string
          user_id: number
        }
        Update: {
          category_id?: number
          color?: string | null
          created_at?: string
          id?: number
          is_system?: boolean
          name?: string
          slug?: string
          updated_at?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "tags_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tag_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_minutes: number | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: number
          parent_id: number | null
          priority: Database["public"]["Enums"]["task_priority"]
          scheduled_date: string | null
          sort_order: number
          status: Database["public"]["Enums"]["task_status"]
          tag_ids: number[]
          tag_slugs: string[]
          time_estimate_minutes: number | null
          title: string
          updated_at: string
          user_id: number
        }
        Insert: {
          actual_minutes?: number | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: number
          parent_id?: number | null
          priority?: Database["public"]["Enums"]["task_priority"]
          scheduled_date?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          tag_ids?: number[]
          tag_slugs?: string[]
          time_estimate_minutes?: number | null
          title: string
          updated_at?: string
          user_id: number
        }
        Update: {
          actual_minutes?: number | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: number
          parent_id?: number | null
          priority?: Database["public"]["Enums"]["task_priority"]
          scheduled_date?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          tag_ids?: number[]
          tag_slugs?: string[]
          time_estimate_minutes?: number | null
          title?: string
          updated_at?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "tasks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_items: {
        Row: {
          category_id: number | null
          category_slug: string | null
          condition_status: string | null
          created_at: string
          description: string | null
          expiration_date: string | null
          id: number
          is_archived: boolean
          is_loaned: boolean
          item_type: string
          loaned_at: string | null
          loaned_to: string | null
          location_id: number | null
          metadata: Json
          name: string
          quantity: number | null
          reorder_threshold: number | null
          tag_ids: number[]
          tag_slugs: string[]
          unit_of_measure: string | null
          updated_at: string
          user_id: number
        }
        Insert: {
          category_id?: number | null
          category_slug?: string | null
          condition_status?: string | null
          created_at?: string
          description?: string | null
          expiration_date?: string | null
          id?: number
          is_archived?: boolean
          is_loaned?: boolean
          item_type: string
          loaned_at?: string | null
          loaned_to?: string | null
          location_id?: number | null
          metadata?: Json
          name: string
          quantity?: number | null
          reorder_threshold?: number | null
          tag_ids?: number[]
          tag_slugs?: string[]
          unit_of_measure?: string | null
          updated_at?: string
          user_id: number
        }
        Update: {
          category_id?: number | null
          category_slug?: string | null
          condition_status?: string | null
          created_at?: string
          description?: string | null
          expiration_date?: string | null
          id?: number
          is_archived?: boolean
          is_loaned?: boolean
          item_type?: string
          loaned_at?: string | null
          loaned_to?: string | null
          location_id?: number | null
          metadata?: Json
          name?: string
          quantity?: number | null
          reorder_threshold?: number | null
          tag_ids?: number[]
          tag_slugs?: string[]
          unit_of_measure?: string | null
          updated_at?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tag_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_diary_entry:
        | {
            Args: {
              p_description?: string
              p_diary_id: number
              p_end_time?: string
              p_energy_level?: number
              p_gratitude?: string[]
              p_is_hearted?: boolean
              p_mood?: string
              p_start_time?: string
              p_tags?: string[]
              p_title?: string
              p_weather?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_description?: string
              p_diary_id: string
              p_end_time?: string
              p_energy_level?: number
              p_gratitude?: string[]
              p_is_hearted?: boolean
              p_mood?: string
              p_start_time?: string
              p_tags?: string[]
              p_title?: string
              p_weather?: string
            }
            Returns: Json
          }
      create_diary_with_first_page: {
        Args: {
          p_cover_color?: string
          p_description?: string
          p_name: string
          p_theme?: string
        }
        Returns: Json
      }
      get_citizen_passport_metrics: { Args: never; Returns: Json }
      get_diary_stats:
        | {
            Args: { p_diary_id?: number }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.get_diary_stats(p_diary_id => int8), public.get_diary_stats(p_diary_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { p_diary_id?: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.get_diary_stats(p_diary_id => int8), public.get_diary_stats(p_diary_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      get_user_diaries_overview: { Args: never; Returns: Json }
      provision_feature_tag_categories: {
        Args: { p_feature: string }
        Returns: Json
      }
      reorder_diaries:
        | {
            Args: { p_diary_ids: number[] }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.reorder_diaries(p_diary_ids => _int8), public.reorder_diaries(p_diary_ids => _uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { p_diary_ids: string[] }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.reorder_diaries(p_diary_ids => _int8), public.reorder_diaries(p_diary_ids => _uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      reorder_user_items: { Args: { p_item_ids: string[] }; Returns: undefined }
      seed_default_tags_for_user: {
        Args: { p_user_id: number }
        Returns: undefined
      }
      update_citizen_passport: {
        Args: {
          p_avatar_url?: string
          p_bio?: string
          p_full_name?: string
          p_metadata?: Json
          p_username?: string
        }
        Returns: Json
      }
      update_sort_preferences: {
        Args: {
          p_filter_favorites_first?: boolean
          p_sort_by: string
          p_sort_order?: string
        }
        Returns: Json
      }
    }
    Enums: {
      goal_priority: "low" | "normal" | "high" | "critical"
      goal_status:
        | "draft"
        | "pending"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "deferred"
      goal_type:
        | "daily"
        | "weekly"
        | "monthly"
        | "quarterly"
        | "yearly"
        | "milestone"
        | "habit"
      task_priority: "low" | "normal" | "high" | "urgent"
      task_status:
        | "todo"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "deferred"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
    Enums: {
      goal_priority: ["low", "normal", "high", "critical"],
      goal_status: [
        "draft",
        "pending",
        "in_progress",
        "completed",
        "cancelled",
        "deferred",
      ],
      goal_type: [
        "daily",
        "weekly",
        "monthly",
        "quarterly",
        "yearly",
        "milestone",
        "habit",
      ],
      task_priority: ["low", "normal", "high", "urgent"],
      task_status: [
        "todo",
        "in_progress",
        "completed",
        "cancelled",
        "deferred",
      ],
    },
  },
} as const
