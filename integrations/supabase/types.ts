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
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string
          doctor_id: string
          ends_at: string
          id: string
          patient_id: string
          patient_note: string | null
          reminder_sent: boolean
          service_id: string
          staff_note: string | null
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          ends_at: string
          id?: string
          patient_id: string
          patient_note?: string | null
          reminder_sent?: boolean
          service_id: string
          staff_note?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          ends_at?: string
          id?: string
          patient_id?: string
          patient_note?: string | null
          reminder_sent?: boolean
          service_id?: string
          staff_note?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_slots: {
        Row: {
          created_at: string
          doctor_id: string
          ends_at: string
          id: string
          reason: string
          recurrence: string
          recurrence_count: number
          recurrence_group_id: string | null
          starts_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          ends_at: string
          id?: string
          reason?: string
          recurrence?: string
          recurrence_count?: number
          recurrence_group_id?: string | null
          starts_at: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          ends_at?: string
          id?: string
          reason?: string
          recurrence?: string
          recurrence_count?: number
          recurrence_group_id?: string | null
          starts_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_slots_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_slots_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          blocked_slot_id: string
          created_at: string
          doctor_id: string | null
          id: string
          new_ends_at: string | null
          new_reason: string | null
          new_starts_at: string | null
          old_ends_at: string | null
          old_reason: string | null
          old_starts_at: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          blocked_slot_id: string
          created_at?: string
          doctor_id?: string | null
          id?: string
          new_ends_at?: string | null
          new_reason?: string | null
          new_starts_at?: string | null
          old_ends_at?: string | null
          old_reason?: string | null
          old_starts_at?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          blocked_slot_id?: string
          created_at?: string
          doctor_id?: string | null
          id?: string
          new_ends_at?: string | null
          new_reason?: string | null
          new_starts_at?: string | null
          old_ends_at?: string | null
          old_reason?: string | null
          old_starts_at?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          handled: boolean
          id: string
          message: string
          name: string
          phone: string | null
          privacy_consent: boolean
        }
        Insert: {
          created_at?: string
          email: string
          handled?: boolean
          id?: string
          message: string
          name: string
          phone?: string | null
          privacy_consent?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          handled?: boolean
          id?: string
          message?: string
          name?: string
          phone?: string | null
          privacy_consent?: boolean
        }
        Relationships: []
      }
      doctor_availability: {
        Row: {
          created_at: string
          doctor_id: string
          end_time: string
          id: string
          start_time: string
          updated_at: string
          weekday: number
        }
        Insert: {
          created_at?: string
          doctor_id: string
          end_time: string
          id?: string
          start_time: string
          updated_at?: string
          weekday: number
        }
        Update: {
          created_at?: string
          doctor_id?: string
          end_time?: string
          id?: string
          start_time?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "doctor_availability_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          active: boolean
          bio: string
          color: string
          created_at: string
          full_name: string
          id: string
          photo_url: string | null
          specialization: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          bio?: string
          color?: string
          created_at?: string
          full_name: string
          id?: string
          photo_url?: string | null
          specialization: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          bio?: string
          color?: string
          created_at?: string
          full_name?: string
          id?: string
          photo_url?: string | null
          specialization?: string
          user_id?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          issued_on: string
          kind: string
          patient_id: string
          title: string
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          issued_on?: string
          kind?: string
          patient_id: string
          title: string
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          issued_on?: string
          kind?: string
          patient_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          appointment_id: string | null
          body: string
          created_at: string
          id: string
          patient_id: string
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          appointment_id?: string | null
          body: string
          created_at?: string
          id?: string
          patient_id: string
          read_at?: string | null
          title: string
          type?: string
        }
        Update: {
          appointment_id?: string | null
          body?: string
          created_at?: string
          id?: string
          patient_id?: string
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          body: string
          category: string
          excerpt: string
          id: string
          published: boolean
          published_at: string
          read_minutes: number
          slug: string
          title: string
        }
        Insert: {
          body: string
          category?: string
          excerpt: string
          id?: string
          published?: boolean
          published_at?: string
          read_minutes?: number
          slug: string
          title: string
        }
        Update: {
          body?: string
          category?: string
          excerpt?: string
          id?: string
          published?: boolean
          published_at?: string
          read_minutes?: number
          slug?: string
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          allergies: string[]
          birth_date: string | null
          conditions: string[]
          created_at: string
          email: string | null
          full_name: string
          id: string
          marketing_consent: boolean
          notes: string | null
          notify_whatsapp: boolean
          notify_in_app: boolean
          notify_sms: boolean
          onboarded: boolean
          phone: string | null
          privacy_consent: boolean
          updated_at: string
          user_id: string | null
        }
        Insert: {
          allergies?: string[]
          birth_date?: string | null
          conditions?: string[]
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          marketing_consent?: boolean
          notes?: string | null
          notify_whatsapp?: boolean
          notify_in_app?: boolean
          notify_sms?: boolean
          onboarded?: boolean
          phone?: string | null
          privacy_consent?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          allergies?: string[]
          birth_date?: string | null
          conditions?: string[]
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          marketing_consent?: boolean
          notes?: string | null
          notify_whatsapp?: boolean
          notify_in_app?: boolean
          notify_sms?: boolean
          onboarded?: boolean
          phone?: string | null
          privacy_consent?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      role_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          target_user_id?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          duration_min: number
          faq: Json
          icon: string
          id: string
          long_description: string
          name: string
          price_cents: number
          published: boolean
          short_description: string
          slug: string
          sort_order: number
          updated_at: string
          what_to_expect: string
        }
        Insert: {
          created_at?: string
          duration_min?: number
          faq?: Json
          icon?: string
          id?: string
          long_description?: string
          name: string
          price_cents?: number
          published?: boolean
          short_description: string
          slug: string
          sort_order?: number
          updated_at?: string
          what_to_expect?: string
        }
        Update: {
          created_at?: string
          duration_min?: number
          faq?: Json
          icon?: string
          id?: string
          long_description?: string
          name?: string
          price_cents?: number
          published?: boolean
          short_description?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          what_to_expect?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          author: string
          created_at: string
          id: string
          published: boolean
          quote: string
          rating: number
          role: string | null
        }
        Insert: {
          author: string
          created_at?: string
          id?: string
          published?: boolean
          quote: string
          rating?: number
          role?: string | null
        }
        Update: {
          author?: string
          created_at?: string
          id?: string
          published?: boolean
          quote?: string
          rating?: number
          role?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      get_busy_slots: {
        Args: { _doctor_id: string; _from: string; _to: string }
        Returns: {
          doctor_id: string
          ends_at: string
          starts_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "doctor" | "receptionist" | "patient"
      appointment_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
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
  public: {
    Enums: {
      app_role: ["admin", "doctor", "receptionist", "patient"],
      appointment_status: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
    },
  },
} as const
