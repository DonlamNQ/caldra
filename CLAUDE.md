# Caldra — Guide Claude Code

SaaS de monitoring comportemental pour traders. Analyse chaque trade en temps réel et déclenche des alertes (revenge sizing, re-entrées impulsives, drawdown, overtrading).

---

## Stack

| Couche | Techno |
|---|---|
| Framework | Next.js 14 App Router |
| Auth + DB + Realtime | Supabase (`@supabase/ssr` v0.3.0) |
| Billing | Stripe |
| IA coaching | Anthropic SDK (`claude-sonnet-4-6`) |
| Langage | TypeScript strict=false |
| Style | Inline styles (pas de Tailwind, pas de CSS modules) |

---

## Architecture des fichiers

```
caldra/
├── app/
│   ├── page.tsx                      # Landing page (public)
│   ├── login/
│   │   ├── page.tsx                  # Formulaire login (Client Component)
│   │   └── actions.ts                # Server Action signInWithPassword → redirect
│   ├── signup/
│   │   ├── page.tsx                  # Formulaire signup (Client Component)
│   │   └── actions.ts                # Server Action signUp → redirect ou confirm
│   ├── auth/callback/route.ts        # Échange code Supabase → session → redirect
│   ├── onboarding/
│   │   ├── page.tsx                  # Server Component — skip si règles existent
│   │   └── OnboardingWizard.tsx      # Wizard 3 étapes (Client Component)
│   ├── dashboard/
│   │   ├── page.tsx                  # Server Component — charge alertes/trades du jour
│   │   └── DashboardClient.tsx       # Realtime Supabase, ScoreRing, AlertFeed, TradeLog
│   ├── alerts/
│   │   ├── page.tsx                  # Server Component — charge 500 dernières alertes
│   │   └── AlertsClient.tsx          # Filtres, search, pagination, export CSV
│   ├── analytics/
│   │   ├── page.tsx                  # Server Component — 30 derniers jours
│   │   └── AnalyticsClient.tsx       # PnL chart SVG, alertes par type, table par jour
│   ├── billing/
│   │   ├── page.tsx                  # Server Component — charge plan depuis user_profiles
│   │   └── BillingClient.tsx         # Plans Free/Pro/Team, Stripe checkout/portal
│   ├── pricing/page.tsx              # Page tarifs (public)
│   ├── settings/
│   │   ├── rules/
│   │   │   ├── page.tsx              # Server Component — charge trading_rules
│   │   │   └── RulesForm.tsx         # Formulaire règles (Client Component)
│   │   └── api/
│   │       ├── page.tsx              # Server Component — charge api_keys
│   │       └── ApiKeyClient.tsx      # Génération/révocation clé API + snippet curl
│   └── api/
│       ├── ingest/route.ts           # POST — ingest trades via x-caldra-key
│       ├── rules/route.ts            # GET/PUT — trading_rules
│       ├── session/route.ts          # GET — session stats du jour
│       ├── api-key/route.ts          # GET/POST/DELETE — gestion clés API
│       ├── detect/route.js           # POST — ancien endpoint (legacy, garder)
│       └── billing/
│           ├── checkout/route.ts     # POST — crée Stripe Checkout Session
│           ├── portal/route.ts       # POST — lien Stripe Customer Portal
│           └── webhook/route.ts      # POST — Stripe webhook (update plan)
├── components/
│   ├── AppHeader.tsx                 # Header nav partagé (dashboard, alerts, analytics…)
│   ├── AlertPanel.jsx                # (legacy)
│   └── dashboard/
│       ├── ScoreRing.tsx             # SVG ring score 0-100
│       ├── AlertFeed.tsx             # Feed alertes avec badge level + animation
│       └── TradeLog.tsx              # Table trades du jour
├── lib/
│   ├── engine.ts                     # 6 détecteurs comportementaux → INSERT alerts
│   ├── schema.sql                    # Schéma complet Supabase v2 (à exécuter en SQL Editor)
│   ├── supabase/
│   │   ├── client.ts                 # createBrowserClient (Client Components)
│   │   └── server.ts                 # createServerClient (Server Components / Actions)
│   ├── detector.js                   # (legacy — utilisé par /api/detect)
│   ├── ai-analyzer.js                # (legacy — analyse IA pour alertes critiques)
│   └── supabase.js                   # (legacy — utilisé par /api/detect)
├── middleware.ts                     # Auth guard + session refresh Supabase
├── .env.local                        # Variables d'env (ne JAMAIS committer)
├── .env.local.example                # Template variables d'env
└── tasks.json                        # Suivi des sprints
```

