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
"""

import os
import time
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

POLL_SECONDS = 20
KEY = hashlib.sha256(MT5_ENC_KEY.encode()).digest()  # même dérivation que lib/mt5crypto.ts

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


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


def process_account(row: dict):
    user_id    = row["user_id"]
    login      = int(row["mt5_login"])
    server     = row["mt5_server"]
    ingest_key = row["ingest_key"]

    try:
        password = decrypt(row["password_enc"])
    except Exception as e:
        print("[mt5] déchiffrement échec:", e)
        set_status(user_id, "error")
        return

    # Connexion au compte (change le compte courant du terminal).
    if not mt5.login(login, password=password, server=server):
        code, msg = mt5.last_error()
        print(f"[mt5] login échec compte {login} ({server}): {code} {msg}")
        set_status(user_id, "auth_failed")
        return

    now = datetime.now(timezone.utc)

    # Première connexion : on pose un repère et on N'IMPORTE PAS l'historique
    # (sinon on génèrerait des alertes sur d'anciens trades).
    if not row.get("last_sync_at"):
        set_status(user_id, "connected", synced=True)
        print(f"[mt5] compte {login} connecté — repère posé (pas d'import d'historique)")
        return

    last_dt = datetime.fromisoformat(str(row["last_sync_at"]).replace("Z", "+00:00"))
    watermark = last_dt.timestamp()

    # Fenêtre large pour pouvoir apparier les deals d'entrée, mais on n'ÉMET que
    # les sorties postérieures au repère.
    deals = mt5.history_deals_get(now - timedelta(days=3), now + timedelta(hours=1))
    if deals is None:
        set_status(user_id, "connected", synced=True)
        return

    # Index des deals d'entrée par position_id (entry == DEAL_ENTRY_IN == 0).
    entries = {d.position_id: d for d in deals if d.entry == 0}

    for d in deals:
        # On ne traite que les sorties (OUT=1, INOUT=2, OUT_BY=3) postérieures au repère.
        if d.entry == 0:
            continue
        if d.time <= watermark:
            continue
        if not d.symbol:
            continue

        ein = entries.get(d.position_id)
        # direction depuis le deal d'entrée (BUY=0 → long, SELL=1 → short) ;
        # fallback depuis la sortie (une vente clôture un long).
        if ein is not None:
            direction = "long" if ein.type == 0 else "short"
            entry_price = ein.price
            entry_time  = iso(ein.time)
        else:
            direction = "long" if d.type == 1 else "short"
            entry_price = d.price
            entry_time  = iso(d.time - 60)

        pnl = (d.profit or 0) + (d.swap or 0) + (d.commission or 0)
        payload = {
            "symbol":      str(d.symbol).strip(),
            "direction":   direction,
            "size":        float(d.volume),
            "entry_price": float(entry_price),
            "exit_price":  float(d.price),
            "entry_time":  entry_time,
            "exit_time":   iso(d.time),
            "pnl":         round(float(pnl), 2),
        }
        if payload["entry_price"] > 0 and payload["exit_price"] > 0 and payload["size"] > 0:
            post_trade(ingest_key, payload)

    set_status(user_id, "connected", synced=True)


def main():
    if MT5_TERMINAL_PATH:
        ok = mt5.initialize(path=MT5_TERMINAL_PATH)
    else:
        ok = mt5.initialize()
    if not ok:
        print("[mt5] initialize échec:", mt5.last_error())
        raise SystemExit(1)
    print("[mt5] terminal initialisé — worker démarré")

    while True:
        try:
            rows = supabase.table("mt5_accounts").select(
                "user_id, mt5_login, mt5_server, password_enc, ingest_key, last_sync_at"
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
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
