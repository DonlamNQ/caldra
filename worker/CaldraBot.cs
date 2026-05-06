using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Globalization;
using cAlgo.API;

namespace CaldraBot
{
    [Robot(TimeZone = TimeZones.UTC, AccessRights = AccessRights.FullAccess)]
    public class CaldraBot : Robot
    {
        [Parameter("Caldra API Key", DefaultValue = "cal_...")]
        public string CaldraApiKey { get; set; }

        private static readonly HttpClient Http = new HttpClient();

        protected override void OnStart()
        {
            Http.DefaultRequestHeaders.Remove("x-caldra-key");
            Http.DefaultRequestHeaders.Add("x-caldra-key", CaldraApiKey);
            Positions.Closed += OnPositionClosed;
            Print("Caldra: bot démarré ✓");
        }

        private void OnPositionClosed(PositionClosedEventArgs args)
        {
            var pos = args.Position;
            var direction = pos.TradeType == TradeType.Buy ? "long" : "short";
            var entryTime = pos.EntryTime.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ");
            var exitTime  = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ");
            var exitPrice = pos.ClosePrice.HasValue
                ? pos.ClosePrice.Value.ToString(CultureInfo.InvariantCulture)
                : pos.EntryPrice.ToString(CultureInfo.InvariantCulture);

            var json = string.Format(
                "{{\"symbol\":\"{0}\",\"direction\":\"{1}\",\"size\":{2},\"entry_price\":{3},\"exit_price\":{4},\"entry_time\":\"{5}\",\"exit_time\":\"{6}\",\"pnl\":{7}}}",
                pos.SymbolName,
                direction,
                pos.Quantity.ToString(CultureInfo.InvariantCulture),
                pos.EntryPrice.ToString(CultureInfo.InvariantCulture),
                exitPrice,
                entryTime,
                exitTime,
                pos.GrossProfit.ToString(CultureInfo.InvariantCulture)
            );

            var content = new StringContent(json, Encoding.UTF8, "application/json");

            Task.Run(async () =>
            {
                try
                {
                    var res = await Http.PostAsync("https://getcaldra.com/api/ingest", content);
                    Print(string.Format("Caldra: {0} {1} envoyé — PnL={2} ({3})",
                        pos.SymbolName, direction, pos.GrossProfit, (int)res.StatusCode));
                }
                catch (Exception e)
                {
                    Print("Caldra erreur: " + e.Message);
                }
            });
        }

        protected override void OnStop() { }
    }
}
