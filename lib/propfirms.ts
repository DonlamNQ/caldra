// Presets de prop firms : calent le drawdown journalier max de Caldra sur la VRAIE
// règle de perte journalière du challenge choisi. L'utilisateur garde sa propre taille
// de compte. `total` = perte max totale du challenge (règle de la firme), affiché à
// titre informatif (Caldra raisonne par session, pas sur le drawdown global du compte).
//
// Valeurs du challenge PHARE (2-step) de chaque firme — vérifiées sur leurs sites
// (juin 2026). Les variantes 1-step / Pro ont des seuils plus stricts ; l'utilisateur
// ajuste manuellement si besoin.
//
// NB : « risk par trade » et « pertes consécutives » NE sont PAS des règles de prop
// firm — ce sont des garde-fous comportementaux propres à Caldra, laissés au choix de
// l'utilisateur et non écrasés par le preset.

export type PropFirmPreset = {
  id: string
  name: string
  daily: number   // perte journalière max (% du compte) → max_daily_drawdown_pct
  total: number   // perte max totale du challenge (% du compte) — informatif
}

export const PROPFIRM_PRESETS: PropFirmPreset[] = [
  { id: 'ftmo',        name: 'FTMO',                daily: 5, total: 10 },
  { id: 'the5ers',     name: 'The5ers',             daily: 5, total: 10 },
  { id: 'fundednext',  name: 'FundedNext',          daily: 5, total: 10 },
  { id: 'e8',          name: 'E8 Markets',          daily: 4, total: 8  },
  { id: 'fundingpips', name: 'Funding Pips',        daily: 5, total: 10 },
  { id: 'alpha',       name: 'Alpha Capital Group', daily: 5, total: 10 },
]
