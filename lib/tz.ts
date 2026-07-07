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
    zones: ['Europe/London', 'Europe/Dublin', 'Europe/Lisbon', 'Europe/Paris', 'Europe/Madrid',
      'Europe/Brussels', 'Europe/Amsterdam', 'Europe/Berlin', 'Europe/Zurich', 'Europe/Rome',
      'Europe/Vienna', 'Europe/Prague', 'Europe/Warsaw', 'Europe/Stockholm', 'Europe/Oslo',
      'Europe/Copenhagen', 'Europe/Helsinki', 'Europe/Athens', 'Europe/Bucharest', 'Europe/Kyiv',
      'Europe/Istanbul', 'Europe/Moscow'],
  },
  {
    label: 'Afrique',
    zones: ['Africa/Abidjan', 'Africa/Accra', 'Africa/Dakar', 'Africa/Bamako', 'Africa/Casablanca',
      'Africa/Algiers', 'Africa/Tunis', 'Africa/Lagos', 'Africa/Douala', 'Africa/Kinshasa',
      'Africa/Cairo', 'Africa/Khartoum', 'Africa/Johannesburg', 'Africa/Kigali', 'Africa/Nairobi',
      'Africa/Addis_Ababa'],
  },
  {
    label: 'Amérique du Nord',
    zones: ['America/New_York', 'America/Toronto', 'America/Chicago', 'America/Mexico_City',
      'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Vancouver',
      'America/Anchorage', 'Pacific/Honolulu'],
  },
  {
    label: 'Amérique latine',
    zones: ['America/Bogota', 'America/Lima', 'America/Caracas', 'America/Santiago',
      'America/Sao_Paulo', 'America/Argentina/Buenos_Aires', 'America/Montevideo'],
  },
  {
    label: 'Moyen-Orient',
    zones: ['Asia/Jerusalem', 'Asia/Beirut', 'Asia/Riyadh', 'Asia/Baghdad', 'Asia/Tehran',
      'Asia/Dubai'],
  },
  {
    label: 'Asie',
    zones: ['Asia/Karachi', 'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Bangkok', 'Asia/Jakarta',
      'Asia/Singapore', 'Asia/Hong_Kong', 'Asia/Shanghai', 'Asia/Taipei', 'Asia/Seoul',
      'Asia/Tokyo'],
  },
  {
    label: 'Océanie',
    zones: ['Australia/Perth', 'Australia/Adelaide', 'Australia/Brisbane', 'Australia/Sydney',
      'Pacific/Auckland'],
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
