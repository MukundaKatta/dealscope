/**
 * Auto-generated Supabase Database types.
 * In production, regenerate with: npx supabase gen types typescript --local
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          subscription_tier: "free" | "starter" | "pro" | "enterprise";
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          push_token: string | null;
          sms_enabled: boolean;
          email_alerts_enabled: boolean;
          push_alerts_enabled: boolean;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          subscription_tier?: "free" | "starter" | "pro" | "enterprise";
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          push_token?: string | null;
          sms_enabled?: boolean;
          email_alerts_enabled?: boolean;
          push_alerts_enabled?: boolean;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          subscription_tier?: "free" | "starter" | "pro" | "enterprise";
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          push_token?: string | null;
          sms_enabled?: boolean;
          email_alerts_enabled?: boolean;
          push_alerts_enabled?: boolean;
          onboarding_completed?: boolean;
        };
      };
      investment_criteria: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          property_types: string[];
          min_price: number;
          max_price: number;
          min_bedrooms: number;
          max_bedrooms: number;
          min_cash_on_cash: number;
          min_cap_rate: number;
          max_days_on_market: number;
          min_deal_score: number;
          target_markets: string[];
          max_distance: number;
          keywords: string[];
          exclude_keywords: string[];
          alert_enabled: boolean;
          alert_frequency: "instant" | "daily" | "weekly";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          property_types?: string[];
          min_price?: number;
          max_price?: number;
          min_bedrooms?: number;
          max_bedrooms?: number;
          min_cash_on_cash?: number;
          min_cap_rate?: number;
          max_days_on_market?: number;
          min_deal_score?: number;
          target_markets?: string[];
          max_distance?: number;
          keywords?: string[];
          exclude_keywords?: string[];
          alert_enabled?: boolean;
          alert_frequency?: "instant" | "daily" | "weekly";
        };
        Update: Partial<Database["public"]["Tables"]["investment_criteria"]["Insert"]>;
      };
      properties: {
        Row: {
          id: string;
          external_id: string | null;
          address: string;
          city: string;
          state: string;
          zip_code: string;
          county: string | null;
          latitude: number | null;
          longitude: number | null;
          list_price: number;
          bedrooms: number;
          bathrooms: number;
          square_feet: number;
          lot_size: number;
          year_built: number | null;
          property_type: string;
          status: string;
          days_on_market: number;
          mls_number: string | null;
          description: string | null;
          images: string[];
          features: string[];
          tax_assessed_value: number | null;
          annual_taxes: number | null;
          hoa_monthly: number | null;
          zestimate: number | null;
          rent_zestimate: number | null;
          last_sold_date: string | null;
          last_sold_price: number | null;
          source: string;
          source_url: string | null;
          raw_data: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          external_id?: string | null;
          address: string;
          city: string;
          state: string;
          zip_code: string;
          county?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          list_price: number;
          bedrooms?: number;
          bathrooms?: number;
          square_feet?: number;
          lot_size?: number;
          year_built?: number | null;
          property_type?: string;
          status?: string;
          days_on_market?: number;
          mls_number?: string | null;
          description?: string | null;
          images?: string[];
          features?: string[];
          tax_assessed_value?: number | null;
          annual_taxes?: number | null;
          hoa_monthly?: number | null;
          zestimate?: number | null;
          rent_zestimate?: number | null;
          last_sold_date?: string | null;
          last_sold_price?: number | null;
          source?: string;
          source_url?: string | null;
          raw_data?: Json | null;
        };
        Update: Partial<Database["public"]["Tables"]["properties"]["Insert"]>;
      };
      property_analyses: {
        Row: {
          id: string;
          property_id: string;
          user_id: string;
          purchase_price: number;
          down_payment_percent: number;
          interest_rate: number;
          loan_term_years: number;
          closing_cost_percent: number;
          rehab_budget: number;
          property_tax_rate: number;
          insurance_annual: number;
          maintenance_percent: number;
          vacancy_percent: number;
          management_percent: number;
          capex_reserve_percent: number;
          hoa_monthly: number;
          utilities_monthly: number;
          total_investment: number | null;
          loan_amount: number | null;
          monthly_mortgage: number | null;
          gross_monthly_rent: number | null;
          net_operating_income: number | null;
          monthly_cash_flow: number | null;
          annual_cash_flow: number | null;
          cap_rate: number | null;
          cash_on_cash_return: number | null;
          gross_rent_multiplier: number | null;
          dscr: number | null;
          break_even_ratio: number | null;
          price_per_sqft: number | null;
          rent_to_price: number | null;
          deal_score: number | null;
          deal_grade: string | null;
          deal_recommendation: string | null;
          score_breakdown: Json | null;
          pros: string[] | null;
          cons: string[] | null;
          summary: string | null;
          five_year_projection: Json | null;
          irr: number | null;
          total_roi: number | null;
          ai_analysis: string | null;
          ai_model: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          user_id: string;
          purchase_price: number;
          down_payment_percent?: number;
          interest_rate?: number;
          loan_term_years?: number;
          closing_cost_percent?: number;
          rehab_budget?: number;
          property_tax_rate?: number;
          insurance_annual?: number;
          maintenance_percent?: number;
          vacancy_percent?: number;
          management_percent?: number;
          capex_reserve_percent?: number;
          hoa_monthly?: number;
          utilities_monthly?: number;
          [key: string]: unknown;
        };
        Update: Partial<Database["public"]["Tables"]["property_analyses"]["Insert"]>;
      };
      comps: {
        Row: {
          id: string;
          analysis_id: string;
          property_id: string | null;
          address: string;
          sale_price: number;
          sale_date: string;
          bedrooms: number;
          bathrooms: number;
          square_feet: number;
          price_per_sqft: number | null;
          distance_miles: number | null;
          similarity_score: number | null;
          adjustments: Json | null;
          adjusted_price: number | null;
          year_built: number | null;
          days_on_market: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          property_id?: string | null;
          address: string;
          sale_price: number;
          sale_date: string;
          bedrooms?: number;
          bathrooms?: number;
          square_feet?: number;
          price_per_sqft?: number | null;
          distance_miles?: number | null;
          similarity_score?: number | null;
          adjustments?: Json | null;
          adjusted_price?: number | null;
          year_built?: number | null;
          days_on_market?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["comps"]["Insert"]>;
      };
      market_data: {
        Row: {
          id: string;
          zip_code: string;
          city: string;
          state: string;
          period_start: string;
          period_end: string;
          median_home_price: number | null;
          median_rent: number | null;
          price_to_rent_ratio: number | null;
          yoy_appreciation: number | null;
          population_growth: number | null;
          median_household_income: number | null;
          unemployment_rate: number | null;
          crime_index: number | null;
          school_rating: number | null;
          walk_score: number | null;
          inventory_months: number | null;
          days_on_market_median: number | null;
          list_to_sale_ratio: number | null;
          foreclosure_rate: number | null;
          new_construction_permits: number | null;
          rent_growth_yoy: number | null;
          market_temperature: string | null;
          raw_data: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          zip_code: string;
          city: string;
          state: string;
          period_start: string;
          period_end: string;
          [key: string]: unknown;
        };
        Update: Partial<Database["public"]["Tables"]["market_data"]["Insert"]>;
      };
      deal_alerts: {
        Row: {
          id: string;
          user_id: string;
          criteria_id: string;
          property_id: string;
          deal_score: number | null;
          match_reasons: string[];
          status: "new" | "viewed" | "saved" | "dismissed";
          notified_via: string[];
          created_at: string;
          viewed_at: string | null;
          saved_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          criteria_id: string;
          property_id: string;
          deal_score?: number | null;
          match_reasons?: string[];
          status?: "new" | "viewed" | "saved" | "dismissed";
          notified_via?: string[];
        };
        Update: Partial<Database["public"]["Tables"]["deal_alerts"]["Insert"]>;
      };
      portfolio_properties: {
        Row: {
          id: string;
          user_id: string;
          property_id: string | null;
          address: string;
          city: string;
          state: string;
          zip_code: string;
          property_type: string;
          purchase_price: number;
          purchase_date: string;
          current_value: number | null;
          monthly_rent: number;
          monthly_expenses: number;
          loan_balance: number;
          interest_rate: number;
          loan_term_years: number;
          bedrooms: number;
          bathrooms: number;
          square_feet: number;
          notes: string | null;
          images: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          property_id?: string | null;
          address: string;
          city: string;
          state: string;
          zip_code: string;
          property_type?: string;
          purchase_price: number;
          purchase_date: string;
          current_value?: number | null;
          monthly_rent?: number;
          monthly_expenses?: number;
          loan_balance?: number;
          interest_rate?: number;
          loan_term_years?: number;
          bedrooms?: number;
          bathrooms?: number;
          square_feet?: number;
          notes?: string | null;
          images?: string[];
        };
        Update: Partial<Database["public"]["Tables"]["portfolio_properties"]["Insert"]>;
      };
      saved_searches: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          filters: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          filters?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["saved_searches"]["Insert"]>;
      };
    };
    Functions: {
      find_nearby_properties: {
        Args: {
          lat: number;
          lng: number;
          radius_miles?: number;
          property_status?: string;
        };
        Returns: Database["public"]["Tables"]["properties"]["Row"][];
      };
    };
    Enums: {
      property_type: string;
      listing_status: string;
      data_source: string;
      alert_status: string;
      alert_frequency: string;
      deal_grade: string;
      deal_recommendation: string;
      subscription_tier: string;
      market_temperature: string;
    };
  };
}
