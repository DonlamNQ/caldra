//+------------------------------------------------------------------+
//|                                                      CaldraEA.mq5 |
//|                                  Caldra — Behavioral Trade Monitor |
//|                                          https://getcaldra.com    |
//+------------------------------------------------------------------+
#property copyright "Caldra"
#property link      "https://getcaldra.com"
#property version   "1.00"
#property description "Envoie chaque trade clôturé à l'API Caldra en temps réel"

#include <Trade\Trade.mqh>

//--- Input parameters
input string CALDRA_API_KEY   = "";                                    // Clé API Caldra (obligatoire)
input string CALDRA_ENDPOINT  = "https://getcaldra.com/api/ingest";   // Endpoint Caldra
input bool   LOG_TRADES       = true;                                  // Logger les envois dans les logs MT5

//--- Constantes
#define MAX_RETRIES     3
#define TIMEOUT_MS      5000
#define EA_NAME         "CaldraEA"

//+------------------------------------------------------------------+
//| Expert initialization                                            |
//+------------------------------------------------------------------+
int OnInit()
{
   if(StringLen(CALDRA_API_KEY) == 0)
   {
      Alert(EA_NAME + " : CALDRA_API_KEY est vide. Renseignez votre clé API dans les paramètres de l'EA.");
      return INIT_PARAMETERS_INCORRECT;
   }

   if(LOG_TRADES)
      Print(EA_NAME + " initialisé. Endpoint: ", CALDRA_ENDPOINT);

   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization                                          |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   if(LOG_TRADES)
      Print(EA_NAME + " : déchargé (raison=", reason, ")");
}

//+------------------------------------------------------------------+
//| OnTradeTransaction — détecte les positions clôturées             |
//+------------------------------------------------------------------+
void OnTradeTransaction(
   const MqlTradeTransaction& trans,
   const MqlTradeRequest&     request,
   const MqlTradeResult&      result)
{
   // On ne traite que la clôture de position via un deal exécuté
   if(trans.type != TRADE_TRANSACTION_DEAL_ADD)
      return;

   // Récupérer le deal
   ulong dealTicket = trans.deal;
   if(dealTicket == 0)
      return;

   // Sélectionner le deal dans l'historique
   if(!HistoryDealSelect(dealTicket))
      return;

   // Ignorer les deals d'entrée (on ne veut que les sorties)
   ENUM_DEAL_ENTRY dealEntry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
   if(dealEntry != DEAL_ENTRY_OUT && dealEntry != DEAL_ENTRY_INOUT)
      return;

   // Ignorer les deals sans profit réel (dépôts, retraits, etc.)
   ENUM_DEAL_TYPE dealType = (ENUM_DEAL_TYPE)HistoryDealGetInteger(dealTicket, DEAL_TYPE);
   if(dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL)
      return;

   //--- Récupérer les infos du deal de clôture
   string symbol     = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
   double exitPrice  = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
   double size       = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
   double pnl        = HistoryDealGetDouble(dealTicket, DEAL_PROFIT)
                     + HistoryDealGetDouble(dealTicket, DEAL_SWAP)
                     + HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
   datetime exitTime = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);

   // direction de la position qui vient d'être clôturée :
   // si le deal de clôture est BUY → la position était SHORT, et vice-versa
   string direction = (dealType == DEAL_TYPE_SELL) ? "long" : "short";

   //--- Retrouver le deal d'entrée via le position ID
   ulong positionId = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
   double entryPrice = 0.0;
   datetime entryTime = 0;

   if(HistorySelectByPosition(positionId))
   {
      int totalDeals = HistoryDealsTotal();
      for(int i = 0; i < totalDeals; i++)
      {
         ulong dTicket = HistoryDealGetTicket(i);
         if(dTicket == 0)
            continue;
         ENUM_DEAL_ENTRY dEntry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(dTicket, DEAL_ENTRY);
         if(dEntry == DEAL_ENTRY_IN || dEntry == DEAL_ENTRY_INOUT)
         {
            entryPrice = HistoryDealGetDouble(dTicket, DEAL_PRICE);
            entryTime  = (datetime)HistoryDealGetInteger(dTicket, DEAL_TIME);
            break;
         }
      }
   }

   if(entryPrice == 0.0 || entryTime == 0)
   {
      if(LOG_TRADES)
         Print(EA_NAME + " [WARN] deal d'entrée introuvable pour position ", positionId, " — trade ignoré");
      return;
   }

   //--- Construire le JSON
   string entryTimeISO = FormatISO8601(entryTime);
   string exitTimeISO  = FormatISO8601(exitTime);

   string json = StringFormat(
      "{\"symbol\":\"%s\",\"direction\":\"%s\",\"size\":%.5f,"
      "\"entry_price\":%.5f,\"exit_price\":%.5f,"
      "\"entry_time\":\"%s\",\"exit_time\":\"%s\","
      "\"pnl\":%.2f}",
      symbol, direction, size,
      entryPrice, exitPrice,
      entryTimeISO, exitTimeISO,
      pnl
   );

   if(LOG_TRADES)
      Print(EA_NAME + " [TRADE] ", json);

   //--- Envoyer à Caldra avec retry
   SendToCaldra(json, symbol, dealTicket);
}

