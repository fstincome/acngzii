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
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          quantity?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          id: string
          order_code: string
          payment_method: string | null
          payment_status: string
          status: string
          table_number: number
          total_amount: number
          visitor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_code: string
          payment_method?: string | null
          payment_status?: string
          status?: string
          table_number?: number
          total_amount?: number
          visitor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_code?: string
          payment_method?: string | null
          payment_status?: string
          status?: string
          table_number?: number
          total_amount?: number
          visitor_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          cost_price: number
          created_at: string
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          price: number
          stock: number
        }
        Insert: {
          category?: string
          cost_price?: number
          created_at?: string
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          price?: number
          stock?: number
        }
        Update: {
          category?: string
          cost_price?: number
          created_at?: string
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          price?: number
          stock?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          department: string | null
          email: string | null
          emergency_contact: string | null
          full_name: string
          hire_date: string | null
          id: string
          job_title: string | null
          national_id: string | null
          phone: string | null
          photo: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          emergency_contact?: string | null
          full_name?: string
          hire_date?: string | null
          id: string
          job_title?: string | null
          national_id?: string | null
          phone?: string | null
          photo?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          emergency_contact?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          job_title?: string | null
          national_id?: string | null
          phone?: string | null
          photo?: string | null
        }
        Relationships: []
      }
      program_attendance: {
        Row: {
          created_at: string
          id: string
          marked_at: string | null
          participant_id: string
          room: string | null
          session_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          marked_at?: string | null
          participant_id: string
          room?: string | null
          session_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          marked_at?: string | null
          participant_id?: string
          room?: string | null
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_attendance_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "program_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "program_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      program_participants: {
        Row: {
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string
          gender: string | null
          id: string
          institution: string | null
          neighborhood: string | null
          occupation: string | null
          participant_code: string
          phone: string | null
          photo: string | null
          program_id: string
          role: string
          sub_program_id: string | null
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          gender?: string | null
          id?: string
          institution?: string | null
          neighborhood?: string | null
          occupation?: string | null
          participant_code: string
          phone?: string | null
          photo?: string | null
          program_id: string
          role?: string
          sub_program_id?: string | null
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          institution?: string | null
          neighborhood?: string | null
          occupation?: string | null
          participant_code?: string
          phone?: string | null
          photo?: string | null
          program_id?: string
          role?: string
          sub_program_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_participants_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_participants_sub_program_id_fkey"
            columns: ["sub_program_id"]
            isOneToOne: false
            referencedRelation: "sub_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_sessions: {
        Row: {
          created_at: string
          id: string
          program_id: string
          session_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          program_id: string
          session_date: string
        }
        Update: {
          created_at?: string
          id?: string
          program_id?: string
          session_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_tasks: {
        Row: {
          created_at: string
          deadline: string | null
          expected_result: string
          id: string
          participant_id: string
          program_id: string
          reporting_instructions: string | null
          status: string
          submission_link: string | null
          submitted_at: string | null
          title: string
          updated_at: string
          validated_at: string | null
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          expected_result: string
          id?: string
          participant_id: string
          program_id: string
          reporting_instructions?: string | null
          status?: string
          submission_link?: string | null
          submitted_at?: string | null
          title: string
          updated_at?: string
          validated_at?: string | null
        }
        Update: {
          created_at?: string
          deadline?: string | null
          expected_result?: string
          id?: string
          participant_id?: string
          program_id?: string
          reporting_instructions?: string | null
          status?: string
          submission_link?: string | null
          submitted_at?: string | null
          title?: string
          updated_at?: string
          validated_at?: string | null
        }
        Relationships: []
      }
      programs: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          logo_url: string | null
          name: string
          start_date: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          logo_url?: string | null
          name: string
          start_date?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          start_date?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_update: boolean
          can_view: boolean
          created_at: string
          id: string
          module: Database["public"]["Enums"]["app_module"]
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_update?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module: Database["public"]["Enums"]["app_module"]
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_update?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module?: Database["public"]["Enums"]["app_module"]
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      scholarship_applications: {
        Row: {
          age: number | null
          created_at: string
          engagement_signed: boolean | null
          expected_results: string[] | null
          form_number: string | null
          id: string
          nb_days_per_week: number | null
          participant_id: string
          performance_indicators: string[] | null
          presence_days: string[] | null
          project_domain: string | null
          project_title: string | null
          project_tools: string | null
          sharing_link: string | null
          signature: string | null
          specific_objectives: string[] | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          age?: number | null
          created_at?: string
          engagement_signed?: boolean | null
          expected_results?: string[] | null
          form_number?: string | null
          id?: string
          nb_days_per_week?: number | null
          participant_id: string
          performance_indicators?: string[] | null
          presence_days?: string[] | null
          project_domain?: string | null
          project_title?: string | null
          project_tools?: string | null
          sharing_link?: string | null
          signature?: string | null
          specific_objectives?: string[] | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          age?: number | null
          created_at?: string
          engagement_signed?: boolean | null
          expected_results?: string[] | null
          form_number?: string | null
          id?: string
          nb_days_per_week?: number | null
          participant_id?: string
          performance_indicators?: string[] | null
          presence_days?: string[] | null
          project_domain?: string | null
          project_title?: string | null
          project_tools?: string | null
          sharing_link?: string | null
          signature?: string | null
          specific_objectives?: string[] | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sub_programs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          program_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          program_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_programs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_update: boolean
          can_view: boolean
          created_at: string
          id: string
          module: Database["public"]["Enums"]["app_module"]
          updated_at: string
          user_id: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_update?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module: Database["public"]["Enums"]["app_module"]
          updated_at?: string
          user_id: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_update?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module?: Database["public"]["Enums"]["app_module"]
          updated_at?: string
          user_id?: string
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visitors: {
        Row: {
          age_group: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string
          gender: string
          id: string
          institution: string | null
          member_type: Database["public"]["Enums"]["member_type"]
          membership_end_date: string | null
          membership_start_date: string | null
          membership_status: Database["public"]["Enums"]["membership_status"]
          neighborhood: string
          occupation: string
          phone: string
          photo: string | null
          registration_date: string
          visitor_id: string
        }
        Insert: {
          age_group?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          gender: string
          id?: string
          institution?: string | null
          member_type?: Database["public"]["Enums"]["member_type"]
          membership_end_date?: string | null
          membership_start_date?: string | null
          membership_status?: Database["public"]["Enums"]["membership_status"]
          neighborhood: string
          occupation: string
          phone: string
          photo?: string | null
          registration_date?: string
          visitor_id: string
        }
        Update: {
          age_group?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          gender?: string
          id?: string
          institution?: string | null
          member_type?: Database["public"]["Enums"]["member_type"]
          membership_end_date?: string | null
          membership_start_date?: string | null
          membership_status?: Database["public"]["Enums"]["membership_status"]
          neighborhood?: string
          occupation?: string
          phone?: string
          photo?: string | null
          registration_date?: string
          visitor_id?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          action: string
          created_at: string
          expected_checkout: string | null
          id: string
          room: string
          timestamp: string
          visitor_id: string
        }
        Insert: {
          action: string
          created_at?: string
          expected_checkout?: string | null
          id?: string
          room: string
          timestamp?: string
          visitor_id: string
        }
        Update: {
          action?: string
          created_at?: string
          expected_checkout?: string | null
          id?: string
          room?: string
          timestamp?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
            referencedColumns: ["visitor_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: { Args: { _user_id: string }; Returns: string }
      has_permission: {
        Args: {
          _action: string
          _module: Database["public"]["Enums"]["app_module"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_module: "visitors" | "programs" | "statistics" | "scanner"
      app_role:
        | "admin"
        | "american_center"
        | "american_corner_gitega"
        | "coordinator"
        | "program_manager"
        | "public_relations"
      member_type:
        | "student"
        | "professional"
        | "entrepreneur"
        | "visitor"
        | "volunteer"
        | "member"
      membership_status: "active" | "inactive" | "pending"
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
      app_module: ["visitors", "programs", "statistics", "scanner"],
      app_role: [
        "admin",
        "american_center",
        "american_corner_gitega",
        "coordinator",
        "program_manager",
        "public_relations",
      ],
      member_type: [
        "student",
        "professional",
        "entrepreneur",
        "visitor",
        "volunteer",
        "member",
      ],
      membership_status: ["active", "inactive", "pending"],
    },
  },
} as const
