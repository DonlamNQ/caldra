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

// Détecteurs réservés au plan Max (6). Les 12 autres détecteurs comportementaux
// sont inclus dès le plan Pro — dont `revenge_sizing` (le problème n°1 des traders),
// volontairement dans Pro pour qu'il soit un vrai produit. Voir lib/engine.ts pour la
// logique de chaque détecteur et CLAUDE.md pour le tableau complet.
export const MAX_ONLY_DETECTORS = new Set<string>([
  'averaging_down',
  'euphoria_sizing',
  'accelerating_frequency',
  'cut_winners_hold_losers',
  'drawdown_override',
  'news_trading',
  // Spécifiques au mode prop firm (ne se déclenchent qu'en challenge actif).
  'consistency_rule',
  'near_target_oversizing',
])

// Comptes VIP : accès complet et traités comme plan Max, SANS abonnement Stripe.
// Bypass du gate d'abonnement + déblocage des fonctionnalités Max.
export const VIP_EMAILS = new Set<string>([
  'alhamkone@gmail.com',
])

/** true si l'email est un compte VIP (accès illimité, plan Max forcé). */
export function isVip(email: string | null | undefined): boolean {
  return !!email && VIP_EMAILS.has(email.trim().toLowerCase())
}
