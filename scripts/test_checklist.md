# Caldra — Checklist test client A à Z

> Tests manuels à effectuer dans le navigateur sur https://getcaldra.com
> Cocher chaque case après vérification.

---

## 1. Landing page (non connecté)

- [ ] Page s'affiche correctement, pas d'erreur console
- [ ] Formulaire waitlist hero : email invalide → message d'erreur visible
- [ ] Formulaire waitlist hero : email valide → message de confirmation + email Brevo reçu
- [ ] Formulaire waitlist footer : même comportement
- [ ] Bouton "Connexion" → redirige vers `/login`
- [ ] Lien `/pricing` → page tarifs Pro/Sentinel affichée

---

## 2. Auth — Inscription

- [ ] `/signup` : formulaire visible
- [ ] Email + mot de passe faibles → message d'erreur
- [ ] Email valide + mot de passe fort → email de confirmation envoyé
- [ ] Lien de confirmation dans l'email → redirige vers `/onboarding` (première fois)
- [ ] Trigger Supabase : ligne `user_profiles` créée automatiquement (plan = "pro")

---

## 3. Onboarding

- [ ] Wizard s'affiche (3 ou 4 étapes)
- [ ] Validation : champs requis vides → impossible de passer à l'étape suivante
- [ ] Compléter toutes les étapes → redirige vers `/dashboard`
- [ ] Ligne `trading_rules` créée dans Supabase avec les valeurs saisies

---

## 4. Auth — Connexion

- [ ] `/login` : mauvais mot de passe → message d'erreur
- [ ] Bon email/mot de passe → redirige vers `/dashboard`
- [ ] Middleware : accès `/dashboard` sans session → redirige vers `/login`
- [ ] Après login, accès à une route protégée fonctionne directement

---

## 5. Dashboard

- [ ] Page s'affiche sans erreur
- [ ] ScoreRing affiche le score de session (100 si aucun trade)
- [ ] AlertFeed vide → message "Aucune alerte" ou équivalent
- [ ] TradeLog vide → état vide affiché
- [ ] SessionLine animée visible
- [ ] PnL = 0 affiché en `#e2e8f0` (pas vert/rouge)

---

## 6. Clé API

- [ ] `/settings/api` : page chargée
- [ ] Générer une clé → clé affichée une seule fois (format `cal_...`)
- [ ] Recharger la page → seul le préfixe est visible (clé masquée)
- [ ] Révoquer la clé → clé supprimée, bouton "Générer" réapparu

---

## 7. Ingest — via curl (trade test)

Remplacer `cal_VOTRE_CLE` par la vraie clé.

```bash
# Trade fermé valide
curl -X POST https://getcaldra.com/api/ingest \
  -H "Content-Type: application/json" \
  -H "x-caldra-key: cal_VOTRE_CLE" \
  -d '{
    "symbol": "EURUSD",
    "direction": "long",
    "size": 0.1,
    "entry_price": 1.08500,
    "exit_price": 1.08350,
    "entry_time": "2026-05-09T09:30:00Z",
    "exit_time": "2026-05-09T10:00:00Z",
    "pnl": -15.00
  }'
```

Réponse attendue :
```json
{"success":true,"trade_id":"...","alerts_generated":0,"alerts":[]}
```

- [ ] Réponse 200 `success: true`
- [ ] Trade apparaît dans le dashboard (realtime — max 3 secondes)
- [ ] Rejouer plusieurs fois jusqu'à déclencher une alerte (ex: `pnl: -500` × 3 → `consecutive_losses`)

---

## 8. Alertes

- [ ] `/alerts` : liste des alertes affichées
- [ ] Filtre par level fonctionne
- [ ] Recherche par symbole fonctionne
- [ ] Export CSV télécharge un fichier correct

---

## 9. Analytics

- [ ] `/analytics` : page chargée
- [ ] PnL chart SVG rendu (même si 0 trade)
- [ ] Tableau "Performance par jour" visible
- [ ] Alertes par type affichées

---

## 10. Règles trading

- [ ] `/settings/rules` : valeurs sauvegardées au step 3 affichées
- [ ] Modifier une valeur + sauvegarder → confirmation visible
- [ ] Recharger la page → valeurs persistées

---

## 11. Intégrations

- [ ] `/settings/integrations` : onglets MT5 / cTrader visibles
- [ ] Onglet MT5 : guide 5 étapes + bouton téléchargement `CaldraMT5.mq5`
- [ ] Téléchargement → fichier `.mq5` récupéré
- [ ] Webhook Slack : URL renseignée + sauvegardée

---

## 12. Sentinel (IA coaching)

- [ ] Bouton Sentinel accessible depuis le dashboard (si trades présents)
- [ ] Envoi d'un message → réponse en 1-3 phrases en français
- [ ] 11e message dans la minute → erreur "Too many requests" (429)

---

## 13. Billing

- [ ] `/billing` sans paramètre → redirige vers `/dashboard`
- [ ] Checkout Stripe Pro → page Stripe s'ouvre
- [ ] Annulation Stripe → `/billing?canceled=1` → message d'annulation
- [ ] (Test complet paiement uniquement en Stripe test mode avec carte 4242 4242...)

---

## 14. Logout

- [ ] Cliquer "Déconnexion" → redirige vers `/login`
- [ ] Accéder à `/dashboard` après déconnexion → redirige vers `/login`

---

## 15. Sécurité — vérification headers

```bash
curl -I https://getcaldra.com
```

Vérifier la présence de :
- [ ] `x-frame-options: DENY`
- [ ] `x-content-type-options: nosniff`
- [ ] `strict-transport-security: max-age=63072000`
- [ ] `content-security-policy: ...`
- [ ] `referrer-policy: strict-origin-when-cross-origin`

---

## 16. MT5 — test complet avec vrai compte

- [ ] Ouvrir et fermer un trade sur Vantage Markets (ou autre MT5)
- [ ] EA `CaldraMT5.mq5` actif sur le compte → log `[Caldra] Trade envoyé ✓`
- [ ] Trade apparaît dans le dashboard Caldra
- [ ] Alerte générée si règle violée (ex: re-entrée < 2 min)
