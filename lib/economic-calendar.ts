// Calendrier économique — détecteur "Trade pendant news".
// Source : flux JSON public de Forex Factory (mirroir faireconomy.media), gratuit
// et sans clé API. Donne pour la semaine en cours chaque événement avec sa devise
// (`country`), son impact (High/Medium/Low/Holiday) et son horaire ISO 8601.
// Remplaçable par une autre source en ne changeant que loadEvents().

type EcoEvent = { time: number; currency: string; title: string; impact: string }

const FEED_URL  = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json'
const CACHE_MS  = 30 * 60 * 1000   // le flux ne bouge qu'une fois par semaine
const WINDOW_MIN_DEFAULT = 5

let cache: { at: number; events: EcoEvent[] } | null = null

async function loadEvents(): Promise<EcoEvent[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.events
  try {
    const res = await fetch(FEED_URL, { headers: { 'user-agent': 'Caldra/1.0' } })
    if (!res.ok) return cache?.events ?? []
    const raw = await res.json()
    const events: EcoEvent[] = (Array.isArray(raw) ? raw : [])
      .map((e: any) => ({
        time:     new Date(e.date).getTime(),
        currency: String(e.country || '').toUpperCase(),
        title:    String(e.title || ''),
        impact:   String(e.impact || ''),
      }))
      .filter((e: EcoEvent) => !!e.time && !!e.currency)
    cache = { at: Date.now(), events }
    return events
  } catch {
    return cache?.events ?? []
  }
}

// Devises impliquées par un symbole. Paire forex standard (6 lettres) → 2 devises.
// Pour les symboles non-forex (indices, métaux), on ne sait pas mapper → [].
function symbolCurrencies(symbol: string): string[] {
  const s = String(symbol || '').toUpperCase().replace(/[^A-Z]/g, '')
  if (s.length >= 6) return [s.slice(0, 3), s.slice(3, 6)]
  return []
}

// Renvoie l'événement à fort impact le plus proche de l'entrée (dans la fenêtre),
// ou null. Toujours sûr : ne jette jamais, renvoie null si flux/symbole inexploitable.
export async function newsConflict(
  entryTimeISO: string,
  symbol: string,
  windowMin: number = WINDOW_MIN_DEFAULT,
): Promise<{ title: string; currency: string; minutes: number } | null> {
  const currencies = symbolCurrencies(symbol)
  if (currencies.length === 0) return null

  const entry = new Date(entryTimeISO).getTime()
  if (!entry) return null

  const events   = await loadEvents()
  const windowMs = windowMin * 60 * 1000

  let best: { title: string; currency: string; minutes: number } | null = null
  for (const e of events) {
    if (e.impact !== 'High') continue
    if (!currencies.includes(e.currency)) continue
    const diff = Math.abs(e.time - entry)
    if (diff <= windowMs) {
      const minutes = Math.round(diff / 60000)
      if (!best || minutes < best.minutes) best = { title: e.title, currency: e.currency, minutes }
    }
  }
  return best
}
