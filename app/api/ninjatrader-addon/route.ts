export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createHash, randomBytes } from 'crypto'

async function getUser() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(s) { try { s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    }
  )
  return supabase.auth.getUser()
}

const service = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Indicateur NinjaScript (NinjaTrader 8) avec la clé injectée.
// On utilise un INDICATEUR (pas un AddOn) : c'est le pattern fiable et documenté
// pour écouter Account.ExecutionUpdate (abonnement dans State.DataLoaded). L'add-on
// pur ne s'initialise pas de façon fiable. L'utilisateur l'ajoute sur un graphique.
// Il capte les exécutions de TOUS les comptes connectés (compte prop firm inclus,
// quelle que soit la firm), reconstruit chaque trade fermé (scaling/inversion gérés)
// et le POST vers /api/ingest. PnL via PointValue de l'instrument (NQ=20, ES=50).
function buildAddon(apiKey: string): string {
  return String.raw`#region Using declarations
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using NinjaTrader.Cbi;
using NinjaTrader.NinjaScript;
#endregion

// CaldraReporter — Caldra Trade Reporter pour NinjaTrader 8 (indicateur)
// Installation :
//   1. Copier ce fichier dans  Documents\NinjaTrader 8\bin\Custom\Indicators\
//   2. Compiler (F5 dans l'éditeur NinjaScript) ou redémarrer NinjaTrader
//   3. Ouvrir un graphique → clic droit → Indicators… → ajouter "CaldraReporter" → OK
// La clé Caldra est déjà intégrée. Il capte les trades de TOUS les comptes connectés.
namespace NinjaTrader.NinjaScript.Indicators
{
    public class CaldraReporter : Indicator
    {
        private const string CaldraApiKey = "${apiKey}";
        private const string IngestUrl    = "https://getcaldra.com/api/ingest";
        private static readonly HttpClient Http = new HttpClient();

        // Position en cours par compte+instrument (Qty signé : + long, − short).
        private class Pos { public int Qty; public double AvgEntry; public DateTime EntryTime; public int RoundQty; public double Realized; }
        private readonly Dictionary<string, Pos> _positions = new Dictionary<string, Pos>();
        private readonly List<Account> _subscribed = new List<Account>();

        protected override void OnStateChange()
        {
            if (State == State.SetDefaults)
            {
                Name                     = "CaldraReporter";
                Description              = "Envoie chaque trade fermé vers Caldra (/api/ingest).";
                Calculate                = Calculate.OnBarClose;
                IsOverlay                = true;
                DisplayInDataBox         = false;
                PaintPriceMarkers        = false;
                IsSuspendedWhileInactive = false;   // continue à tourner même hors focus
            }
            else if (State == State.DataLoaded)
            {
                if (!Http.DefaultRequestHeaders.Contains("x-caldra-key"))
                    Http.DefaultRequestHeaders.Add("x-caldra-key", CaldraApiKey);

                lock (Account.All)
                    foreach (Account a in Account.All)
                    {
                        a.ExecutionUpdate += OnExecutionUpdate;
                        _subscribed.Add(a);
                    }

                Print("[Caldra] Reporter actif ✓ — " + _subscribed.Count + " compte(s) surveillé(s)");
            }
            else if (State == State.Terminated)
            {
                foreach (Account a in _subscribed) a.ExecutionUpdate -= OnExecutionUpdate;
                _subscribed.Clear();
            }
        }

        protected override void OnBarUpdate() { }

        private void OnExecutionUpdate(object sender, ExecutionEventArgs e)
        {
            try
            {
                Execution ex = e.Execution;
                if (ex == null || ex.Instrument == null || ex.Quantity <= 0) return;

                MasterInstrument mi = ex.Instrument.MasterInstrument;
                string   symbol     = mi.Name;
                double   pointValue = mi.PointValue;
                int      sign       = ex.MarketPosition == MarketPosition.Long ? 1 : -1;
                int      fillQty    = (int)ex.Quantity * sign;
                double   price      = ex.Price;
                DateTime time       = ex.Time;

                string key = (ex.Account != null ? ex.Account.Name : "?") + "|" + ex.Instrument.FullName;
                Pos p;
                if (!_positions.TryGetValue(key, out p)) { p = new Pos(); _positions[key] = p; }

                int prevQty = p.Qty;

                // Ouverture d'une nouvelle position.
                if (prevQty == 0)
                {
                    p.Qty = fillQty; p.AvgEntry = price; p.EntryTime = time;
                    p.RoundQty = Math.Abs(fillQty); p.Realized = 0;
                    return;
                }

                bool sameDir = (prevQty > 0) == (fillQty > 0);

                // Renforcement (même sens) → moyenne pondérée de l'entrée.
                if (sameDir)
                {
                    int newQty = prevQty + fillQty;
                    p.AvgEntry = (p.AvgEntry * Math.Abs(prevQty) + price * Math.Abs(fillQty)) / Math.Abs(newQty);
                    p.Qty      = newQty;
                    p.RoundQty = Math.Max(p.RoundQty, Math.Abs(newQty));
                    return;
                }

                // Réduction / clôture / inversion.
                int closeQty = Math.Min(Math.Abs(prevQty), Math.Abs(fillQty));
                int dirSign  = prevQty > 0 ? 1 : -1;
                p.Realized += (price - p.AvgEntry) * dirSign * closeQty * pointValue;
                int after = prevQty + fillQty;

                if (after == 0)
                {
                    EmitTrade(symbol, dirSign > 0 ? "long" : "short", p.RoundQty, p.AvgEntry, price, p.EntryTime, time, p.Realized);
                    _positions.Remove(key);
                }
                else if ((after > 0) != (prevQty > 0))
                {
                    // Inversion : clôture l'ancienne, ouvre la nouvelle avec le reste.
                    EmitTrade(symbol, dirSign > 0 ? "long" : "short", p.RoundQty, p.AvgEntry, price, p.EntryTime, time, p.Realized);
                    p.Qty = after; p.AvgEntry = price; p.EntryTime = time;
                    p.RoundQty = Math.Abs(after); p.Realized = 0;
                }
                else
                {
                    // Réduction partielle (même sens) — on attend la clôture complète.
                    p.Qty = after;
                }
            }
            catch (Exception err)
            {
                Print("[Caldra] erreur exec: " + err.Message);
            }
        }

        private void EmitTrade(string symbol, string direction, int size, double entry, double exit,
                               DateTime entryTime, DateTime exitTime, double pnl)
        {
            string json = string.Format(CultureInfo.InvariantCulture,
                "{{\"symbol\":\"{0}\",\"direction\":\"{1}\",\"size\":{2},\"entry_price\":{3},\"exit_price\":{4},\"entry_time\":\"{5}\",\"exit_time\":\"{6}\",\"pnl\":{7}}}",
                Sanitize(symbol), direction, size,
                entry.ToString(CultureInfo.InvariantCulture),
                exit.ToString(CultureInfo.InvariantCulture),
                Iso(entryTime), Iso(exitTime),
                pnl.ToString(CultureInfo.InvariantCulture));

            Task.Run(async () =>
            {
                try
                {
                    StringContent content = new StringContent(json, Encoding.UTF8, "application/json");
                    HttpResponseMessage res = await Http.PostAsync(IngestUrl, content);
                    Print(string.Format("[Caldra] {0} {1} pnl={2} ({3})", symbol, direction, pnl, (int)res.StatusCode));
                }
                catch (Exception err)
                {
                    Print("[Caldra] erreur envoi: " + err.Message);
                }
            });
        }

        private static string Iso(DateTime t)
        {
            DateTime u = t.Kind == DateTimeKind.Utc ? t : t.ToUniversalTime();
            return u.ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture);
        }

        private static string Sanitize(string s)
        {
            StringBuilder sb = new StringBuilder();
            foreach (char c in s)
                if (char.IsLetterOrDigit(c) || c == '.' || c == '/' || c == '_' || c == '-') sb.Append(c);
            return sb.ToString();
        }
    }
}
`
}

// GET — génère une clé API fraîche, l'intègre à l'indicateur, renvoie le .cs prêt à l'emploi.
export async function GET() {
  const { data: { user } } = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rawKey    = `cal_${randomBytes(24).toString('hex')}`
  const keyHash   = createHash('sha256').update(rawKey).digest('hex')
  const keyPrefix = rawKey.slice(0, 14)

  // Clé dédiée 'NinjaTrader' (coexiste avec 'main' MT5, 'cTrader', 'Tradovate').
  await service().from('api_keys').delete().eq('user_id', user.id).eq('label', 'NinjaTrader')
  await service().from('api_keys').insert({
    user_id: user.id, key_hash: keyHash, key_prefix: keyPrefix, label: 'NinjaTrader',
  })

  return new NextResponse(buildAddon(rawKey), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="CaldraReporter.cs"',
      'Cache-Control': 'no-store',
    },
  })
}
