export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activity_logs: {
        Row: {
          activity_date: string | null
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at: string | null
          id: string
          lead_id: string
          outcome: string | null
          summary: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_date?: string | null
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at?: string | null
          id?: string
          lead_id: string
          outcome?: string | null
          summary: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_date?: string | null
          activity_type?: Database["public"]["Enums"]["activity_type"]
          created_at?: string | null
          id?: string
          lead_id?: string
          outcome?: string | null
          summary?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_with_author_name"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          lead_id: string
          parent_comment_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          lead_id: string
          parent_comment_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          lead_id?: string
          parent_comment_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_with_author_name"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string | null
          created_by: string
          deal_value: number | null
          id: string
          lead_id: string
          notes: string | null
          offer_title: string
          status_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          created_by: string
          deal_value?: number | null
          id?: string
          lead_id: string
          notes?: string | null
          offer_title: string
          status_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string
          deal_value?: number | null
          id?: string
          lead_id?: string
          notes?: string | null
          offer_title?: string
          status_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_with_author_name"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tags: {
        Row: {
          created_at: string | null
          lead_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          lead_id: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          lead_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_with_author_name"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          amazon_link: string | null
          assigned_to: string | null
          author_bio: string | null
          author_name: string
          book_title: string
          category: string | null
          country: string | null
          created_at: string | null
          created_by: string
          deal_value: number | null
          first_name: string | null
          id: string
          last_name: string | null
          multiple_titles: boolean | null
          offer_title: string | null
          other_titles: Json | null
          phone_number_1: string | null
          phone_number_2: string | null
          primary_email: string | null
          publisher: string | null
          secondary_email: string | null
          source: string | null
          state: string | null
          status_id: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          amazon_link?: string | null
          assigned_to?: string | null
          author_bio?: string | null
          author_name: string
          book_title: string
          category?: string | null
          country?: string | null
          created_at?: string | null
          created_by: string
          deal_value?: number | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          multiple_titles?: boolean | null
          offer_title?: string | null
          other_titles?: Json | null
          phone_number_1?: string | null
          phone_number_2?: string | null
          primary_email?: string | null
          publisher?: string | null
          secondary_email?: string | null
          source?: string | null
          state?: string | null
          status_id: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          amazon_link?: string | null
          assigned_to?: string | null
          author_bio?: string | null
          author_name?: string
          book_title?: string
          category?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string
          deal_value?: number | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          multiple_titles?: boolean | null
          offer_title?: string | null
          other_titles?: Json | null
          phone_number_1?: string | null
          phone_number_2?: string | null
          primary_email?: string | null
          publisher?: string | null
          secondary_email?: string | null
          source?: string | null
          state?: string | null
          status_id?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      statuses: {
        Row: {
          color: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          order_index: number
          updated_at: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_index: number
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_index?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      leads_with_author_name: {
        Row: {
          amazon_link: string | null
          assigned_to: string | null
          author_bio: string | null
          author_name: string | null
          book_title: string | null
          category: string | null
          computed_author_name: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          deal_value: number | null
          first_name: string | null
          id: string | null
          last_name: string | null
          multiple_titles: boolean | null
          offer_title: string | null
          other_titles: Json | null
          phone_number_1: string | null
          phone_number_2: string | null
          primary_email: string | null
          publisher: string | null
          secondary_email: string | null
          source: string | null
          state: string | null
          status_id: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          amazon_link?: string | null
          assigned_to?: string | null
          author_bio?: string | null
          author_name?: string | null
          book_title?: string | null
          category?: string | null
          computed_author_name?: never
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_value?: number | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          multiple_titles?: boolean | null
          offer_title?: string | null
          other_titles?: Json | null
          phone_number_1?: string | null
          phone_number_2?: string | null
          primary_email?: string | null
          publisher?: string | null
          secondary_email?: string | null
          source?: string | null
          state?: string | null
          status_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          amazon_link?: string | null
          assigned_to?: string | null
          author_bio?: string | null
          author_name?: string | null
          book_title?: string | null
          category?: string | null
          computed_author_name?: never
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_value?: number | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          multiple_titles?: boolean | null
          offer_title?: string | null
          other_titles?: Json | null
          phone_number_1?: string | null
          phone_number_2?: string | null
          primary_email?: string | null
          publisher?: string | null
          secondary_email?: string | null
          source?: string | null
          state?: string | null
          status_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "statuses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_author_name: {
        Args: { first_name: string; last_name: string }
        Returns: string
      }
    }
    Enums: {
      activity_type:
        | "call"
        | "email"
        | "meeting"
        | "note"
        | "status_change"
        | "assignment"
      user_role: "leads_manager" | "sales_manager" | "sales"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activity_type: [
        "call",
        "email",
        "meeting",
        "note",
        "status_change",
        "assignment",
      ],
      user_role: ["leads_manager", "sales_manager", "sales"],
    },
  },
} as const
