-- DealScope Initial Schema
-- All tables, indexes, RLS policies, and functions

-- =============================================================================
-- EXTENSIONS
-- =============================================================================
create extension if not exists "uuid-ossp";
create extension if not exists "postgis";

-- =============================================================================
-- ENUMS
-- =============================================================================
create type property_type as enum (
  'single_family', 'multi_family', 'condo', 'townhouse',
  'duplex', 'triplex', 'fourplex', 'apartment',
  'commercial', 'land', 'mobile_home'
);

create type listing_status as enum (
  'active', 'pending', 'sold', 'off_market',
  'foreclosure', 'auction', 'pre_foreclosure'
);

create type data_source as enum (
  'zillow', 'mls', 'redfin', 'realtor', 'manual'
);

create type alert_status as enum (
  'new', 'viewed', 'saved', 'dismissed'
);

create type alert_frequency as enum (
  'instant', 'daily', 'weekly'
);

create type deal_grade as enum (
  'A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'
);

create type deal_recommendation as enum (
  'strong_buy', 'buy', 'hold', 'pass', 'avoid'
);

create type subscription_tier as enum (
  'free', 'starter', 'pro', 'enterprise'
);

create type market_temperature as enum (
  'hot', 'warm', 'neutral', 'cool', 'cold'
);

-- =============================================================================
-- USERS (extends Supabase auth.users)
-- =============================================================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  phone text,
  subscription_tier subscription_tier not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  push_token text,
  sms_enabled boolean not null default false,
  email_alerts_enabled boolean not null default true,
  push_alerts_enabled boolean not null default true,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- INVESTMENT CRITERIA
