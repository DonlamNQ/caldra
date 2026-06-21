# Worker MT5 sur VPS Windows — installation

Le worker `mt5-worker.py` doit tourner **24/7 sur une machine Windows dédiée**
(il se connecte aux comptes MT5 des clients pour lire leurs trades). Ces étapes
reproduisent ce qui a été validé en local, mais sur le VPS.

## 0. Prérequis : le VPS
- **Windows** (Server 2022 ou Win 10/11), **accès Bureau à distance (RDP) + admin**.
- **≥ 4 Go RAM**, 2 vCPU, ~50 Go SSD. (Un seul terminal MT5 + Python = léger.)
- ⚠️ PAS le "VPS gratuit" du broker / MetaQuotes VPS (ils n'autorisent pas Python).
- Fournisseurs ok : AccuWeb (essai 7 j), LumaDock, Contabo… (~10-15 $/mois).

## 1. Se connecter au VPS
- Windows : "Connexion Bureau à distance" → IP + identifiant + mot de passe reçus.
- Mac : app "Windows App" (ex-Microsoft Remote Desktop).

## 2. Installer MetaTrader 5
- Télécharge MT5 (site du broker, ou metatrader5.com) et installe-le.
- Pas besoin de pré-connecter un compte : le worker se connecte lui-même avec
  les identifiants de chaque client.

## 3. Installer Python 3.12
- PowerShell (admin) : `winget install -e --id Python.Python.3.12`
- (ou python.org → cocher "Add to PATH")

## 4. Installer les librairies
```
pip install MetaTrader5 supabase requests cryptography
```

## 5. Copier le worker + créer le .env
- Copie `mt5-worker.py` sur le VPS (ex. dans `C:\caldra-worker\`).
- Crée un fichier `.env` à côté, avec :
```
SUPABASE_URL=<même que .env.local : NEXT_PUBLIC_SUPABASE_URL>
SUPABASE_SERVICE_ROLE_KEY=<même que .env.local>
MT5_ENC_KEY=<EXACTEMENT la même valeur que sur Vercel>
CALDRA_INGEST_URL=https://caldra-sable.vercel.app/api/ingest
MT5_TERMINAL_PATH=C:\Program Files\MetaTrader 5\terminal64.exe
```
> `MT5_ENC_KEY` DOIT être identique à celle de Vercel, sinon le worker ne peut
> pas déchiffrer les mots de passe (→ déchiffrement échoue).

## 6. Lancer
```
python mt5-worker.py
```
Tu dois voir `[mt5] terminal initialisé — worker démarré`.

## 7. Démarrage automatique (survit aux reboots)
La tâche planifiée **`CaldraMT5Worker`** (déclencheur *à l'ouverture de session*,
`RestartCount 999`) existe déjà sur le VPS : elle lance `C:\caldra-worker\run.bat`
qui boucle sur le worker (anti-crash) et log dans `mt5.log`. **Ne pas en créer
une seconde** — ça ferait tourner deux workers sur le même terminal MT5 (un seul
login à la fois) → conflit et faux `auth_failed`.

Ce qui manque pour survivre à un **reboot complet sans intervention** : qu'une
session s'ouvre seule au boot, et que le terminal MT5 (appli GUI) se rouvre. Le
script `harden-reboot.ps1` fait les deux (auto-logon + MT5 dans le dossier
Démarrage). Une seule fois, PowerShell **admin**, dans le dossier du worker :
```powershell
powershell -ExecutionPolicy Bypass -File .\harden-reboot.ps1
```
Le terminal MT5 étant une appli graphique, le worker doit tourner dans une vraie
session de bureau : c'est pour ça qu'on n'utilise PAS le compte SYSTEM.

> Règle RDP : quitter avec **« Déconnecter »**, jamais **« Fermer la session »**
> (ça tue MT5 + le worker).

### Mettre à jour le worker (après un push de fix)
```powershell
Invoke-WebRequest -UseBasicParsing `
  "https://raw.githubusercontent.com/DonlamNQ/caldra/main/worker/mt5-worker.py" `
  -OutFile "C:\caldra-worker\mt5-worker.py"
Stop-ScheduledTask  -TaskName "CaldraMT5Worker"   # Restart-ScheduledTask n'existe pas
Start-ScheduledTask -TaskName "CaldraMT5Worker"   #   sur ce Windows → Stop puis Start
```

## Validation
Connecte un compte démo via Caldra (page MetaTrader 5 → Se connecter), fais un
trade, vérifie qu'il remonte. Le worker log chaque envoi : `[ingest] … pnl=…`.

## 8. Multi-broker (un terminal MT5 ne connaît que SON broker)
**Contrainte clé** : un terminal MT5 ne peut logger que des comptes de son propre
broker. Tenter `mt5.login(server="ICMarkets-Live01")` sur un terminal Vantage →
`-10005 IPC timeout`. Le worker traduit désormais ce cas en statut
`broker_unavailable` (« BROKER BIENTÔT DISPONIBLE » côté client) — **pas** en
« identifiants refusés ».

Pour prendre en charge un nouveau broker quand un client arrive :
1. Installe le terminal **de marque du broker** (téléchargé sur le site du broker —
   il connaît déjà tous les serveurs de ce broker, donc pas de login manuel).
   Mets-le dans son propre dossier, ex. `C:\MT5-ICMarkets\terminal64.exe`.
2. Copie le worker dans un dossier dédié, ex. `C:\caldra-icmarkets\`, avec un `.env`
   identique au principal **plus** :
   ```
   MT5_TERMINAL_PATH=C:\MT5-ICMarkets\terminal64.exe
   MT5_BROKER=ICMarkets        # préfixe(s) de serveur gérés par CE worker (CSV)
   ```
   `MT5_BROKER` fait que ce worker ne traite QUE les comptes dont le serveur commence
   par `ICMarkets` (les autres sont laissés aux autres workers).
3. Ajoute le terminal au dossier Démarrage et crée une tâche planifiée dédiée
   (même modèle que `CaldraMT5Worker`, nom différent, son propre `run.bat`).

> Le worker principal (sans `MT5_BROKER`) traite tout le reste et marque
> `broker_unavailable` les comptes dont aucun terminal ne gère le broker.

## Dépannage — `-10005 IPC timeout` (worker bloqué à l'init)

`initialize échec — terminal injoignable (-10005)` en boucle = le module Python
n'arrive pas à parler au terminal. Causes, par fréquence :

1. **Terminal ouvert mais PAS connecté à un compte** (cause n°1, et celle qui revient
   après un reboot). MT5 doit être loggé à un compte (n'importe lequel) avec des cours
   qui bougent, sinon `initialize()` échoue toujours. → Navigateur (`Ctrl+N`) → Comptes
   → double-clic sur le compte. **Cocher « Sauvegarder les informations du compte »**
   pour qu'il se reconnecte seul au lancement (sinon chaque reboot = re-déconnecté).
2. **Algo Trading désactivé** (bouton rouge dans la barre d'outils) → l'API Python
   refuse de s'attacher. Le passer au vert (Outils → Options → Expert Advisors →
   « Autoriser le trading algorithmique »).
3. **Niveaux de privilège différents** entre terminal et worker : le tube IPC exige
   que les DEUX soient au même niveau (les deux normaux, ou les deux admin). Terminal
   ouvert au double-clic = normal → lancer le worker en PowerShell **normal** aussi.
4. **`MT5_TERMINAL_PATH` pointe sur un autre MT5** que celui ouvert (plusieurs installs).
5. **Build du terminal auto-mis à jour**, plus récent que le paquet Python →
   `pip install --upgrade MetaTrader5`.

Test rapide (PowerShell, terminal ouvert ET connecté) :
```powershell
python -c "import MetaTrader5 as mt5; print(mt5.initialize(), mt5.last_error())"
```
→ doit afficher `True (1, 'Success')`. Tant que c'est `False (-10005, ...)`, le worker
ne peut rien faire : régler ça avant tout autre diagnostic.

Brokers cœur de cible à installer au fur et à mesure : IC Markets, Exness,
Pepperstone, XM + prop firms FTMO, FundedNext, The5ers, E8, FundingPips.
