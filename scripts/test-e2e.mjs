/**
 * Caldra — Test end-to-end complet
 *
 * Usage:
 *   node scripts/test-e2e.mjs                          → teste localhost:3000
 *   BASE_URL=https://getcaldra.com node scripts/test-e2e.mjs
 *   CALDRA_KEY=cal_xxx node scripts/test-e2e.mjs       → teste aussi l'ingest avec une vraie clé
 *
 * Les tests d'ingest avec une vraie clé insèrent un trade réel en DB.
 * Supprimer manuellement dans Supabase SQL Editor si besoin :
 *   DELETE FROM trades WHERE symbol = '_TEST_' AND user_id = '...';
 */

const BASE  = process.env.BASE_URL  ?? 'http://localhost:3000'
const KEY   = process.env.CALDRA_KEY ?? ''

let passed = 0
let failed = 0
const errors = []

// ─── helpers ──────────────────────────────────────────────────────────────────

async function req(method, path, { body, headers = {}, params = '' } = {}) {
  const url = `${BASE}${path}${params}`
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  }
  try {
    const res = await fetch(url, opts)
    let json = null
    try { json = await res.json() } catch {}
    return { status: res.status, json }
  } catch (e) {
    return { status: 0, json: null, err: e.message }
  }
}

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✓  ${label}`)
    passed++
  } else {
    console.log(`  ✗  ${label}${detail ? `  ← ${detail}` : ''}`)
    failed++
    errors.push(label)
  }
}

function section(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 54 - title.length))}`)
}

// ─── 1. Waitlist ─────────────────────────────────────────────────────────────
// NOTE : limite 5 req/min par IP. On envoie exactement 4 requêtes ici pour
// laisser de la marge au test rate-limit (section 7) qui en envoie 6.

section('POST /api/waitlist')

{
  // Email valide en premier — la plus importante
  const r = await req('POST', '/api/waitlist', { body: { email: 'test-caldra-ci@mailinator.com' } })
  check('Email valide → 200 ok', r.status === 200 && r.json?.ok === true)
}
{
  const r = await req('POST', '/api/waitlist', { body: { email: 'pasunemail' } })
  check('Email sans @ → 400', r.status === 400)
}
{
  const r = await req('POST', '/api/waitlist', { body: { email: 'a@b' } })
  check('Email sans TLD → 400', r.status === 400)
}
{
  // Honeypot rempli : bot détecté → 200 silencieux
  const r = await req('POST', '/api/waitlist', { body: { email: 'bot@spam.com', website: 'http://spam.com' } })
  check('Honeypot rempli → 200 silencieux (bot ignoré)', r.status === 200 && r.json?.ok === true)
}
// Autres cas couverts implicitement par le regex (email vide, > 320 chars, body vide)
// — vérifiables manuellement ou en env local sans contrainte de rate-limit.

// ─── 2. Ingest — auth ─────────────────────────────────────────────────────────

section('POST /api/ingest — authentification')

{
  const r = await req('POST', '/api/ingest', { body: { symbol: 'ES', direction: 'long', size: 1, entry_price: 5000, entry_time: new Date().toISOString() } })
  check('Sans clé → 401', r.status === 401)
}
{
  const r = await req('POST', '/api/ingest', {
    headers: { 'x-caldra-key': 'cal_fausse_cle_00000000000000000000000' },
    body: { symbol: 'ES', direction: 'long', size: 1, entry_price: 5000, entry_time: new Date().toISOString() }
  })
  check('Clé invalide → 401', r.status === 401)
}
{
  // MT5 : clé dans query param, sans header
  const r = await req('GET', '/api/ingest', { params: '?key=cal_fausse_cle_00000000000000000000000&symbol=ES&direction=long&size=1&entry_price=5000&entry_time=2026-01-01T09%3A00%3A00Z' })
  check('GET sans clé valide → 401', r.status === 401)
}

// ─── 3. Ingest — validation ───────────────────────────────────────────────────

section('POST /api/ingest — validation champs')

// Ces tests utilisent une fausse clé → tous retournent 401.
// On ne peut pas tester la validation sans une vraie clé.
// Si CALDRA_KEY est fournie, on teste avec la vraie clé.

