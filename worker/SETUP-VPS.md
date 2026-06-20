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

## 7. Démarrage automatique (survit aux reboots + aux crashes)
Deux fichiers sont fournis à côté du worker :
- `run-mt5.bat` — relance le worker en boucle s'il s'arrête (**anti-crash**) et
  écrit dans `mt5.log` / `mt5.err.log`.
- `install-autostart.ps1` — enregistre une tâche planifiée qui lance ce `.bat`
  **à chaque ouverture de session** (**anti-reboot**).

Installation (une seule fois, PowerShell **admin**, dans le dossier du worker) :
```powershell
powershell -ExecutionPolicy Bypass -File .\install-autostart.ps1
Start-ScheduledTask -TaskName "Caldra MT5 Worker"   # démarre tout de suite
```

⚠️ **Pour survivre à un reboot complet sans intervention**, active l'auto-logon
Windows — sinon le VPS reste bloqué sur l'écran de connexion et la session ne
s'ouvre jamais (donc le worker ne démarre pas) :
```
netplwiz   →  décoche "Les utilisateurs doivent entrer un mot de passe"  →  saisis le mot de passe
```
Le terminal MT5 étant une appli graphique, le worker doit tourner dans une vraie
session de bureau : c'est pour ça qu'on n'utilise PAS le compte SYSTEM.

## Validation
Connecte un compte démo via Caldra (page MetaTrader 5 → Se connecter), fais un
trade, vérifie qu'il remonte. Le worker log chaque envoi : `[ingest] … pnl=…`.