---

## Base de données Supabase (schéma v2)

Fichier de référence : `lib/schema.sql` — **exécuter dans Supabase SQL Editor avant tout test**.

### Tables

```sql
user_profiles   -- plan (free/pro/team), stripe_customer_id, stripe_subscription_id
trading_rules   -- règles par user : drawdown, pertes consécutives, horaires, max trades
api_keys        -- clés API per-user : key_hash (SHA-256), key_prefix (display)
trades          -- user_id, symbol, direction, size, entry_price, exit_price, pnl, entry_time
alerts          -- user_id, trade_id, type, level (1/2/3), message, detail (jsonb), session_date
```

### Trigger automatique
Un trigger `on_auth_user_created` crée une ligne `user_profiles` à chaque signup.

### Realtime
`alerts` est ajoutée à `supabase_realtime` publication → le dashboard se met à jour en live.

---

## Auth flow

```
Signup  → app/signup/page.tsx (CLIENT-SIDE, createBrowserClient)   ← NE PAS passer en Server Action
           → supabase.auth.signUp()                                      le code-verifier PKCE doit être
           → si session immédiate : window.location.href = '/onboarding' écrit dans document.cookie AVANT
           → sinon : affiche "vérifiez votre email"                      toute navigation

Email   → lien pointe vers /auth/callback?code=...
confirm    → exchangeCodeForSession(code)  [avec fallback si code expiré]
           → getDestination() : vérifie trading_rules → /onboarding (0 règles) ou /dashboard

Login   → app/login/actions.ts (Server Action)   ← IMPORTANT : Server Action obligatoire
           → supabase.auth.signInWithPassword()       pour que Set-Cookie soit dans la réponse
           → vérifie trading_rules → redirect('/onboarding') si 0 règles, sinon redirect('/dashboard')
           → next param honoré si fourni et ≠ /login

Logout  → window.location.href = '/login'  (dans AppHeader, DashboardClient, etc.)
           NE PAS utiliser router.push() + router.refresh() → crée des boucles de redirection
```

### Pourquoi Server Action pour le login (ne pas changer)
`@supabase/ssr v0.3.0` écrit la session en chunks asynchrones via `document.cookie`. Si on navigue côté client avant que tous les chunks soient écrits, le middleware ne voit pas la session et redirige en boucle vers `/login`. Avec un Server Action, le `Set-Cookie` est posé dans les headers de la réponse HTTP — le middleware le voit immédiatement.

---

## Endpoint `/api/ingest`

L'endpoint principal que les plateformes de trading appellent pour envoyer des trades.

```bash
POST /api/ingest
Header: x-caldra-key: cal_xxxxxxxxxxxxxxxxxxxx

{
  "symbol": "ES",
  "direction": "long",
  "size": 2,
  "entry_price": 5210.50,
  "exit_price": 5198.25,
  "entry_time": "2026-03-31T09:45:00Z",
  "exit_time": "2026-03-31T10:12:00Z",
  "pnl": -24.50
}
```

- Valide `x-caldra-key` via hash SHA-256 → table `api_keys` → résout `user_id`
- `user_id` n'est PAS dans le body (sécurité)
- Appelle `analyzeTradeForAlerts()` dans `lib/engine.ts` → INSERT dans `alerts`
- Le dashboard se met à jour via Supabase Realtime

### 6 détecteurs dans `lib/engine.ts`

