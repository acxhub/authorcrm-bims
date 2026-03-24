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
          deleted_at: string | null
          deleted_by: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
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
      attendance_breaks: {
        Row: {
          id: string
          shift_id: string
          break_start_at: string
          break_end_at: string | null
          duration_seconds: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          shift_id: string
          break_start_at: string
          break_end_at?: string | null
          duration_seconds?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          shift_id?: string
          break_start_at?: string
          break_end_at?: string | null
          duration_seconds?: number | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_breaks_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "attendance_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_shifts: {
        Row: {
          id: string
          user_id: string
          clock_in_at: string
          clock_out_at: string | null
          status: Database["public"]["Enums"]["attendance_shift_status"]
          total_break_seconds: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          clock_in_at: string
          clock_out_at?: string | null
          status?: Database["public"]["Enums"]["attendance_shift_status"]
          total_break_seconds?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          clock_in_at?: string
          clock_out_at?: string | null
          status?: Database["public"]["Enums"]["attendance_shift_status"]
          total_break_seconds?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_shifts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_commission_settings: {
        Row: {
          id: string
          agent_id: string
          template_id: string | null
          custom_commission_percent: number | null
          custom_markup_percent: number | null
          use_custom_override: boolean | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          agent_id: string
          template_id?: string | null
          custom_commission_percent?: number | null
          custom_markup_percent?: number | null
          use_custom_override?: boolean | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          agent_id?: string
          template_id?: string | null
          custom_commission_percent?: number | null
          custom_markup_percent?: number | null
          use_custom_override?: boolean | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_commission_settings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_commission_settings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "commission_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          lead_id: string
          parent_comment_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          lead_id: string
          parent_comment_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
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
      commission_audit_log: {
        Row: {
          id: string
          commission_id: string
          action: string
          previous_values: Json | null
          new_values: Json | null
          performed_by: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          commission_id: string
          action: string
          previous_values?: Json | null
          new_values?: Json | null
          performed_by?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          commission_id?: string
          action?: string
          previous_values?: Json | null
          new_values?: Json | null
          performed_by?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_audit_log_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          calculation_type: string
          markup_commissionable_percent: number | null
          is_active: boolean | null
          is_default: boolean | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          calculation_type: string
          markup_commissionable_percent?: number | null
          is_active?: boolean | null
          is_default?: boolean | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          calculation_type?: string
          markup_commissionable_percent?: number | null
          is_active?: boolean | null
          is_default?: boolean | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_tiers: {
        Row: {
          id: string
          template_id: string
          min_amount: number
          max_amount: number | null
          commission_percent: number
          sort_order: number | null
          deleted_at: string | null
          deleted_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          template_id: string
          min_amount: number
          max_amount?: number | null
          commission_percent: number
          sort_order?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          template_id?: string
          min_amount?: number
          max_amount?: number | null
          commission_percent?: number
          sort_order?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_tiers_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "commission_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          id: string
          deal_id: string
          agent_id: string | null
          deal_value: number
          markup_amount: number | null
          base_commission_amount: number
          markup_commissionable_percent: number | null
          markup_commission_amount: number | null
          company_markup_amount: number | null
          total_commission_amount: number
          template_id: string | null
          template_name: string | null
          calculation_type: string | null
          tier_breakdown: Json | null
          is_overridden: boolean | null
          override_amount: number | null
          override_reason: string | null
          overridden_by: string | null
          overridden_at: string | null
          status: string | null
          approved_by: string | null
          approved_at: string | null
          rejection_reason: string | null
          paid_at: string | null
          commission_period: string | null
          period_type: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          deal_id: string
          agent_id?: string | null
          deal_value: number
          markup_amount?: number | null
          base_commission_amount: number
          markup_commissionable_percent?: number | null
          markup_commission_amount?: number | null
          company_markup_amount?: number | null
          total_commission_amount: number
          template_id?: string | null
          template_name?: string | null
          calculation_type?: string | null
          tier_breakdown?: Json | null
          is_overridden?: boolean | null
          override_amount?: number | null
          override_reason?: string | null
          overridden_by?: string | null
          overridden_at?: string | null
          status?: string | null
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          paid_at?: string | null
          commission_period?: string | null
          period_type?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          deal_id?: string
          agent_id?: string | null
          deal_value?: number
          markup_amount?: number | null
          base_commission_amount?: number
          markup_commissionable_percent?: number | null
          markup_commission_amount?: number | null
          company_markup_amount?: number | null
          total_commission_amount?: number
          template_id?: string | null
          template_name?: string | null
          calculation_type?: string | null
          tier_breakdown?: Json | null
          is_overridden?: boolean | null
          override_amount?: number | null
          override_reason?: string | null
          overridden_by?: string | null
          overridden_at?: string | null
          status?: string | null
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          paid_at?: string | null
          commission_period?: string | null
          period_type?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "commission_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_overridden_by_fkey"
            columns: ["overridden_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_revenue: {
        Row: {
          id: string
          deal_id: string
          commission_id: string | null
          revenue_type: string
          amount: number
          description: string | null
          revenue_period: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          deal_id: string
          commission_id?: string | null
          revenue_type: string
          amount: number
          description?: string | null
          revenue_period?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          deal_id?: string
          commission_id?: string | null
          revenue_type?: string
          amount?: number
          description?: string | null
          revenue_period?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_revenue_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_revenue_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "commissions"
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
          deleted_at: string | null
          deleted_by: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
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
          assigned_at: string | null
          assigned_to: string | null
          author_bio: string | null
          author_name: string
          book_title: string | null
          category: string | null
          country: string | null
          created_at: string | null
          created_by: string
          deal_value: number | null
          deleted_at: string | null
          deleted_by: string | null
          first_name: string | null
          id: string
          is_pinned: boolean
          last_name: string | null
          multiple_titles: boolean | null
          offer_title: string | null
          other_titles: Json | null
          pen_name: string | null
          phone_number_1: string | null
          phone_number_2: string | null
          pinned_at: string | null
          primary_email: string | null
          publisher: string | null
          recycled_at: string | null
          recycled_by: string | null
          previous_assignee: string | null
          secondary_email: string | null
          state: string | null
          status_id: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          amazon_link?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          author_bio?: string | null
          author_name: string
          book_title?: string | null
          category?: string | null
          country?: string | null
          created_at?: string | null
          created_by: string
          deal_value?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          first_name?: string | null
          id?: string
          is_pinned?: boolean
          last_name?: string | null
          multiple_titles?: boolean | null
          offer_title?: string | null
          other_titles?: Json | null
          pen_name?: string | null
          phone_number_1?: string | null
          phone_number_2?: string | null
          pinned_at?: string | null
          primary_email?: string | null
          publisher?: string | null
          recycled_at?: string | null
          recycled_by?: string | null
          previous_assignee?: string | null
          secondary_email?: string | null
          state?: string | null
          status_id: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          amazon_link?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          author_bio?: string | null
          author_name?: string
          book_title?: string | null
          category?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string
          deal_value?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          first_name?: string | null
          id?: string
          is_pinned?: boolean
          last_name?: string | null
          multiple_titles?: boolean | null
          offer_title?: string | null
          other_titles?: Json | null
          pen_name?: string | null
          phone_number_1?: string | null
          phone_number_2?: string | null
          pinned_at?: string | null
          primary_email?: string | null
          publisher?: string | null
          recycled_at?: string | null
          recycled_by?: string | null
          previous_assignee?: string | null
          secondary_email?: string | null
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
          {
            foreignKeyName: "leads_recycled_by_fkey"
            columns: ["recycled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_previous_assignee_fkey"
            columns: ["previous_assignee"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          can_delete_leads: boolean | null
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
          can_delete_leads?: boolean | null
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
          can_delete_leads?: boolean | null
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
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_active: boolean | null
          name: string
          order_index: number
          updated_at: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_index: number
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
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
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tag_type: string
          updated_at: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tag_type?: string
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tag_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      reminders: {
        Row: {
          id: string
          user_id: string
          lead_id: string | null
          title: string
          notes: string | null
          is_completed: boolean
          completed_at: string | null
          due_date: string | null
          priority: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          lead_id?: string | null
          title: string
          notes?: string | null
          is_completed?: boolean
          completed_at?: string | null
          due_date?: string | null
          priority?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          lead_id?: string | null
          title?: string
          notes?: string | null
          is_completed?: boolean
          completed_at?: string | null
          due_date?: string | null
          priority?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_with_author_name"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          recipient_id: string
          actor_id: string | null
          type: string
          title: string
          message: string
          entity_type: string | null
          entity_id: string | null
          metadata: Json | null
          is_read: boolean | null
          read_at: string | null
          created_at: string | null
          group_key: string | null
        }
        Insert: {
          id?: string
          recipient_id: string
          actor_id?: string | null
          type: string
          title: string
          message: string
          entity_type?: string | null
          entity_id?: string | null
          metadata?: Json | null
          is_read?: boolean | null
          read_at?: string | null
          created_at?: string | null
          group_key?: string | null
        }
        Update: {
          id?: string
          recipient_id?: string
          actor_id?: string | null
          type?: string
          title?: string
          message?: string
          entity_type?: string | null
          entity_id?: string | null
          metadata?: Json | null
          is_read?: boolean | null
          read_at?: string | null
          created_at?: string | null
          group_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          pen_name: string | null
          phone_number_1: string | null
          phone_number_2: string | null
          primary_email: string | null
          publisher: string | null
          secondary_email: string | null
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
          pen_name?: string | null
          phone_number_1?: string | null
          phone_number_2?: string | null
          primary_email?: string | null
          publisher?: string | null
          secondary_email?: string | null
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
          pen_name?: string | null
          phone_number_1?: string | null
          phone_number_2?: string | null
          primary_email?: string | null
          publisher?: string | null
          secondary_email?: string | null
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
      attendance_clock_in: {
        Args: { p_at?: string }
        Returns: string
      }
      attendance_clock_out: {
        Args: { p_shift_id: string; p_at?: string }
        Returns: undefined
      }
      attendance_start_break: {
        Args: { p_shift_id: string; p_at?: string }
        Returns: string
      }
      attendance_end_break: {
        Args: { p_break_id: string; p_at?: string }
        Returns: undefined
      }
      archive_lead_cascade: {
        Args: { p_lead_id: string; p_deleted_by: string }
        Returns: undefined
      }
      get_author_name: {
        Args: { first_name: string; last_name: string }
        Returns: string
      }
      restore_lead_cascade: {
        Args: { p_lead_id: string }
        Returns: undefined
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
      attendance_shift_status: "active" | "on_break" | "clocked_out"
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
      attendance_shift_status: ["active", "on_break", "clocked_out"],
      user_role: ["leads_manager", "sales_manager", "sales"],
    },
  },
} as const
