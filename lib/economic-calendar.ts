// Calendrier économique — détecteur "Trade pendant news".
// Source : flux JSON public de Forex Factory (mirroir faireconomy.media), gratuit
// et sans clé API. Donne pour la semaine en cours chaque événement avec sa devise
// (`country`), son impact (High/Medium/Low/Holiday) et son horaire ISO 8601.
// Remplaçable par une autre source en ne changeant que loadEvents().

type EcoEvent = { time: number; currency: string; title: string; impact: string }

const FEED_URL  = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json'
const CACHE_MS  = 30 * 60 * 1000   // le flux ne bouge qu'une fois par semaine
const WINDOW_MIN_DEFAULT = 10      // ±10 min autour de l'événement

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

// Indices / matières premières → devise de l'économie sous-jacente. Les news à
// fort impact sur cette devise font bouger l'indice : un trader DAX est exposé
// aux chiffres de la zone euro, un trader US30 aux chiffres US, etc. Clé = symbole
// normalisé (majuscules, sans séparateur). Couvre les alias courtiers les plus
// répandus (MT5, cTrader, IG, OANDA…).
const INDEX_CURRENCY: Record<string, string> = {
  // — États-Unis (USD) —
  US30: 'USD', DJ30: 'USD', DJI30: 'USD', DJI: 'USD', DOW: 'USD', WS30: 'USD', YM: 'USD',
  US500: 'USD', SPX500: 'USD', SP500: 'USD', SPX: 'USD', ES: 'USD',
  US100: 'USD', NAS100: 'USD', USTEC: 'USD', NDX: 'USD', NQ: 'USD', NASDAQ: 'USD',
  US2000: 'USD', RUSSELL2000: 'USD', RUSSELL: 'USD', RUT: 'USD', RTY: 'USD',
  // — Zone euro (EUR) —
  GER40: 'EUR', GER30: 'EUR', DE40: 'EUR', DE30: 'EUR', DAX40: 'EUR', DAX: 'EUR',
  FRA40: 'EUR', FR40: 'EUR', CAC40: 'EUR', CAC: 'EUR',
  EU50: 'EUR', EUSTX50: 'EUR', STOXX50: 'EUR', ESTX50: 'EUR', SX5E: 'EUR',
  ESP35: 'EUR', SPA35: 'EUR', IBEX35: 'EUR', IBEX: 'EUR',
  ITA40: 'EUR', IT40: 'EUR', FTSEMIB: 'EUR', MIB: 'EUR',
  NETH25: 'EUR', NL25: 'EUR', AEX: 'EUR',
  // — Royaume-Uni (GBP) —
  UK100: 'GBP', FTSE100: 'GBP', FTSE: 'GBP', UKX: 'GBP',
  // — Suisse (CHF) —
  SWI20: 'CHF', CH20: 'CHF', SMI: 'CHF',
  // — Japon (JPY) —
  JP225: 'JPY', JPN225: 'JPY', NI225: 'JPY', N225: 'JPY', NIKKEI: 'JPY',
  // — Australie (AUD) —
  AUS200: 'AUD', AU200: 'AUD', ASX200: 'AUD', ASX: 'AUD',
  // — Matières premières cotées en USD —
  USOIL: 'USD', WTI: 'USD', OIL: 'USD', CL: 'USD',
  UKOIL: 'USD', BRENT: 'USD',
  XAU: 'USD', GOLD: 'USD', XAG: 'USD', SILVER: 'USD',
  NATGAS: 'USD', NGAS: 'USD',
}

// Suffixes courtiers fréquents accolés au symbole : US30.cash, GER40USD,
// NAS100SPOT, SPX500FT… On les retire pour retrouver la clé de base.
const BROKER_SUFFIX = /(CASH|SPOT|FT|RT|IDX|USD|EUR|GBP|JPY|AUD|CHF)$/

function indexCurrency(raw: string): string | null {
  if (INDEX_CURRENCY[raw]) return INDEX_CURRENCY[raw]
  const stripped = raw.replace(BROKER_SUFFIX, '')
  if (stripped !== raw && INDEX_CURRENCY[stripped]) return INDEX_CURRENCY[stripped]
  return null
}

// Devises impliquées par un symbole.
//   1) Indice / matière première connu → devise de l'économie sous-jacente.
//   2) Paire forex standard (≥ 6 lettres) → les 2 devises.
//   3) Sinon → [] (pas de mapping fiable, on se tait).
function symbolCurrencies(symbol: string): string[] {
  const raw = String(symbol || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!raw) return []
  const idx = indexCurrency(raw)
  if (idx) return [idx]
  const letters = raw.replace(/[0-9]/g, '')
  if (letters.length >= 6) return [letters.slice(0, 3), letters.slice(3, 6)]
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