//+------------------------------------------------------------------+
//| Envoie le JSON à l'API Caldra avec retry automatique            |
//+------------------------------------------------------------------+
void SendToCaldra(const string& json, const string& symbol, const ulong dealTicket)
{
   string headers = "Content-Type: application/json\r\n"
                  + "x-caldra-key: " + CALDRA_API_KEY + "\r\n";

   uchar dataOut[];
   StringToCharArray(json, dataOut, 0, StringLen(json));

   uchar  dataIn[];
   string responseHeaders;

   for(int attempt = 1; attempt <= MAX_RETRIES; attempt++)
   {
      ArrayResize(dataIn, 0);
      int httpCode = WebRequest(
         "POST",
         CALDRA_ENDPOINT,
         headers,
         TIMEOUT_MS,
         dataOut,
         dataIn,
         responseHeaders
      );

      if(httpCode == 200)
      {
         string response = CharArrayToString(dataIn);
         if(LOG_TRADES)
            Print(EA_NAME + " [OK] deal=", dealTicket, " symbol=", symbol,
                  " HTTP=200 response=", response);
         return;
      }
      else if(httpCode == -1)
      {
         int err = GetLastError();
         if(LOG_TRADES)
            Print(EA_NAME + " [ERR] tentative ", attempt, "/", MAX_RETRIES,
                  " — WebRequest erreur=", err,
                  ". Vérifiez que l'URL est dans MT5 Tools→Options→Expert Advisors→Allowed URLs");
      }
      else
      {
         string response = CharArrayToString(dataIn);
         if(LOG_TRADES)
            Print(EA_NAME + " [ERR] tentative ", attempt, "/", MAX_RETRIES,
                  " — HTTP ", httpCode, " response=", response);

         // 4xx = erreur client, inutile de retry
         if(httpCode >= 400 && httpCode < 500)
            return;
      }
   }

   if(LOG_TRADES)
      Print(EA_NAME + " [FAIL] deal=", dealTicket, " symbol=", symbol,
            " — échec après ", MAX_RETRIES, " tentatives");
}

//+------------------------------------------------------------------+
//| Formate un datetime en ISO 8601 UTC : 2026-03-31T09:45:00Z      |
//+------------------------------------------------------------------+
string FormatISO8601(const datetime dt)
{
   MqlDateTime mdt;
   TimeToStruct(dt, mdt);
   return StringFormat("%04d-%02d-%02dT%02d:%02d:%02dZ",
      mdt.year, mdt.mon, mdt.day,
      mdt.hour, mdt.min, mdt.sec);
}

//+------------------------------------------------------------------+
//| OnTick — requis par MQL5 même si non utilisé                    |
//+------------------------------------------------------------------+
void OnTick() {}
//+------------------------------------------------------------------+
