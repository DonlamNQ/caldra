// Presets de prop firms : remplissent les garde-fous (perte journalière max, risque
// par trade) avec les valeurs types du challenge choisi. L'utilisateur garde sa
// propre taille de compte. Valeurs indicatives — à vérifier selon le challenge exact.

export type PropFirmPreset = {
  id: string
  name: string
  daily: number          // perte journalière max (% du compte) → max_daily_drawdown_pct
  total: number          // perte max totale (% du compte) — informatif
  risk: number           // risque conseillé par trade (%) → max_risk_per_trade_pct
  maxLosses: number      // pertes consécutives avant alerte → max_consecutive_losses
}

export const PROPFIRM_PRESETS: PropFirmPreset[] = [
  { id: 'ftmo',       name: 'FTMO',          daily: 5, total: 10, risk: 1,   maxLosses: 3 },
  { id: 'mff',        name: 'MyForexFunds',  daily: 5, total: 12, risk: 1,   maxLosses: 3 },
  { id: 'the5ers',    name: 'The5ers',       daily: 4, total: 6,  risk: 0.5, maxLosses: 3 },
  { id: 'fundednext', name: 'FundedNext',    daily: 5, total: 10, risk: 1,   maxLosses: 3 },
  { id: 'e8',         name: 'E8 Funding',    daily: 5, total: 8,  risk: 1,   maxLosses: 3 },
  { id: 'ftt',        name: 'FundingTraps',  daily: 5, total: 10, risk: 1,   maxLosses: 3 },
]
