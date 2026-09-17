export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'admin' | 'member' | 'guest';

export interface UserSortPreferences {
  default_sort_by: 'created_at' | 'updated_at' | 'title' | 'sort_order';
  default_sort_order: 'asc' | 'desc';
  custom_order?: string[];
  pinned_items?: string[];
  filter_favorites_first: boolean;
}

export interface UserEmailPreferences {
  marketing: boolean;
  transactional: boolean;
  newsletter: boolean;
  product_updates: boolean;
  digest_frequency: 'daily' | 'weekly' | 'monthly' | 'never';
}

export interface UserDisplaySettings {
  theme: 'light' | 'dark' | 'system';
  density: 'comfortable' | 'compact';
  view_mode: 'grid' | 'list' | 'board';
}

export interface CitizenStamp {
  id: string;
  code: string;
  name: string;
  description: string;
  category: 'chronicle' | 'ritual' | 'security' | 'provenance';
  unlocked_at?: string;
}

export interface CitizenPassportMetadata {
  residence?: string;
  clearance_title?: string;
  ritual_streak_days?: number;
  unlocked_stamps?: string[];
  [key: string]: Json | undefined;
}

export interface CitizenPassportMetrics {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: UserRole;
  passport_number: string;
  residence: string;
  clearance_title: string;
  ritual_streak_days: number;
  unlocked_stamps: string[];
  total_items: number;
  pinned_items: number;
  favorite_items: number;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: UserRole;
  sort_preferences: UserSortPreferences;
  email_preferences: UserEmailPreferences;
  display_settings: UserDisplaySettings;
  metadata: CitizenPassportMetadata;
  created_at: string;
  updated_at: string;
}

export interface UserItem {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: 'active' | 'archived' | 'draft';
  sort_order: number;
  is_pinned: boolean;
  is_favorite: boolean;
  tags: string[];
  metadata: Record<string, Json>;
  created_at: string;
  updated_at: string;
}

export interface DiaryRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  theme: 'vintage' | 'classic' | 'modern';
  cover_color: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  sort_order: number;
  metadata: Record<string, Json>;
  created_at: string;
  updated_at: string;
}

export interface DiaryEntryRow {
  id: string;
  diary_id: string;
  user_id: string;
  page_number: number;
  entry_date: string;
  date_str: string;
  day_of_week: string;
  year_str: string;
  title: string;
  description: string;
  gratitude: string[];
  energy_level: number;
  start_time: string;
  end_time: string;
  mood: string;
  weather: string;
  is_hearted: boolean;
  tags: string[];
  word_count: number;
  metadata: Record<string, Json>;
  created_at: string;
  updated_at: string;
}

export interface DiaryStats {
  total_entries: number;
  total_words: number;
  average_energy: number;
  hearted_entries: number;
  current_streak: number;
  longest_streak: number;
  mood_breakdown: Record<string, number>;
  tags: string[];
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>> & { id: string; email: string };
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
        Relationships: [];
      };
      user_items: {
        Row: UserItem;
        Insert: Omit<UserItem, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<UserItem, 'id' | 'user_id' | 'created_at'>>;
        Relationships: [
          {
            foreignKeyName: "user_items_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      diaries: {
        Row: DiaryRow;
        Insert: Omit<DiaryRow, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<DiaryRow, 'id' | 'user_id' | 'created_at'>>;
        Relationships: [
          {
            foreignKeyName: "diaries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      diary_entries: {
        Row: DiaryEntryRow;
        Insert: Omit<DiaryEntryRow, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<DiaryEntryRow, 'id' | 'diary_id' | 'user_id' | 'created_at'>>;
        Relationships: [
          {
            foreignKeyName: "diary_entries_diary_id_fkey";
            columns: ["diary_id"];
            isOneToOne: false;
            referencedRelation: "diaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "diary_entries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_citizen_passport_metrics: {
        Args: Record<string, never>;
        Returns: CitizenPassportMetrics;
      };
      update_citizen_passport: {
        Args: {
          p_full_name?: string | null;
          p_username?: string | null;
          p_bio?: string | null;
          p_avatar_url?: string | null;
          p_metadata?: Json | null;
        };
        Returns: Profile;
      };
      get_sorted_user_items: {
        Args: {
          p_status?: string | null;
          p_sort_by?: string | null;
          p_ascending?: boolean | null;
        };
        Returns: UserItem[];
      };
      reorder_user_items: {
        Args: {
          p_item_ids: string[];
        };
        Returns: void;
      };
      update_sort_preferences: {
        Args: {
          p_sort_by: string;
          p_sort_order?: string;
          p_filter_favorites_first?: boolean;
        };
        Returns: Json;
      };
      get_diary_stats: {
        Args: {
          p_diary_id?: string | null;
        };
        Returns: DiaryStats;
      };
      get_user_diaries_overview: {
        Args: Record<string, never>;
        Returns: Json;
      };
      reorder_diaries: {
        Args: {
          p_diary_ids: string[];
        };
        Returns: void;
      };
      create_diary_with_first_page: {
        Args: {
          p_name: string;
          p_description?: string | null;
          p_theme?: string | null;
          p_cover_color?: string | null;
        };
        Returns: Json;
      };
      create_diary_entry: {
        Args: {
          p_diary_id: string;
          p_title?: string;
          p_description?: string;
          p_gratitude?: string[];
          p_energy_level?: number;
          p_start_time?: string;
          p_end_time?: string;
          p_mood?: string;
          p_weather?: string;
          p_is_hearted?: boolean;
          p_tags?: string[];
        };
        Returns: Json;
      };
    };
    Enums: {
      user_role: UserRole;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
