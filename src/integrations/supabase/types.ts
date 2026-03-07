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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_packages: {
        Row: {
          country_code: string
          created_at: string
          description: string | null
          duration_days: number
          id: string
          is_active: boolean
          name: string
          price_xaf: number
          priority_boost: number
          type: string
          updated_at: string
        }
        Insert: {
          country_code?: string
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          name: string
          price_xaf: number
          priority_boost?: number
          type: string
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          name?: string
          price_xaf?: number
          priority_boost?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      cities: {
        Row: {
          country: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          region: string | null
        }
        Insert: {
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          region?: string | null
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          region?: string | null
        }
        Relationships: []
      }
      commission_rules: {
        Row: {
          commission_percent: number
          country_code: string
          created_at: string
          id: string
          is_active: boolean
          max_amount: number | null
          min_amount: number
          monthly_cap_xaf: number | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
        }
        Insert: {
          commission_percent: number
          country_code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number
          monthly_cap_xaf?: number | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
        }
        Update: {
          commission_percent?: number
          country_code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number
          monthly_cap_xaf?: number | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          owner_id: string
          property_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          owner_id: string
          property_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          owner_id?: string
          property_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_transactions: {
        Row: {
          amount_xaf: number
          auto_release_at: string | null
          client_id: string
          commission_rate: number
          commission_xaf: number
          created_at: string
          dispute_reason: string | null
          funded_at: string | null
          id: string
          net_amount_xaf: number
          payment_method:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          payment_reference: string | null
          provider_id: string
          quote_id: string
          refunded_at: string | null
          released_at: string | null
          request_id: string
          status: Database["public"]["Enums"]["escrow_status"]
          updated_at: string
        }
        Insert: {
          amount_xaf: number
          auto_release_at?: string | null
          client_id: string
          commission_rate: number
          commission_xaf?: number
          created_at?: string
          dispute_reason?: string | null
          funded_at?: string | null
          id?: string
          net_amount_xaf: number
          payment_method?:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          payment_reference?: string | null
          provider_id: string
          quote_id: string
          refunded_at?: string | null
          released_at?: string | null
          request_id: string
          status?: Database["public"]["Enums"]["escrow_status"]
          updated_at?: string
        }
        Update: {
          amount_xaf?: number
          auto_release_at?: string | null
          client_id?: string
          commission_rate?: number
          commission_xaf?: number
          created_at?: string
          dispute_reason?: string | null
          funded_at?: string | null
          id?: string
          net_amount_xaf?: number
          payment_method?:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          payment_reference?: string | null
          provider_id?: string
          quote_id?: string
          refunded_at?: string | null
          released_at?: string | null
          request_id?: string
          status?: Database["public"]["Enums"]["escrow_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_transactions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "service_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_transactions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      followers: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      imm_comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "imm_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "imm_post_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_post_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          likes_count: number
          parent_id: string | null
          post_id: string
          status: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          likes_count?: number
          parent_id?: string | null
          post_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          likes_count?: number
          parent_id?: string | null
          post_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "imm_post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "imm_post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "imm_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "imm_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "imm_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_post_reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          post_id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          post_id: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          post_id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "imm_post_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "imm_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_post_saves: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "imm_post_saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "imm_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_post_shares: {
        Row: {
          created_at: string
          id: string
          platform: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "imm_post_shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "imm_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_posts: {
        Row: {
          ai_score: number
          author_id: string
          author_type: string
          background_style: string | null
          category: string
          city: string | null
          comments_count: number
          content: string
          created_at: string
          font_style: string | null
          id: string
          is_pinned: boolean
          is_pro_post: boolean
          is_sponsored: boolean
          is_story: boolean | null
          likes_count: number
          link_url: string | null
          media_urls: string[] | null
          neighborhood: string | null
          post_type: string
          provider_id: string | null
          reports_count: number
          saves_count: number
          shares_count: number
          status: string
          story_expires_at: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          ai_score?: number
          author_id: string
          author_type?: string
          background_style?: string | null
          category?: string
          city?: string | null
          comments_count?: number
          content: string
          created_at?: string
          font_style?: string | null
          id?: string
          is_pinned?: boolean
          is_pro_post?: boolean
          is_sponsored?: boolean
          is_story?: boolean | null
          likes_count?: number
          link_url?: string | null
          media_urls?: string[] | null
          neighborhood?: string | null
          post_type?: string
          provider_id?: string | null
          reports_count?: number
          saves_count?: number
          shares_count?: number
          status?: string
          story_expires_at?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          ai_score?: number
          author_id?: string
          author_type?: string
          background_style?: string | null
          category?: string
          city?: string | null
          comments_count?: number
          content?: string
          created_at?: string
          font_style?: string | null
          id?: string
          is_pinned?: boolean
          is_pro_post?: boolean
          is_sponsored?: boolean
          is_story?: boolean | null
          likes_count?: number
          link_url?: string | null
          media_urls?: string[] | null
          neighborhood?: string | null
          post_type?: string
          provider_id?: string | null
          reports_count?: number
          saves_count?: number
          shares_count?: number
          status?: string
          story_expires_at?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imm_posts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_payment_summary"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "imm_posts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_pro_accounts: {
        Row: {
          company_name: string | null
          created_at: string
          id: string
          is_premium: boolean
          is_verified: boolean
          license_number: string | null
          monthly_post_limit: number
          posts_this_month: number
          premium_expires_at: string | null
          pro_type: string
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          id?: string
          is_premium?: boolean
          is_verified?: boolean
          license_number?: string | null
          monthly_post_limit?: number
          posts_this_month?: number
          premium_expires_at?: string | null
          pro_type: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string
          id?: string
          is_premium?: boolean
          is_verified?: boolean
          license_number?: string | null
          monthly_post_limit?: number
          posts_this_month?: number
          premium_expires_at?: string | null
          pro_type?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean | null
          media_metadata: Json | null
          media_url: string | null
          message_type: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          media_metadata?: Json | null
          media_url?: string | null
          message_type?: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          media_metadata?: Json | null
          media_url?: string | null
          message_type?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_alerts: {
        Row: {
          alert_type: string
          created_at: string
          description: string
          id: string
          is_resolved: boolean | null
          metadata: Json | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          target_content_id: string | null
          target_content_type: string | null
          target_user_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string
          description: string
          id?: string
          is_resolved?: boolean | null
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          target_content_id?: string | null
          target_content_type?: string | null
          target_user_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          description?: string
          id?: string
          is_resolved?: boolean | null
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          target_content_id?: string | null
          target_content_type?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      moderation_logs: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string
          id: string
          metadata: Json | null
          notes: string | null
          reason: string
          target_content_id: string | null
          target_content_type: string | null
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          reason: string
          target_content_id?: string | null
          target_content_type?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          reason?: string
          target_content_id?: string | null
          target_content_type?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      notification_history: {
        Row: {
          channel: string
          content: string | null
          id: string
          is_read: boolean | null
          metadata: Json | null
          notification_type: string
          read_at: string | null
          sent_at: string
          title: string
          user_id: string
        }
        Insert: {
          channel: string
          content?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          notification_type: string
          read_at?: string | null
          sent_at?: string
          title: string
          user_id: string
        }
        Update: {
          channel?: string
          content?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          notification_type?: string
          read_at?: string | null
          sent_at?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          digest_frequency: string | null
          email_marketing: boolean | null
          email_new_inquiry: boolean | null
          email_new_message: boolean | null
          email_property_views: boolean | null
          email_recommendations: boolean | null
          email_weekly_digest: boolean | null
          id: string
          push_account: boolean | null
          push_high_views: boolean | null
          push_listing: boolean | null
          push_marketing: boolean | null
          push_new_inquiry: boolean | null
          push_new_message: boolean | null
          push_new_property: boolean | null
          push_new_review: boolean | null
          push_price_drop: boolean | null
          push_property_views: boolean | null
          push_recommendations: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sms_new_inquiry: boolean | null
          sms_new_message: boolean | null
          sms_urgent_only: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          digest_frequency?: string | null
          email_marketing?: boolean | null
          email_new_inquiry?: boolean | null
          email_new_message?: boolean | null
          email_property_views?: boolean | null
          email_recommendations?: boolean | null
          email_weekly_digest?: boolean | null
          id?: string
          push_account?: boolean | null
          push_high_views?: boolean | null
          push_listing?: boolean | null
          push_marketing?: boolean | null
          push_new_inquiry?: boolean | null
          push_new_message?: boolean | null
          push_new_property?: boolean | null
          push_new_review?: boolean | null
          push_price_drop?: boolean | null
          push_property_views?: boolean | null
          push_recommendations?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_new_inquiry?: boolean | null
          sms_new_message?: boolean | null
          sms_urgent_only?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          digest_frequency?: string | null
          email_marketing?: boolean | null
          email_new_inquiry?: boolean | null
          email_new_message?: boolean | null
          email_property_views?: boolean | null
          email_recommendations?: boolean | null
          email_weekly_digest?: boolean | null
          id?: string
          push_account?: boolean | null
          push_high_views?: boolean | null
          push_listing?: boolean | null
          push_marketing?: boolean | null
          push_new_inquiry?: boolean | null
          push_new_message?: boolean | null
          push_new_property?: boolean | null
          push_new_review?: boolean | null
          push_price_drop?: boolean | null
          push_property_views?: boolean | null
          push_recommendations?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_new_inquiry?: boolean | null
          sms_new_message?: boolean | null
          sms_urgent_only?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_status: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      payment_history: {
        Row: {
          amount_xaf: number
          created_at: string
          id: string
          metadata: Json | null
          payment_method: string | null
          payment_reference: string | null
          payment_type: string
          status: string
          target_id: string | null
          user_id: string
        }
        Insert: {
          amount_xaf: number
          created_at?: string
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_type: string
          status?: string
          target_id?: string | null
          user_id: string
        }
        Update: {
          amount_xaf?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_type?: string
          status?: string
          target_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      platform_wallet: {
        Row: {
          amount_xaf: number
          created_at: string
          description: string | null
          id: string
          source_id: string | null
          transaction_type: string
        }
        Insert: {
          amount_xaf: number
          created_at?: string
          description?: string | null
          id?: string
          source_id?: string | null
          transaction_type: string
        }
        Update: {
          amount_xaf?: number
          created_at?: string
          description?: string | null
          id?: string
          source_id?: string | null
          transaction_type?: string
        }
        Relationships: []
      }
      pro_plans: {
        Row: {
          ai_priority_boost: number
          boost_discount_percent: number
          country_code: string
          created_at: string
          features: Json
          id: string
          is_active: boolean
          max_publications_per_month: number
          name: string
          plan_type: string
          price_xaf: number
        }
        Insert: {
          ai_priority_boost?: number
          boost_discount_percent?: number
          country_code?: string
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          max_publications_per_month?: number
          name: string
          plan_type: string
          price_xaf: number
        }
        Update: {
          ai_priority_boost?: number
          boost_discount_percent?: number
          country_code?: string
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          max_publications_per_month?: number
          name?: string
          plan_type?: string
          price_xaf?: number
        }
        Relationships: []
      }
      pro_subscriptions: {
        Row: {
          auto_renew: boolean
          created_at: string
          current_month_transactions: number | null
          ends_at: string
          id: string
          is_active: boolean
          monthly_transaction_cap: number | null
          payment_reference: string | null
          plan_type: string
          price_xaf: number
          starts_at: string
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean
          created_at?: string
          current_month_transactions?: number | null
          ends_at: string
          id?: string
          is_active?: boolean
          monthly_transaction_cap?: number | null
          payment_reference?: string | null
          plan_type: string
          price_xaf: number
          starts_at?: string
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renew?: boolean
          created_at?: string
          current_month_transactions?: number | null
          ends_at?: string
          id?: string
          is_active?: boolean
          monthly_transaction_cap?: number | null
          payment_reference?: string | null
          plan_type?: string
          price_xaf?: number
          starts_at?: string
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          budget_max: number | null
          budget_min: number | null
          city: string | null
          created_at: string | null
          email_verified: boolean | null
          followers_count: number | null
          following_count: number | null
          full_name: string | null
          id: string
          is_service_provider_only: boolean | null
          is_verified: boolean | null
          language: string | null
          move_in_timeline: string | null
          phone: string | null
          phone_verified: boolean | null
          posts_count: number | null
          preferred_amenities: string[] | null
          preferred_listing_types: string[] | null
          preferred_neighborhoods: string[] | null
          preferred_property_types: string[] | null
          updated_at: string | null
          user_id: string
          user_type: Database["public"]["Enums"]["user_type"] | null
          whatsapp_number: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          budget_max?: number | null
          budget_min?: number | null
          city?: string | null
          created_at?: string | null
          email_verified?: boolean | null
          followers_count?: number | null
          following_count?: number | null
          full_name?: string | null
          id?: string
          is_service_provider_only?: boolean | null
          is_verified?: boolean | null
          language?: string | null
          move_in_timeline?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          posts_count?: number | null
          preferred_amenities?: string[] | null
          preferred_listing_types?: string[] | null
          preferred_neighborhoods?: string[] | null
          preferred_property_types?: string[] | null
          updated_at?: string | null
          user_id: string
          user_type?: Database["public"]["Enums"]["user_type"] | null
          whatsapp_number?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          budget_max?: number | null
          budget_min?: number | null
          city?: string | null
          created_at?: string | null
          email_verified?: boolean | null
          followers_count?: number | null
          following_count?: number | null
          full_name?: string | null
          id?: string
          is_service_provider_only?: boolean | null
          is_verified?: boolean | null
          language?: string | null
          move_in_timeline?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          posts_count?: number | null
          preferred_amenities?: string[] | null
          preferred_listing_types?: string[] | null
          preferred_neighborhoods?: string[] | null
          preferred_property_types?: string[] | null
          updated_at?: string | null
          user_id?: string
          user_type?: Database["public"]["Enums"]["user_type"] | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          amenities: string[] | null
          area: number | null
          available_from: string | null
          available_to: string | null
          bathrooms: number | null
          bedrooms: number | null
          city: string
          comments_count: number | null
          created_at: string | null
          deposit: number | null
          description: string | null
          floor_number: number | null
          has_title_deed: boolean | null
          id: string
          images: string[] | null
          is_available: boolean | null
          is_negotiable: boolean | null
          is_published: boolean | null
          is_verified: boolean | null
          land_area: number | null
          latitude: number | null
          likes_count: number | null
          listing_type: Database["public"]["Enums"]["listing_type"]
          longitude: number | null
          min_stay_days: number | null
          neighborhood: string | null
          num_floors: number | null
          num_units: number | null
          owner_id: string
          price: number
          price_unit: string
          property_type: Database["public"]["Enums"]["property_type"]
          recommendations_count: number | null
          rental_months: number | null
          rules: string[] | null
          shares_count: number | null
          title: string
          total_floors: number | null
          updated_at: string | null
          view_count: number | null
          visit_price: number | null
          whatsapp_enabled: boolean | null
          year_built: number | null
        }
        Insert: {
          address?: string | null
          amenities?: string[] | null
          area?: number | null
          available_from?: string | null
          available_to?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city: string
          comments_count?: number | null
          created_at?: string | null
          deposit?: number | null
          description?: string | null
          floor_number?: number | null
          has_title_deed?: boolean | null
          id?: string
          images?: string[] | null
          is_available?: boolean | null
          is_negotiable?: boolean | null
          is_published?: boolean | null
          is_verified?: boolean | null
          land_area?: number | null
          latitude?: number | null
          likes_count?: number | null
          listing_type?: Database["public"]["Enums"]["listing_type"]
          longitude?: number | null
          min_stay_days?: number | null
          neighborhood?: string | null
          num_floors?: number | null
          num_units?: number | null
          owner_id: string
          price: number
          price_unit?: string
          property_type?: Database["public"]["Enums"]["property_type"]
          recommendations_count?: number | null
          rental_months?: number | null
          rules?: string[] | null
          shares_count?: number | null
          title: string
          total_floors?: number | null
          updated_at?: string | null
          view_count?: number | null
          visit_price?: number | null
          whatsapp_enabled?: boolean | null
          year_built?: number | null
        }
        Update: {
          address?: string | null
          amenities?: string[] | null
          area?: number | null
          available_from?: string | null
          available_to?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string
          comments_count?: number | null
          created_at?: string | null
          deposit?: number | null
          description?: string | null
          floor_number?: number | null
          has_title_deed?: boolean | null
          id?: string
          images?: string[] | null
          is_available?: boolean | null
          is_negotiable?: boolean | null
          is_published?: boolean | null
          is_verified?: boolean | null
          land_area?: number | null
          latitude?: number | null
          likes_count?: number | null
          listing_type?: Database["public"]["Enums"]["listing_type"]
          longitude?: number | null
          min_stay_days?: number | null
          neighborhood?: string | null
          num_floors?: number | null
          num_units?: number | null
          owner_id?: string
          price?: number
          price_unit?: string
          property_type?: Database["public"]["Enums"]["property_type"]
          recommendations_count?: number | null
          rental_months?: number | null
          rules?: string[] | null
          shares_count?: number | null
          title?: string
          total_floors?: number | null
          updated_at?: string | null
          view_count?: number | null
          visit_price?: number | null
          whatsapp_enabled?: boolean | null
          year_built?: number | null
        }
        Relationships: []
      }
      property_favorites: {
        Row: {
          created_at: string | null
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_inquiries: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          move_in_date: string | null
          property_id: string
          sender_email: string
          sender_id: string | null
          sender_name: string
          sender_phone: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          move_in_date?: string | null
          property_id: string
          sender_email: string
          sender_id?: string | null
          sender_name: string
          sender_phone?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          move_in_date?: string | null
          property_id?: string
          sender_email?: string
          sender_id?: string | null
          sender_name?: string
          sender_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_inquiries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_likes: {
        Row: {
          created_at: string
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_likes_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_recommendations: {
        Row: {
          created_at: string
          id: string
          message: string | null
          property_id: string
          recommended_to_email: string | null
          recommended_to_user_id: string | null
          recommender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          property_id: string
          recommended_to_email?: string | null
          recommended_to_user_id?: string | null
          recommender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          property_id?: string
          recommended_to_email?: string | null
          recommended_to_user_id?: string | null
          recommender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_recommendations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          property_id: string
          rating: number
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          property_id: string
          rating: number
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          property_id?: string
          rating?: number
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_reviews_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_shares: {
        Row: {
          created_at: string
          id: string
          platform: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_shares_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_verifications: {
        Row: {
          address_verified: boolean | null
          created_at: string
          duplicate_images_found: boolean | null
          field_visit_agent: string | null
          field_visit_date: string | null
          has_field_visit: boolean | null
          has_gps_location: boolean | null
          has_original_photos: boolean | null
          has_utility_bill: boolean | null
          has_video: boolean | null
          id: string
          property_id: string
          status: Database["public"]["Enums"]["verification_status"] | null
          updated_at: string
          user_id: string
          verification_report: Json | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          address_verified?: boolean | null
          created_at?: string
          duplicate_images_found?: boolean | null
          field_visit_agent?: string | null
          field_visit_date?: string | null
          has_field_visit?: boolean | null
          has_gps_location?: boolean | null
          has_original_photos?: boolean | null
          has_utility_bill?: boolean | null
          has_video?: boolean | null
          id?: string
          property_id: string
          status?: Database["public"]["Enums"]["verification_status"] | null
          updated_at?: string
          user_id: string
          verification_report?: Json | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          address_verified?: boolean | null
          created_at?: string
          duplicate_images_found?: boolean | null
          field_visit_agent?: string | null
          field_visit_date?: string | null
          has_field_visit?: boolean | null
          has_gps_location?: boolean | null
          has_original_photos?: boolean | null
          has_utility_bill?: boolean | null
          has_video?: boolean | null
          id?: string
          property_id?: string
          status?: Database["public"]["Enums"]["verification_status"] | null
          updated_at?: string
          user_id?: string
          verification_report?: Json | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_verifications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_views: {
        Row: {
          id: string
          property_id: string
          session_id: string | null
          source: string | null
          user_id: string | null
          view_duration_seconds: number | null
          viewed_at: string
        }
        Insert: {
          id?: string
          property_id: string
          session_id?: string | null
          source?: string | null
          user_id?: string | null
          view_duration_seconds?: number | null
          viewed_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          session_id?: string | null
          source?: string | null
          user_id?: string | null
          view_duration_seconds?: number | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_views_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_payouts: {
        Row: {
          amount_xaf: number
          completed_at: string | null
          created_at: string
          escrow_id: string
          id: string
          payout_method:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          payout_reference: string | null
          provider_id: string
          status: string
        }
        Insert: {
          amount_xaf: number
          completed_at?: string | null
          created_at?: string
          escrow_id: string
          id?: string
          payout_method?:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          payout_reference?: string | null
          provider_id: string
          status?: string
        }
        Update: {
          amount_xaf?: number
          completed_at?: string | null
          created_at?: string
          escrow_id?: string
          id?: string
          payout_method?:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          payout_reference?: string | null
          provider_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_payouts_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrow_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_portfolio: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          media_type: string
          media_url: string
          project_category: string | null
          provider_id: string
          title: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          media_type?: string
          media_url: string
          project_category?: string | null
          provider_id: string
          title?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          media_type?: string
          media_url?: string
          project_category?: string | null
          provider_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_portfolio_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_payment_summary"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "provider_portfolio_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      reputation_badges: {
        Row: {
          badge_level: number
          badge_type: string
          earned_at: string
          id: string
          points_at_award: number
          user_id: string
        }
        Insert: {
          badge_level?: number
          badge_type: string
          earned_at?: string
          id?: string
          points_at_award?: number
          user_id: string
        }
        Update: {
          badge_level?: number
          badge_type?: string
          earned_at?: string
          id?: string
          points_at_award?: number
          user_id?: string
        }
        Relationships: []
      }
      reputation_stats: {
        Row: {
          badges_count: number
          created_at: string
          current_cycle_points: number
          downvotes_received: number
          id: string
          last_badge_at: string | null
          total_points: number
          updated_at: string
          upvotes_received: number
          user_id: string
        }
        Insert: {
          badges_count?: number
          created_at?: string
          current_cycle_points?: number
          downvotes_received?: number
          id?: string
          last_badge_at?: string | null
          total_points?: number
          updated_at?: string
          upvotes_received?: number
          user_id: string
        }
        Update: {
          badges_count?: number
          created_at?: string
          current_cycle_points?: number
          downvotes_received?: number
          id?: string
          last_badge_at?: string | null
          total_points?: number
          updated_at?: string
          upvotes_received?: number
          user_id?: string
        }
        Relationships: []
      }
      reputation_votes: {
        Row: {
          context: string | null
          context_id: string | null
          created_at: string
          id: string
          target_user_id: string
          vote_type: string
          voter_id: string
        }
        Insert: {
          context?: string | null
          context_id?: string | null
          created_at?: string
          id?: string
          target_user_id: string
          vote_type: string
          voter_id: string
        }
        Update: {
          context?: string | null
          context_id?: string | null
          created_at?: string
          id?: string
          target_user_id?: string
          vote_type?: string
          voter_id?: string
        }
        Relationships: []
      }
      service_contacts: {
        Row: {
          contact_method: string
          created_at: string
          id: string
          provider_id: string
          user_id: string
        }
        Insert: {
          contact_method?: string
          created_at?: string
          id?: string
          provider_id: string
          user_id: string
        }
        Update: {
          contact_method?: string
          created_at?: string
          id?: string
          provider_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_contacts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_payment_summary"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "service_contacts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_providers: {
        Row: {
          availability: Database["public"]["Enums"]["provider_availability"]
          average_rating: number | null
          business_name: string
          category: Database["public"]["Enums"]["service_category"]
          city: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_hidden: boolean | null
          is_verified: boolean | null
          last_active_at: string | null
          neighborhood: string | null
          reports_count: number | null
          secondary_categories:
            | Database["public"]["Enums"]["service_category"][]
            | null
          total_reviews: number | null
          updated_at: string
          user_id: string
          whatsapp_number: string | null
        }
        Insert: {
          availability?: Database["public"]["Enums"]["provider_availability"]
          average_rating?: number | null
          business_name: string
          category: Database["public"]["Enums"]["service_category"]
          city: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_hidden?: boolean | null
          is_verified?: boolean | null
          last_active_at?: string | null
          neighborhood?: string | null
          reports_count?: number | null
          secondary_categories?:
            | Database["public"]["Enums"]["service_category"][]
            | null
          total_reviews?: number | null
          updated_at?: string
          user_id: string
          whatsapp_number?: string | null
        }
        Update: {
          availability?: Database["public"]["Enums"]["provider_availability"]
          average_rating?: number | null
          business_name?: string
          category?: Database["public"]["Enums"]["service_category"]
          city?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_hidden?: boolean | null
          is_verified?: boolean | null
          last_active_at?: string | null
          neighborhood?: string | null
          reports_count?: number | null
          secondary_categories?:
            | Database["public"]["Enums"]["service_category"][]
            | null
          total_reviews?: number | null
          updated_at?: string
          user_id?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      service_quotes: {
        Row: {
          amount_xaf: number
          conditions: string | null
          created_at: string
          duration_days: number | null
          expires_at: string
          id: string
          provider_id: string
          request_id: string
          status: Database["public"]["Enums"]["quote_status"]
          updated_at: string
        }
        Insert: {
          amount_xaf: number
          conditions?: string | null
          created_at?: string
          duration_days?: number | null
          expires_at?: string
          id?: string
          provider_id: string
          request_id: string
          status?: Database["public"]["Enums"]["quote_status"]
          updated_at?: string
        }
        Update: {
          amount_xaf?: number
          conditions?: string | null
          created_at?: string
          duration_days?: number | null
          expires_at?: string
          id?: string
          provider_id?: string
          request_id?: string
          status?: Database["public"]["Enums"]["quote_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          provider_id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          provider_id: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          provider_id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_reports_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_payment_summary"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "service_reports_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          category: Database["public"]["Enums"]["request_category"]
          city: string
          client_id: string
          country: string
          created_at: string
          description: string
          district: string | null
          expires_at: string
          id: string
          selected_quote_id: string | null
          status: Database["public"]["Enums"]["service_request_status"]
          updated_at: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          category: Database["public"]["Enums"]["request_category"]
          city: string
          client_id: string
          country?: string
          created_at?: string
          description: string
          district?: string | null
          expires_at?: string
          id?: string
          selected_quote_id?: string | null
          status?: Database["public"]["Enums"]["service_request_status"]
          updated_at?: string
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          category?: Database["public"]["Enums"]["request_category"]
          city?: string
          client_id?: string
          country?: string
          created_at?: string
          description?: string
          district?: string | null
          expires_at?: string
          id?: string
          selected_quote_id?: string | null
          status?: Database["public"]["Enums"]["service_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_selected_quote"
            columns: ["selected_quote_id"]
            isOneToOne: false
            referencedRelation: "service_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      service_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          is_verified: boolean | null
          provider_id: string
          rating: number
          reviewer_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean | null
          provider_id: string
          rating: number
          reviewer_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean | null
          provider_id?: string
          rating?: number
          reviewer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_payment_summary"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "service_reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      structured_feedback: {
        Row: {
          comment: string | null
          context_id: string | null
          context_type: string
          created_at: string
          flagged_as_fake: boolean | null
          giver_account_age_days: number | null
          giver_id: string
          giver_verified: boolean | null
          has_real_interaction: boolean | null
          id: string
          is_visible: boolean | null
          negative_category: string | null
          rating: number
          receiver_id: string
          weight_multiplier: number | null
        }
        Insert: {
          comment?: string | null
          context_id?: string | null
          context_type: string
          created_at?: string
          flagged_as_fake?: boolean | null
          giver_account_age_days?: number | null
          giver_id: string
          giver_verified?: boolean | null
          has_real_interaction?: boolean | null
          id?: string
          is_visible?: boolean | null
          negative_category?: string | null
          rating: number
          receiver_id: string
          weight_multiplier?: number | null
        }
        Update: {
          comment?: string | null
          context_id?: string | null
          context_type?: string
          created_at?: string
          flagged_as_fake?: boolean | null
          giver_account_age_days?: number | null
          giver_id?: string
          giver_verified?: boolean | null
          has_real_interaction?: boolean | null
          id?: string
          is_visible?: boolean | null
          negative_category?: string | null
          rating?: number
          receiver_id?: string
          weight_multiplier?: number | null
        }
        Relationships: []
      }
      testimonial_likes: {
        Row: {
          created_at: string
          id: string
          testimonial_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          testimonial_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          testimonial_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimonial_likes_testimonial_id_fkey"
            columns: ["testimonial_id"]
            isOneToOne: false
            referencedRelation: "testimonials"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          content: string
          created_at: string
          id: string
          is_approved: boolean
          likes_count: number
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_approved?: boolean
          likes_count?: number
          rating?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_approved?: boolean
          likes_count?: number
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transaction_stats: {
        Row: {
          as_client_count: number
          as_provider_count: number
          completed_transactions: number
          created_at: string
          disputed_transactions: number
          id: string
          last_transaction_at: string | null
          total_amount_xaf: number
          total_transactions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          as_client_count?: number
          as_provider_count?: number
          completed_transactions?: number
          created_at?: string
          disputed_transactions?: number
          id?: string
          last_transaction_at?: string | null
          total_amount_xaf?: number
          total_transactions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          as_client_count?: number
          as_provider_count?: number
          completed_transactions?: number
          created_at?: string
          disputed_transactions?: number
          id?: string
          last_transaction_at?: string | null
          total_amount_xaf?: number
          total_transactions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trust_score_history: {
        Row: {
          change_amount: number
          change_reason: string
          created_at: string
          id: string
          new_score: number
          previous_score: number
          user_id: string
        }
        Insert: {
          change_amount: number
          change_reason: string
          created_at?: string
          id?: string
          new_score: number
          previous_score: number
          user_id: string
        }
        Update: {
          change_amount?: number
          change_reason?: string
          created_at?: string
          id?: string
          new_score?: number
          previous_score?: number
          user_id?: string
        }
        Relationships: []
      }
      user_blacklist: {
        Row: {
          added_by: string | null
          created_at: string
          email: string | null
          id: string
          phone: string | null
          reason: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          reason: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      user_boosts: {
        Row: {
          city: string | null
          contacts_before_boost: number | null
          contacts_during_boost: number | null
          created_at: string
          ends_at: string
          id: string
          is_active: boolean
          neighborhood: string | null
          package_id: string
          payment_reference: string | null
          starts_at: string
          target_id: string
          target_type: string
          user_id: string
          views_before_boost: number | null
          views_during_boost: number | null
        }
        Insert: {
          city?: string | null
          contacts_before_boost?: number | null
          contacts_during_boost?: number | null
          created_at?: string
          ends_at: string
          id?: string
          is_active?: boolean
          neighborhood?: string | null
          package_id: string
          payment_reference?: string | null
          starts_at?: string
          target_id: string
          target_type: string
          user_id: string
          views_before_boost?: number | null
          views_during_boost?: number | null
        }
        Update: {
          city?: string | null
          contacts_before_boost?: number | null
          contacts_during_boost?: number | null
          created_at?: string
          ends_at?: string
          id?: string
          is_active?: boolean
          neighborhood?: string | null
          package_id?: string
          payment_reference?: string | null
          starts_at?: string
          target_id?: string
          target_type?: string
          user_id?: string
          views_before_boost?: number | null
          views_during_boost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_boosts_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "boost_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_push_tokens: {
        Row: {
          created_at: string
          device_type: string
          id: string
          subscription: Json | null
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_type?: string
          id?: string
          subscription?: Json | null
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_type?: string
          id?: string
          subscription?: Json | null
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_reliability_scores: {
        Row: {
          account_age_days: number
          can_post_links: boolean
          content_reported_count: number
          created_at: string
          daily_post_limit: number
          daily_posts_count: number
          daily_posts_date: string | null
          id: string
          is_shadow_banned: boolean
          is_verified: boolean
          reliability_score: number
          reports_validated_count: number
          response_rate: number | null
          shadow_banned_at: string | null
          shadow_banned_reason: string | null
          spam_flags: number
          total_posts_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_age_days?: number
          can_post_links?: boolean
          content_reported_count?: number
          created_at?: string
          daily_post_limit?: number
          daily_posts_count?: number
          daily_posts_date?: string | null
          id?: string
          is_shadow_banned?: boolean
          is_verified?: boolean
          reliability_score?: number
          reports_validated_count?: number
          response_rate?: number | null
          shadow_banned_at?: string | null
          shadow_banned_reason?: string | null
          spam_flags?: number
          total_posts_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_age_days?: number
          can_post_links?: boolean
          content_reported_count?: number
          created_at?: string
          daily_post_limit?: number
          daily_posts_count?: number
          daily_posts_date?: string | null
          id?: string
          is_shadow_banned?: boolean
          is_verified?: boolean
          reliability_score?: number
          reports_validated_count?: number
          response_rate?: number | null
          shadow_banned_at?: string | null
          shadow_banned_reason?: string | null
          spam_flags?: number
          total_posts_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          action_taken: string | null
          created_at: string
          description: string | null
          evidence_urls: string[] | null
          id: string
          reason: string
          reported_property_id: string | null
          reported_user_id: string | null
          reporter_id: string
          resolution_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["verification_status"] | null
          trust_score_impact: number | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          description?: string | null
          evidence_urls?: string[] | null
          id?: string
          reason: string
          reported_property_id?: string | null
          reported_user_id?: string | null
          reporter_id: string
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"] | null
          trust_score_impact?: number | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          description?: string | null
          evidence_urls?: string[] | null
          id?: string
          reason?: string
          reported_property_id?: string | null
          reported_user_id?: string | null
          reporter_id?: string
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"] | null
          trust_score_impact?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_reports_reported_property_id_fkey"
            columns: ["reported_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_verifications: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          business_verified: boolean | null
          cancellation_count: number | null
          created_at: string
          current_level: Database["public"]["Enums"]["verification_level"]
          email_verified: boolean | null
          has_real_photo: boolean | null
          id: string
          identity_document_verified: boolean | null
          interview_completed: boolean | null
          is_suspended: boolean | null
          level_1_completed_at: string | null
          level_1_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          level_2_completed_at: string | null
          level_2_eligible_at: string | null
          level_2_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          level_3_completed_at: string | null
          level_3_eligible_at: string | null
          level_3_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          level_4_completed_at: string | null
          level_4_eligible_at: string | null
          level_4_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          negative_reviews_count: number | null
          phone_verified: boolean | null
          positive_reviews_count: number | null
          reports_count: number | null
          response_rate: number | null
          selfie_verified: boolean | null
          signature_verified: boolean | null
          suspended_at: string | null
          suspension_reason: string | null
          trust_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          business_verified?: boolean | null
          cancellation_count?: number | null
          created_at?: string
          current_level?: Database["public"]["Enums"]["verification_level"]
          email_verified?: boolean | null
          has_real_photo?: boolean | null
          id?: string
          identity_document_verified?: boolean | null
          interview_completed?: boolean | null
          is_suspended?: boolean | null
          level_1_completed_at?: string | null
          level_1_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          level_2_completed_at?: string | null
          level_2_eligible_at?: string | null
          level_2_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          level_3_completed_at?: string | null
          level_3_eligible_at?: string | null
          level_3_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          level_4_completed_at?: string | null
          level_4_eligible_at?: string | null
          level_4_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          negative_reviews_count?: number | null
          phone_verified?: boolean | null
          positive_reviews_count?: number | null
          reports_count?: number | null
          response_rate?: number | null
          selfie_verified?: boolean | null
          signature_verified?: boolean | null
          suspended_at?: string | null
          suspension_reason?: string | null
          trust_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          business_verified?: boolean | null
          cancellation_count?: number | null
          created_at?: string
          current_level?: Database["public"]["Enums"]["verification_level"]
          email_verified?: boolean | null
          has_real_photo?: boolean | null
          id?: string
          identity_document_verified?: boolean | null
          interview_completed?: boolean | null
          is_suspended?: boolean | null
          level_1_completed_at?: string | null
          level_1_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          level_2_completed_at?: string | null
          level_2_eligible_at?: string | null
          level_2_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          level_3_completed_at?: string | null
          level_3_eligible_at?: string | null
          level_3_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          level_4_completed_at?: string | null
          level_4_eligible_at?: string | null
          level_4_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          negative_reviews_count?: number | null
          phone_verified?: boolean | null
          positive_reviews_count?: number | null
          reports_count?: number | null
          response_rate?: number | null
          selfie_verified?: boolean | null
          signature_verified?: boolean | null
          suspended_at?: string | null
          suspension_reason?: string | null
          trust_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      verification_documents: {
        Row: {
          auto_analysis_result: Json | null
          created_at: string
          document_type: Database["public"]["Enums"]["document_type"]
          duplicate_detected: boolean | null
          face_match_score: number | null
          file_name: string | null
          file_url: string
          id: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["verification_status"] | null
          updated_at: string
          user_id: string
          verification_id: string
          verification_level: Database["public"]["Enums"]["verification_level"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          auto_analysis_result?: Json | null
          created_at?: string
          document_type: Database["public"]["Enums"]["document_type"]
          duplicate_detected?: boolean | null
          face_match_score?: number | null
          file_name?: string | null
          file_url: string
          id?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["verification_status"] | null
          updated_at?: string
          user_id: string
          verification_id: string
          verification_level: Database["public"]["Enums"]["verification_level"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          auto_analysis_result?: Json | null
          created_at?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          duplicate_detected?: boolean | null
          face_match_score?: number | null
          file_name?: string | null
          file_url?: string
          id?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["verification_status"] | null
          updated_at?: string
          user_id?: string
          verification_id?: string
          verification_level?: Database["public"]["Enums"]["verification_level"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_documents_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "user_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      provider_payment_summary: {
        Row: {
          business_name: string | null
          completed_transactions: number | null
          disputed_transactions: number | null
          monthly_earnings: number | null
          pending_amount: number | null
          pending_transactions: number | null
          provider_id: string | null
          total_earnings: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_commission: {
        Args: { p_amount: number; p_country_code?: string; p_user_id: string }
        Returns: {
          commission_amount: number
          commission_percent: number
          net_amount: number
        }[]
      }
      calculate_post_ai_score: {
        Args: {
          p_comments: number
          p_created_at: string
          p_is_pro: boolean
          p_is_verified_author: boolean
          p_likes: number
          p_reports: number
          p_shares: number
        }
        Returns: number
      }
      calculate_reliability_score: {
        Args: { p_user_id: string }
        Returns: number
      }
      calculate_trust_score: { Args: { p_user_id: string }; Returns: number }
      can_receive_payments: { Args: { p_user_id: string }; Returns: boolean }
      can_user_publish: { Args: { p_user_id: string }; Returns: boolean }
      check_level_eligibility: { Args: { p_user_id: string }; Returns: Json }
      check_post_limits: { Args: { p_user_id: string }; Returns: Json }
      current_user_has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      get_active_stories: {
        Args: { for_user_id?: string }
        Returns: {
          ai_score: number
          author_id: string
          author_type: string
          background_style: string | null
          category: string
          city: string | null
          comments_count: number
          content: string
          created_at: string
          font_style: string | null
          id: string
          is_pinned: boolean
          is_pro_post: boolean
          is_sponsored: boolean
          is_story: boolean | null
          likes_count: number
          link_url: string | null
          media_urls: string[] | null
          neighborhood: string | null
          post_type: string
          provider_id: string | null
          reports_count: number
          saves_count: number
          shares_count: number
          status: string
          story_expires_at: string | null
          updated_at: string
          video_url: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "imm_posts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_boost_priority: {
        Args: { p_target_id: string; p_target_type: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_content_boosted: {
        Args: { p_target_id: string; p_target_type: string }
        Returns: boolean
      }
      process_reputation_vote: {
        Args: {
          p_context?: string
          p_context_id?: string
          p_target_user_id: string
          p_vote_type: string
          p_voter_id: string
        }
        Returns: Json
      }
      recalculate_trust_score: { Args: { p_user_id: string }; Returns: number }
      update_account_privileges: { Args: never; Returns: undefined }
      user_has_pro: { Args: { p_user_id: string }; Returns: Json }
    }
    Enums: {
      account_type: "owner" | "agent" | "agency"
      app_role: "admin" | "moderator" | "user"
      document_type:
        | "id_card"
        | "passport"
        | "selfie_with_id"
        | "digital_signature"
        | "property_photo"
        | "property_video"
        | "utility_bill"
        | "business_register"
        | "management_mandate"
        | "other"
      escrow_status: "pending" | "funded" | "released" | "refunded" | "disputed"
      listing_type: "rent" | "sale" | "colocation" | "short_term"
      payment_method_type: "mobile_money" | "card" | "paypal" | "bank_transfer"
      property_type:
        | "studio"
        | "apartment"
        | "house"
        | "room"
        | "villa"
        | "terrain"
        | "boutique"
        | "immeuble"
        | "batiment"
        | "autre"
      provider_availability: "disponible" | "sur_rendez_vous" | "indisponible"
      quote_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "expired"
        | "cancelled"
      request_category:
        | "property_rental"
        | "property_purchase"
        | "plumbing"
        | "electrical"
        | "cleaning"
        | "moving"
        | "renovation"
        | "painting"
        | "security"
        | "gardening"
        | "other"
      service_category:
        | "maconnerie"
        | "plomberie"
        | "electricite"
        | "menuiserie"
        | "peinture"
        | "climatisation"
        | "demenagement"
        | "fourniture_materiaux"
        | "juridique"
        | "gestion_entretien"
      service_request_status:
        | "pending"
        | "quoted"
        | "accepted"
        | "paid"
        | "in_progress"
        | "completed"
        | "disputed"
        | "cancelled"
        | "refunded"
      subscription_tier: "free" | "pro" | "premium"
      user_type: "seeker" | "owner" | "both" | "agent" | "agency"
      verification_level: "level_1" | "level_2" | "level_3" | "level_4"
      verification_status: "pending" | "approved" | "rejected" | "expired"
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
      account_type: ["owner", "agent", "agency"],
      app_role: ["admin", "moderator", "user"],
      document_type: [
        "id_card",
        "passport",
        "selfie_with_id",
        "digital_signature",
        "property_photo",
        "property_video",
        "utility_bill",
        "business_register",
        "management_mandate",
        "other",
      ],
      escrow_status: ["pending", "funded", "released", "refunded", "disputed"],
      listing_type: ["rent", "sale", "colocation", "short_term"],
      payment_method_type: ["mobile_money", "card", "paypal", "bank_transfer"],
      property_type: [
        "studio",
        "apartment",
        "house",
        "room",
        "villa",
        "terrain",
        "boutique",
        "immeuble",
        "batiment",
        "autre",
      ],
      provider_availability: ["disponible", "sur_rendez_vous", "indisponible"],
      quote_status: ["pending", "accepted", "rejected", "expired", "cancelled"],
      request_category: [
        "property_rental",
        "property_purchase",
        "plumbing",
        "electrical",
        "cleaning",
        "moving",
        "renovation",
        "painting",
        "security",
        "gardening",
        "other",
      ],
      service_category: [
        "maconnerie",
        "plomberie",
        "electricite",
        "menuiserie",
        "peinture",
        "climatisation",
        "demenagement",
        "fourniture_materiaux",
        "juridique",
        "gestion_entretien",
      ],
      service_request_status: [
        "pending",
        "quoted",
        "accepted",
        "paid",
        "in_progress",
        "completed",
        "disputed",
        "cancelled",
        "refunded",
      ],
      subscription_tier: ["free", "pro", "premium"],
      user_type: ["seeker", "owner", "both", "agent", "agency"],
      verification_level: ["level_1", "level_2", "level_3", "level_4"],
      verification_status: ["pending", "approved", "rejected", "expired"],
    },
  },
} as const
