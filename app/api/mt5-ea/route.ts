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

// Source de l'EA avec la clé injectée. String.raw pour préserver les \r\n littéraux du MQL5.
function buildEa(apiKey: string): string {
  return String.raw`//+------------------------------------------------------------------+
//| CaldraMT5.mq5 — Caldra Trade Reporter v2                        |
//| Clé API déjà intégrée — aucune saisie manuelle nécessaire.      |
//| Envoie l'ouverture ET la fermeture de chaque trade              |
//+------------------------------------------------------------------+
#property copyright "Caldra"
#property version   "2.0"
#property strict

input string CaldraApiKey = "${apiKey}";  // Caldra API Key (déjà renseignée)

int lastDealsCount = 0;

//+------------------------------------------------------------------+
int OnInit() {
   lastDealsCount = (int)HistoryDealsTotal();
   Print("[Caldra] EA initialisé v2. Deals connus : ", lastDealsCount);
   EventSetTimer(5);
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason) {
   EventKillTimer();
}

//+------------------------------------------------------------------+
void OnTimer() {
   HistorySelect(0, TimeCurrent());
   int total = (int)HistoryDealsTotal();
   if (total <= lastDealsCount) return;

   for (int i = lastDealsCount; i < total; i++) {
      ulong ticket = HistoryDealGetTicket(i);
      if (ticket == 0) continue;

      long entryType = HistoryDealGetInteger(ticket, DEAL_ENTRY);
      string symbol  = HistoryDealGetString(ticket,  DEAL_SYMBOL);
      long dealType  = HistoryDealGetInteger(ticket, DEAL_TYPE);
      double volume  = HistoryDealGetDouble(ticket,  DEAL_VOLUME);
      double price   = HistoryDealGetDouble(ticket,  DEAL_PRICE);
      long   timeMs  = HistoryDealGetInteger(ticket, DEAL_TIME) * 1000;
      string timeStr = FormatTime((long)(timeMs / 1000));

      string direction = "";

      if (entryType == DEAL_ENTRY_IN) {
         direction = (dealType == DEAL_TYPE_BUY) ? "long" : "short";
         SendOpen(symbol, direction, volume, price, timeStr);

      } else if (entryType == DEAL_ENTRY_OUT || entryType == DEAL_ENTRY_INOUT) {
         long   posId      = HistoryDealGetInteger(ticket, DEAL_POSITION_ID);
         double entryPrice = price;
         string entryTime  = "";

         for (int j = 0; j < i; j++) {
            ulong t2 = HistoryDealGetTicket(j);
            if (HistoryDealGetInteger(t2, DEAL_POSITION_ID) == posId &&
                HistoryDealGetInteger(t2, DEAL_ENTRY) == DEAL_ENTRY_IN) {
               long entryDealType = HistoryDealGetInteger(t2, DEAL_TYPE);
               direction  = (entryDealType == DEAL_TYPE_BUY) ? "long" : "short";
               entryPrice = HistoryDealGetDouble(t2, DEAL_PRICE);
               entryTime  = FormatTime(HistoryDealGetInteger(t2, DEAL_TIME));
               break;
            }
         }
         if (direction == "") direction = (dealType == DEAL_TYPE_SELL) ? "long" : "short";
         if (entryTime  == "") entryTime = FormatTime((long)(timeMs / 1000) - 60);

         double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
         SendClose(symbol, direction, volume, entryPrice, price, entryTime, timeStr, profit);
      }
   }

   lastDealsCount = total;
}

//+------------------------------------------------------------------+
string UrlEncode(string s) {
   StringReplace(s, ":", "%3A");
   StringReplace(s, "+", "%2B");
   StringReplace(s, " ", "%20");
   return s;
}

void SendOpen(string symbol, string direction, double volume,
              double entryPrice, string entryTime) {
   string url = StringFormat(
      "https://getcaldra.com/api/ingest?key=%s&symbol=%s&direction=%s&size=%.2f"
      "&entry_price=%.5f&entry_time=%s",
      CaldraApiKey, symbol, direction, volume,
      entryPrice, UrlEncode(entryTime)
   );

   char post[]; char result[]; string resultHeaders;
   int res = WebRequest("POST", url, "Content-Type: application/json\r\n", 5000, post, result, resultHeaders);
   if (res == 200 || res == 201) Print("[Caldra] Ouverture envoyée ✓ ", symbol);
   else Print("[Caldra] Erreur ouverture HTTP ", res);
}

void SendClose(string symbol, string direction, double volume,
               double entryPrice, double exitPrice,
               string entryTime, string exitTime, double profit) {
   string url = StringFormat(
      "https://getcaldra.com/api/ingest?key=%s&symbol=%s&direction=%s&size=%.2f"
      "&entry_price=%.5f&exit_price=%.5f&entry_time=%s&exit_time=%s&pnl=%.2f",
      CaldraApiKey, symbol, direction, volume,
      entryPrice, exitPrice,
      UrlEncode(entryTime), UrlEncode(exitTime), profit
   );

   char post[]; char result[]; string resultHeaders;
   int res = WebRequest("POST", url, "Content-Type: application/json\r\n", 5000, post, result, resultHeaders);
   if (res == 200 || res == 201) Print("[Caldra] Fermeture envoyée ✓ ", symbol);
   else Print("[Caldra] Erreur fermeture HTTP ", res);
}

//+------------------------------------------------------------------+
string FormatTime(long unixSeconds) {
   MqlDateTime dt;
   TimeToStruct((datetime)unixSeconds, dt, false);  // false = UTC
   return StringFormat("%04d-%02d-%02dT%02d:%02d:%02dZ",
      dt.year, dt.mon, dt.day, dt.hour, dt.min, dt.sec);
}
`
}

// GET — génère une clé API fraîche, l'intègre à l'EA et renvoie le fichier prêt à l'emploi.
export async function GET() {
  const { data: { user } } = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rawKey    = `cal_${randomBytes(24).toString('hex')}`
  const keyHash   = createHash('sha256').update(rawKey).digest('hex')
  const keyPrefix = rawKey.slice(0, 14)

  // Remplace la clé 'main' existante (on ne peut pas ré-intégrer une clé dont on n'a pas le clair)
  await service().from('api_keys').delete().eq('user_id', user.id).eq('label', 'main')
  await service().from('api_keys').insert({
    user_id: user.id, key_hash: keyHash, key_prefix: keyPrefix, label: 'main',
  })

  return new NextResponse(buildEa(rawKey), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="CaldraMT5.mq5"',
      'Cache-Control': 'no-store',
    },
  })
}
