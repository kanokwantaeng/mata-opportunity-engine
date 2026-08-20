create extension if not exists pgcrypto;

create table if not exists opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  raw_input text not null default '',
  product_domain text default 'DIGITAL_PRODUCT',
  opportunity_type text[] default '{}',
  status text not null default 'DRAFT',
  current_decision text,
  current_score numeric(5,1),
  current_confidence text,
  scoring_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists buyer_hypotheses (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  payer_description text, user_description text, age_range text, context text,
  desired_outcome text, job_to_be_done text, reachability_notes text,
  ai_generated boolean default false, user_approved boolean default false,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists motivations (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  intensity_score int default 0 check (intensity_score between 0 and 3),
  frequency_score int default 0 check (frequency_score between 0 and 3),
  urgency_score int default 0 check (urgency_score between 0 and 3),
  emotional_relevance_score int default 0 check (emotional_relevance_score between 0 and 3),
  workaround_score int default 0 check (workaround_score between 0 and 3),
  notes text, evidence_coverage jsonb default '{}'::jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists assumptions (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  statement text not null,
  status text not null default 'UNKNOWN',
  impact text not null default 'MEDIUM',
  category text,
  related_entity_type text, related_entity_id uuid,
  ai_generated boolean default false,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists evidence (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  source_type text not null,
  source_name text, source_url text, raw_text text, summary text not null,
  direction text not null default 'SUPPORTS',
  strength text not null default 'WEAK',
  confidence text not null default 'LOW',
  supports_assumption_ids uuid[] default '{}',
  contradicts_assumption_ids uuid[] default '{}',
  observed_at timestamptz,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists product_hypotheses (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  version int not null default 1, rank int not null, selected boolean default false,
  name text not null, type text not null, target_customer text, job_to_be_done text,
  core_outcome text, description text, feature_list jsonb default '[]'::jsonb,
  estimated_build_hours numeric, production_complexity text, ai_leverage text,
  maintenance_level text, support_burden text, price_hypothesis numeric,
  bundle_potential text, upsell_potential text, rationale text,
  created_at timestamptz default now()
);

create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  product_hypothesis_id uuid references product_hypotheses(id) on delete set null,
  positioning text, promise text, core_offer text,
  includes jsonb default '[]'::jsonb, bonus jsonb default '[]'::jsonb,
  differentiator text, proof_needed jsonb default '[]'::jsonb,
  objections jsonb default '[]'::jsonb, price_hypothesis numeric,
  risk_reducer text, why_buy_now text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists economics (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  product_hypothesis_id uuid references product_hypotheses(id) on delete set null,
  currency text default 'THB', selling_price numeric default 0,
  platform_fee numeric default 0, payment_fee numeric default 0,
  other_variable_cost numeric default 0, refund_allowance numeric default 0,
  contribution_margin numeric default 0, contribution_margin_pct numeric default 0,
  upsell_price numeric, upsell_take_rate numeric, expected_revenue_per_buyer numeric,
  paid_ads_status text not null default 'NOT_TESTED',
  ad_spend numeric, actual_cac numeric, actual_roas numeric, notes text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists validation_experiments (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  target_assumption_id uuid references assumptions(id) on delete set null,
  experiment_type text not null, hypothesis text not null, channel text,
  cost_budget numeric default 0, success_metric text,
  strong_signal_rule text, moderate_signal_rule text, weak_signal_rule text,
  status text not null default 'PLANNED',
  started_at timestamptz, ended_at timestamptz, created_at timestamptz default now()
);

create table if not exists validation_results (
  id uuid primary key default gen_random_uuid(),
  validation_experiment_id uuid not null references validation_experiments(id) on delete cascade,
  views int, clicks int, comments int, inquiries int, orders int,
  revenue numeric, spend numeric, qualitative_notes text,
  result_classification text, evidence_id uuid references evidence(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists score_snapshots (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  scoring_version text not null,
  demand_score numeric, motivation_score numeric, buyer_score numeric,
  competition_score numeric, differentiation_score numeric, buildability_score numeric,
  economics_score numeric, scale_score numeric, overall_score numeric,
  confidence text, decision text, decision_reason text,
  evidence_snapshot_json jsonb default '[]'::jsonb,
  assumptions_snapshot_json jsonb default '[]'::jsonb,
  gates_json jsonb default '{}'::jsonb, red_flags_json jsonb default '[]'::jsonb,
  calculated_at timestamptz default now()
);

create table if not exists decision_logs (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  previous_decision text, new_decision text, system_recommendation text,
  user_override boolean default false, override_reason text,
  score_snapshot_id uuid references score_snapshots(id) on delete set null,
  created_at timestamptz default now()
);

-- Browser clients should not access these tables directly in V1.
-- All access is server-side through Netlify Functions using the service role.
alter table opportunities enable row level security;
alter table buyer_hypotheses enable row level security;
alter table motivations enable row level security;
alter table assumptions enable row level security;
alter table evidence enable row level security;
alter table product_hypotheses enable row level security;
alter table offers enable row level security;
alter table economics enable row level security;
alter table validation_experiments enable row level security;
alter table validation_results enable row level security;
alter table score_snapshots enable row level security;
alter table decision_logs enable row level security;
