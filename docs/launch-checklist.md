# Checklist de lancement Caldra — semaine du 30/06/2026

> Objectif : figer ce qui reste à finir avant le lancement et arrêter de s'éparpiller.
> On coche au fur et à mesure. Mis à jour le 2026-06-24.

Connexions plateforme critiques **jour 1** : **cTrader (OAuth)** + **MT5 (identifiants)**.

---

## 🟢 Fait (vérifié)
- [x] Auth complète (login/signup, middleware, callback, onboarding)
- [x] Dashboard temps réel (ScoreRing, AlertFeed, TradeLog, analytics)
- [x] 18 détecteurs comportementaux (`lib/engine.ts`) + gating par plan
- [x] Billing Stripe (checkout / portal / webhook validé en prod)
- [x] Essai 7 jours gated CB + promo START25 (−25 % à vie)
- [x] Emails d'auth : Amazon SES, DMARC PASS, 6 templates FR sans emoji
- [x] Pages légales (mentions légales, confidentialité)
- [x] MT5 autostart VPS (anti-reboot validé, test reboot réussi le 20/06)
- [x] Landing en mode lancement (CTA → /signup, essai 7j — plus de waitlist)

## 🔴 À finir / confirmer avant lancement
- [ ] **Stripe en mode LIVE** — confirmer par un **vrai test de paiement** (carte ajoutée le 23/06) : produits Pro/Max + price IDs *live* dans Vercel, webhook *live* qui met bien à jour `user_profiles.plan` + `subscription_status`.
- [x] **cTrader day 1** — OK, validé (worker Railway → `caldra-sable.vercel.app`, ingest fonctionnel).
- [ ] **MT5 day 1** — worker VPS opérationnel, `MT5_ENC_KEY` identique Vercel+VPS, « Sauvegarder infos compte » coché + Algo Trading vert. Tester une connexion client réelle.
- [ ] **Test end-to-end complet** : signup → checkout (essai) → onboarding → connexion plateforme → ingest trade → alerte temps réel → dashboard.
- [ ] **Purge des données de test** en prod (trades/alertes de test restants).

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
