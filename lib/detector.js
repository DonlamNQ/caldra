/**
 * Caldra — Behavioural Detection Engine
 * Each detector receives a `context` object and returns:
 *   { detected: boolean, severity: 1|2|3, message: string }
 *
 * Severity scale:
 *   1 — Info / watch
 *   2 — Warning / review
 *   3 — Critical / stop
 */

// ─── 1. Revenge Sizing ────────────────────────────────────────────────────────
// Position size increases after a losing trade.
export function detectRevengeSizing(context) {
  const { trades } = context;
  if (!trades || trades.length < 2) return { detected: false, severity: 1, message: '' };

  const last = trades[trades.length - 1];
  const prev = trades[trades.length - 2];

  const afterLoss = prev.pnl < 0;
  const sizeIncreased = last.size > prev.size * 1.2; // >20% increase

  if (afterLoss && sizeIncreased) {
    const ratio = ((last.size / prev.size - 1) * 100).toFixed(0);
    return {
      detected: true,
      severity: 3,
      message: `Revenge sizing detected: position size increased by ${ratio}% after a losing trade.`,
    };
  }
  return { detected: false, severity: 1, message: '' };
}

// ─── 2. Risk Rule Breach ──────────────────────────────────────────────────────
// Single trade risk exceeds the configured max-risk-per-trade.
export function detectRiskRuleBreach(context) {
  const { trade, maxRiskPerTrade, accountSize } = context;
  if (!trade || !maxRiskPerTrade || !accountSize) return { detected: false, severity: 1, message: '' };

  const riskAmount = Math.abs(trade.entryPrice - trade.stopLoss) * trade.size;
  const riskPercent = (riskAmount / accountSize) * 100;
  const limitPercent = maxRiskPerTrade * 100;

  if (riskPercent > limitPercent) {
    return {
      detected: true,
      severity: 3,
      message: `Risk rule breach: trade risks ${riskPercent.toFixed(2)}% of account vs. ${limitPercent.toFixed(2)}% limit.`,
    };
  }
  return { detected: false, severity: 1, message: '' };
}

// ─── 3. Immediate Re-entry ────────────────────────────────────────────────────
// New trade opened within 2 minutes of the previous trade's exit.
export function detectImmediateReentry(context) {
  const { lastExitTime, newEntryTime, thresholdMinutes = 2 } = context;
  if (!lastExitTime || !newEntryTime) return { detected: false, severity: 1, message: '' };

  const diffMs = new Date(newEntryTime) - new Date(lastExitTime);
  const diffMinutes = diffMs / 60_000;

  if (diffMinutes >= 0 && diffMinutes < thresholdMinutes) {
    return {
      detected: true,
      severity: 2,
      message: `Immediate re-entry: new trade opened ${diffMinutes.toFixed(1)} min after last exit (threshold: ${thresholdMinutes} min).`,
    };
  }
  return { detected: false, severity: 1, message: '' };
}

// ─── 4. Loss Streak ───────────────────────────────────────────────────────────
// Three or more consecutive losing trades.
export function detectLossStreak(context) {
  const { trades, streakThreshold = 3 } = context;
  if (!trades || trades.length < streakThreshold) return { detected: false, severity: 1, message: '' };

  const recent = trades.slice(-streakThreshold);
  const allLosses = recent.every((t) => t.pnl < 0);

  if (allLosses) {
    const total = recent.reduce((sum, t) => sum + t.pnl, 0).toFixed(2);
    return {
      detected: true,
      severity: 2,
      message: `Loss streak: ${streakThreshold} consecutive losing trades (total: ${total}).`,
    };
  }
  return { detected: false, severity: 1, message: '' };
}

// ─── 5. Drawdown Alert ────────────────────────────────────────────────────────
// Daily loss approaching the configured daily drawdown limit.
export function detectDrawdownAlert(context) {
  const { dailyPnl, dailyDrawdownLimit, accountSize, warningThreshold = 0.8 } = context;
  if (dailyPnl === undefined || !dailyDrawdownLimit || !accountSize) return { detected: false, severity: 1, message: '' };

  const limitAmount = dailyDrawdownLimit * accountSize;
  const currentLoss = Math.abs(Math.min(dailyPnl, 0));
  const ratio = currentLoss / limitAmount;

  if (ratio >= 1) {
    return {
      detected: true,
      severity: 3,
      message: `Drawdown limit reached: daily loss of ${currentLoss.toFixed(2)} equals or exceeds limit of ${limitAmount.toFixed(2)}.`,
    };
  }
  if (ratio >= warningThreshold) {
    return {
      detected: true,
      severity: 2,
      message: `Drawdown warning: daily loss at ${(ratio * 100).toFixed(0)}% of limit (${currentLoss.toFixed(2)} / ${limitAmount.toFixed(2)}).`,
    };
  }
  return { detected: false, severity: 1, message: '' };
}

