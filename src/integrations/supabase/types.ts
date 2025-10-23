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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          initial_balance: number | null
          is_active: boolean | null
          last4: string | null
          name: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          initial_balance?: number | null
          is_active?: boolean | null
          last4?: string | null
          name: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          initial_balance?: number | null
          is_active?: boolean | null
          last4?: string | null
          name?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          after_data: Json | null
          before_data: Json | null
          created_at: string | null
          entity: string
          entity_id: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string | null
          entity: string
          entity_id: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string | null
          entity?: string
          entity_id?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string
          created_at: string | null
          icon: string
          id: string
          is_default: boolean | null
          name: string
          user_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          icon?: string
          id?: string
          is_default?: boolean | null
          name: string
          user_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          icon?: string
          id?: string
          is_default?: boolean | null
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      category_goals: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          limit_amount: number
          month: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          limit_amount: number
          month: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          limit_amount?: number
          month?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_goals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      educational_content: {
        Row: {
          category: string
          content: string
          created_at: string
          description: string
          id: string
          level: string
          reading_time: number | null
          title: string
          type: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          description: string
          id?: string
          level: string
          reading_time?: number | null
          title: string
          type: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          description?: string
          id?: string
          level?: string
          reading_time?: number | null
          title?: string
          type?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string | null
          date: string
          id: string
          merchant: string | null
          notes: string | null
          payment_method: string | null
          receipt_url: string | null
          source: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string | null
          date?: string
          id?: string
          merchant?: string | null
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          source?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string | null
          date?: string
          id?: string
          merchant?: string | null
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          source?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_health_scores: {
        Row: {
          budget_adherence_score: number
          consistency_score: number
          created_at: string
          id: string
          month: string
          quiz_performance_score: number
          savings_score: number
          score: number
          user_id: string
        }
        Insert: {
          budget_adherence_score?: number
          consistency_score?: number
          created_at?: string
          id?: string
          month: string
          quiz_performance_score?: number
          savings_score?: number
          score: number
          user_id: string
        }
        Update: {
          budget_adherence_score?: number
          consistency_score?: number
          created_at?: string
          id?: string
          month?: string
          quiz_performance_score?: number
          savings_score?: number
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      monthly_goals: {
        Row: {
          created_at: string | null
          id: string
          month: string
          total_limit: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          month: string
          total_limit: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          month?: string
          total_limit?: number
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json
          read: boolean
          ref_month: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          read?: boolean
          ref_month?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          read?: boolean
          ref_month?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          billing_cycle_day: number | null
          created_at: string | null
          id: string
          monthly_goal: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          billing_cycle_day?: number | null
          created_at?: string | null
          id: string
          monthly_goal?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          billing_cycle_day?: number | null
          created_at?: string | null
          id?: string
          monthly_goal?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          category: string
          correct_answer: string
          created_at: string
          difficulty: string
          explanation: string
          id: string
          options: Json
          points: number
          question: string
        }
        Insert: {
          category: string
          correct_answer: string
          created_at?: string
          difficulty: string
          explanation: string
          id?: string
          options: Json
          points?: number
          question: string
        }
        Update: {
          category?: string
          correct_answer?: string
          created_at?: string
          difficulty?: string
          explanation?: string
          id?: string
          options?: Json
          points?: number
          question?: string
        }
        Relationships: []
      }
      quiz_responses: {
        Row: {
          completed_at: string
          id: string
          is_correct: boolean
          points_earned: number
          question_id: string
          user_answer: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          is_correct: boolean
          points_earned?: number
          question_id: string
          user_answer: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          is_correct?: boolean
          points_earned?: number
          question_id?: string
          user_answer?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_content_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          content_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          content_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          content_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_content_progress_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "educational_content"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_financial_health_score: {
        Args: { p_month: string; p_user_id: string }
        Returns: {
          budget_score: number
          consistency_score: number
          quiz_score: number
          savings_score: number
          total_score: number
        }[]
      }
      create_audit_log: {
        Args: {
          p_action: string
          p_after_data?: Json
          p_before_data?: Json
          p_entity: string
          p_entity_id: string
        }
        Returns: undefined
      }
      get_billing_period: {
        Args: { p_reference_date: string; p_user_id: string }
        Returns: {
          end_date: string
          start_date: string
        }[]
      }
      sum_expenses_in_month: {
        Args: { p_month: string; p_user_id: string }
        Returns: {
          sum: number
        }[]
      }
      upsert_monthly_goals: {
        Args: { p_limit: number; p_months: string[]; p_user_id: string }
        Returns: undefined
      }
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
  public: {
    Enums: {},
  },
} as const
