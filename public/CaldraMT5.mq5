//+------------------------------------------------------------------+
//| CaldraMT5.mq5 — Caldra Trade Reporter                           |
//| Sends closed trades to https://getcaldra.com/api/ingest          |
//+------------------------------------------------------------------+
#property copyright "Caldra"
#property version   "1.0"
#property strict

input string CaldraApiKey = "cal_votre_cle_ici";  // Caldra API Key

// Track last known history count to detect new closed trades
int    lastDealsCount = 0;

//+------------------------------------------------------------------+
int OnInit() {
   lastDealsCount = (int)HistoryDealsTotal();
   Print("[Caldra] EA initialisé. Deals connus : ", lastDealsCount);
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

      long  entryType = HistoryDealGetInteger(ticket, DEAL_ENTRY);
      if (entryType != DEAL_ENTRY_OUT && entryType != DEAL_ENTRY_INOUT) continue;

      string symbol    = HistoryDealGetString(ticket,  DEAL_SYMBOL);
      long   dealType  = HistoryDealGetInteger(ticket, DEAL_TYPE);
      double volume    = HistoryDealGetDouble(ticket,  DEAL_VOLUME);
      double price     = HistoryDealGetDouble(ticket,  DEAL_PRICE);
      double profit    = HistoryDealGetDouble(ticket,  DEAL_PROFIT);
      long   timeMs    = HistoryDealGetInteger(ticket, DEAL_TIME) * 1000;

      // Find matching entry deal (same position)
      long   posId     = HistoryDealGetInteger(ticket, DEAL_POSITION_ID);
      double entryPrice = price;
      string entryTimeStr = "";
      for (int j = 0; j < i; j++) {
         ulong t2 = HistoryDealGetTicket(j);
         if (HistoryDealGetInteger(t2, DEAL_POSITION_ID) == posId &&
             HistoryDealGetInteger(t2, DEAL_ENTRY) == DEAL_ENTRY_IN) {
            entryPrice = HistoryDealGetDouble(t2, DEAL_PRICE);
            long et = HistoryDealGetInteger(t2, DEAL_TIME);
            entryTimeStr = FormatTime(et);
            break;
         }
      }
      if (entryTimeStr == "") entryTimeStr = FormatTime((long)(timeMs / 1000) - 60);

      string direction = (dealType == DEAL_TYPE_BUY) ? "long" : "short";
      string exitTimeStr = FormatTime((long)(timeMs / 1000));

      string body = StringFormat(
         "{\"symbol\":\"%s\",\"direction\":\"%s\",\"size\":%.2f,"
         "\"entry_price\":%.5f,\"exit_price\":%.5f,"
         "\"entry_time\":\"%s\",\"exit_time\":\"%s\",\"pnl\":%.2f}",
         symbol, direction, volume,
         entryPrice, price,
         entryTimeStr, exitTimeStr, profit
      );

      SendToCaldra(body);
   }

   lastDealsCount = total;
}

//+------------------------------------------------------------------+
void SendToCaldra(string jsonBody) {
   string headers =
      "Content-Type: application/json\r\n"
      "x-caldra-key: " + CaldraApiKey + "\r\n";

   char   post[];
   char   result[];
   string resultHeaders;
   StringToCharArray(jsonBody, post, 0, StringLen(jsonBody));

   int res = WebRequest(
      "POST",
      "https://getcaldra.com/api/ingest",
      headers, 5000,
      post, result, resultHeaders
   );

   if (res == 200 || res == 201) {
      Print("[Caldra] Trade envoyé ✓");
   } else {
      Print("[Caldra] Erreur envoi — HTTP ", res, " | Body: ", CharArrayToString(result));
   }
}

//+------------------------------------------------------------------+
string FormatTime(long unixSeconds) {
   MqlDateTime dt;
   TimeToStruct((datetime)unixSeconds, dt);
   return StringFormat("%04d-%02d-%02dT%02d:%02d:%02dZ",
      dt.year, dt.mon, dt.day, dt.hour, dt.min, dt.sec);
}
