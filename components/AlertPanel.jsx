'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5_000;

const SEVERITY_CONFIG = {
  1: {
    label: 'INFO',
    color: '#f0c040',
    bg: 'rgba(240, 192, 64, 0.08)',
    border: 'rgba(240, 192, 64, 0.30)',
    dot: '#f0c040',
  },
  2: {
    label: 'WARNING',
    color: '#e07820',
    bg: 'rgba(224, 120, 32, 0.08)',
    border: 'rgba(224, 120, 32, 0.30)',
    dot: '#e07820',
  },
  3: {
    label: 'CRITICAL',
    color: '#dc503c',
    bg: 'rgba(220, 80, 60, 0.10)',
    border: 'rgba(220, 80, 60, 0.40)',
    dot: '#dc503c',
  },
};

const PATTERN_LABELS = {
  revengeSizing: 'Revenge Sizing',
  riskRuleBreach: 'Risk Rule Breach',
  immediateReentry: 'Immediate Re-entry',
  lossStreak: 'Loss Streak',
  drawdownAlert: 'Drawdown Alert',
  newsWindowTrade: 'News Window Trade',
  outOfSessionTrade: 'Out-of-Session Trade',
  stopViolation: 'Stop Violation',
  sessionOvertrading: 'Session Overtrading',
};

// ─── Behavior Score ───────────────────────────────────────────────────────────
// 100 = clean session. Each alert deducts points weighted by severity.

function computeBehaviorScore(alerts) {
  if (!alerts.length) return 100;
  const WEIGHTS = { 1: 3, 2: 8, 3: 18 };
  const deduction = alerts.reduce((sum, a) => sum + (WEIGHTS[a.severity] ?? 0), 0);
  return Math.max(0, 100 - deduction);
}

