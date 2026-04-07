# CaldraEA — Expert Advisor MT5

Envoie chaque trade clôturé en temps réel à [Caldra](https://getcaldra.com) via `/api/ingest`.

---

## 1. Générer votre clé API Caldra

1. Connectez-vous sur **[getcaldra.com](https://getcaldra.com)**
2. Allez dans **Settings → API Key**
3. Cliquez **Generate API Key**
4. Copiez la clé affichée (format `cal_xxxxxxxxxxxxxxxxxxxx`) — elle n'est visible qu'une seule fois

---

## 2. Installer l'EA sur MetaTrader 5 (Vantage)

### Copier le fichier

1. Dans MT5, ouvrez **File → Open Data Folder**
2. Naviguez vers `MQL5/Experts/`
3. Copiez `CaldraEA.mq5` dans ce dossier

### Compiler l'EA

1. Ouvrez **MetaEditor** (touche F4 dans MT5)
2. Dans l'arborescence à gauche, double-cliquez sur `Experts/CaldraEA.mq5`
3. Cliquez **Compile** (F7) — vous devez voir `0 errors, 0 warnings`

### Autoriser les requêtes HTTPS

**Obligatoire** — sans cette étape, `WebRequest` échouera silencieusement.

1. Dans MT5 : **Tools → Options → Expert Advisors**
2. Cochez **Allow WebRequest for listed URL**
3. Ajoutez l'URL : `https://getcaldra.com`
4. Cliquez **OK**

---

## 3. Attacher l'EA à un chart

1. Ouvrez le chart de la paire souhaitée (ex. EURUSD, NAS100, XAUUSD…)
2. Dans le **Navigator** (Ctrl+N), dépliez **Expert Advisors**
3. Double-cliquez sur **CaldraEA** ou glissez-le sur le chart
4. Dans la fenêtre **Inputs** :

| Paramètre | Valeur |
|---|---|
| `CALDRA_API_KEY` | `cal_xxxxxxxxxxxxxxxxxxxx` ← votre clé |
| `CALDRA_ENDPOINT` | `https://getcaldra.com/api/ingest` (par défaut) |
| `LOG_TRADES` | `true` (recommandé) |

5. Onglet **Common** : cochez **Allow live trading** et **Allow DLL imports**
6. Cliquez **OK**

L'icône de l'EA apparaît en haut à droite du chart (smiley). S'il est gris, les trades automatiques sont désactivés — cliquez le bouton **Algo Trading** dans la barre d'outils MT5.

> **Note :** l'EA peut être attaché à n'importe quel chart, toutes paires confondues. Il détecte les clôtures de toutes les positions ouvertes sur le compte, quel que soit le symbole.

---

## 4. Vérifier que les trades arrivent dans Caldra

### Dans MT5

Ouvrez l'onglet **Experts** en bas (ou **View → Terminal → Experts**). Vous verrez :

```
CaldraEA initialisé. Endpoint: https://getcaldra.com/api/ingest
CaldraEA [TRADE] {"symbol":"EURUSD","direction":"long","size":0.10,...}
CaldraEA [OK] deal=12345 symbol=EURUSD HTTP=200 response={"success":true,...}
```

### Dans le dashboard Caldra

1. Allez sur **[getcaldra.com/dashboard](https://getcaldra.com/dashboard)**
2. Après chaque trade clôturé, il apparaît dans le **Trade Log** et les alertes comportementales se déclenchent en temps réel

### En cas d'erreur

| Message | Cause | Solution |
|---|---|---|
| `WebRequest erreur=4014` | URL non autorisée | Ajouter `https://getcaldra.com` dans Tools→Options→Expert Advisors |
| `HTTP 401` | Clé API invalide | Vérifier `CALDRA_API_KEY` dans les inputs |
| `HTTP 400` | Champs manquants | Vérifier que le deal a bien un prix d'entrée |
| `deal d'entrée introuvable` | Historique MT5 trop court | Charger plus d'historique dans MT5 |

---

## 5. Format du payload envoyé

```json
{
  "symbol": "EURUSD",
  "direction": "long",
  "size": 0.10,
  "entry_price": 1.08542,
  "exit_price": 1.08721,
  "entry_time": "2026-04-07T09:45:00Z",
  "exit_time": "2026-04-07T10:12:00Z",
  "pnl": 17.90
}
```

- `direction` : `"long"` si position BUY, `"short"` si position SELL
- `pnl` : profit net incluant swap et commission
- Les timestamps sont en **UTC** (format ISO 8601)
- Les trades sans `exit_price` (positions encore ouvertes) ne sont pas envoyés

---

## 6. Support

- Dashboard : [getcaldra.com/dashboard](https://getcaldra.com/dashboard)
- Issues : ouvrez un ticket sur le support Caldra
