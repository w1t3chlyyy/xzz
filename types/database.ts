export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          telegram_id: number;
          username: string | null;
          first_name: string | null;
          last_name: string | null;
          avatar_url: string | null;
          role: "client" | "executor" | null;
          subscription_tier: "free" | "pro";
          subscription_expires_at: string | null;
          responses_today: number;
          responses_reset_at: string | null;
          trial_started_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          telegram_id: number;
          username?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          role?: "client" | "executor" | null;
          subscription_tier?: "free" | "pro";
          subscription_expires_at?: string | null;
          responses_today?: number;
          responses_reset_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          telegram_id?: number;
          username?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          role?: "client" | "executor" | null;
          subscription_tier?: "free" | "pro";
          subscription_expires_at?: string | null;
          responses_today?: number;
          responses_reset_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          client_id: string;
          title: string;
          description: string;
          category: string;
          budget_min: number | null;
          budget_max: number | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
      };
      responses: {
        Row: {
          id: string;
          order_id: string;
          executor_id: string;
          message: string;
          status: string;
          created_at: string;
        };
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          telegram_id: number | null;
          invoice_id: number;
          amount: number;
          currency: string;
          tier: string;
          method: "crypto" | "stars" | "bank";
          duration_days: number;
          status: string;
          proof_file_id: string | null;
          reviewed_by: number | null;
          reviewed_at: string | null;
          paid_at: string | null;
          created_at: string;
        };
      };
      settings: {
        Row: {
          id: number;
          welcome_message: string;
          pro_price: number;
          admin_ids: number[];
          updated_at: string;
        };
      };
      executor_profiles: {
        Row: {
          id: string;
          skills: string[];
          bio: string;
          portfolio_url: string | null;
          rating: number;
          completed_orders: number;
        };
      };
      payment_requisites: {
        Row: {
          id: number;
          details: string;
          updated_at: string;
        };
      };
      promo_codes: {
        Row: {
          code: string;
          tier: string;
          duration_days: number;
          max_uses: number | null;
          used_count: number;
          active: boolean;
          created_at: string;
        };
      };
    };
  };
}
