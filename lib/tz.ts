// Fuseau horaire utilisateur via identifiant IANA (ex. 'Europe/Paris').
// Remplace l'ancien offset fixe `tz_offset_hours` : le décalage est recalculé à
// chaque instant, donc l'heure d'été/hiver (DST) est gérée automatiquement —
// plus besoin de reculer le réglage de 2→1 fin octobre.

export const DEFAULT_TZ = 'Europe/Paris'

// Décalage (en minutes) d'un fuseau IANA à un instant donné, DST inclus.
export function tzOffsetMin(ms: number, tz: string): number {
  try {
    const d = new Date(ms)
    const utc = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }))
    const loc = new Date(d.toLocaleString('en-US', { timeZone: tz }))
    return Math.round((loc.getTime() - utc.getTime()) / 60000)
  } catch {
    return 0
  }
}

// Fuseau effectif depuis les règles : `timezone` IANA si présent, sinon défaut.
export function rulesTz(rules: any): string {
  const t = rules?.timezone
  return (typeof t === 'string' && t.includes('/')) ? t : DEFAULT_TZ
}

// Fuseau détecté côté navigateur (ex. 'Europe/Paris'), avec repli.
export function detectTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TZ
  } catch {
    return DEFAULT_TZ
  }
}

// Fuseaux courants groupés par région pour le sélecteur (optgroup).
export const TZ_GROUPS: { label: string; zones: string[] }[] = [
  {
    label: 'Europe',
    zones: ['Europe/Paris', 'Europe/London', 'Europe/Madrid', 'Europe/Berlin', 'Europe/Zurich',
      'Europe/Lisbon', 'Europe/Athens', 'Europe/Moscow'],
  },
  {
    label: 'Afrique',
    zones: ['Africa/Abidjan', 'Africa/Dakar', 'Africa/Casablanca', 'Africa/Algiers', 'Africa/Tunis',
      'Africa/Lagos', 'Africa/Douala', 'Africa/Cairo', 'Africa/Nairobi', 'Africa/Johannesburg'],
  },
  {
    label: 'Amériques',
    zones: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
      'America/Toronto', 'America/Sao_Paulo'],
  },
  {
    label: 'Asie / Moyen-Orient',
    zones: ['Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Shanghai', 'Asia/Tokyo'],
  },
  {
    label: 'Océanie',
    zones: ['Australia/Sydney'],
  },
  {
    label: 'Autre',
    zones: ['UTC'],
  },
]

// Liste plate (rétro-compat) dérivée des groupes.
export const COMMON_TZ = TZ_GROUPS.flatMap(g => g.zones)

// Libellé lisible d'un fuseau IANA (ex. 'Africa/Douala' → 'Douala').
export function tzLabel(tz: string): string {
  const city = tz.split('/').pop() || tz
  return city.replace(/_/g, ' ')
}
