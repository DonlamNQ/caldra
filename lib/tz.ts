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

// Liste de fuseaux courants pour le sélecteur (la détection auto y est fusionnée).
export const COMMON_TZ = [
  'Europe/Paris', 'Europe/London', 'Europe/Madrid', 'Europe/Berlin', 'Europe/Zurich',
  'Europe/Lisbon', 'Europe/Athens', 'Europe/Moscow', 'UTC',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Sao_Paulo', 'America/Toronto',
  'Africa/Abidjan', 'Africa/Dakar', 'Africa/Casablanca', 'Africa/Algiers', 'Africa/Tunis',
  'Africa/Lagos', 'Africa/Cairo', 'Africa/Nairobi', 'Africa/Johannesburg',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Shanghai',
  'Australia/Sydney',
]
