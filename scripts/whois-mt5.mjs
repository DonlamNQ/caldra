// Trouve l'utilisateur Caldra associé à un login MT5.
// Usage : node scripts/whois-mt5.mjs 25584260
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

function loadEnvLocal() {
  try {
    const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m) continue
      const k = m[1]
      const v = m[2].trim().replace(/^["']|["']$/g, '')
      if (!(k in process.env)) process.env[k] = v
    }
  } catch {}
}
loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('❌ URL/clé service manquante dans .env.local'); process.exit(1) }

const login = process.argv[2]   // optionnel : si absent → liste tous les comptes

const supa = createClient(url, key)

let q = supa.from('mt5_accounts').select('user_id, mt5_login, mt5_server, status, last_sync_at')
if (login) q = q.eq('mt5_login', login)
const { data: accts, error } = await q

if (error) { console.error('❌', error.message); process.exit(1) }
if (!accts?.length) { console.log(login ? `Aucun compte avec login ${login}.` : 'Aucun compte MT5 enregistré.'); process.exit(0) }
console.log(`${accts.length} compte(s) MT5 :`)

for (const a of accts) {
  const { data: u } = await supa.auth.admin.getUserById(a.user_id)
  console.log('─────────────────────────────')
  console.log('login    :', a.mt5_login)
  console.log('serveur  :', a.mt5_server)
  console.log('statut   :', a.status ?? '(n/a)')
  console.log('last_sync:', a.last_sync_at ?? '(jamais)')
  console.log('user_id  :', a.user_id)
  console.log('email    :', u?.user?.email ?? '(introuvable)')
}
