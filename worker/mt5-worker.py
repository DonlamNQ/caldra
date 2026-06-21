"""
Caldra — Worker d'ingestion MT5 par IDENTIFIANTS (sans EA).

Se connecte à chaque compte MT5 enregistré (login + mot de passe investisseur +
serveur), lit les trades fermés via l'API Python officielle MetaTrader5, et les
POST vers /api/ingest. Même rôle que le worker cTrader, mais pour MT5.

⚠️ Prérequis : Windows + terminal MetaTrader 5 installé (l'API Python communique
   avec un terminal local). Un terminal = un compte à la fois → ce worker change
   de compte en rotation (mt5.login) à chaque tour de boucle.

Installation :
   pip install MetaTrader5 supabase requests cryptography
   python mt5-worker.py

Variables d'environnement (fichier .env à côté, ou env système) :
   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MT5_ENC_KEY
   CALDRA_INGEST_URL  (défaut https://caldra-sable.vercel.app/api/ingest)
   MT5_TERMINAL_PATH  (optionnel — chemin vers terminal64.exe)
   MT5_BROKER         (optionnel — préfixes de serveur gérés par CE terminal, séparés
                       par des virgules, ex. "Vantage,VantageMarkets". Vide = tous les
                       comptes. Sert au multi-broker : 1 terminal de marque par broker,
                       chaque worker ne traite que les comptes de SON broker.)
"""

import os
import time
import json
import base64
import hashlib
from datetime import datetime, timedelta, timezone

import requests
import MetaTrader5 as mt5
from supabase import create_client
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# --- env (charge .env si présent) ---
try:
    with open(".env", "r", encoding="utf-8") as f:
        for line in f:
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())
except FileNotFoundError:
    pass

SUPABASE_URL              = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
MT5_ENC_KEY               = os.environ["MT5_ENC_KEY"]
CALDRA_INGEST_URL         = os.environ.get("CALDRA_INGEST_URL", "https://caldra-sable.vercel.app/api/ingest")
MT5_TERMINAL_PATH         = os.environ.get("MT5_TERMINAL_PATH")  # optionnel

POLL_SECONDS = int(os.environ.get("MT5_POLL_SECONDS", "5"))  # poll rapide → réaction ~live
KEY = hashlib.sha256(MT5_ENC_KEY.encode()).digest()  # même dérivation que lib/mt5crypto.ts

# Brokers gérés par CE terminal (préfixes de serveur, minuscules). Vide = tous.
BROKER_PREFIXES = [b.strip().lower() for b in os.environ.get("MT5_BROKER", "").split(",") if b.strip()]

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Dédup par ticket de deal (insensible au fuseau horaire, contrairement au temps).
# user_id -> set des tickets de sortie déjà traités cette session.
SEEN = {}

# Backoff des comptes injoignables (broker non installé → -10005 lent). On évite de
# retenter leur login à CHAQUE tour (ça ralentit toute la boucle) ; on les retente
# seulement toutes les BACKOFF_SECONDS. user_id -> timestamp avant lequel on saute.
BACKOFF = {}
# Broker non installé : le compte ne se débloquera qu'après installation du terminal de
# marque + restart du worker (qui vide ce dict). Inutile de le retenter souvent — chaque
# tentative coûte un timeout ET peut perturber le terminal. 30 min suffit largement.
BACKOFF_SECONDS = int(os.environ.get("MT5_BROKER_BACKOFF_SECONDS", "1800"))
FAIL_BACKOFF_SECONDS = 60       # échec creds/terminal : ne pas retenter à chaque tour (sinon ça stalle la boucle)

# Persistance du backoff : run.bat relance le worker à chaque crash (terminal instable),
# ce qui vidait BACKOFF en mémoire → re-login -10005 à CHAQUE restart → spam + terminal
# encore plus déstabilisé. On sauve/recharge le dict sur disque pour que le skip 30 min
# survive aux redémarrages.
BACKOFF_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backoff.json")


def load_backoff():
    try:
        with open(BACKOFF_FILE, "r", encoding="utf-8") as f:
            now = time.time()
            for uid, ts in json.load(f).items():
                if ts > now:           # on ignore les backoffs déjà expirés
                    BACKOFF[uid] = ts
    except (FileNotFoundError, ValueError):
        pass


def save_backoff():
    try:
        with open(BACKOFF_FILE, "w", encoding="utf-8") as f:
            json.dump(BACKOFF, f)
    except Exception as e:
        print("[mt5] sauvegarde backoff échec:", e)

