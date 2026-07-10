/**
 * Supabase database types for project rbtfjshktqabnswvxrmi.
 * Regenerate after schema changes: npm run db:types
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      attendance: {
        Row: {
          attendance_date: string;
          check_in_code: string;
          check_in_method: string;
          checked_in_at: string;
          created_at: string;
          expires_at: string;
          gym_id: string;
          id: string;
          user_id: string;
        };
        Insert: {
          attendance_date?: string;
          check_in_code?: string;
          check_in_method?: string;
          checked_in_at?: string;
          created_at?: string;
          expires_at: string;
          gym_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          attendance_date?: string;
          check_in_code?: string;
          check_in_method?: string;
          checked_in_at?: string;
          created_at?: string;
          expires_at?: string;
          gym_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'attendance_gym_id_fkey';
            columns: ['gym_id'];
            isOneToOne: false;
            referencedRelation: 'gyms';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_messages: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          read_at: string | null;
          recipient_id: string;
          sender_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          recipient_id: string;
          sender_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          recipient_id?: string;
          sender_id?: string;
        };
        Relationships: [];
      };
      daily_attendance_codes: {
        Row: {
          code: string;
          code_date: string;
          created_at: string;
          gym_id: string;
          id: string;
          user_id: string;
        };
        Insert: {
          code: string;
          code_date?: string;
          created_at?: string;
          gym_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          code?: string;
          code_date?: string;
          created_at?: string;
          gym_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'daily_attendance_codes_gym_id_fkey';
            columns: ['gym_id'];
            isOneToOne: false;
            referencedRelation: 'gyms';
            referencedColumns: ['id'];
          },
        ];
      };
      diet_daily_summaries: {
        Row: {
          calories: number;
          clean_ratio: number;
          created_at: string;
          gym_attended: boolean;
          gym_id: string | null;
          id: string;
          protein_g: number;
          score: number;
          summary_date: string;
          timing_score: number;
          updated_at: string;
          user_id: string;
          water_liters: number;
        };
        Insert: {
          calories?: number;
          clean_ratio?: number;
          created_at?: string;
          gym_attended?: boolean;
          gym_id?: string | null;
          id?: string;
          protein_g?: number;
          score?: number;
          summary_date: string;
          timing_score?: number;
          updated_at?: string;
          user_id: string;
          water_liters?: number;
        };
        Update: {
          calories?: number;
          clean_ratio?: number;
          created_at?: string;
          gym_attended?: boolean;
          gym_id?: string | null;
          id?: string;
          protein_g?: number;
          score?: number;
          summary_date?: string;
          timing_score?: number;
          updated_at?: string;
          user_id?: string;
          water_liters?: number;
        };
        Relationships: [];
      };
      diet_logs: {
        Row: {
          created_at: string;
          diet_score: number;
          fitness_score: number;
          foods: Json;
          gym_id: string | null;
          id: string;
          log_date: string;
          totals: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          diet_score?: number;
          fitness_score?: number;
          foods?: Json;
          gym_id?: string | null;
          id?: string;
          log_date?: string;
          totals?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          diet_score?: number;
          fitness_score?: number;
          foods?: Json;
          gym_id?: string | null;
          id?: string;
          log_date?: string;
          totals?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      friend_requests: {
        Row: {
          created_at: string;
          from_user_id: string;
          id: string;
          status: Database['public']['Enums']['friend_request_status'];
          to_user_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          from_user_id: string;
          id?: string;
          status?: Database['public']['Enums']['friend_request_status'];
          to_user_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          from_user_id?: string;
          id?: string;
          status?: Database['public']['Enums']['friend_request_status'];
          to_user_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      friendships: {
        Row: {
          created_at: string;
          id: string;
          pair_key: string;
          user_a_id: string;
          user_b_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          pair_key?: string;
          user_a_id: string;
          user_b_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          pair_key?: string;
          user_a_id?: string;
          user_b_id?: string;
        };
        Relationships: [];
      };
      gym_memberships: {
        Row: {
          amount: number | null;
          created_at: string;
          ends_at: string | null;
          gym_id: string;
          id: string;
          payment_mode: string;
          payment_status: Database['public']['Enums']['payment_status'];
          plan: Database['public']['Enums']['membership_plan'] | null;
          starts_at: string | null;
          status: Database['public']['Enums']['membership_status'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount?: number | null;
          created_at?: string;
          ends_at?: string | null;
          gym_id: string;
          id?: string;
          payment_mode?: string;
          payment_status?: Database['public']['Enums']['payment_status'];
          plan?: Database['public']['Enums']['membership_plan'] | null;
          starts_at?: string | null;
          status?: Database['public']['Enums']['membership_status'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount?: number | null;
          created_at?: string;
          ends_at?: string | null;
          gym_id?: string;
          id?: string;
          payment_mode?: string;
          payment_status?: Database['public']['Enums']['payment_status'];
          plan?: Database['public']['Enums']['membership_plan'] | null;
          starts_at?: string | null;
          status?: Database['public']['Enums']['membership_status'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'gym_memberships_gym_id_fkey';
            columns: ['gym_id'];
            isOneToOne: false;
            referencedRelation: 'gyms';
            referencedColumns: ['id'];
          },
        ];
      };
      gym_staff: {
        Row: {
          created_at: string;
          gym_id: string;
          id: string;
          staff_role: Database['public']['Enums']['gym_staff_role'];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          gym_id: string;
          id?: string;
          staff_role: Database['public']['Enums']['gym_staff_role'];
          user_id: string;
        };
        Update: {
          created_at?: string;
          gym_id?: string;
          id?: string;
          staff_role?: Database['public']['Enums']['gym_staff_role'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'gym_staff_gym_id_fkey';
            columns: ['gym_id'];
            isOneToOne: false;
            referencedRelation: 'gyms';
            referencedColumns: ['id'];
          },
        ];
      };
      gyms: {
        Row: {
          closing_time: string | null;
          code: string;
          contact_email: string;
          created_at: string;
          id: string;
          location: string;
          logo_url: string | null;
          name: string;
          opening_time: string | null;
          owner_id: string;
          phone: string;
          price_1_month: number;
          price_12_month: number;
          price_3_month: number;
          price_6_month: number;
          updated_at: string;
        };
        Insert: {
          closing_time?: string | null;
          code: string;
          contact_email?: string;
          created_at?: string;
          id?: string;
          location?: string;
          logo_url?: string | null;
          name: string;
          opening_time?: string | null;
          owner_id: string;
          phone?: string;
          price_1_month?: number;
          price_12_month?: number;
          price_3_month?: number;
          price_6_month?: number;
          updated_at?: string;
        };
        Update: {
          closing_time?: string | null;
          code?: string;
          contact_email?: string;
          created_at?: string;
          id?: string;
          location?: string;
          logo_url?: string | null;
          name?: string;
          opening_time?: string | null;
          owner_id?: string;
          phone?: string;
          price_1_month?: number;
          price_12_month?: number;
          price_3_month?: number;
          price_6_month?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      join_requests: {
        Row: {
          created_at: string;
          gym_id: string;
          id: string;
          message: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database['public']['Enums']['join_request_status'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          gym_id: string;
          id?: string;
          message?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database['public']['Enums']['join_request_status'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          gym_id?: string;
          id?: string;
          message?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database['public']['Enums']['join_request_status'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'join_requests_gym_id_fkey';
            columns: ['gym_id'];
            isOneToOne: false;
            referencedRelation: 'gyms';
            referencedColumns: ['id'];
          },
        ];
      };
      league_seasons: {
        Row: {
          created_at: string;
          day_points: Json;
          gym_id: string | null;
          id: string;
          season_id: string;
          total_points: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          day_points?: Json;
          gym_id?: string | null;
          id?: string;
          season_id: string;
          total_points?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          day_points?: Json;
          gym_id?: string | null;
          id?: string;
          season_id?: string;
          total_points?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string;
          created_at: string;
          created_by: string | null;
          gym_id: string;
          id: string;
          title: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          created_by?: string | null;
          gym_id: string;
          id?: string;
          title: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          created_by?: string | null;
          gym_id?: string;
          id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_gym_id_fkey';
            columns: ['gym_id'];
            isOneToOne: false;
            referencedRelation: 'gyms';
            referencedColumns: ['id'];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          created_at: string;
          gym_id: string;
          id: string;
          membership_id: string | null;
          paid_at: string;
          payment_mode: string;
          plan: Database['public']['Enums']['membership_plan'] | null;
          status: Database['public']['Enums']['payment_status'];
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          gym_id: string;
          id?: string;
          membership_id?: string | null;
          paid_at?: string;
          payment_mode?: string;
          plan?: Database['public']['Enums']['membership_plan'] | null;
          status?: Database['public']['Enums']['payment_status'];
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          gym_id?: string;
          id?: string;
          membership_id?: string | null;
          paid_at?: string;
          payment_mode?: string;
          plan?: Database['public']['Enums']['membership_plan'] | null;
          status?: Database['public']['Enums']['payment_status'];
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          address_line1: string;
          address_line2: string;
          avatar_url: string | null;
          body_goal: string;
          city: string;
          created_at: string;
          date_of_birth: string | null;
          diet_preferences: Json;
          email: string;
          first_name: string;
          full_name: string;
          gender: string;
          last_name: string;
          onboarding_completed: boolean;
          phone: string;
          postal_code: string;
          role: Database['public']['Enums']['user_role'];
          state: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          address_line1?: string;
          address_line2?: string;
          avatar_url?: string | null;
          body_goal?: string;
          city?: string;
          created_at?: string;
          date_of_birth?: string | null;
          diet_preferences?: Json;
          email: string;
          first_name?: string;
          full_name?: string;
          gender?: string;
          last_name?: string;
          onboarding_completed?: boolean;
          phone?: string;
          postal_code?: string;
          role?: Database['public']['Enums']['user_role'];
          state?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          address_line1?: string;
          address_line2?: string;
          avatar_url?: string | null;
          body_goal?: string;
          city?: string;
          created_at?: string;
          date_of_birth?: string | null;
          diet_preferences?: Json;
          email?: string;
          first_name?: string;
          full_name?: string;
          gender?: string;
          last_name?: string;
          onboarding_completed?: boolean;
          phone?: string;
          postal_code?: string;
          role?: Database['public']['Enums']['user_role'];
          state?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      trainer_assignments: {
        Row: {
          assigned_at: string;
          gym_id: string;
          id: string;
          member_id: string;
          trainer_id: string;
        };
        Insert: {
          assigned_at?: string;
          gym_id: string;
          id?: string;
          member_id: string;
          trainer_id: string;
        };
        Update: {
          assigned_at?: string;
          gym_id?: string;
          id?: string;
          member_id?: string;
          trainer_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'trainer_assignments_gym_id_fkey';
            columns: ['gym_id'];
            isOneToOne: false;
            referencedRelation: 'gyms';
            referencedColumns: ['id'];
          },
        ];
      };
      user_streaks: {
        Row: {
          best_meal_log_streak: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          best_meal_log_streak?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          best_meal_log_streak?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      expire_memberships_if_needed: {
        Args: { p_user_id?: string };
        Returns: undefined;
      };
      generate_daily_attendance_code: {
        Args: { p_gym_id: string };
        Returns: string;
      };
      mark_attendance_by_code: {
        Args: { p_gym_id: string; p_code: string };
        Returns: Json;
      };
      self_check_in: {
        Args: { p_gym_id: string };
        Returns: Json;
      };
      current_user_role: {
        Args: Record<string, never>;
        Returns: Database['public']['Enums']['user_role'];
      };
      is_platform_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      owns_gym: {
        Args: { target_gym_id: string };
        Returns: boolean;
      };
      staff_of_gym: {
        Args: { target_gym_id: string };
        Returns: boolean;
      };
      member_of_gym: {
        Args: { target_gym_id: string };
        Returns: boolean;
      };
      trainer_assigned_to: {
        Args: { target_member_id: string };
        Returns: boolean;
      };
      lookup_gym_by_code: {
        Args: { p_code: string };
        Returns: {
          id: string;
          code: string;
          name: string;
          location: string;
        }[];
      };
      lookup_profile_by_email: {
        Args: { p_email: string };
        Returns: {
          user_id: string;
          email: string;
          first_name: string;
          last_name: string;
          full_name: string;
        }[];
      };
    };
    Enums: {
      friend_request_status: 'pending' | 'accepted' | 'rejected';
      gym_staff_role: 'owner' | 'trainer';
      join_request_status: 'pending' | 'approved' | 'rejected';
      membership_plan: '1_month' | '3_month' | '6_month' | '12_month';
      membership_status: 'pending' | 'active' | 'expired' | 'rejected' | 'cancelled';
      payment_status: 'not_paid' | 'paid' | 'refunded' | 'failed';
      user_role: 'platform_admin' | 'gym_owner' | 'trainer' | 'member';
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

export type MarkAttendanceResult = {
  already_marked: boolean;
  attendance_id?: string;
  member_id?: string;
  member_name?: string;
  expires_at?: string;
};

export type SelfCheckInResult = {
  already_marked: boolean;
  attendance_id?: string;
  expires_at?: string;
};
