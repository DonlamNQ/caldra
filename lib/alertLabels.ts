// Mapping central type d'alerte → libellé français.
// Utilisé par AlertFeed (feed dashboard) et la grille de métriques.
// Toute nouvelle alerte créée dans lib/engine.ts doit être ajoutée ici.

export const ALERT_LABELS: Record<string, string> = {
  revenge_sizing:     'Revenge sizing',
  immediate_reentry:  'Re-entrée immédiate',
  consecutive_losses: 'Pertes consécutives',
  drawdown_alert:     'Drawdown',
  outside_session:    'Hors horaires',
  overtrading:        'Overtrading',
  news_trading:       'Trade pendant news',
  stop_not_respected: 'Stop non respecté',
  risk_exceeded:      'Risk dépassé',
}

/** Libellé FR lisible pour un type d'alerte (fallback : snake_case → mots). */
export function alertLabel(type?: string | null): string {
  if (!type) return '—'
  return ALERT_LABELS[type] ?? type.replace(/_/g, ' ')
}
