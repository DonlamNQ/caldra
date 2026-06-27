# Checklist de lancement Caldra — semaine du 30/06/2026

> Objectif : figer ce qui reste à finir avant le lancement et arrêter de s'éparpiller.
> On coche au fur et à mesure. Mis à jour le 2026-06-24.

Connexions plateforme critiques **jour 1** : **cTrader (OAuth)** + **MT5 (identifiants)**.

---

## 🟢 Fait (vérifié)
- [x] Auth complète (login/signup, middleware, callback, onboarding)
- [x] Dashboard temps réel (ScoreRing, AlertFeed, TradeLog, analytics)
- [x] 18 détecteurs comportementaux (`lib/engine.ts`) + gating par plan (Pro 12 / Max 18 ; revenge_sizing en Pro)
- [x] Mode prop firm (Max) : presets garde-fous, ambiance violette, Analytics scopée au démarrage du compte
- [x] Notifications push serveur (cron quotidien `daily-nudges`) : streaks, reprise, inactivité, bilan hebdo
- [x] Couche engagement : message du jour, streaks de discipline (×3), rappels contextuels
- [x] Billing Stripe (checkout / portal / webhook validé en prod)
- [x] Essai 7 jours gated CB + promo START25 (−25 % à vie)
- [x] Emails d'auth : Amazon SES, DMARC PASS, 6 templates FR sans emoji
- [x] Pages légales (mentions légales, confidentialité)
- [x] MT5 autostart VPS (anti-reboot validé, test reboot réussi le 20/06)
- [x] Landing en mode lancement (CTA → /signup, essai 7j — plus de waitlist)

## 🔴 À finir / confirmer avant lancement
- [x] **Nouveau prix Max 29€** — prix `price_1TmxBKBJjaZ0wLhV4oaUw5vk` (2900) créé en LIVE le 2026-06-27, ancien 34€ archivé, `.env.local` + `STRIPE_MAX_PRICE_ID` Vercel (Production) à jour.
- [x] **Outil de test push retiré** — bloc `?test=`/`&samples=` du cron `daily-nudges` supprimé (2026-06-27).
- [x] **Migrations SQL exécutées en prod** (Supabase SQL Editor, 2026-06-27) : v2.14 `prop_firm_started_at` + v2.15 table `notif_state`.
- [ ] **Stripe en mode LIVE** — coupon START25 plafonné à 25 (`caldra-early-25-cap`). **RESTE : un vrai test de paiement end-to-end** (webhook → `user_profiles.plan` + `subscription_status`).
- [x] **cTrader day 1** — OK, validé (worker Railway → `caldra-sable.vercel.app`, ingest fonctionnel).
- [x] **MT5 day 1** — worker VPS à jour + relancé (2026-06-27). Connexion réelle validée : 3 comptes connectés (ICMarkets/Pepperstone/Vantage), trade test remonté dans le dashboard Caldra. ✅
- [ ] **Test end-to-end complet** : signup → checkout (essai) → onboarding → connexion plateforme → ingest trade → alerte temps réel → dashboard.
- [x] **Purge des données de test** en prod (trades/alertes — fait 2026-06-26).

## 🟡 Nice-to-have / post-lancement
- [ ] `STRIPE_WEBHOOK_SECRET` en local (présent sur Vercel — pas bloquant)
- [ ] Emails produit Brevo (alertes, rapport hebdo) testés bout-en-bout
- [ ] SPF : ajouter `include:amazonses.com` + custom MAIL FROM SES (double alignement)
- [ ] DMARC `p=none` → `p=quarantine` une fois les rapports propres
- [ ] NinjaTrader / Futures (add-on) — voie secondaire, pas day 1
- [ ] Idées backlog : journal de trading, couche engagement, détecteur symbole inhabituel

---

## Notes
- Stack/archi : voir `CLAUDE.md`.
- Templates emails : `docs/supabase-email-templates.md`.
- Setup worker MT5 : `worker/SETUP-VPS.md`.