// ─── 6. News Window Trade ─────────────────────────────────────────────────────
// Trade opened within 5 minutes of a scheduled macro event.
export function detectNewsWindowTrade(context) {
  const { tradeTime, macroEvents = [], windowMinutes = 5 } = context;
  if (!tradeTime || macroEvents.length === 0) return { detected: false, severity: 1, message: '' };

  const tradeDate = new Date(tradeTime);

  for (const event of macroEvents) {
    const eventDate = new Date(event.time);
    const diffMs = Math.abs(tradeDate - eventDate);
    const diffMinutes = diffMs / 60_000;

    if (diffMinutes <= windowMinutes) {
      return {
        detected: true,
        severity: 2,
        message: `News window trade: opened ${diffMinutes.toFixed(1)} min from "${event.name}" (±${windowMinutes} min blackout).`,
      };
    }
  }
  return { detected: false, severity: 1, message: '' };
}

// ─── 7. Out-of-Session Trade ──────────────────────────────────────────────────
// Trade opened outside the trader's defined trading window.
export function detectOutOfSessionTrade(context) {
  const { tradeTime, sessionStart, sessionEnd } = context;
  // sessionStart / sessionEnd: "HH:MM" strings in the trader's local tz
  if (!tradeTime || !sessionStart || !sessionEnd) return { detected: false, severity: 1, message: '' };

  const toMinutes = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };

  const tradeDate = new Date(tradeTime);
  const tradeMinutes = tradeDate.getHours() * 60 + tradeDate.getMinutes();
  const startMinutes = toMinutes(sessionStart);
  const endMinutes = toMinutes(sessionEnd);

  const inSession =
    startMinutes <= endMinutes
      ? tradeMinutes >= startMinutes && tradeMinutes <= endMinutes
      : tradeMinutes >= startMinutes || tradeMinutes <= endMinutes; // crosses midnight

  if (!inSession) {
    return {
      detected: true,
      severity: 2,
      message: `Out-of-session trade: opened at ${tradeDate.getHours()}:${String(tradeDate.getMinutes()).padStart(2, '0')} outside window ${sessionStart}–${sessionEnd}.`,
    };
  }
  return { detected: false, severity: 1, message: '' };
}

// ─── 8. Stop Violation ────────────────────────────────────────────────────────
// Position held beyond the trader's typical stop-loss distance.
export function detectStopViolation(context) {
  const { trade, avgStopDistance, toleranceMultiplier = 1.5 } = context;
  if (!trade || !avgStopDistance) return { detected: false, severity: 1, message: '' };

  const actualStopDistance = Math.abs(trade.entryPrice - trade.stopLoss);
  const limit = avgStopDistance * toleranceMultiplier;

  if (actualStopDistance > limit) {
    return {
      detected: true,
      severity: 3,
      message: `Stop violation: stop distance (${actualStopDistance.toFixed(4)}) is ${(actualStopDistance / avgStopDistance).toFixed(1)}× your average (${avgStopDistance.toFixed(4)}).`,
    };
  }
  return { detected: false, severity: 1, message: '' };
}

// ─── 9. Session Overtrading ───────────────────────────────────────────────────
// Number of trades in the current session exceeds the historical average.
export function detectSessionOvertrading(context) {
  const { sessionTradeCount, avgSessionTrades, multiplierThreshold = 1.5 } = context;
  if (sessionTradeCount === undefined || !avgSessionTrades) return { detected: false, severity: 1, message: '' };

  const limit = avgSessionTrades * multiplierThreshold;

  if (sessionTradeCount >= limit) {
    return {
      detected: true,
      severity: 2,
      message: `Session overtrading: ${sessionTradeCount} trades this session vs. average of ${avgSessionTrades.toFixed(1)} (limit: ${limit.toFixed(0)}).`,
    };
  }
  return { detected: false, severity: 1, message: '' };
}

// ─── Master detector ──────────────────────────────────────────────────────────
// Runs all detectors and returns only the ones that fired.
export function runAllDetectors(context) {
  const results = {
    revengeSizing: detectRevengeSizing(context),
    riskRuleBreach: detectRiskRuleBreach(context),
    immediateReentry: detectImmediateReentry(context),
    lossStreak: detectLossStreak(context),
    drawdownAlert: detectDrawdownAlert(context),
    newsWindowTrade: detectNewsWindowTrade(context),
    outOfSessionTrade: detectOutOfSessionTrade(context),
    stopViolation: detectStopViolation(context),
    sessionOvertrading: detectSessionOvertrading(context),
  };

  const alerts = Object.entries(results)
    .filter(([, r]) => r.detected)
    .map(([name, r]) => ({ pattern: name, ...r }))
    .sort((a, b) => b.severity - a.severity); // critical first

  return { alerts, raw: results };
}
