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
    PostgrestVersion: "12.2.3 (519615d)"
  }
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
            foreignKeyName: "activity_logs_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
      agent_commission_settings: {
        Row: {
          agent_id: string | null
          created_at: string | null
          custom_commission_percent: number | null
          custom_markup_percent: number | null
          id: string
          notes: string | null
          template_id: string | null
          updated_at: string | null
          use_custom_override: boolean | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          custom_commission_percent?: number | null
          custom_markup_percent?: number | null
          id?: string
          notes?: string | null
          template_id?: string | null
          updated_at?: string | null
          use_custom_override?: boolean | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          custom_commission_percent?: number | null
          custom_markup_percent?: number | null
          id?: string
          notes?: string | null
          template_id?: string | null
          updated_at?: string | null
          use_custom_override?: boolean | null
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
            foreignKeyName: "comments_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
          action: string
          commission_id: string | null
          created_at: string | null
          id: string
          new_values: Json | null
          notes: string | null
          performed_by: string | null
          previous_values: Json | null
        }
        Insert: {
          action: string
          commission_id?: string | null
          created_at?: string | null
          id?: string
          new_values?: Json | null
          notes?: string | null
          performed_by?: string | null
          previous_values?: Json | null
        }
        Update: {
          action?: string
          commission_id?: string | null
          created_at?: string | null
          id?: string
          new_values?: Json | null
          notes?: string | null
          performed_by?: string | null
          previous_values?: Json | null
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
          calculation_type: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          markup_commissionable_percent: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          calculation_type: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          markup_commissionable_percent?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          calculation_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          markup_commissionable_percent?: number | null
          name?: string
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
          commission_percent: number
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          max_amount: number | null
          min_amount: number
          sort_order: number | null
          template_id: string | null
        }
        Insert: {
          commission_percent: number
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          max_amount?: number | null
          min_amount: number
          sort_order?: number | null
          template_id?: string | null
        }
        Update: {
          commission_percent?: number
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          max_amount?: number | null
          min_amount?: number
          sort_order?: number | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_tiers_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
          agent_id: string | null
          approved_at: string | null
          approved_by: string | null
          base_commission_amount: number
          calculation_type: string | null
          commission_period: string | null
          company_markup_amount: number | null
          created_at: string | null
          deal_id: string | null
          deal_value: number
          id: string
          is_overridden: boolean | null
          markup_amount: number | null
          markup_commission_amount: number | null
          markup_commissionable_percent: number | null
          overridden_at: string | null
          overridden_by: string | null
          override_amount: number | null
          override_reason: string | null
          paid_at: string | null
          period_type: string | null
          rejection_reason: string | null
          status: string | null
          template_id: string | null
          template_name: string | null
          tier_breakdown: Json | null
          total_commission_amount: number
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          base_commission_amount: number
          calculation_type?: string | null
          commission_period?: string | null
          company_markup_amount?: number | null
          created_at?: string | null
          deal_id?: string | null
          deal_value: number
          id?: string
          is_overridden?: boolean | null
          markup_amount?: number | null
          markup_commission_amount?: number | null
          markup_commissionable_percent?: number | null
          overridden_at?: string | null
          overridden_by?: string | null
          override_amount?: number | null
          override_reason?: string | null
          paid_at?: string | null
          period_type?: string | null
          rejection_reason?: string | null
          status?: string | null
          template_id?: string | null
          template_name?: string | null
          tier_breakdown?: Json | null
          total_commission_amount: number
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          base_commission_amount?: number
          calculation_type?: string | null
          commission_period?: string | null
          company_markup_amount?: number | null
          created_at?: string | null
          deal_id?: string | null
          deal_value?: number
          id?: string
          is_overridden?: boolean | null
          markup_amount?: number | null
          markup_commission_amount?: number | null
          markup_commissionable_percent?: number | null
          overridden_at?: string | null
          overridden_by?: string | null
          override_amount?: number | null
          override_reason?: string | null
          paid_at?: string | null
          period_type?: string | null
          rejection_reason?: string | null
          status?: string | null
          template_id?: string | null
          template_name?: string | null
          tier_breakdown?: Json | null
          total_commission_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_agent_id_fkey"
            columns: ["agent_id"]
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
          {
            foreignKeyName: "commissions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
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
            foreignKeyName: "commissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "commission_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      company_revenue: {
        Row: {
          amount: number
          commission_id: string | null
          created_at: string | null
          deal_id: string | null
          description: string | null
          id: string
          revenue_period: string | null
          revenue_type: string
        }
        Insert: {
          amount: number
          commission_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          description?: string | null
          id?: string
          revenue_period?: string | null
          revenue_type: string
        }
        Update: {
          amount?: number
          commission_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          description?: string | null
          id?: string
          revenue_period?: string | null
          revenue_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_revenue_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_revenue_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
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
            foreignKeyName: "deals_deleted_by_fkey"
            columns: ["deleted_by"]
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
          alternative_email: string | null
          alternative_phone_number: string | null
          amazon_link: string | null
          assigned_at: string | null
          assigned_to: string | null
          author_bio: string | null
          author_name: string
          book_title: string
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
          lead_record_type: string
          multiple_titles: boolean | null
          offer_title: string | null
          other_titles: Json | null
          pen_name: string | null
          phone_number_1: string | null
          phone_number_2: string | null
          pinned_at: string | null
          previous_assignee: string | null
          primary_email: string | null
          publisher: string | null
          recycled_at: string | null
          recycled_by: string | null
          secondary_email: string | null
          state: string | null
          status_id: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          alternative_email?: string | null
          alternative_phone_number?: string | null
          amazon_link?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          author_bio?: string | null
          author_name: string
          book_title: string
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
          lead_record_type?: string
          multiple_titles?: boolean | null
          offer_title?: string | null
          other_titles?: Json | null
          pen_name?: string | null
          phone_number_1?: string | null
          phone_number_2?: string | null
          pinned_at?: string | null
          previous_assignee?: string | null
          primary_email?: string | null
          publisher?: string | null
          recycled_at?: string | null
          recycled_by?: string | null
          secondary_email?: string | null
          state?: string | null
          status_id: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          alternative_email?: string | null
          alternative_phone_number?: string | null
          amazon_link?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          author_bio?: string | null
          author_name?: string
          book_title?: string
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
          lead_record_type?: string
          multiple_titles?: boolean | null
          offer_title?: string | null
          other_titles?: Json | null
          pen_name?: string | null
          phone_number_1?: string | null
          phone_number_2?: string | null
          pinned_at?: string | null
          previous_assignee?: string | null
          primary_email?: string | null
          publisher?: string | null
          recycled_at?: string | null
          recycled_by?: string | null
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
            foreignKeyName: "leads_deleted_by_fkey"
            columns: ["deleted_by"]
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
          {
            foreignKeyName: "leads_recycled_by_fkey"
            columns: ["recycled_by"]
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
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          group_key: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          read_at: string | null
          recipient_id: string
          title: string
          type: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          group_key?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          read_at?: string | null
          recipient_id: string
          title: string
          type: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          group_key?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          read_at?: string | null
          recipient_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
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
      reminders: {
        Row: {
          completed_at: string | null
          created_at: string | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          lead_id: string | null
          notes: string | null
          priority: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          lead_id?: string | null
          notes?: string | null
          priority?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          lead_id?: string | null
          notes?: string | null
          priority?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
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
          {
            foreignKeyName: "reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "statuses_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "tags_deleted_by_fkey"
            columns: ["deleted_by"]
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
          assigned_at: string | null
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
          deleted_at: string | null
          deleted_by: string | null
          first_name: string | null
          id: string | null
          is_pinned: boolean | null
          last_name: string | null
          lead_record_type: string | null
          multiple_titles: boolean | null
          offer_title: string | null
          other_titles: Json | null
          phone_number_1: string | null
          phone_number_2: string | null
          pinned_at: string | null
          previous_assignee: string | null
          primary_email: string | null
          publisher: string | null
          recycled_at: string | null
          recycled_by: string | null
          secondary_email: string | null
          state: string | null
          status_id: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          amazon_link?: string | null
          assigned_at?: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
          first_name?: string | null
          id?: string | null
          is_pinned?: boolean | null
          last_name?: string | null
          lead_record_type?: string | null
          multiple_titles?: boolean | null
          offer_title?: string | null
          other_titles?: Json | null
          phone_number_1?: string | null
          phone_number_2?: string | null
          pinned_at?: string | null
          previous_assignee?: string | null
          primary_email?: string | null
          publisher?: string | null
          recycled_at?: string | null
          recycled_by?: string | null
          secondary_email?: string | null
          state?: string | null
          status_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          amazon_link?: string | null
          assigned_at?: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
          first_name?: string | null
          id?: string | null
          is_pinned?: boolean | null
          last_name?: string | null
          lead_record_type?: string | null
          multiple_titles?: boolean | null
          offer_title?: string | null
          other_titles?: Json | null
          phone_number_1?: string | null
          phone_number_2?: string | null
          pinned_at?: string | null
          previous_assignee?: string | null
          primary_email?: string | null
          publisher?: string | null
          recycled_at?: string | null
          recycled_by?: string | null
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
            foreignKeyName: "leads_deleted_by_fkey"
            columns: ["deleted_by"]
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
          {
            foreignKeyName: "leads_recycled_by_fkey"
            columns: ["recycled_by"]
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
      archive_lead_cascade: {
        Args: { p_deleted_by: string; p_lead_id: string }
        Returns: undefined
      }
      bulk_recycle_leads: { Args: { lead_ids: string[] }; Returns: undefined }
      cleanup_old_notifications: { Args: never; Returns: undefined }
      get_agent_lead_counts: { Args: never; Returns: Json }
      get_author_name: {
        Args: { first_name: string; last_name: string }
        Returns: string
      }
      get_filtered_lead_ids:
        | {
            Args: {
              p_assigned_to?: string
              p_assignment_status?: string
              p_created_by?: string
              p_date_from?: string
              p_date_to?: string
              p_include_archived?: boolean
              p_limit?: number
              p_no_tags?: boolean
              p_page?: number
              p_search?: string
              p_status_ids?: string[]
              p_tag_ids?: string[]
              p_untouched?: boolean
            }
            Returns: Json
          }
        | {
            Args: {
              p_assigned_to?: string
              p_assignment_status?: string
              p_created_by?: string
              p_date_from?: string
              p_date_to?: string
              p_in_pipeline?: boolean
              p_include_archived?: boolean
              p_limit?: number
              p_no_tags?: boolean
              p_page?: number
              p_search?: string
              p_status_ids?: string[]
              p_tag_ids?: string[]
              p_untouched?: boolean
            }
            Returns: Json
          }
      get_lead_manager_agent_workloads: { Args: never; Returns: Json }
      get_lead_manager_counts: {
        Args: { p_stale_days?: number }
        Returns: Json
      }
      get_lead_manager_leads: {
        Args: {
          p_agent_id?: string
          p_filter_type: string
          p_limit?: number
          p_page?: number
          p_stale_days?: number
          p_tag_id?: string
        }
        Returns: Json
      }
      get_leads_quick_stats: { Args: never; Returns: Json }
      get_status_distribution: { Args: never; Returns: Json }
      get_tag_distribution: { Args: never; Returns: Json }
      recycle_lead: { Args: { lead_ids: string[] }; Returns: undefined }
      restore_lead_cascade: { Args: { p_lead_id: string }; Returns: undefined }
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
