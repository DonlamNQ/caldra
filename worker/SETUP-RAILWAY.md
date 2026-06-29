# Workers Node sur Railway — installation

Trois workers de Caldra sont du **Node pur** (pas de MetaTrader, pas de Python) et
tournent donc très bien sur **Railway**, 24/7, sans VPS Windows :

| Worker | Fichier | Script npm | Plateforme |
|---|---|---|---|
| cTrader | `ctrader-worker.js` | `npm start` | forex / CFD (OAuth) |
| Interactive Brokers | `ibkr-worker.js` | `npm run start:ibkr` | futures / actions / options (Flex) |
| TradeStation | `tradestation-worker.js` | `npm run start:tradestation` | futures / actions / options US (OAuth) |

> Le worker **MT5** reste à part : lui a besoin du terminal MetaTrader (appli GUI) et
> d'une vraie session de bureau → il vit sur le **VPS Windows** (voir `SETUP-VPS.md`).
> Ne pas tenter de le mettre sur Railway.

Chaque worker = **un service Railway séparé** (même repo, même dossier `worker/`,
mais une commande de démarrage différente). Trois services = trois processus
indépendants : si l'un crashe, les autres continuent.

---

## 0. Prérequis
- Un compte **Railway** (railway.app). Le plan Hobby suffit au démarrage ; passer au
  plan payant quand le volume monte (ces workers sont légers : un poll toutes les 30 s).
- Le repo GitHub `caldra` connecté à Railway (les workers se déploient depuis le repo).
- Les valeurs d'env sous la main :
  - `SUPABASE_URL` = `NEXT_PUBLIC_SUPABASE_URL` (depuis `.env.local` / Vercel)
  - `SUPABASE_SERVICE_ROLE_KEY` (depuis `.env.local` / Vercel)
  - `MT5_ENC_KEY` = **exactement** la même valeur que sur Vercel (sinon les workers ne
    peuvent pas déchiffrer les tokens → tout échoue en déchiffrement)
  - pour TradeStation : `TRADESTATION_CLIENT_ID` / `TRADESTATION_CLIENT_SECRET`
    (voir l'étape « Enregistrer l'app TradeStation » plus bas)

---

## 1. Créer un service par worker

Pour **chaque** worker, dans Railway :

1. **New Project** (ou, dans un projet existant, **New → Service**) → **Deploy from GitHub repo** → choisir `caldra`.
2. Ouvrir le service → **Settings** :
   - **Root Directory** : `worker`
     (le `package.json` et les workers y sont ; Railway lancera `npm install` ici).
   - **Start Command** : selon le worker —
     - cTrader → `npm start`
     - IBKR → `npm run start:ibkr`
     - TradeStation → `npm run start:tradestation`
   - **(Optionnel) Service Name** : `caldra-ibkr`, `caldra-tradestation`, `caldra-ctrader`
     pour s'y retrouver.
3. Onglet **Variables** → ajouter les variables d'env (section suivante).
4. **Deploy**. Dans **Deployments → View Logs**, tu dois voir la ligne de démarrage :
   - IBKR : `[ibkr] worker démarré, poll 30 s`
   - TradeStation : `[ts] worker démarré, poll 30 s`
   - cTrader : log de connexion cTrader.

> Ces workers n'écoutent **aucun port HTTP** (ce sont des boucles `setInterval`).
> Railway peut afficher « no open ports detected » — c'est **normal**, ce ne sont pas
> des serveurs web. Ne pas y attacher de domaine ni de healthcheck HTTP.

---

## 2. Variables d'env par service

