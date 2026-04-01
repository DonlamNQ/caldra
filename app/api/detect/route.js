import { runAllDetectors } from '@/lib/detector';
import { saveTrade, saveAlert, getSessionTrades } from '@/lib/supabase';
import { analyzeSession } from '@/lib/ai-analyzer';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { trade, context: extraContext } = body;

  if (!trade) {
    return Response.json({ error: 'Missing required field: trade.' }, { status: 400 });
  }

  // ── 1. Persist the incoming trade ────────────────────────────────────────────
  const { data: savedTrade, error: tradeError } = await saveTrade(trade);
  if (tradeError) {
    console.error('[detect] saveTrade failed:', tradeError);
    // Non-blocking: detection continues even if persistence fails
  }

  // ── 2. Build detection context ────────────────────────────────────────────────
  // Fetch sibling trades from the same session for streak / overtrading checks
  let sessionTrades = [];
  if (trade.sessionId) {
    const { data } = await getSessionTrades(trade.sessionId);
    sessionTrades = data ?? [];
  }

  const context = {
    trade,
    trades: [...sessionTrades, trade],           // history + current trade
    sessionTradeCount: sessionTrades.length + 1,
    ...extraContext,                              // caller may pass avgSessionTrades, macroEvents, etc.
  };

  // ── 3. Run all detectors ──────────────────────────────────────────────────────
  const { alerts, raw } = runAllDetectors(context);

  // ── 4. Persist each alert ────────────────────────────────────────────────────
  const persistedAlerts = await Promise.all(
    alerts.map(async (alert) => {
      const payload = {
        ...alert,
        tradeId: savedTrade?.id ?? trade.id,
        sessionId: trade.sessionId,
        createdAt: new Date().toISOString(),
      };
      const { data, error } = await saveAlert(payload);
      if (error) console.error('[detect] saveAlert failed:', error);
      return data ?? payload;
    })
  );

  // ── 5. AI narrative for severity-3 alerts ────────────────────────────────────
  let aiAnalysis = null;
  const hasCritical = alerts.some((a) => a.severity === 3);

  if (hasCritical) {
    try {
      aiAnalysis = await analyzeSession({
        trade,
        alerts,
        sessionTrades,
      });
    } catch (err) {
      console.error('[detect] analyzeSession failed:', err);
      aiAnalysis = null;
    }
  }

  // ── 6. Response ───────────────────────────────────────────────────────────────
  return Response.json({
    alerts: persistedAlerts,
    raw,
    aiAnalysis,
    meta: {
      totalAlerts: alerts.length,
      criticalCount: alerts.filter((a) => a.severity === 3).length,
      tradeId: savedTrade?.id ?? trade.id,
    },
  });
}
