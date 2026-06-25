// Source unique des détecteurs : libellé, appartenance Max, et seuils réglables.
// Stockés par utilisateur dans trading_rules.detector_config (jsonb) :
//   { [type]: { enabled?: boolean, <seuil>?: number } }
// Lu avec défauts côté moteur (lib/engine.ts) et édité dans l'onglet Règles (Max).

export type DetectorThreshold = {
  key: string
  label: string
  unit?: string
  def: number
  min: number
  max: number
  step: number
}

export type DetectorDef = {
  type: string
  label: string
  max?: boolean
  thresholds?: DetectorThreshold[]
}

export const DETECTOR_DEFS: DetectorDef[] = [
  { type: 'outside_session', label: 'Hors horaires' },
  { type: 'immediate_reentry', label: 'Re-entrée immédiate' },
  { type: 'overtrading', label: 'Overtrading' },
  { type: 'end_of_day_desperation', label: 'Désespoir de fin de session', thresholds: [{ key: 'minutes', label: 'Avant clôture', unit: 'min', def: 10, min: 1, max: 60, step: 1 }] },
  { type: 'unfamiliar_symbol', label: 'Actif inhabituel' },
  { type: 'consecutive_losses', label: 'Pertes consécutives' },
  { type: 'drawdown_alert', label: 'Drawdown' },
  { type: 'stop_not_respected', label: 'Stop non respecté' },
  { type: 'risk_exceeded', label: 'Risk dépassé' },
  { type: 'overleverage', label: 'Sur-exposition' },
  { type: 'no_stop', label: 'Aucun stop' },
  { type: 'revenge_sizing', label: 'Revenge sizing', max: true, thresholds: [{ key: 'ratio', label: 'Ratio de taille', unit: '×', def: 1.5, min: 1.1, max: 5, step: 0.1 }] },
  { type: 'euphoria_sizing', label: "Sizing d'euphorie", max: true, thresholds: [{ key: 'ratio', label: 'Ratio de taille', unit: '×', def: 1.5, min: 1.1, max: 5, step: 0.1 }] },
  { type: 'averaging_down', label: 'Acharnement directionnel', max: true, thresholds: [{ key: 'losses', label: 'Pertes avant alerte', def: 2, min: 1, max: 5, step: 1 }] },
  { type: 'accelerating_frequency', label: "Cadence qui s'emballe", max: true },
  { type: 'cut_winners_hold_losers', label: 'Tu coupes tes gains', max: true },
  { type: 'drawdown_override', label: 'Drawdown franchi', max: true },
  { type: 'news_trading', label: 'Trade pendant news', max: true, thresholds: [{ key: 'window', label: 'Fenêtre news', unit: 'min', def: 10, min: 1, max: 60, step: 1 }] },
]

type Cfg = Record<string, { enabled?: boolean; [k: string]: unknown }> | null | undefined

/** true sauf si explicitement désactivé. */
export function detectorEnabled(config: Cfg, type: string): boolean {
  return config?.[type]?.enabled !== false
}

/** Seuil réglé pour ce détecteur, sinon le défaut. */
export function detectorThreshold(config: Cfg, type: string, key: string, def: number): number {
  const v = Number(config?.[type]?.[key])
  return isFinite(v) && v > 0 ? v : def
}
