// Presets de prop firms : calent les garde-fous Caldra (drawdown journalier/total) et
// le suivi de challenge (objectif de profit par phase, jours min) sur les VRAIES règles
// du challenge choisi. L'utilisateur garde sa propre taille de compte (capital).
//
// Valeurs du challenge PHARE (2-step) de chaque firme — vérifiées sur leurs sites
// (juin 2026). Les variantes 1-step / Pro ont des seuils différents ; l'utilisateur
// ajuste manuellement si besoin (les champs restent éditables dans les Réglages).
//
// NB : « risk par trade » et « pertes consécutives » NE sont PAS des règles de prop
// firm — ce sont des garde-fous comportementaux propres à Caldra, laissés au choix de
// l'utilisateur et non écrasés par le preset.

export type PropFirmPreset = {
  id: string
  name: string
  daily: number     // perte journalière max (% du compte) → max_daily_drawdown_pct
  total: number     // perte max totale du challenge (% du compte)
  target1: number   // objectif de profit Phase 1 (% du compte)
  target2: number   // objectif de profit Phase 2 (% du compte)
  minDays: number   // jours de trading minimum (0 = pas de minimum)
}

export const PROPFIRM_PRESETS: PropFirmPreset[] = [
  { id: 'ftmo',        name: 'FTMO',                daily: 5, total: 10, target1: 10, target2: 5, minDays: 4 },
  { id: 'the5ers',     name: 'The5ers',             daily: 5, total: 10, target1: 8,  target2: 5, minDays: 3 },
  { id: 'fundednext',  name: 'FundedNext',          daily: 5, total: 10, target1: 8,  target2: 5, minDays: 5 },
  { id: 'e8',          name: 'E8 Markets',          daily: 4, total: 8,  target1: 8,  target2: 5, minDays: 0 },
  { id: 'fundingpips', name: 'Funding Pips',        daily: 5, total: 10, target1: 8,  target2: 5, minDays: 0 },
  { id: 'alpha',       name: 'Alpha Capital Group', daily: 5, total: 10, target1: 8,  target2: 5, minDays: 0 },
]

// Phase du challenge : Phase 1 (challenge) → Phase 2 (vérification) → Funded (financé).
export type PropFirmPhase = 'p1' | 'p2' | 'funded'

export const PROPFIRM_PHASES: { id: PropFirmPhase; label: string; short: string }[] = [
  { id: 'p1',     label: 'Phase 1',  short: 'P1' },
  { id: 'p2',     label: 'Phase 2',  short: 'P2' },
  { id: 'funded', label: 'Financé',  short: 'Funded' },
]

// Objectif de profit (%) pour une phase donnée. Funded = pas d'objectif (on protège les gains).
export function targetForPhase(p: PropFirmPreset, phase: PropFirmPhase): number {
  return phase === 'p1' ? p.target1 : phase === 'p2' ? p.target2 : 0
}
