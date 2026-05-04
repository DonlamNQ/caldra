//+------------------------------------------------------------------+
//| CaldraMT5.mq5 — Caldra Trade Reporter v1.1                       |
//| Envoie chaque trade fermé vers https://getcaldra.com/api/ingest  |
//|                                                                  |
//| SETUP REQUIS dans MT5 :                                          |
//| Outils → Options → Expert Advisors                               |
//| ✅ Autoriser les WebRequest pour les URL suivantes :             |
//|    https://getcaldra.com                                         |
//+------------------------------------------------------------------+
#property copyright "Caldra"
#property version   "1.1"
#property strict

input string CaldraApiKey = "cal_votre_cle_ici";  // Caldra API Key

int lastDealsCount = 0;

int OnInit() {
   lastDealsCount = (int)HistoryDealsTotal();
   Print("[Caldra] EA démarré — ", lastDealsCount, " deals historiques ignorés");
   EventSetTimer(5);
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason) {
   EventKillTimer();
   Print("[Caldra] EA arrêté");
}

void OnTimer() {
   HistorySelect(0, TimeCurrent());
   int total = (int)HistoryDealsTotal();
   if (total <= lastDealsCount) return;

   for (int i = lastDealsCount; i < total; i++) {
      ulong ticket = HistoryDealGetTicket(i);
      if (ticket == 0) continue;

      // On ne traite que les deals de clôture
      long entryType = HistoryDealGetInteger(ticket, DEAL_ENTRY);
      if (entryType != DEAL_ENTRY_OUT && entryType != DEAL_ENTRY_INOUT) continue;

      string symbol   = HistoryDealGetString(ticket,  DEAL_SYMBOL);
      double exitPrice = HistoryDealGetDouble(ticket,  DEAL_PRICE);
      double volume    = HistoryDealGetDouble(ticket,  DEAL_VOLUME);
      double profit    = HistoryDealGetDouble(ticket,  DEAL_PROFIT);
      long   exitTimeS = HistoryDealGetInteger(ticket, DEAL_TIME);
      long   posId     = HistoryDealGetInteger(ticket, DEAL_POSITION_ID);

      // Retrouve le deal d'ouverture pour avoir le prix d'entrée et la direction réelle
      double entryPrice   = exitPrice;
      string entryTimeStr = FormatTime(exitTimeS - 60);
      string direction    = "long"; // défaut

      for (int j = 0; j < i; j++) {
         ulong t2 = HistoryDealGetTicket(j);
         if (HistoryDealGetInteger(t2, DEAL_POSITION_ID) == posId &&
             HistoryDealGetInteger(t2, DEAL_ENTRY) == DEAL_ENTRY_IN) {
            entryPrice   = HistoryDealGetDouble(t2,  DEAL_PRICE);
            entryTimeStr = FormatTime(HistoryDealGetInteger(t2, DEAL_TIME));
            // La direction est celle du deal d'OUVERTURE (BUY = long, SELL = short)
            direction = (HistoryDealGetInteger(t2, DEAL_TYPE) == DEAL_TYPE_BUY) ? "long" : "short";
            break;
         }
      }

      string exitTimeStr = FormatTime(exitTimeS);

      string body = StringFormat(
         "{\"symbol\":\"%s\",\"direction\":\"%s\",\"size\":%.4f,"
         "\"entry_price\":%.5f,\"exit_price\":%.5f,"
         "\"entry_time\":\"%s\",\"exit_time\":\"%s\",\"pnl\":%.2f}",
         symbol, direction, volume,
         entryPrice, exitPrice,
         entryTimeStr, exitTimeStr, profit
      );

      Print("[Caldra] Envoi trade : ", symbol, " ", direction, " size=", volume, " pnl=", profit);
      SendToCaldra(body);
   }

   lastDealsCount = total;
}

void SendToCaldra(string jsonBody) {
   string headers =
      "Content-Type: application/json\r\n"
      "x-caldra-key: " + CaldraApiKey + "\r\n";

   uchar post[];
   uchar result[];
   string resultHeaders;
   StringToCharArray(jsonBody, post, 0, StringLen(jsonBody), CP_UTF8);

   int res = WebRequest(
      "POST",
      "https://getcaldra.com/api/ingest",
      headers, 10000,
      post, result, resultHeaders
   );

   string responseBody = CharArrayToString(result);

   if (res == 200 || res == 201) {
      Print("[Caldra] ✓ Trade envoyé — réponse : ", responseBody);
   } else if (res == -1) {
      Print("[Caldra] ✗ WebRequest bloqué — va dans Outils → Options → Expert Advisors");
      Print("[Caldra]   Ajoute https://getcaldra.com dans la liste des URL autorisées");
   } else {
      Print("[Caldra] ✗ Erreur HTTP ", res, " — réponse : ", responseBody);
   }
}

string FormatTime(long unixSeconds) {
   MqlDateTime dt;
   TimeToStruct((datetime)unixSeconds, dt);
   return StringFormat("%04d-%02d-%02dT%02d:%02d:%02dZ",
      dt.year, dt.mon, dt.day, dt.hour, dt.min, dt.sec);
}
