// Seed ~1 mois d'historique de trading pour un utilisateur (compte de démo).
// Usage : node scripts/seed-history.mjs <email>
// Lit les clés dans .env.local, supprime les trades + alertes existants de
// l'utilisateur, puis insère des trades réalistes sur ~30 jours (jours ouvrés).
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// ── env ──────────────────────────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
const email = (process.argv[2] || 'samsam.kone@gmail.com').toLowerCase()
if (!URL_ || !KEY) { console.error('Clés Supabase manquantes dans .env.local'); process.exit(1) }

const sb = createClient(URL_, KEY, { auth: { persistSession: false } })

// ── trouver l'utilisateur ────────────────────────────────────────────────────
async function findUser() {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const u = data.users.find(u => (u.email || '').toLowerCase() === email)
    if (u) return u
    if (data.users.length < 1000) break
  }
  return null
}

// ── générateur ───────────────────────────────────────────────────────────────
const rnd = (a, b) => a + Math.random() * (b - a)
const pick = arr => arr[Math.floor(Math.random() * arr.length)]
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d

// symbole → prix de base + valeur du point (€/point/contrat) + pas de prix
const SYMBOLS = [
  { s: 'ES',  base: 5210, pv: 50,   tick: 0.25 },
  { s: 'NQ',  base: 18250, pv: 20,  tick: 0.25 },
  { s: 'GC',  base: 2355, pv: 100,  tick: 0.1 },
  { s: 'CL',  base: 78.5, pv: 1000, tick: 0.01 },
  { s: 'YM',  base: 39100, pv: 5,   tick: 1 },
  { s: 'RTY', base: 2055, pv: 50,   tick: 0.1 },
]

function genTrades(userId) {
  const trades = []
  const now = new Date()
  // 30 jours calendaires en arrière → on garde les jours ouvrés
  for (let d = 30; d >= 0; d--) {
    const day = new Date(now)
    day.setUTCDate(now.getUTCDate() - d)
    const dow = day.getUTCDay()
    if (dow === 0 || dow === 6) continue          // week-end
    if (Math.random() < 0.12) continue            // quelques jours sans trade

    const nTrades = Math.floor(rnd(2, 7))          // 2 à 6 trades / jour
    // léger biais : certaines journées sont franchement bonnes ou mauvaises
    const dayBias = pick([1, 1, 1, 0.85, 1.15])

    for (let k = 0; k < nTrades; k++) {
      const sym = pick(SYMBOLS)
      const direction = Math.random() < 0.5 ? 'long' : 'short'
      const size = Math.floor(rnd(1, 4))           // 1 à 3 contrats

      const entry = new Date(day)
      entry.setUTCHours(Math.floor(rnd(13, 19)), Math.floor(rnd(0, 60)), 0, 0)
      const exit = new Date(entry.getTime() + Math.floor(rnd(5, 90)) * 60000)

      // P&L : ~54% de gagnants, gains un peu plus gros que les pertes
      const win = Math.random() < 0.54 * dayBias
      let pnl = win
        ? rnd(40, 260) * (Math.random() < 0.12 ? 1.8 : 1)     // gros gain occasionnel
        : -rnd(30, 170) * (Math.random() < 0.12 ? 1.7 : 1)    // grosse perte occasionnelle
      pnl = round(pnl * dayBias)

      const entryPrice = round(sym.base * (1 + rnd(-0.012, 0.012)), 2)
      const move = pnl / (size * sym.pv)            // points pour atteindre ce pnl
      const exitPrice = round(direction === 'long' ? entryPrice + move : entryPrice - move, 2)

      trades.push({
        user_id: userId,
        symbol: sym.s,
        direction,
        size,
        entry_price: entryPrice,
        exit_price: exitPrice,
        entry_time: entry.toISOString(),
        exit_time: exit.toISOString(),
        pnl,
        status: 'closed',
      })
    }
  }
  return trades
}

// ── run ──────────────────────────────────────────────────────────────────────
const user = await findUser()
if (!user) { console.error(`Utilisateur introuvable : ${email}`); process.exit(1) }
console.log(`Utilisateur : ${email} → ${user.id}`)

const { error: delA } = await sb.from('alerts').delete().eq('user_id', user.id)
if (delA) throw delA
const { error: delT } = await sb.from('trades').delete().eq('user_id', user.id)
if (delT) throw delT
console.log('Trades + alertes existants supprimés.')

const trades = genTrades(user.id)
const { error: insErr } = await sb.from('trades').insert(trades)
if (insErr) throw insErr

const total = round(trades.reduce((a, t) => a + t.pnl, 0))
const wins = trades.filter(t => t.pnl > 0).length
console.log(`${trades.length} trades insérés · P&L net ${total >= 0 ? '+' : ''}${total}€ · ${wins}G/${trades.length - wins}P`)