if (!KEY) {
  console.log('  ⚠  CALDRA_KEY non définie — tests validation skippés (nécessitent une vraie clé)')
  console.log('     Lancer avec : CALDRA_KEY=cal_xxx node scripts/test-e2e.mjs')
} else {
  const base = { symbol: 'ES', direction: 'long', size: 1, entry_price: 5210.50, exit_price: 5198.25, entry_time: '2026-01-02T09:45:00Z', exit_time: '2026-01-02T10:00:00Z', pnl: -24.50 }
  const post  = (body) => req('POST', '/api/ingest', { headers: { 'x-caldra-key': KEY }, body })
  const get   = (params) => req('GET',  '/api/ingest', { params: `?key=${KEY}&${params}` })

  {
    const r = await post({ ...base, symbol: 'INVALID SYMBOL!!!' })
    check('Symbol invalide → 400', r.status === 400, JSON.stringify(r.json))
  }
  {
    const r = await post({ ...base, symbol: 'X'.repeat(21) })
    check('Symbol trop long → 400', r.status === 400)
  }
  {
    const r = await post({ ...base, direction: 'buy' })
    check('Direction invalide → 400', r.status === 400)
  }
  {
    const r = await post({ ...base, size: -1 })
    check('Size négative → 400', r.status === 400)
  }
  {
    const r = await post({ ...base, size: 200000 })
    check('Size > 100000 → 400', r.status === 400)
  }
  {
    const r = await post({ ...base, entry_price: 0 })
    check('entry_price = 0 → 400', r.status === 400)
  }
  {
    const r = await post({ ...base, pnl: 99_000_000 })
    check('pnl > 10M → 400', r.status === 400)
  }
  {
    const r = await post({ ...base, entry_time: 'not-a-date' })
    check('entry_time invalide → 400', r.status === 400)
  }
  {
    // Trade ouvert (pas d'exit_price) → ignoré
    const r = await post({ symbol: 'ES', direction: 'long', size: 1, entry_price: 5210.50, entry_time: '2026-01-02T09:45:00Z' })
    check('Trade ouvert (pas exit_price) → 200 ignored', r.status === 200 && r.json?.ignored === true, JSON.stringify(r.json))
  }
  {
    // Trade valide (symbol fictif _TEST_)
    const r = await post({ symbol: '_TEST_', direction: 'long', size: 1, entry_price: 100, exit_price: 101, entry_time: '2026-01-02T09:45:00Z', exit_time: '2026-01-02T10:00:00Z', pnl: 100 })
    check('Trade fermé valide → 200 success', r.status === 200 && r.json?.success === true, JSON.stringify(r.json))
    if (r.json?.success) {
      console.log(`     trade_id  : ${r.json.trade_id}`)
      console.log(`     alertes   : ${r.json.alerts_generated}`)
    }
  }
  {
    // MT5 mode : GET avec query params
    const r = await get('symbol=_TEST_&direction=short&size=1&entry_price=100&exit_price=99&entry_time=2026-01-02T09%3A45%3A00Z&exit_time=2026-01-02T10%3A00%3A00Z&pnl=-100')
    check('MT5 GET mode → 200 success', r.status === 200 && r.json?.success === true, JSON.stringify(r.json))
  }
}

// ─── 4. Auth-protected endpoints — sans cookie ───────────────────────────────

section('Endpoints protégés — accès sans session')

{
  const r = await req('GET', '/api/session')
  check('GET /api/session sans session → 401', r.status === 401)
}
{
  const r = await req('GET', '/api/rules')
  check('GET /api/rules sans session → 401', r.status === 401)
}
{
  const r = await req('PUT', '/api/rules', { body: {} })
  check('PUT /api/rules sans session → 401', r.status === 401)
}
{
  const r = await req('GET', '/api/api-key')
  check('GET /api/api-key sans session → 401', r.status === 401)
}
// ─── CORS /api/ingest ──────────────────────────────────────────────────────

section('OPTIONS /api/ingest — CORS preflight')

{
  const r = await req('OPTIONS', '/api/ingest')
  check('OPTIONS → 200 (CORS preflight)', r.status === 200)
}

// ─── 7. Rate limit ────────────────────────────────────────────────────────────

section('Rate limiting /api/waitlist (5 req/min)')

// On envoie 6 requêtes rapides — la 6e doit être 429
{
  let last = null
  for (let i = 0; i < 6; i++) {
    last = await req('POST', '/api/waitlist', { body: { email: `rl-test-${i}@mailinator.com` } })
  }
  check('6e requête /api/waitlist → 429', last?.status === 429, `status: ${last?.status}`)
}

// ─── Résumé ───────────────────────────────────────────────────────────────────

console.log(`\n${'═'.repeat(58)}`)
console.log(`  Résultats : ${passed} ✓ passés  /  ${failed} ✗ échoués`)
if (errors.length) {
  console.log(`\n  Tests échoués :`)
  errors.forEach(e => console.log(`    - ${e}`))
}
console.log(`${'═'.repeat(58)}\n`)

process.exit(failed > 0 ? 1 : 0)
