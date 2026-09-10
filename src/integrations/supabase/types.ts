export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      booking_services: {
        Row: {
          booking_id: string;
          created_at: string;
          duration_minutes: number;
          id: string;
          price_cents: number;
          service_id: string;
        };
        Insert: {
          booking_id: string;
          created_at?: string;
          duration_minutes: number;
          id?: string;
          price_cents: number;
          service_id: string;
        };
        Update: {
          booking_id?: string;
          created_at?: string;
          duration_minutes?: number;
          id?: string;
          price_cents?: number;
          service_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_services_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_services_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          created_at: string;
          customer_email: string;
          customer_id: string | null;
          customer_name: string;
          customer_phone: string | null;
          duration_minutes: number;
          id: string;
          location_id: string | null;
          notes: string | null;
          service_id: string | null;
          staff_id: string | null;
          starts_at: string;
          status: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          customer_email: string;
          customer_id?: string | null;
          customer_name: string;
          customer_phone?: string | null;
          duration_minutes?: number;
          id?: string;
          location_id?: string | null;
          notes?: string | null;
          service_id?: string | null;
          staff_id?: string | null;
          starts_at: string;
          status?: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          customer_email?: string;
          customer_id?: string | null;
          customer_name?: string;
          customer_phone?: string | null;
          duration_minutes?: number;
          id?: string;
          location_id?: string | null;
          notes?: string | null;
          service_id?: string | null;
          staff_id?: string | null;
          starts_at?: string;
          status?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      catalog_audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          actor_name: string | null;
          changes: Json;
          created_at: string;
          entity_id: string | null;
          entity_label: string | null;
          entity_type: string;
          id: string;
          tenant_id: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          actor_name?: string | null;
          changes?: Json;
          created_at?: string;
          entity_id?: string | null;
          entity_label?: string | null;
          entity_type: string;
          id?: string;
          tenant_id: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          actor_name?: string | null;
          changes?: Json;
          created_at?: string;
          entity_id?: string | null;
          entity_label?: string | null;
          entity_type?: string;
          id?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_audit_log_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      closures: {
        Row: {
          created_at: string;
          end_date: string;
          id: string;
          location_id: string | null;
          notes: string | null;
          reason: string;
          start_date: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          end_date: string;
          id?: string;
          location_id?: string | null;
          notes?: string | null;
          reason: string;
          start_date: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          end_date?: string;
          id?: string;
          location_id?: string | null;
          notes?: string | null;
          reason?: string;
          start_date?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "closures_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "closures_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_notes: {
        Row: {
          author_id: string | null;
          author_name: string | null;
          body: string;
          created_at: string;
          customer_id: string;
          id: string;
          tenant_id: string;
        };
        Insert: {
          author_id?: string | null;
          author_name?: string | null;
          body: string;
          created_at?: string;
          customer_id: string;
          id?: string;
          tenant_id: string;
        };
        Update: {
          author_id?: string | null;
          author_name?: string | null;
          body?: string;
          created_at?: string;
          customer_id?: string;
          id?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_notes_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_notes_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          birth_date: string | null;
          consent_updated_at: string | null;
          created_at: string;
          email: string | null;
          full_name: string;
          id: string;
          marketing_consent: boolean;
          notes: string | null;
          phone: string | null;
          privacy_consent: boolean;
          tags: string[];
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          birth_date?: string | null;
          consent_updated_at?: string | null;
          created_at?: string;
          email?: string | null;
          full_name: string;
          id?: string;
          marketing_consent?: boolean;
          notes?: string | null;
          phone?: string | null;
          privacy_consent?: boolean;
          tags?: string[];
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          birth_date?: string | null;
          consent_updated_at?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string;
          id?: string;
          marketing_consent?: boolean;
          notes?: string | null;
          phone?: string | null;
          privacy_consent?: boolean;
          tags?: string[];
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      faqs: {
        Row: {
          answer: string;
          id: string;
          is_active: boolean;
          question: string;
          sort_order: number;
          tenant_id: string;
        };
        Insert: {
          answer: string;
          id?: string;
          is_active?: boolean;
          question: string;
          sort_order?: number;
          tenant_id: string;
        };
        Update: {
          answer?: string;
          id?: string;
          is_active?: boolean;
          question?: string;
          sort_order?: number;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "faqs_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      location_hours: {
        Row: {
          created_at: string;
          end_time: string;
          id: string;
          location_id: string;
          start_time: string;
          tenant_id: string;
          updated_at: string;
          weekday: number;
        };
        Insert: {
          created_at?: string;
          end_time: string;
          id?: string;
          location_id: string;
          start_time: string;
          tenant_id: string;
          updated_at?: string;
          weekday: number;
        };
        Update: {
          created_at?: string;
          end_time?: string;
          id?: string;
          location_id?: string;
          start_time?: string;
          tenant_id?: string;
          updated_at?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "location_hours_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "location_hours_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      locations: {
        Row: {
          address: string | null;
          city: string | null;
          created_at: string;
          email: string | null;
          id: string;
          is_active: boolean;
          name: string;
          opening_hours: Json;
          phone: string | null;
          postal_code: string | null;
          sort_order: number;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          city?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          opening_hours?: Json;
          phone?: string | null;
          postal_code?: string | null;
          sort_order?: number;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          city?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          opening_hours?: Json;
          phone?: string | null;
          postal_code?: string | null;
          sort_order?: number;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "locations_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: {
        Row: {
          body: string | null;
          cover_url: string | null;
          created_at: string;
          excerpt: string | null;
          id: string;
          is_published: boolean;
          published_at: string | null;
          slug: string;
          tenant_id: string;
          title: string;
        };
        Insert: {
          body?: string | null;
          cover_url?: string | null;
          created_at?: string;
          excerpt?: string | null;
          id?: string;
          is_published?: boolean;
          published_at?: string | null;
          slug: string;
          tenant_id: string;
          title: string;
        };
        Update: {
          body?: string | null;
          cover_url?: string | null;
          created_at?: string;
          excerpt?: string | null;
          id?: string;
          is_published?: boolean;
          published_at?: string | null;
          slug?: string;
          tenant_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posts_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          author_name: string;
          body: string;
          created_at: string;
          id: string;
          is_published: boolean;
          rating: number;
          source: string | null;
          tenant_id: string;
        };
        Insert: {
          author_name: string;
          body: string;
          created_at?: string;
          id?: string;
          is_published?: boolean;
          rating?: number;
          source?: string | null;
          tenant_id: string;
        };
        Update: {
          author_name?: string;
          body?: string;
          created_at?: string;
          id?: string;
          is_published?: boolean;
          rating?: number;
          source?: string | null;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      service_availability: {
        Row: {
          created_at: string;
          end_time: string;
          id: string;
          is_active: boolean;
          service_id: string;
          start_time: string;
          tenant_id: string;
          updated_at: string;
          weekday: number;
        };
        Insert: {
          created_at?: string;
          end_time?: string;
          id?: string;
          is_active?: boolean;
          service_id: string;
          start_time?: string;
          tenant_id: string;
          updated_at?: string;
          weekday: number;
        };
        Update: {
          created_at?: string;
          end_time?: string;
          id?: string;
          is_active?: boolean;
          service_id?: string;
          start_time?: string;
          tenant_id?: string;
          updated_at?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "service_availability_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_availability_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      service_categories: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          sort_order: number;
          tenant_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          sort_order?: number;
          tenant_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          sort_order?: number;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_categories_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      service_staff: {
        Row: {
          created_at: string;
          id: string;
          service_id: string;
          staff_id: string;
          tenant_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          service_id: string;
          staff_id: string;
          tenant_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          service_id?: string;
          staff_id?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_staff_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_staff_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_staff_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      services: {
        Row: {
          category_id: string | null;
          created_at: string;
          description: string | null;
          duration_minutes: number;
          id: string;
          image_url: string | null;
          is_active: boolean;
          is_bookable: boolean;
          is_featured: boolean;
          name: string;
          price_cents: number;
          slug: string;
          sort_order: number;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          duration_minutes?: number;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          is_bookable?: boolean;
          is_featured?: boolean;
          name: string;
          price_cents?: number;
          slug: string;
          sort_order?: number;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          duration_minutes?: number;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          is_bookable?: boolean;
          is_featured?: boolean;
          name?: string;
          price_cents?: number;
          slug?: string;
          sort_order?: number;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "service_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "services_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      site_sections: {
        Row: {
          content: Json;
          id: string;
          is_visible: boolean;
          key: string;
          sort_order: number;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          content?: Json;
          id?: string;
          is_visible?: boolean;
          key: string;
          sort_order?: number;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          content?: Json;
          id?: string;
          is_visible?: boolean;
          key?: string;
          sort_order?: number;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "site_sections_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_absences: {
        Row: {
          created_at: string;
          end_date: string;
          end_time: string | null;
          id: string;
          reason: string | null;
          staff_id: string;
          start_date: string;
          start_time: string | null;
          tenant_id: string;
          type: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          end_date: string;
          end_time?: string | null;
          id?: string;
          reason?: string | null;
          staff_id: string;
          start_date: string;
          start_time?: string | null;
          tenant_id: string;
          type?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          end_date?: string;
          end_time?: string | null;
          id?: string;
          reason?: string | null;
          staff_id?: string;
          start_date?: string;
          start_time?: string | null;
          tenant_id?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_absences_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_absences_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      staff: {
        Row: {
          bio: string | null;
          created_at: string;
          full_name: string;
          id: string;
          is_active: boolean;
          location_id: string | null;
          photo_url: string | null;
          role_title: string | null;
          sort_order: number;
          specialties: string[];
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          bio?: string | null;
          created_at?: string;
          full_name: string;
          id?: string;
          is_active?: boolean;
          location_id?: string | null;
          photo_url?: string | null;
          role_title?: string | null;
          sort_order?: number;
          specialties?: string[];
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          bio?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          is_active?: boolean;
          location_id?: string | null;
          photo_url?: string | null;
          role_title?: string | null;
          sort_order?: number;
          specialties?: string[];
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      tenant_users: {
        Row: {
          created_at: string;
          full_name: string | null;
          id: string;
          is_active: boolean;
          role: Database["public"]["Enums"]["app_role"];
          staff_id: string | null;
          tenant_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          full_name?: string | null;
          id?: string;
          is_active?: boolean;
          role?: Database["public"]["Enums"]["app_role"];
          staff_id?: string | null;
          tenant_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          id?: string;
          is_active?: boolean;
          role?: Database["public"]["Enums"]["app_role"];
          staff_id?: string | null;
          tenant_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_users_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tenant_users_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      tenants: {
        Row: {
          created_at: string;
          domain: string | null;
          id: string;
          is_active: boolean;
          logo_url: string | null;
          modules: Json;
          name: string;
          seo: Json;
          slug: string;
          social: Json;
          tagline: string | null;
          theme: Json;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          domain?: string | null;
          id?: string;
          is_active?: boolean;
          logo_url?: string | null;
          modules?: Json;
          name: string;
          seo?: Json;
          slug: string;
          social?: Json;
          tagline?: string | null;
          theme?: Json;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          domain?: string | null;
          id?: string;
          is_active?: boolean;
          logo_url?: string | null;
          modules?: Json;
          name?: string;
          seo?: Json;
          slug?: string;
          social?: Json;
          tagline?: string | null;
          theme?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_tenant_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _tenant_id: string;
        };
        Returns: boolean;
      };
      is_tenant_member: { Args: { _tenant_id: string }; Returns: boolean };
      request_booking: {
        Args: {
          _customer_email: string;
          _customer_name: string;
          _customer_phone?: string;
          _location_id: string;
          _notes?: string;
          _service_ids: string[];
          _staff_id: string;
          _starts_at: string;
          _tenant_slug: string;
        };
        Returns: string;
      };
    };
    Enums: {
      app_role: "owner" | "manager" | "staff";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "manager", "staff"],
    },
  },
} as const;
