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
    };
    Enums: {
      user_role: UserRole;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