function scoreColor(score) {
  if (score >= 75) return '#4ade80'; // green
  if (score >= 45) return '#f0c040'; // yellow
  if (score >= 20) return '#e07820'; // orange
  return '#dc503c';                  // red
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreRing({ score }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;
  const color = scoreColor(score);

  return (
    <div style={styles.scoreRingWrapper}>
      <svg width={72} height={72} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={36} cy={36} r={radius} fill="none" stroke="#1e1e2a" strokeWidth={6} />
        <circle
          cx={36} cy={36} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <span style={{ ...styles.scoreValue, color }}>{score}</span>
    </div>
  );
}

function AlertCard({ alert, isNew }) {
  const cfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG[1];
  const label = PATTERN_LABELS[alert.pattern] ?? alert.pattern;

  return (
    <div
      style={{
        ...styles.alertCard,
        background: cfg.bg,
        borderColor: cfg.border,
        animation: isNew ? 'fadeSlideIn 0.35s ease' : 'none',
      }}
    >
      <div style={styles.alertHeader}>
        <span style={{ ...styles.severityDot, background: cfg.dot }} />
        <span style={{ ...styles.severityLabel, color: cfg.color }}>{cfg.label}</span>
        <span style={styles.patternLabel}>{label}</span>
        <span style={styles.alertTime}>
          {new Date(alert.created_at ?? Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <p style={styles.alertMessage}>{alert.message}</p>
    </div>
  );
}

function CriticalBanner({ alert, onStop }) {
  if (!alert) return null;
  return (
    <div style={styles.criticalBanner}>
      <div style={styles.criticalBannerHeader}>
        <span style={styles.criticalIcon}>⚠</span>
        <span style={styles.criticalTitle}>Critical Risk Detected</span>
      </div>
      <p style={styles.criticalAiMessage}>{alert.ai_message ?? alert.message}</p>
      <button style={styles.stopButton} onClick={onStop}>
        Stop Session
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AlertPanel({ sessionId, onSessionStop }) {
  const [alerts, setAlerts] = useState([]);
  const [score, setScore] = useState(100);
  const [latestCritical, setLatestCritical] = useState(null);
  const [sessionStopped, setSessionStopped] = useState(false);
  const [error, setError] = useState(null);
  const [lastPoll, setLastPoll] = useState(null);
  const knownIdsRef = useRef(new Set());

  const fetchAlerts = useCallback(async () => {
    if (sessionStopped || !sessionId) return;

    try {
      const res = await fetch(`/api/session-alerts?sessionId=${sessionId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { alerts: incoming } = await res.json();

      // Mark which alerts are new for the entry animation
      const withNewFlag = incoming.map((a) => ({
        ...a,
        _isNew: !knownIdsRef.current.has(a.id),
      }));
      incoming.forEach((a) => knownIdsRef.current.add(a.id));

      setAlerts(withNewFlag);
      setScore(computeBehaviorScore(incoming));

      const critical = withNewFlag
        .filter((a) => a.severity === 3)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] ?? null;
      setLatestCritical(critical);
      setLastPoll(new Date());
      setError(null);
    } catch (err) {
      setError('Connection issue — retrying…');
      console.error('[AlertPanel] poll failed:', err);
    }
  }, [sessionId, sessionStopped]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  function handleStop() {
    setSessionStopped(true);
    onSessionStop?.();
  }

  const criticals = alerts.filter((a) => a.severity === 3);
  const others = alerts.filter((a) => a.severity < 3);

  return (
    <>
      <style>{keyframesCSS}</style>
      <div style={styles.panel}>

        {/* ── Header ── */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Behavior Monitor</h2>
            <span style={styles.sessionId}>
              Session {sessionId ? sessionId.slice(0, 8) + '…' : '—'}
            </span>
          </div>
          <div style={styles.scoreSection}>
            <ScoreRing score={score} />
            <span style={{ ...styles.scoreLabel, color: scoreColor(score) }}>
              Behavior Score
            </span>
          </div>
        </div>

        {/* ── Status bar ── */}
        <div style={styles.statusBar}>
          {sessionStopped ? (
            <span style={{ color: '#dc503c', fontWeight: 600 }}>● Session stopped</span>
          ) : error ? (
            <span style={{ color: '#e07820' }}>⚠ {error}</span>
          ) : (
            <span style={{ color: '#4ade80' }}>
              ● Live — last update {lastPoll ? lastPoll.toLocaleTimeString() : '—'}
            </span>
          )}
          <span style={styles.alertCount}>{alerts.length} alert{alerts.length !== 1 ? 's' : ''}</span>
        </div>

        {/* ── Critical banner ── */}
        {latestCritical && !sessionStopped && (
          <CriticalBanner alert={latestCritical} onStop={handleStop} />
        )}

        {/* ── Alert list ── */}
        <div style={styles.alertList}>
          {alerts.length === 0 && (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>✓</span>
              <p style={styles.emptyText}>No patterns detected this session.</p>
            </div>
          )}

          {criticals.length > 0 && (
            <section>
              <p style={styles.groupLabel}>Critical</p>
              {criticals.map((a) => (
                <AlertCard key={a.id} alert={a} isNew={a._isNew} />
              ))}
            </section>
          )}

          {others.length > 0 && (
            <section>
              {criticals.length > 0 && <p style={styles.groupLabel}>Other alerts</p>}
              {others.map((a) => (
                <AlertCard key={a.id} alert={a} isNew={a._isNew} />
              ))}
            </section>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  panel: {
    background: '#08080d',
    border: '1px solid #1e1e2a',
    borderRadius: 12,
    padding: '20px 24px',
    fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
    color: '#e2e2e8',
    minWidth: 360,
    maxWidth: 520,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    margin: 0,
    fontSize: 17,
    fontWeight: 600,
    letterSpacing: '-0.3px',
    color: '#f0f0f5',
  },
  sessionId: {
    fontSize: 11,
    color: '#5a5a6e',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  scoreSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  scoreRingWrapper: {
    position: 'relative',
    width: 72,
    height: 72,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    position: 'absolute',
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: '-0.5px',
  },
  scoreLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    fontWeight: 500,
  },
  statusBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 12,
    color: '#5a5a6e',
    borderTop: '1px solid #1e1e2a',
    paddingTop: 12,
  },
  alertCount: {
    fontSize: 11,
    color: '#5a5a6e',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  criticalBanner: {
    background: 'rgba(220, 80, 60, 0.08)',
    border: '1px solid rgba(220, 80, 60, 0.35)',
    borderRadius: 8,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    animation: 'fadeSlideIn 0.35s ease',
  },
  criticalBannerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  criticalIcon: {
    fontSize: 16,
    color: '#dc503c',
  },
  criticalTitle: {
    fontWeight: 600,
    fontSize: 14,
    color: '#dc503c',
    letterSpacing: '-0.2px',
  },
  criticalAiMessage: {
    margin: 0,
    fontSize: 13,
    color: '#c8c8d4',
    lineHeight: 1.55,
  },
  stopButton: {
    alignSelf: 'flex-start',
    background: '#dc503c',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '-0.1px',
    transition: 'opacity 0.15s ease',
  },
  alertList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  groupLabel: {
    margin: '0 0 6px',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    color: '#5a5a6e',
    fontWeight: 600,
  },
  alertCard: {
    borderRadius: 7,
    border: '1px solid transparent',
    padding: '10px 13px',
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    marginBottom: 4,
  },
  alertHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
  },
  severityDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    flexShrink: 0,
  },
  severityLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.7px',
  },
  patternLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: '#c8c8d4',
    flex: 1,
  },
  alertTime: {
    fontSize: 10,
    color: '#5a5a6e',
    flexShrink: 0,
  },
  alertMessage: {
    margin: 0,
    fontSize: 12,
    color: '#8888a0',
    lineHeight: 1.5,
    paddingLeft: 14,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: '28px 0',
  },
  emptyIcon: {
    fontSize: 22,
    color: '#4ade80',
  },
  emptyText: {
    margin: 0,
    fontSize: 13,
    color: '#5a5a6e',
  },
};

const keyframesCSS = `
  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  button:hover { opacity: 0.85; }
`;
