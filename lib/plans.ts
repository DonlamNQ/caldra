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

// Comptes VIP permanents : accès complet et traités comme plan Max, SANS abonnement
// Stripe. Bypass du gate d'abonnement + déblocage des fonctionnalités Max. Pas d'expiration.
export const VIP_EMAILS = new Set<string>([
  'alhamkone@gmail.com',
])

// Comptes VIP temporaires : email → date d'expiration (ISO). L'accès Max se coupe
// tout seul passé cette date (comparaison en UTC, la journée entière est incluse).
// Format 'YYYY-MM-DD' → expire à la fin de ce jour (soit à minuit UTC le lendemain).
export const VIP_EXPIRING: Record<string, string> = {
  'moudouroudavid91@icloud.com': '2026-07-21',
}

/** true si l'email est un compte VIP actif (permanent, ou temporaire non expiré). */
export function isVip(email: string | null | undefined): boolean {
  if (!email) return false
  const normalized = email.trim().toLowerCase()
  if (VIP_EMAILS.has(normalized)) return true
  const expiry = VIP_EXPIRING[normalized]
  if (!expiry) return false
  // Actif jusqu'à la fin du jour d'expiration inclus.
  return Date.now() < Date.parse(`${expiry}T23:59:59.999Z`)
}