-- =============================================================================
create table public.investment_criteria (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  property_types property_type[] not null default '{}',
  min_price numeric(12,2) not null default 0,
  max_price numeric(12,2) not null default 1000000,
  min_bedrooms integer not null default 0,
  max_bedrooms integer not null default 10,
  min_cash_on_cash numeric(5,2) not null default 0,
  min_cap_rate numeric(5,2) not null default 0,
  max_days_on_market integer not null default 0,
  min_deal_score integer not null default 0,
  target_markets text[] not null default '{}',
  max_distance numeric(6,2) not null default 25,
  keywords text[] not null default '{}',
  exclude_keywords text[] not null default '{}',
  alert_enabled boolean not null default true,
  alert_frequency alert_frequency not null default 'daily',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_criteria_user on public.investment_criteria(user_id);
create index idx_criteria_active on public.investment_criteria(user_id) where alert_enabled = true;

-- =============================================================================
-- PROPERTIES
-- =============================================================================
create table public.properties (
  id uuid primary key default uuid_generate_v4(),
  external_id text,
  address text not null,
  city text not null,
  state text not null,
  zip_code text not null,
  county text,
  location geography(Point, 4326),
  latitude numeric(10,7),
  longitude numeric(10,7),
  list_price numeric(12,2) not null,
  bedrooms integer not null default 0,
  bathrooms numeric(4,1) not null default 0,
  square_feet integer not null default 0,
  lot_size integer not null default 0,
  year_built integer,
  property_type property_type not null default 'single_family',
  status listing_status not null default 'active',
  days_on_market integer not null default 0,
  mls_number text,
  description text,
  images text[] not null default '{}',
  features text[] not null default '{}',
  tax_assessed_value numeric(12,2),
  annual_taxes numeric(10,2),
  hoa_monthly numeric(8,2),
  zestimate numeric(12,2),
  rent_zestimate numeric(8,2),
  last_sold_date date,
  last_sold_price numeric(12,2),
  source data_source not null default 'zillow',
  source_url text,
  raw_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_properties_zip on public.properties(zip_code);
create index idx_properties_city_state on public.properties(city, state);
create index idx_properties_status on public.properties(status);
create index idx_properties_price on public.properties(list_price);
create index idx_properties_type on public.properties(property_type);
create index idx_properties_location on public.properties using gist(location);
create index idx_properties_external on public.properties(external_id) where external_id is not null;
create unique index idx_properties_address_zip on public.properties(address, zip_code);

-- =============================================================================
-- PROPERTY ANALYSES
-- =============================================================================
create table public.property_analyses (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references public.properties(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,

  -- Financing assumptions
  purchase_price numeric(12,2) not null,
  down_payment_percent numeric(5,2) not null default 20,
  interest_rate numeric(5,3) not null default 7.0,
  loan_term_years integer not null default 30,
  closing_cost_percent numeric(5,2) not null default 3,
  rehab_budget numeric(10,2) not null default 0,

  -- Expense assumptions
  property_tax_rate numeric(5,3) not null default 1.2,
  insurance_annual numeric(8,2) not null default 1500,
  maintenance_percent numeric(5,2) not null default 5,
  vacancy_percent numeric(5,2) not null default 5,
  management_percent numeric(5,2) not null default 8,
  capex_reserve_percent numeric(5,2) not null default 5,
  hoa_monthly numeric(8,2) not null default 0,
  utilities_monthly numeric(8,2) not null default 0,

  -- Calculated results
  total_investment numeric(12,2),
  loan_amount numeric(12,2),
  monthly_mortgage numeric(8,2),
  gross_monthly_rent numeric(8,2),
  net_operating_income numeric(10,2),
  monthly_cash_flow numeric(8,2),
  annual_cash_flow numeric(10,2),
  cap_rate numeric(5,2),
  cash_on_cash_return numeric(6,2),
  gross_rent_multiplier numeric(6,2),
  dscr numeric(5,2),
  break_even_ratio numeric(5,2),
  price_per_sqft numeric(8,2),
  rent_to_price numeric(5,3),

  -- Deal scoring
  deal_score integer,
  deal_grade deal_grade,
  deal_recommendation deal_recommendation,
  score_breakdown jsonb,
  pros text[],
  cons text[],
  summary text,

  -- Projections
  five_year_projection jsonb,
  irr numeric(6,2),
  total_roi numeric(8,2),

  -- AI commentary
  ai_analysis text,
  ai_model text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_analyses_property on public.property_analyses(property_id);
create index idx_analyses_user on public.property_analyses(user_id);
create index idx_analyses_score on public.property_analyses(deal_score desc);

-- =============================================================================
-- COMPS (comparable sales used in analyses)
-- =============================================================================
create table public.comps (
  id uuid primary key default uuid_generate_v4(),
  analysis_id uuid not null references public.property_analyses(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  address text not null,
  sale_price numeric(12,2) not null,
  sale_date date not null,
  bedrooms integer not null default 0,
  bathrooms numeric(4,1) not null default 0,
  square_feet integer not null default 0,
  price_per_sqft numeric(8,2),
  distance_miles numeric(5,2),
  similarity_score numeric(4,2),
  adjustments jsonb,
  adjusted_price numeric(12,2),
  year_built integer,
  days_on_market integer,
  created_at timestamptz not null default now()
);

create index idx_comps_analysis on public.comps(analysis_id);

-- =============================================================================
-- MARKET DATA
-- =============================================================================
create table public.market_data (
  id uuid primary key default uuid_generate_v4(),
  zip_code text not null,
  city text not null,
  state text not null,
  period_start date not null,
  period_end date not null,

  median_home_price numeric(12,2),
  median_rent numeric(8,2),
  price_to_rent_ratio numeric(6,2),
  yoy_appreciation numeric(6,2),
  population_growth numeric(5,2),
  median_household_income numeric(10,2),
  unemployment_rate numeric(5,2),
  crime_index numeric(5,1),
  school_rating numeric(3,1),
  walk_score integer,
  inventory_months numeric(5,2),
  days_on_market_median integer,
  list_to_sale_ratio numeric(6,2),
  foreclosure_rate numeric(5,3),
  new_construction_permits integer,
  rent_growth_yoy numeric(6,2),
  market_temperature market_temperature,

  raw_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_market_zip on public.market_data(zip_code);
create index idx_market_city on public.market_data(city, state);
create index idx_market_period on public.market_data(period_start, period_end);
create unique index idx_market_zip_period on public.market_data(zip_code, period_start);

-- =============================================================================
-- DEAL ALERTS
-- =============================================================================
create table public.deal_alerts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  criteria_id uuid not null references public.investment_criteria(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  deal_score integer,
  match_reasons text[] not null default '{}',
  status alert_status not null default 'new',
  notified_via text[] not null default '{}',
  created_at timestamptz not null default now(),
  viewed_at timestamptz,
  saved_at timestamptz
);

create index idx_alerts_user on public.deal_alerts(user_id);
create index idx_alerts_user_status on public.deal_alerts(user_id, status);
create index idx_alerts_created on public.deal_alerts(created_at desc);
create unique index idx_alerts_user_property on public.deal_alerts(user_id, property_id, criteria_id);

-- =============================================================================
-- PORTFOLIO PROPERTIES
-- =============================================================================
create table public.portfolio_properties (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  address text not null,
  city text not null,
  state text not null,
  zip_code text not null,
  property_type property_type not null default 'single_family',
  purchase_price numeric(12,2) not null,
  purchase_date date not null,
  current_value numeric(12,2),
  monthly_rent numeric(8,2) not null default 0,
  monthly_expenses numeric(8,2) not null default 0,
  loan_balance numeric(12,2) not null default 0,
  interest_rate numeric(5,3) not null default 0,
  loan_term_years integer not null default 30,
  bedrooms integer not null default 0,
  bathrooms numeric(4,1) not null default 0,
  square_feet integer not null default 0,
  notes text,
  images text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_portfolio_user on public.portfolio_properties(user_id);

-- =============================================================================
-- SAVED SEARCHES
-- =============================================================================
create table public.saved_searches (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_saved_searches_user on public.saved_searches(user_id);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Auto-update updated_at timestamp
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply to all relevant tables
create trigger trg_users_updated_at before update on public.users
  for each row execute function public.update_updated_at();
create trigger trg_criteria_updated_at before update on public.investment_criteria
  for each row execute function public.update_updated_at();
create trigger trg_properties_updated_at before update on public.properties
  for each row execute function public.update_updated_at();
create trigger trg_analyses_updated_at before update on public.property_analyses
  for each row execute function public.update_updated_at();
create trigger trg_market_updated_at before update on public.market_data
  for each row execute function public.update_updated_at();
create trigger trg_portfolio_updated_at before update on public.portfolio_properties
  for each row execute function public.update_updated_at();

-- Auto-set location geography from lat/lng on properties
create or replace function public.set_property_location()
returns trigger as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.location = st_setsrid(st_makepoint(new.longitude, new.latitude), 4326)::geography;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_properties_location before insert or update on public.properties
  for each row execute function public.set_property_location();

-- Find nearby properties within a radius (miles)
create or replace function public.find_nearby_properties(
  lat numeric,
  lng numeric,
  radius_miles numeric default 5,
  property_status listing_status default 'active'
)
returns setof public.properties as $$
begin
  return query
    select *
    from public.properties
    where status = property_status
      and st_dwithin(
        location,
        st_setsrid(st_makepoint(lng, lat), 4326)::geography,
        radius_miles * 1609.34
      )
    order by location <-> st_setsrid(st_makepoint(lng, lat), 4326)::geography;
end;
$$ language plpgsql stable;

-- Create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table public.users enable row level security;
alter table public.investment_criteria enable row level security;
alter table public.properties enable row level security;
alter table public.property_analyses enable row level security;
alter table public.comps enable row level security;
alter table public.market_data enable row level security;
alter table public.deal_alerts enable row level security;
alter table public.portfolio_properties enable row level security;
alter table public.saved_searches enable row level security;

-- Users: can read/update own profile
create policy "Users can read own profile"
  on public.users for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.users for update using (auth.uid() = id);

-- Investment criteria: users own their criteria
create policy "Users can CRUD own criteria"
  on public.investment_criteria for all using (auth.uid() = user_id);

-- Properties: readable by all authenticated users (listing data is public)
create policy "Authenticated users can read properties"
  on public.properties for select using (auth.role() = 'authenticated');
create policy "Service role can manage properties"
  on public.properties for all using (auth.role() = 'service_role');

-- Property analyses: users own their analyses
create policy "Users can CRUD own analyses"
  on public.property_analyses for all using (auth.uid() = user_id);

-- Comps: accessible via analysis ownership
create policy "Users can read comps for own analyses"
  on public.comps for select using (
    exists (
      select 1 from public.property_analyses pa
      where pa.id = comps.analysis_id and pa.user_id = auth.uid()
    )
  );
create policy "Users can create comps for own analyses"
  on public.comps for insert with check (
    exists (
      select 1 from public.property_analyses pa
      where pa.id = comps.analysis_id and pa.user_id = auth.uid()
    )
  );

-- Market data: readable by all authenticated users
create policy "Authenticated users can read market data"
  on public.market_data for select using (auth.role() = 'authenticated');
create policy "Service role can manage market data"
  on public.market_data for all using (auth.role() = 'service_role');

-- Deal alerts: users own their alerts
create policy "Users can CRUD own alerts"
  on public.deal_alerts for all using (auth.uid() = user_id);

-- Portfolio: users own their portfolio
create policy "Users can CRUD own portfolio"
  on public.portfolio_properties for all using (auth.uid() = user_id);

-- Saved searches: users own their searches
create policy "Users can CRUD own searches"
  on public.saved_searches for all using (auth.uid() = user_id);

-- =============================================================================
-- REALTIME
-- =============================================================================
-- Enable realtime for deal alerts so users get instant notifications
alter publication supabase_realtime add table public.deal_alerts;
alter publication supabase_realtime add table public.portfolio_properties;