| Détecteur | Level | Condition |
|---|---|---|
| `revenge_sizing` | 2 | size > last_size × 1.5 après une perte |
| `immediate_reentry` | 1 | < `min_time_between_entries_sec` après la sortie |
| `consecutive_losses` | 2 | ≥ `max_consecutive_losses` pertes d'affilée |
| `drawdown_alert` | 2/3 | PnL session < 80%/100% du drawdown max |
| `outside_session` | 1 | trade hors `session_start`–`session_end` |
| `overtrading` | 1/2 | ≥ 80%/100% de `max_trades_per_session` |

---

## Score de session

Calculé côté client ET serveur (fonction dupliquée — à extraire si besoin) :

```ts
score = 100 - Σ(deductions)
// level 3 → -18 pts | level 2 → -8 pts | level 1 → -3 pts
// min = 0
```

---

## Billing Stripe

### Routes
- `POST /api/billing/checkout` — crée une Checkout Session, retourne `{ url }`
- `POST /api/billing/portal` — retourne le lien Customer Portal Stripe
- `POST /api/billing/webhook` — reçoit les events Stripe, met à jour `user_profiles.plan`

### Events traités
- `checkout.session.completed` → set plan + stripe_subscription_id
- `customer.subscription.updated` → update plan selon price ID
- `customer.subscription.deleted` → downgrade vers `free`

### Plans
| Plan | Prix | Limite |
|---|---|---|
| `free` | Gratuit | 50 trades/jour |
| `pro` | 29€/mois | Illimité + IA coaching |
| `team` | 99€/mois | 5 traders + dashboard consolidé |

---

## Variables d'environnement

Copier `.env.local.example` → `.env.local` et remplir :

```bash
# Supabase (Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Stripe (dashboard.stripe.com → Developers → API Keys)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=      # Price ID du produit Pro dans Stripe
STRIPE_TEAM_PRICE_ID=     # Price ID du produit Team dans Stripe

# App (pour les redirects Stripe en production)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Supabase Dashboard — configuration requise

### Authentication → URL Configuration
```
Site URL:      https://getcaldra.com          (prod)
               http://localhost:3000          (dev)
Redirect URLs: https://getcaldra.com/**
               http://localhost:3000/**
```

### SQL Editor
Exécuter `lib/schema.sql` en entier pour créer les tables, triggers, RLS et realtime.

---

## Stripe — configuration requise

1. Créer deux produits (Pro 29€/mois, Team 99€/mois) → copier les Price IDs dans `.env.local`
2. Ajouter un webhook endpoint :
   - URL : `https://votre-app.vercel.app/api/billing/webhook`
   - Events : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
3. Copier le Webhook Secret dans `STRIPE_WEBHOOK_SECRET`

---

## Commandes

```bash
# Développement
npm run dev          # Lance sur http://localhost:3000

# Build
npm run build        # Build production
npm run start        # Lance le build production

# TypeScript
npx tsc --noEmit     # Vérifie sans compiler (0 erreur attendue)
```

---

## Conventions de code

- **Pas de Tailwind** — tout en inline styles avec des objets `React.CSSProperties`
- **Palette** : bg `#08080d`, card `#0d0d1a`, border `#1e1e35`, text `#e2e8f0`, muted `#475569`
- **Server Actions** pour toutes les mutations auth (login, signup) — jamais `router.push + router.refresh`
- **`window.location.href`** pour les navigations post-auth dans les Client Components (logout)
- **Service role key** uniquement côté serveur (API routes, Server Actions, Server Components)
- **Schéma DB** : toujours `user_id` (pas `session_id`), `level` (pas `severity`), `entry_time` (pas `opened_at`)

---

## État du projet (2026-04-08)

### ✅ Terminé
- Auth complète (login/signup Server Actions, middleware, callback, onboarding)
- Schéma DB v2 (5 tables, RLS, triggers, realtime)
- Dashboard temps réel (ScoreRing, AlertFeed, TradeLog)
- `/api/ingest` avec auth per-user API key (SHA-256)
- 6 détecteurs comportementaux dans `lib/engine.ts`
- Analytics (PnL chart SVG, alertes par type, performance par jour)
- Alertes (historique, filtres, search, export CSV)
- Settings (règles trading, clé API)
- Billing (Stripe checkout + portal + webhook)
- Toutes les pages — TypeScript 0 erreur

