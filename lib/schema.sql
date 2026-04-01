-- ─────────────────────────────────────────────────────────────────────────────
-- Caldra — Database Schema (v2)
-- Run in: Supabase dashboard → SQL Editor → New query
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ─── user_profiles ───────────────────────────────────────────────────────────
-- Créé automatiquement par le trigger new_user_profile ci-dessous.

create table if not exists user_profiles (
  user_id                 uuid        primary key references auth.users (id) on delete cascade,
  plan                    text        not null default 'free' check (plan in ('free', 'pro', 'team')),
  stripe_customer_id      text        unique,
  stripe_subscription_id  text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- Auto-provision profile on signup
create or replace function create_user_profile()
returns trigger language plpgsql security definer as $$
begin
  insert into user_profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure create_user_profile();

-- ─── trading_rules ────────────────────────────────────────────────────────────

create table if not exists trading_rules (
  user_id                       uuid        primary key references auth.users (id) on delete cascade,
  max_daily_drawdown_pct        numeric     not null default 3,
  max_consecutive_losses        int         not null default 3,
  min_time_between_entries_sec  int         not null default 120,
  session_start                 time        not null default '09:30',
  session_end                   time        not null default '16:00',
  max_trades_per_session        int         not null default 10,
  max_risk_per_trade_pct        numeric     not null default 1,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

-- ─── api_keys ─────────────────────────────────────────────────────────────────

create table if not exists api_keys (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  key_hash    text        not null unique,   -- SHA-256 of the raw key
  key_prefix  text        not null,          -- first 14 chars for display
  created_at  timestamptz not null default now()
);

create unique index if not exists api_keys_user_id_idx on api_keys (user_id);

-- ─── trades ──────────────────────────────────────────────────────────────────

create table if not exists trades (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users (id) on delete cascade,
  symbol       text        not null,
  direction    text        not null check (direction in ('long', 'short')),
  size         numeric     not null,
  entry_price  numeric     not null,
  exit_price   numeric,
  entry_time   timestamptz not null,
  exit_time    timestamptz,
  pnl          numeric,
  status       text        not null default 'open' check (status in ('open', 'closed')),
  created_at   timestamptz not null default now()
);

create index if not exists trades_user_entry_idx on trades (user_id, entry_time desc);

-- ─── alerts ──────────────────────────────────────────────────────────────────

create table if not exists alerts (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users (id) on delete cascade,
  trade_id     uuid        references trades (id) on delete set null,
  type         text        not null,
  level        int         not null check (level in (1, 2, 3)),
  message      text        not null,
  detail       jsonb,
  session_date date        not null default current_date,
  created_at   timestamptz not null default now()
);

create index if not exists alerts_user_session_idx on alerts (user_id, session_date, level desc, created_at desc);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table user_profiles  enable row level security;
alter table trading_rules  enable row level security;
alter table api_keys       enable row level security;
alter table trades         enable row level security;
alter table alerts         enable row level security;

-- Policies : service role full access (API routes utilisent SUPABASE_SERVICE_ROLE_KEY)
do $$
declare
  tbl text;
begin
  foreach tbl in array array['user_profiles','trading_rules','api_keys','trades','alerts'] loop
    execute format(
      'drop policy if exists "service role full access" on %I; '
      'create policy "service role full access" on %I for all using (true) with check (true);',
      tbl, tbl
    );
  end loop;
end;
$$;

-- Policies : lecture/écriture pour l'utilisateur connecté (client Supabase)
create policy "users read own profile"      on user_profiles  for select using (auth.uid() = user_id);
create policy "users read own rules"        on trading_rules  for select using (auth.uid() = user_id);
create policy "users read own trades"       on trades         for select using (auth.uid() = user_id);
create policy "users read own alerts"       on alerts         for select using (auth.uid() = user_id);
create policy "users read own api keys"     on api_keys       for select using (auth.uid() = user_id);

-- Realtime : activer sur la table alerts pour le dashboard live
alter publication supabase_realtime add table alerts;
