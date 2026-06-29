-- ─────────────────────────────────────────────────────────────────────────────
-- Caldra — Database Schema (v2)
-- Run in: Supabase dashboard → SQL Editor → New query
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ─── user_profiles ───────────────────────────────────────────────────────────
-- Créé automatiquement par le trigger new_user_profile ci-dessous.

create table if not exists user_profiles (
  user_id                 uuid        primary key references auth.users (id) on delete cascade,
  plan                    text        not null default 'pro' check (plan in ('pro', 'max')),
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
  max_leverage                  numeric     not null default 30,
  require_stop_loss             boolean     not null default false,
  telegram_bot_token            text,
  telegram_chat_id              text,
  detector_config               jsonb       not null default '{}'::jsonb,
  prop_firm                     text,
  prop_firm_started_at          date,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

-- ─── api_keys ─────────────────────────────────────────────────────────────────

create table if not exists api_keys (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  key_hash    text        not null unique,   -- SHA-256 of the raw key
  key_prefix  text        not null,          -- first 14 chars for display
  label       text        not null default 'main', -- 'main' | 'cTrader'
  created_at  timestamptz not null default now()
);

create unique index if not exists api_keys_user_label_idx on api_keys (user_id, label);

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


-- Realtime : activer sur alerts + trades pour le dashboard live
alter publication supabase_realtime add table alerts;
alter publication supabase_realtime add table trades;

-- ─── push_subscriptions ──────────────────────────────────────────────────────

create table if not exists push_subscriptions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  endpoint   text        not null,
  p256dh     text        not null,
  auth       text        not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table push_subscriptions enable row level security;

drop policy if exists "service role full access" on push_subscriptions;
create policy "service role full access" on push_subscriptions
  for all using (true) with check (true);

-- ─── Migrations (exécuter si la DB existe déjà) ───────────────────────────────
-- !! Seulement si vous avez déjà exécuté ce schéma une première fois !!

-- v2.1 : taille du compte + webhook sortant
alter table trading_rules add column if not exists account_size       numeric not null default 10000;
alter table trading_rules add column if not exists slack_webhook_url  text;

-- v2.2 : plans Pro/Sentinel (remplace free/pro/team)
alter table user_profiles drop constraint if exists user_profiles_plan_check;
alter table user_profiles add constraint user_profiles_plan_check check (plan in ('pro', 'sentinel'));
update user_profiles set plan = 'pro' where plan in ('free', 'team');
alter table user_profiles alter column plan set default 'pro';

-- v2.3 : fuseau horaire pour la détection hors-session
alter table trading_rules add column if not exists tz_offset_hours smallint not null default 0;

-- v2.4 : cTrader OAuth — label sur api_keys + nouvelle table ctrader_accounts
alter table api_keys add column if not exists label text not null default 'main';
drop index if exists api_keys_user_id_idx;
create unique index if not exists api_keys_user_label_idx on api_keys (user_id, label);

create table if not exists ctrader_accounts (
  id                       uuid        primary key default gen_random_uuid(),
  user_id                  uuid        not null references auth.users(id) on delete cascade,
  environment              text        not null default 'live',
  ctid_trader_account_id   bigint,
  access_token             text        not null,
  refresh_token            text,
  token_expires_at         timestamptz,
  ingest_key               text        not null,
  created_at               timestamptz default now(),
  unique (user_id, ctid_trader_account_id)
);
alter table ctrader_accounts enable row level security;
drop policy if exists "service role full access" on ctrader_accounts;
create policy "service role full access" on ctrader_accounts for all using (true) with check (true);

-- v2.5 : capture du stop-loss → détecteur "Risk dépassé" (risque planifié par trade)
alter table trades add column if not exists stop_loss numeric;

-- v2.6 : intégration futures Tradovate (OAuth) — même modèle que ctrader_accounts.
-- Le worker Node (worker/tradovate-worker.js) lit les fillPair via REST/WS et POST
-- vers /api/ingest avec l'ingest_key dédié. tradovate_account_id résolu par le worker.
create table if not exists tradovate_accounts (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null references auth.users(id) on delete cascade,
  environment           text        not null default 'live',   -- live | demo
  tradovate_account_id  bigint,                                 -- résolu par le worker
  tradovate_user_id     bigint,
  access_token          text        not null,
  token_expires_at      timestamptz,
  ingest_key            text        not null,
  status                text,                                   -- connected | conflict | error
  created_at            timestamptz default now(),
  unique (user_id, tradovate_account_id)
);
alter table tradovate_accounts enable row level security;
drop policy if exists "service role full access" on tradovate_accounts;
create policy "service role full access" on tradovate_accounts for all using (true) with check (true);

-- v2.7 : connexion MT5 par identifiants (sans EA). Le worker Python
-- (worker/mt5-worker.py, sur VPS Windows) se connecte au terminal avec le mot de
-- passe INVESTISSEUR (lecture seule), lit history_deals_get et POST vers /api/ingest.
-- Le mot de passe est chiffré (AES-256-GCM, voir lib/mt5crypto.ts) — jamais en clair.
create table if not exists mt5_accounts (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  mt5_login     text        not null,
  mt5_server    text        not null,
  password_enc  text        not null,   -- mot de passe investisseur chiffré (AES-256-GCM)
  ingest_key    text        not null,
  status        text,                   -- connected | auth_failed | error
  last_sync_at  timestamptz,
  created_at    timestamptz default now(),
  unique (user_id)
);
alter table mt5_accounts enable row level security;
drop policy if exists "service role full access" on mt5_accounts;
create policy "service role full access" on mt5_accounts for all using (true) with check (true);

-- v2.8 : renommage du plan 'sentinel' → 'max' (Pro 19€ / Max 39€).
-- Migre les abonnés existants AVANT de resserrer la contrainte.
alter table user_profiles drop constraint if exists user_profiles_plan_check;
update user_profiles set plan = 'max' where plan = 'sentinel';
update user_profiles set plan = 'pro' where plan not in ('pro', 'max');
alter table user_profiles add constraint user_profiles_plan_check check (plan in ('pro', 'max'));

-- v2.9 : essai gated par carte bancaire.
-- `subscription_status` = signal d'accès. NULL = pas d'abonnement → pas d'accès
-- à l'app (le gate du middleware renvoie au checkout Stripe). Le webhook Stripe
-- écrit 'trialing' / 'active' (accès) ou 'canceled' / 'past_due' (accès coupé).
-- `plan` reste 'pro'/'max' (jamais NULL) mais ne suffit plus à donner l'accès.
alter table user_profiles add column if not exists subscription_status text;

-- v2.10 : seuil de levier configurable (détecteur overleverage) + exigence de
-- stop-loss (détecteur no_stop, opt-in). Lus avec défaut côté engine, donc la
-- migration n'est pas bloquante — mais sans ces colonnes l'UI ne peut pas les régler.
alter table trading_rules add column if not exists max_leverage      numeric not null default 30;
alter table trading_rules add column if not exists require_stop_loss boolean not null default false;

-- v2.11 : alertes Telegram (canal plan Max) — bot token + chat id fournis par l'user.
alter table trading_rules add column if not exists telegram_bot_token text;
alter table trading_rules add column if not exists telegram_chat_id   text;

-- v2.12 : détecteurs configurables (Max) — on/off + seuils par détecteur (jsonb).
alter table trading_rules add column if not exists detector_config jsonb not null default '{}'::jsonb;

-- v2.13 : mode prop firm (Max) — id du preset appliqué (FTMO, FundedNext…), informatif.
alter table trading_rules add column if not exists prop_firm text;

-- v2.14 : date de démarrage du compte prop firm → l'Analytique se scope à partir de
-- cette date quand le mode est actif (données « repartent à 0 » à l'activation).
alter table trading_rules add column if not exists prop_firm_started_at date;

-- v2.15 : déduplication des notifications push serveur (cron quotidien « nudges »).
-- kind = streak_discipline | streak_risque | streak_sangfroid | hard | idle | weekly.
-- value = dernier palier / date / clé de semaine déjà notifié → on n'envoie qu'une fois.
create table if not exists notif_state (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  kind       text        not null,
  value      text,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind)
);
alter table notif_state enable row level security;
drop policy if exists "users read own notif_state" on notif_state;
create policy "users read own notif_state" on notif_state for select using (auth.uid() = user_id);

-- v2.16 : prop_firm_started_at passe de `date` → `timestamptz` (heure EXACTE d'activation).
-- La Session live repart précisément au moment de l'activation (exclut les trades faits
-- plus tôt le même jour) ; l'Analytique/Calendrier comparent toujours sur la date (slice).
-- Les valeurs existantes (dates) deviennent minuit ce jour-là — comportement inchangé pour elles.
alter table trading_rules
  alter column prop_firm_started_at type timestamptz
  using prop_firm_started_at::timestamptz;

-- v2.17 : mode prop firm = VUE basculable (Classique ⇄ Prop firm) sans rien perdre.
-- `prop_firm` (firme) + `prop_firm_started_at` (heure d'activation) restent MÉMORISÉS
-- même en vue Classique ; `prop_firm_active` dit seulement quelle vue est affichée.
-- Classique = toutes les données ; Prop firm = données depuis l'activation.
alter table trading_rules add column if not exists prop_firm_active boolean not null default false;
-- Les comptes prop firm déjà configurés restent en vue prop firm après migration.
update trading_rules set prop_firm_active = true where prop_firm is not null;

-- v2.18 : phase du challenge prop firm (suivi de challenge) — 'p1' | 'p2' | 'funded'.
-- Sert à choisir l'objectif de profit (Phase 1/2) et l'affichage du suivi de challenge.
alter table trading_rules add column if not exists prop_firm_phase text not null default 'p1';

-- v2.19 : DEUX dates de démarrage prop firm pour séparer 2 scopes.
--  • prop_firm_started_at        = début de l'ÉVALUATION → Analytique + Calendrier.
--      Reset à : changement de firme, recommencer, passage en Funded. PAS à P1→P2.
--  • prop_firm_phase_started_at  = début de la PHASE en cours → suivi de challenge live
--      (objectif, marges, P&L, courbe). Reset à CHAQUE changement de phase + les ci-dessus.
-- Backfill : la phase démarre au même instant que l'évaluation pour l'existant.
alter table trading_rules add column if not exists prop_firm_phase_started_at timestamptz;
update trading_rules set prop_firm_phase_started_at = prop_firm_started_at
  where prop_firm_phase_started_at is null and prop_firm_started_at is not null;

-- v2.20 : connexion Interactive Brokers via Flex Web Service (modèle MT5 : token lecture
-- seule + worker qui interroge, gratuit, sans bot chez l'utilisateur ni partenariat).
-- `flex_token_enc` = token Flex chiffré (AES-256-GCM, MT5_ENC_KEY) ; `flex_query_id` =
-- l'ID de la requête « Trade Confirms ». Le worker poste les exécutions vers /api/ingest.
create table if not exists ibkr_accounts (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  flex_token_enc text        not null,
  flex_query_id  text        not null,
  ingest_key     text        not null,
  status         text,                   -- connected | auth_failed | error
  last_sync_at   timestamptz,
  last_trade_at  timestamptz,            -- dernier trade ingéré (anti-doublon côté worker)
  created_at     timestamptz default now(),
  unique (user_id)
);
alter table ibkr_accounts enable row level security;
-- L'utilisateur lit UNIQUEMENT sa propre ligne (carte d'état dans Intégrations). Le worker
-- et les routes utilisent la service role key qui bypasse la RLS (insert/update/delete).
drop policy if exists "users read own ibkr" on ibkr_accounts;
create policy "users read own ibkr" on ibkr_accounts for select using (auth.uid() = user_id);

-- v2.21 : connexion TradeStation via OAuth (futures + actions/options US, gratuit, sans bot,
-- modèle cTrader). Tokens chiffrés (AES-256-GCM, MT5_ENC_KEY). Le worker rafraîchit le token
-- et poste les ordres exécutés vers /api/ingest.
create table if not exists tradestation_accounts (
  id                 uuid        primary key default gen_random_uuid(),
  user_id            uuid        not null references auth.users(id) on delete cascade,
  access_token_enc   text        not null,
  refresh_token_enc  text,
  account_ids        text,                   -- IDs de comptes TradeStation (CSV), résolus par le worker
  token_expires_at   timestamptz,
  ingest_key         text        not null,
  status             text,                   -- connected | auth_failed | error
  last_sync_at       timestamptz,
  last_order_at      timestamptz,            -- dernier ordre ingéré (anti-doublon)
  created_at         timestamptz default now(),
  unique (user_id)
);
alter table tradestation_accounts enable row level security;
drop policy if exists "users read own tradestation" on tradestation_accounts;
create policy "users read own tradestation" on tradestation_accounts for select using (auth.uid() = user_id);

-- v2.22 : DURCISSEMENT RLS (audit sécurité 2026-06-29). ⚠️ À EXÉCUTER EN PROD.
-- Les policies « service role full access » … for all using (true) n'ont PAS de clause TO,
-- donc elles s'appliquent à TOUS les rôles (anon + authenticated), pas seulement au service
-- role (qui bypasse déjà la RLS). Conséquence : mt5_accounts (et toute table portant cette
-- policy sans policy own-row) était lisible par la clé anon PUBLIQUE — fuite confirmée
-- (login, serveur, mot de passe chiffré, ingest_key en clair). On retire ces policies
-- permissives et on garantit une lecture limitée à SA PROPRE ligne.

-- Tables broker + push : le client ne lit que SA ligne (statut) ; routes/workers écrivent
-- via la service role (bypass RLS). Donc une seule policy : SELECT own-row.
do $$
declare t text;
begin
  foreach t in array array['mt5_accounts','ctrader_accounts','tradovate_accounts','push_subscriptions'] loop
    execute format('drop policy if exists "service role full access" on %I;', t);
    execute format('drop policy if exists "users read own %1$s" on %1$s;', t);
    execute format('create policy "users read own %1$s" on %1$s for select using (auth.uid() = user_id);', t);
  end loop;
end $$;

-- Tables cœur : la policy permissive using(true) est inutile (service role bypasse la RLS)
-- et dangereuse. On la retire ; les policies own-row en lecture (déjà créées) suffisent.
do $$
declare t text;
begin
  foreach t in array array['user_profiles','trading_rules','api_keys','trades','alerts'] loop
    execute format('drop policy if exists "service role full access" on %I;', t);
  end loop;
end $$;