# Login borné : le défaut MT5 (60 s) fait que CHAQUE compte en échec bloque la boucle
# ~1 min → latence de plusieurs minutes pour les comptes sains. Mais 8 s était trop juste :
# certains serveurs (ICMarkets demo p.ex.) mettent 6–8 s à authentifier → faux -10005.
# 12 s laisse de la marge ; un compte vraiment mort est de toute façon mis en backoff après
# un échec, donc il ne stalle pas la boucle à chaque tour.
LOGIN_TIMEOUT_MS = int(os.environ.get("MT5_LOGIN_TIMEOUT_MS", "12000"))

# Compte actuellement loggé dans le terminal → évite un re-login inutile (coûteux) quand
# le tour suivant retombe sur le même compte (cas fréquent : un seul compte sain restant).
CURRENT_LOGIN = None


def decrypt(enc_b64: str) -> str:
    """Déchiffre le mot de passe (format iv(12)||ciphertext||tag(16), AES-256-GCM)."""
    data = base64.b64decode(enc_b64)
    iv, rest = data[:12], data[12:]
    return AESGCM(KEY).decrypt(iv, rest, None).decode("utf-8")


def iso(unix_seconds: int) -> str:
    return datetime.fromtimestamp(unix_seconds, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def set_status(user_id: str, status: str, synced: bool = False):
    patch = {"status": status}
    if synced:
        patch["last_sync_at"] = datetime.now(timezone.utc).isoformat()
    try:
        supabase.table("mt5_accounts").update(patch).eq("user_id", user_id).execute()
    except Exception as e:
        print("[mt5] maj statut échec:", e)


def post_trade(ingest_key: str, payload: dict):
    try:
        r = requests.post(CALDRA_INGEST_URL, json=payload,
                          headers={"x-caldra-key": ingest_key}, timeout=10)
        if r.status_code in (200, 201):
            print(f"[ingest] {payload['symbol']} {payload['direction']} pnl={payload['pnl']}")
        else:
            print("[ingest] échec", r.status_code, r.text[:200])
    except Exception as e:
        print("[ingest] erreur réseau:", e)


def ensure_init(force: bool = False):
    """(Re)connecte le terminal MT5 ; le relance s'il a été fermé."""
    if force or mt5.terminal_info() is None:
        if MT5_TERMINAL_PATH:
            mt5.initialize(path=MT5_TERMINAL_PATH)
        else:
            mt5.initialize()


def broker_utc_offset(symbol: str) -> int:
    """Décalage (secondes, arrondi à l'heure) entre l'heure serveur du broker et
    l'UTC réel. Les deals MT5 sont horodatés en heure-broker → conversion en UTC."""
    try:
        mt5.symbol_select(symbol, True)
        t = mt5.symbol_info_tick(symbol)
        if t and t.time:
            return int(round((t.time - time.time()) / 3600.0) * 3600)
    except Exception:
        pass
    return 0


def process_account(row: dict):
    user_id    = row["user_id"]
    login      = int(row["mt5_login"])
    server     = row["mt5_server"]
    ingest_key = row["ingest_key"]

    # Multi-broker : si ce worker est dédié à un/des broker(s), ignorer les comptes
    # des autres (un autre worker, sur le terminal de marque du broker, les traite).
    if BROKER_PREFIXES and not any(server.lower().startswith(p) for p in BROKER_PREFIXES):
        return

    # Compte fraîchement (re)connecté via Caldra → on purge un éventuel backoff pour le
    # retenter immédiatement. La route /connect réinsère la ligne avec status=NULL : c'est
    # CE signal qui distingue une vraie reconnexion d'un compte durablement indisponible.
    # ⚠️ Un compte broker_unavailable/auth_failed garde last_sync_at NULL en PERMANENCE :
    # se fier au seul last_sync_at re-purgeait son backoff à chaque tour → -10005 toutes
    # les 5 s. On exclut donc ces statuts terminaux.
    if row.get("last_sync_at") is None and row.get("status") not in ("broker_unavailable", "auth_failed"):
        if BACKOFF.pop(user_id, None) is not None:
            save_backoff()

    # Compte injoignable récemment (broker non installé / échec) → on saute jusqu'à
    # expiration du backoff, pour ne pas subir son timeout de login à chaque tour.
    if time.time() < BACKOFF.get(user_id, 0):
        return

    try:
        password = decrypt(row["password_enc"])
    except Exception as e:
        print("[mt5] déchiffrement échec:", e)
        set_status(user_id, "error")
        return

    # Connexion au compte (change le compte courant du terminal).
    # Fast path : si le terminal est déjà loggé sur CE compte, on saute le re-login
    # (coûteux). Énorme gain de latence quand il ne reste qu'un compte sain à traiter.
    global CURRENT_LOGIN
    t_login0 = time.time()
    info = mt5.account_info() if CURRENT_LOGIN == login else None
    if not (info is not None and getattr(info, "login", None) == login):
        # timeout borné (LOGIN_TIMEOUT_MS) : un login qui échoue ne bloque plus la boucle.
        if not mt5.login(login, password=password, server=server, timeout=LOGIN_TIMEOUT_MS):
            code, msg = mt5.last_error()
            CURRENT_LOGIN = None
            # -10001 = IPC : lien terminal coupé → on réinitialise et on retente une fois.
            if code == -10001:
                ensure_init(force=True)
                if not mt5.login(login, password=password, server=server, timeout=LOGIN_TIMEOUT_MS):
                    code, msg = mt5.last_error()
                    print(f"[mt5] login échec (terminal injoignable) compte {login}: {code} {msg}")
                    set_status(user_id, "error")
                    BACKOFF[user_id] = time.time() + FAIL_BACKOFF_SECONDS
                    save_backoff()
                    return
            # -10005 = IPC timeout : ce terminal ne connaît pas ce serveur (mauvais broker)
            # ou il est occupé. Ce N'EST PAS un problème d'identifiants → surtout ne pas
            # afficher « refusés » au client. Statut dédié = broker pas encore pris en charge.
            # -10005 = IPC timeout. Deux sens TRÈS différents → on tranche via last_sync_at :
            #   • compte JAMAIS synchronisé (last_sync_at NULL) → ce terminal ne connaît pas
            #     ce broker → broker_unavailable + backoff long (30 min).
            #   • compte DÉJÀ synchronisé → login lent / terminal occupé (PAS un mauvais
            #     broker) → backoff COURT, on NE le marque PAS indisponible. Sinon on
            #     suspendait 30 min un compte valide juste parce qu'un login a dépassé le
            #     timeout — c'est ce qui sautait ICMarketsEU-Demo après un restart.
            elif code == -10005:
                if row.get("last_sync_at") is not None:
                    print(f"[mt5] login lent (IPC timeout) compte {login} ({server}) — retry bientôt: {code} {msg}")
                    BACKOFF[user_id] = time.time() + FAIL_BACKOFF_SECONDS
                    save_backoff()
                    return
                print(f"[mt5] broker non pris en charge par ce terminal — compte {login} ({server}): {code} {msg}")
                set_status(user_id, "broker_unavailable")
                BACKOFF[user_id] = time.time() + BACKOFF_SECONDS  # ne pas re-tenter à chaque tour
                save_backoff()
                return
            # -6 = Authorization failed : vrais identifiants invalides.
            elif code == -6:
                print(f"[mt5] identifiants refusés compte {login} ({server}): {code} {msg}")
                set_status(user_id, "auth_failed")
                BACKOFF[user_id] = time.time() + FAIL_BACKOFF_SECONDS
                save_backoff()
                return
            # Tout le reste = transitoire → backoff court (pas « refusés »), pour ne pas
            # staller la boucle en le retentant à chaque tour.
            else:
                print(f"[mt5] login échec compte {login} ({server}): {code} {msg}")
                set_status(user_id, "error")
                BACKOFF[user_id] = time.time() + FAIL_BACKOFF_SECONDS
                save_backoff()
                return
        CURRENT_LOGIN = login
    t_login = time.time() - t_login0

    now = datetime.now(timezone.utc)

    # Fenêtre large pour apparier les entrées (l'heure MT5 est en heure-broker, on
    # ne s'y fie donc PAS — la dédup se fait par ticket, insensible au fuseau).
    t_histo0 = time.time()
    deals = mt5.history_deals_get(now - timedelta(days=3), now + timedelta(days=1))
    t_histo = time.time() - t_histo0
    # Chrono : repère le(s) compte(s) qui plombent la rotation (login lent / re-sync histo).
    # Seuil à 5 s : ~2 s par login est normal au changement de compte sur un terminal
    # partagé — on ne loggue que les vrais pics (≥5 s), pas le régime nominal.
    if t_login + t_histo > 5:
        print(f"[mt5] compte {login} lent: login {t_login:.1f}s + histo {t_histo:.1f}s")
    if deals is None:
        set_status(user_id, "connected", synced=True)
        return

    # Index des deals d'entrée par position_id (entry == DEAL_ENTRY_IN == 0).
    entries = {d.position_id: d for d in deals if d.entry == 0}
    # Deals de SORTIE (OUT=1, INOUT=2, OUT_BY=3) qui forment un trade fermé.
    out_deals = [d for d in deals if d.entry != 0 and d.symbol]

    # Premier passage : on pose un REPÈRE (tous les deals existants = déjà vus) pour
    # NE PAS réimporter l'historique. Deux cas déclenchent le repère :
    #   1. user_id absent de SEEN → le worker vient de démarrer.
    #   2. last_sync_at NULL → le compte vient d'être (re)connecté via Caldra (la route
    #      /connect remet last_sync_at à NULL). Indispensable au CHANGEMENT DE COMPTE :
    #      sans ça, le repère en mémoire = tickets de l'ancien compte → tous les trades
    #      du nouveau compte passent pour "nouveaux" → bombardement d'alertes.
    if user_id not in SEEN or row.get("last_sync_at") is None:
        SEEN[user_id] = set(d.ticket for d in out_deals)
        set_status(user_id, "connected", synced=True)
        print(f"[mt5] compte {login} connecté — {len(SEEN[user_id])} deals existants ignorés (repère)")
        return

    seen = SEEN[user_id]
    offset = broker_utc_offset(out_deals[0].symbol) if out_deals else 0
    for d in out_deals:
        if d.ticket in seen:
            continue
        seen.add(d.ticket)

        ein = entries.get(d.position_id)
        # direction depuis le deal d'entrée (BUY=0 → long, SELL=1 → short) ;
        # fallback depuis la sortie (une vente clôture un long).
        if ein is not None:
            direction = "long" if ein.type == 0 else "short"
            entry_price = ein.price
            entry_time  = iso(ein.time - offset)
        else:
            direction = "long" if d.type == 1 else "short"
            entry_price = d.price
            entry_time  = iso(d.time - offset - 60)

        # PnL = colonne "Profit" de MT5 (comme l'EA) — hors commission/swap, pour
        # coller à ce que le trader voit dans son terminal.
        pnl = (d.profit or 0)
        payload = {
            "symbol":      str(d.symbol).strip(),
            "direction":   direction,
            "size":        float(d.volume),
            "entry_price": float(entry_price),
            "exit_price":  float(d.price),
            "entry_time":  entry_time,
            "exit_time":   iso(d.time - offset),
            "pnl":         round(float(pnl), 2),
        }
        if payload["entry_price"] > 0 and payload["exit_price"] > 0 and payload["size"] > 0:
            post_trade(ingest_key, payload)

    set_status(user_id, "connected", synced=True)


def main():
    # Init résilient : si le terminal n'est pas prêt (IPC timeout, terminal figé ou pas
    # encore ouvert), on RETENTE au lieu de crasher. Un SystemExit relançait tout le
    # process (via la tâche planifiée) → boucle de crash + repère SEEN perdu à chaque fois.
    while True:
        ok = mt5.initialize(path=MT5_TERMINAL_PATH) if MT5_TERMINAL_PATH else mt5.initialize()
        if ok:
            break
        print("[mt5] initialize échec — terminal injoignable, nouvelle tentative dans 10s:", mt5.last_error())
        time.sleep(10)
    print("[mt5] terminal initialisé — worker démarré")
    load_backoff()   # reprend les skips en cours (survit aux restarts run.bat)

    while True:
        t_cycle = time.time()
        rows = []
        try:
            ensure_init()   # garde le terminal vivant / le relance s'il a été fermé
            rows = supabase.table("mt5_accounts").select(
                "user_id, mt5_login, mt5_server, password_enc, ingest_key, last_sync_at, status"
            ).execute().data or []
            if not rows:
                print("[mt5] aucun compte enregistré — en attente")
            for row in rows:
                try:
                    process_account(row)
                except Exception as e:
                    print("[mt5] erreur compte:", e)
        except Exception as e:
            print("[mt5] erreur boucle:", e)
        dt = time.time() - t_cycle
        # Chrono cycle complet : si > 6s, la rotation des comptes est le goulot de latence.
        if dt > 6:
            print(f"[mt5] cycle complet: {dt:.1f}s pour {len(rows)} comptes")
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
