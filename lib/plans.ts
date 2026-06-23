// Source unique pour la logique de plan Caldra.
//
// Plans en base : 'pro' (19€/mois) et 'max' (39€/mois).
// 'sentinel' était l'ancien nom du plan Max — encore toléré en lecture le temps
// que la migration DB (UPDATE user_profiles SET plan='max' WHERE plan='sentinel')
// se propage et qu'aucun webhook en vol ne réécrive l'ancienne valeur.

export type Plan = 'pro' | 'max'

/** true si l'utilisateur a le plan Max (ou l'ancien 'sentinel'). */
export function isMaxPlan(plan: string | null | undefined): boolean {
  return plan === 'max' || plan === 'sentinel'
}

/** true si l'utilisateur a un plan payant (Pro ou Max). */
export function isPaidPlan(plan: string | null | undefined): boolean {
  return plan === 'pro' || isMaxPlan(plan)
}

/** Normalise une valeur de plan reçue (ex. metadata Stripe) vers le nom canonique. */
export function normalizePlan(plan: string | null | undefined): Plan | null {
  if (plan === 'pro') return 'pro'
  if (isMaxPlan(plan)) return 'max'
  return null
}

// Détecteurs réservés au plan Max (7). Les 11 autres détecteurs comportementaux
// sont inclus dès le plan Pro. Voir lib/engine.ts pour la logique de chaque
// détecteur et CLAUDE.md pour le tableau complet.
export const MAX_ONLY_DETECTORS = new Set<string>([
  'revenge_sizing',
  'averaging_down',
  'euphoria_sizing',
  'accelerating_frequency',
  'cut_winners_hold_losers',
  'drawdown_override',
  'news_trading',
])