### ✅ Déploiement prod (01/04/2026)
- Fix Stripe lazy init dans `app/api/billing/webhook/route.ts`, `checkout/route.ts`, `portal/route.ts` — évite le crash au build quand `STRIPE_SECRET_KEY` est absent
- Contrainte UNIQUE ajoutée sur `trading_rules.user_id` dans Supabase (`ALTER TABLE trading_rules ADD CONSTRAINT trading_rules_user_id_key UNIQUE (user_id)`)
- Variables d'env configurées sur Vercel (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`)
- Domaine `getcaldra.com` acheté sur Namecheap et connecté à Vercel (A record `216.198.79.1` + CNAME `e18fb8e584972c72.vercel-dns-017.com`)
- Supabase URL Configuration mis à jour : Site URL = `https://getcaldra.com`, Redirect URLs = `https://getcaldra.com/**`
- Landing page mise à jour : nouveau design, pricing 2 plans (Pro/Sentinel), carousel patterns comportementaux, témoignages mis à jour

### ✅ Polissage UI (08/04/2026)
- Logo "CALDRA SESSION" : `letterSpacing` de "CALDRA" augmenté à 8, `letterSpacing` de "SESSION" réduit à 3 → hiérarchie visuelle claire. Appliqué dans `AppHeader.tsx` ET `DashboardClient.tsx`.
- Inputs number dans `RulesForm.tsx` : flèches webkit/moz supprimées via `<style>` global injecté dans le composant.
- Calendrier (`CalendrierPanel` dans `DashboardClient.tsx`) : jours avec trades → `#1a1a2e` / border `rgba(220,80,60,.45)` / texte `#e2e8f0`. Jours sans trades → `#0d0d1a` / border `#1e1e35` / texte `#475569`. Jour sélectionné → fond `rgba(220,80,60,.12)` / border `#dc503c`. Numéros de jours 13px.
- Graphique PnL (`PnlChart`) dans l'onglet "Session live" : toujours visible. 0 trade → axes + "// en attente de trades". 1 trade → point unique. 2+ → ligne continue. Couleur neutre `#e2e8f0`, grille `#1e1e35`.
- PnL affiché en `#e2e8f0` (neutre) **partout dans le dashboard** — jamais rouge ou vert. Règle anti-biais cognitif appliquée dans : SessionPanel, J-1 bar, trade feed, footer stats, AnalyticsPanel, graphique cumulé analytics, SentinelPanel.
- Page de connexion (`app/login/page.tsx`) : redesign complet cohérent avec la landing — fond `#08080d`, card `#0d0d1a`, logo CALDRA style header, bouton `#dc503c`, DM Sans, lien inscription en bas.

### 🎨 Conventions visuelles à respecter
- **PnL = toujours `#e2e8f0`** dans le dashboard (jamais C.g/C.red) — anti-biais cognitif
- **Logo** : CALDRA `letterSpacing: 8`, SESSION `letterSpacing: 3`, fontSize 7
- **Calendrier** : jours avec trades = `#1a1a2e` bg + border rouge ; sans trades = `#0d0d1a` bg + border `#1e1e35`
- **PnlChart** : toujours rendu (même à 0 trade), couleur ligne `#e2e8f0`, grille `#1e1e35`
- **Inputs number** : pas de flèches (webkit-appearance: none + moz-appearance: textfield)

### 🌍 Prod
- URL : https://getcaldra.com
- Waitlist Brevo opérationnelle
- Auth magic link fonctionnelle end-to-end

### ⏳ À configurer (une seule fois, hors code)
- Créer produits Stripe + webhook → remplir `.env.local` et Vercel env vars

### 🔜 Prochaines features possibles
- Alertes Slack / Webhook sortant
- Export PDF rapport hebdomadaire
- Dashboard consolidé Team (multi-traders)
- IA coaching via Anthropic pour les alertes level 3
- `account_size` configurable dans `trading_rules` (actuellement hardcodé à 10 000)
