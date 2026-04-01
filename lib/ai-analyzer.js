import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SEVERITY_LABELS = { 1: 'info', 2: 'warning', 3: 'critical' };

/**
 * Build a concise session summary for the prompt.
 * Keeps the payload small — the LLM only needs the facts.
 */
function buildSessionSummary({ trade, alerts, sessionTrades }) {
  const criticalPatterns = alerts
    .filter((a) => a.severity === 3)
    .map((a) => `- ${a.pattern}: ${a.message}`)
    .join('\n');

  const allPatterns = alerts
    .map((a) => `[${SEVERITY_LABELS[a.severity]}] ${a.pattern}: ${a.message}`)
    .join('\n');

  const sessionStats = sessionTrades.length
    ? {
        totalTrades: sessionTrades.length,
        losses: sessionTrades.filter((t) => t.pnl < 0).length,
        totalPnl: sessionTrades.reduce((s, t) => s + (t.pnl ?? 0), 0).toFixed(2),
      }
    : null;

  return {
    currentTrade: {
      symbol: trade.symbol,
      size: trade.size,
      pnl: trade.pnl,
      entryPrice: trade.entryPrice,
      stopLoss: trade.stopLoss,
    },
    sessionStats,
    criticalPatterns,
    allPatterns,
  };
}

/**
 * Generate a personalised coaching message for the trader when severity-3
 * patterns are detected in the session.
 *
 * @param {{ trade: object, alerts: object[], sessionTrades: object[] }} params
 * @returns {Promise<{ message: string, shouldStop: boolean }>}
 */
export async function analyzeSession({ trade, alerts, sessionTrades }) {
  const summary = buildSessionSummary({ trade, alerts, sessionTrades });

  const systemPrompt = `You are Caldra's behavioural risk coach, embedded inside a professional trading platform.
Your role is to protect traders from self-destructive patterns by delivering clear, direct, and empathetic warnings.

Guidelines:
- Be concise (max 4 sentences).
- Address the trader in second person ("you", "your").
- Name the critical patterns explicitly.
- Explain the psychological risk in plain language — no jargon.
- End with a single, unambiguous recommendation (stop / pause / reduce size).
- Never be alarmist or condescending. Be firm and caring.
- Output plain text only, no markdown.`;

  const userPrompt = `Here is the current session state:

CURRENT TRADE:
Symbol: ${summary.currentTrade.symbol ?? 'N/A'}
Size: ${summary.currentTrade.size}
P&L: ${summary.currentTrade.pnl}
Entry: ${summary.currentTrade.entryPrice} | Stop: ${summary.currentTrade.stopLoss}

${summary.sessionStats ? `SESSION SO FAR (${summary.sessionStats.totalTrades} trades):
Losses: ${summary.sessionStats.losses}
Total P&L: ${summary.sessionStats.totalPnl}` : 'No prior trades this session.'}

DETECTED PATTERNS:
${summary.allPatterns}

CRITICAL PATTERNS THAT TRIGGERED THIS ANALYSIS:
${summary.criticalPatterns}

Write a personalised warning message for this trader.`;

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 256,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  });

  const message = response.content[0]?.text?.trim() ?? '';

  // shouldStop is true when any severity-3 pattern is present
  const shouldStop = alerts.some((a) => a.severity === 3);

  return { message, shouldStop };
}
