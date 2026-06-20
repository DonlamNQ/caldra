// Détail TECHNIQUE d'une alerte, dérivé de son `detail` (jsonb) — affiché dans le
// feed à la place de la conséquence pédagogique (qui, elle, ira dans les messages).
// Court, factuel, propre au trade.

export function alertTechnical(type?: string | null, detail?: Record<string, any> | null): string | null {
  const d = detail || {}
  switch (type) {
    case 'revenge_sizing':
    case 'euphoria_sizing':
      return d.current_size != null ? `Taille ${d.current_size} vs ${d.previous_size} (×${d.ratio})` : null
    case 'immediate_reentry':
      return d.seconds_since_exit != null ? `${d.seconds_since_exit}s après sortie · min ${d.minimum_required}s` : null
    case 'overtrading':
      return d.current != null ? `${d.current}/${d.max} trades` : null
    case 'outside_session':
      return d.entry_time ? `Entrée ${String(d.entry_time).slice(0, 5)} · fenêtre ${String(d.session_start).slice(0, 5)}–${String(d.session_end).slice(0, 5)}` : null
    case 'averaging_down':
      return d.symbol ? `${d.symbol} ${d.direction} · taille ${d.current_size} ≥ ${d.previous_size}` : null
    case 'consecutive_losses':
      return d.count != null ? `${d.count} pertes d'affilée · seuil ${d.threshold}` : null
    case 'drawdown_alert':
    case 'drawdown_override':
      return d.drawdown_pct != null || d.prior_drawdown_pct != null
        ? `${d.drawdown_pct ?? d.prior_drawdown_pct}% / ${d.max_allowed}% · ${Math.round(Number(d.current_pnl ?? d.prior_pnl ?? 0))}€`
        : null
    case 'stop_not_respected':
      return d.loss_pct != null ? `Perte ${d.loss_pct}% > risque ${d.max_risk_pct}%` : null
    case 'risk_exceeded':
      return d.risk_pct != null ? `Risque ${d.risk_pct}% > ${d.max_risk_pct}%` : null
    case 'overleverage':
      return d.leverage != null ? `Levier ×${d.leverage} · max ${d.max_leverage}×` : null
    case 'accelerating_frequency':
      return d.last_gap_sec != null ? `${d.last_gap_sec}s entre entrées · médiane ${d.median_gap_sec}s` : null
    case 'end_of_day_desperation':
      return d.minutes_to_close != null ? `${d.minutes_to_close} min avant clôture` : null
    case 'news_trading':
      return d.title ? `${d.title} (${d.currency}) à ${d.minutes_from_event} min` : null
    case 'cut_winners_hold_losers':
      return d.avg_win_sec != null ? `Gagnants ${d.avg_win_sec}s vs perdants ${d.avg_loss_sec}s` : null
    case 'no_stop':
      return d.symbol ? `${d.symbol} fermé sans stop` : null
    case 'unfamiliar_symbol':
      return d.symbol ? `${d.symbol} · ${d.known_symbols} symboles habituels (${d.lookback_days}j)` : null
    default:
      return null
  }
}
