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
- [ ] **Vercel Hobby → Pro (~20$/mois) — au 1er client payant** (plus bloquant pour le lancement). Crons ramenés à **2** (monthly-report + daily-nudges) → ça rentre dans Hobby, l'app tourne. Reste la règle « Hobby = non-commercial » → passer Pro dès le **1er paiement** (1 abonné couvre les 20€ + fiabilité + pas de risque de suspension). Upgrade = 1 clic, effet immédiat. Au 2026-06-27 : encore en Hobby.
- [x] **Nouveau prix Max 29€** — prix `price_1TmxBKBJjaZ0wLhV4oaUw5vk` (2900) créé en LIVE le 2026-06-27, ancien 34€ archivé, `.env.local` + `STRIPE_MAX_PRICE_ID` Vercel (Production) à jour.
- [x] **Outil de test push retiré** — bloc `?test=`/`&samples=` du cron `daily-nudges` supprimé (2026-06-27).
- [x] **Migrations SQL exécutées en prod** (Supabase SQL Editor, 2026-06-27) : v2.14 `prop_firm_started_at` + v2.15 table `notif_state`.
- [x] **cTrader day 1** — OK, validé (worker Railway → `caldra-sable.vercel.app`, ingest fonctionnel).
- [x] **MT5 day 1** — worker VPS à jour + relancé (2026-06-27). Connexion réelle validée : 3 comptes connectés (ICMarkets/Pepperstone/Vantage), trade test remonté dans le dashboard Caldra. ✅
- [ ] **Test end-to-end complet (inclut le paiement Stripe LIVE)** : signup → checkout (essai, CB réelle) → **webhook met à jour `user_profiles.plan` + `subscription_status`** → onboarding → connexion plateforme → ingest trade → alerte temps réel → dashboard. (Stripe LIVE déjà prêt : coupon START25 plafonné à 25 `caldra-early-25-cap`.) Le paiement et l'e2e sont le MÊME test, plus deux items séparés.
- [x] **Purge des données de test** en prod (trades/alertes — fait 2026-06-26).
- [ ] **🔒 AUDIT SÉCURITÉ + DROITS + CONFORMITÉ (demandé par le user, à faire AVANT le lancement public)** :
  - **RLS Supabase** : toutes les tables ont RLS activée + policies own-row (vérifier avec la clé anon qu'un user ne voit/écrit QUE ses lignes — cf. `mt5_accounts`, `notif_state`, `ctrader_accounts`, `tradovate_accounts`, `push_subscriptions`, `trading_rules`, `trades`, `alerts`, `user_profiles`).
  - **Auth des routes API** : chaque route vérifie l'identité (service-role key jamais exposée côté client ; `/api/ingest` via hash clé ; webhooks vérifiés signature).
  - **Secrets** : aucun secret committé (`.env.local` gitignoré), clés service-role/Stripe uniquement serveur, `MT5_ENC_KEY` non exposée.
  - **Chiffrement données sensibles** : mots de passe MT5 chiffrés (AES-256-GCM), pas de PII en clair inutile.
  - **RGPD / conformité** : mentions légales + politique de confidentialité à jour, suppression de compte (`/api/account/delete`) fonctionnelle, base de traitement, consentement, hébergement UE (Supabase région), DPA Stripe/Brevo/SES.
  - **Surface d'attaque** : rate-limiting/abuse sur routes publiques, pas d'IDOR (accès par user_id, pas d'id devinable), CORS, headers de sécurité.

## 🟡 Nice-to-have / post-lancement
- [ ] `STRIPE_WEBHOOK_SECRET` en local (présent sur Vercel — pas bloquant)
- [ ] Emails produit Brevo (alertes, rapport hebdo) testés bout-en-bout
- [ ] SPF : ajouter `include:amazonses.com` + custom MAIL FROM SES (double alignement)
- [~] DMARC : passé à `p=quarantine; pct=25` le 2026-06-27 (SES + Brevo confirmés DKIM-signés). **RESTE : monter `pct=25` → `pct=100` dans ~1 semaine** une fois la délivrabilité confirmée OK.
- [x] **#2 Guide de première connexion** ✅ (2026-06-29) — tour guidé multi-étapes (carte portal) qui bascule sur chaque onglet (Session, Calendrier, Analytique, Rapports, Règles, Intégrations) + intro/outro. S'affiche 1× (localStorage) + rejouable via « Revoir le guide » dans Aide.
- [x] **#13 Rapports = vrais documents** ✅ (2026-06-28) — PDF hebdo/mensuel refondu : synthèse rédigée, métriques de journal (profit factor, espérance, ratio gain/perte, séries, durée…), répartition Long/Short + par symbole, tendance discipline, recommandations, section prop firm. Logique factorisée dans `lib/reportData.ts`.
- [x] **#14 Page d'inscription complète** ✅ (2026-06-29) — ajout adresse, code postal, ville (requis) + pays (select) au formulaire, stockés en métadonnées. Stripe Checkout `billing_address_collection: 'required'`. Mail de confirmation déjà en place. Restait déjà : prénom/nom/téléphone/mdp + force.
- [~] **#8 Autres plateformes futures** — recherche faite : seules les voies « gratuit + sans bot » sont retenues. **IBKR (Flex Web Service, modèle MT5)** + **TradeStation (OAuth, modèle cTrader)** CODÉS (2026-06-29). **Tradovate** = via accord vendeur plus tard. Rithmic/ProjectX = payant/serveur interdit (écartés). NinjaTrader/Quantower/MotiveWave = add-on chez l'user (écartés). **IBKR : worker déployé sur Railway et EN LIGNE** (2026-06-29, `MT5_ENC_KEY` confirmée identique à Vercel par test de déchiffrement) ✅ — connexion réelle validée (rapport Flex lu, vide car pas de trade ce jour-là). Reste à valider avec un trade réel. **TradeStation : REMIS (décision user 2026-06-29, « ça fait un truc en plus qui fonctionne »)** — carte ACTIVE (clic OAuth), code/worker/routes/config Railway/table SQL restaurés. Limite connue : l'API ne donne pas le P&L réalisé par ordre → en l'état seuls les détecteurs d'ENTRÉE marchent (P&L réalisé reconstructible en FIFO plus tard si besoin). Pour l'activer en prod : enregistrer l'app sur developer.tradestation.com → `TRADESTATION_CLIENT_ID/SECRET` sur Vercel + service Railway (`railway.tradestation.json`), redirect_uri = `<APP_URL>/api/tradestation/callback`. **Binance + Coinbase (crypto)** restent en cartes « Prochainement » : clé API lecture seule, **temps réel** (REST + WebSocket, pas de passerelle comme IBKR), gratuit, sans entourloupe (P&L spot à reconstruire en FIFO). Autres « Prochainement » : Trading 212, IG (façon broker), Tradovate (accord vendeur).
- [ ] **Fuseau horaire = vrai timezone (Europe/Paris…) au lieu de `UTC+X` fixe** — le champ `tz_offset_hours` est un offset FIXE, il ne gère pas le passage été/hiver (DST). Conséquence : les users français doivent repasser le champ de 2→1 fin octobre. Remplacer par un IANA timezone (auto-DST). Touche `tz_offset_hours` (stockage) + `userDay()` moteur + `dayFloorUTC` client + détecteur d'horaires. Post-lancement. (noté 2026-06-29)
- [ ] Idées backlog plus anciennes : journal de trading, couche engagement, détecteur symbole inhabituel

## ✅ Fait sessions 2026-06-27/28
- Worker MT5 redéployé + connexion réelle validée ; migrations v2.14→v2.18 toutes passées.
- Stripe Max 29€ LIVE (produit réactivé, ancien 34€ archivé) ; bug 500 checkout réglé + handler GET résilient.
- Rapports : hebdo = push « rapport prêt » le dimanche (Max) ; mensuel = email PDF (tous payants) ; 2 crons (rentre dans Hobby).
- 6 quick wins UI (4 patterns Pro, « patterns récurrents », Long/Short neutre, score moy. blanc, halo score, fix mobile calendrier).
- **Mode prop firm complet** : suivi de challenge (bandeau dépliable, neutre), phases p1/p2/funded, débriefs IA scopés, popup reset, **mode strict** (seuils resserrés). C'est la vraie valeur Max.

---

## Notes
- Stack/archi : voir `CLAUDE.md`.
- Templates emails : `docs/supabase-email-templates.md`.
- Setup worker MT5 : `worker/SETUP-VPS.md`.