### Communes aux trois
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
CALDRA_INGEST_URL=https://caldra-sable.vercel.app/api/ingest
```
> `CALDRA_INGEST_URL` pointe sur `caldra-sable.vercel.app` (et **pas** getcaldra.com)
> pour contourner le Bot Fight Mode de Cloudflare qui bloque les requêtes serveur.

### IBKR — en plus
```
MT5_ENC_KEY=<exactement la même valeur que sur Vercel>
```

### TradeStation — en plus
```
MT5_ENC_KEY=<exactement la même valeur que sur Vercel>
TRADESTATION_CLIENT_ID=<depuis l'app TradeStation>
TRADESTATION_CLIENT_SECRET=<depuis l'app TradeStation>
```

### cTrader — en plus
```
CTRADER_CLIENT_ID=<openapi.ctrader.com → My Apps>
CTRADER_CLIENT_SECRET=<idem>
# CTRADER_ENV laissé VIDE en prod (gère démo + live dans le même processus)
```

> `MT5_ENC_KEY` sert de clé de déchiffrement (AES-256-GCM) commune à Vercel et aux
> workers IBKR/TradeStation. La moindre différence d'un caractère = déchiffrement KO.

---

## 3. Enregistrer l'app TradeStation (une seule fois)

Le flux OAuth TradeStation a besoin d'identifiants d'app :

1. Aller sur **developer.tradestation.com**, créer une application.
2. **Redirect URI** : `https://getcaldra.com/api/tradestation/callback`
   (doit correspondre exactement à `NEXT_PUBLIC_APP_URL` + `/api/tradestation/callback`).
3. Scopes : `openid profile offline_access ReadAccount` (lecture seule + refresh token).
4. Récupérer **Client ID** et **Client Secret**, puis les poser **à deux endroits** :
   - sur **Vercel** (les routes `/api/tradestation/connect` et `/callback` en ont besoin)
   - sur le **service Railway** TradeStation (le worker rafraîchit le token).

---

## 4. Mettre à jour un worker après un push

Railway redéploie automatiquement à chaque push sur la branche connectée (`main`).
Si l'auto-deploy est désactivé : ouvrir le service → **Deployments → Redeploy**.

---

## 5. Validation de bout en bout

Pour chaque intégration :
1. Connecter un compte via Caldra (onglet **Intégrations** → IBKR « Se connecter » /
   TradeStation OAuth en un clic).
2. La carte doit passer de « EN ATTENTE… » à **« CONNECTÉ »** (le worker met le statut
   à jour à chaque poll, soit ≤ 30 s).
3. Faire (ou avoir) un trade exécuté → il doit remonter au dashboard.
4. Côté logs Railway, le worker journalise chaque envoi :
   - IBKR : `[ibkr] <user_id> : N trade(s) ingéré(s)`
   - TradeStation : `[ts] <user_id> : N exécution(s) ingérée(s)`

### Statuts possibles (colonne `status` en base, repris par l'UI)
- `connected` — OK, le worker lit le compte.
- `auth_failed` — token Flex invalide (IBKR) / autorisation OAuth expirée (TradeStation).
  → l'utilisateur doit se reconnecter.
- `error` — réponse inattendue du broker (rapport indisponible, comptes non résolus…).
  → regarder les logs Railway.

---

## Dépannage

- **Le statut reste « EN ATTENTE… »** : le worker ne tourne pas ou n'atteint pas la base.
  Vérifier les logs Railway et que `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` sont bons.
- **`auth_failed` immédiat** : `MT5_ENC_KEY` du worker ≠ celle de Vercel → le token
  déchiffré est corrompu. Réaligner la clé, puis l'utilisateur se reconnecte (le token
  est rechiffré avec la bonne clé au moment de la reconnexion).
- **TradeStation : `token exchange échoué` / refresh KO** : `CLIENT_ID/SECRET` ou le
  redirect URI ne correspondent pas à l'app enregistrée. Vérifier les trois (Vercel +
  Railway + portail TradeStation).
- **Trades non remontés alors que `connected`** : vérifier `CALDRA_INGEST_URL`
  (doit être `caldra-sable.vercel.app`) ; les logs montrent `ingest échec <status>` si
  l'ingest répond une erreur (clé d'ingest, payload…).
