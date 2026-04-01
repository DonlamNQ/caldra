import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Trades ───────────────────────────────────────────────────────────────────

/**
 * Persist a trade record.
 * Expected shape: { sessionId, symbol, size, entryPrice, stopLoss, pnl, openedAt, closedAt, ... }
 * Returns { data: trade, error }
 */
export async function saveTrade(trade) {
  const { data, error } = await supabase
    .from('trades')
    .insert({
      session_id: trade.sessionId,
      symbol: trade.symbol,
      size: trade.size,
      entry_price: trade.entryPrice,
      stop_loss: trade.stopLoss,
      pnl: trade.pnl,
      opened_at: trade.openedAt,
      closed_at: trade.closedAt,
      raw: trade, // store full payload for future use
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Fetch all trades belonging to a session, ordered chronologically.
 * Returns { data: trade[], error }
 */
export async function getSessionTrades(sessionId) {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('session_id', sessionId)
    .order('opened_at', { ascending: true });

  return { data, error };
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

/**
 * Persist a detected alert.
 * Expected shape: { pattern, detected, severity, message, tradeId, sessionId, createdAt }
 * Returns { data: alert, error }
 */
export async function saveAlert(alert) {
  const { data, error } = await supabase
    .from('alerts')
    .insert({
      trade_id: alert.tradeId,
      session_id: alert.sessionId,
      pattern: alert.pattern,
      severity: alert.severity,
      message: alert.message,
      created_at: alert.createdAt ?? new Date().toISOString(),
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Fetch all alerts for a session, most critical first.
 * Returns { data: alert[], error }
 */
export async function getSessionAlerts(sessionId) {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('session_id', sessionId)
    .order('severity', { ascending: false })
    .order('created_at', { ascending: false });

  return { data, error };
}
