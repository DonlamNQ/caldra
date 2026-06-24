// Configuration one-shot du compte Stripe Caldra (mode LIVE ou test).
//
// Crée (de façon idempotente) :
//   • Produit "Caldra Pro"  + prix 19€/mois
//   • Produit "Caldra Max"  + prix 34€/mois
//   • Coupon early adopter  : -25 % à vie, max 25 utilisations
//   • Code promo associé    : START25 (configurable)
//   • Webhook endpoint      : 3 events → /api/billing/webhook
// Puis imprime les variables d'env à coller dans Vercel + .env.local.
//
// Usage (PowerShell) :
//   $env:STRIPE_SECRET_KEY="sk_live_xxx"; node scripts/stripe-setup.mjs
// Usage (bash) :
//   STRIPE_SECRET_KEY=sk_live_xxx node scripts/stripe-setup.mjs
//
// Optionnel :
//   CALDRA_WEBHOOK_URL=https://getcaldra.com/api/billing/webhook  (défaut)
//   EARLY_PROMO_CODE=START25                                      (défaut)
//
// Réexécutable sans risque : il réutilise ce qui existe déjà (pas de doublons).

import Stripe from 'stripe'
import { readFileSync } from 'node:fs'

// Charge .env.local (gitignoré) si STRIPE_SECRET_KEY n'est pas déjà dans l'env.
// Évite d'avoir à taper la clé en clair dans le terminal / le chat.
function loadEnvLocal() {
  if (process.env.STRIPE_SECRET_KEY) return
  try {
    const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m) continue
      const key = m[1]
      let val = m[2].trim().replace(/^["']|["']$/g, '')
      if (!(key in process.env)) process.env[key] = val
    }
  } catch { /* pas de .env.local → on lira l'env système */ }
}
loadEnvLocal()

const KEY = process.env.STRIPE_SECRET_KEY
if (!KEY) {
  console.error('❌ STRIPE_SECRET_KEY manquant. Ex : STRIPE_SECRET_KEY=sk_live_xxx node scripts/stripe-setup.mjs')
  process.exit(1)
}
const LIVE = KEY.startsWith('sk_live_')
const WEBHOOK_URL = process.env.CALDRA_WEBHOOK_URL || 'https://getcaldra.com/api/billing/webhook'
const PROMO_CODE  = (process.env.EARLY_PROMO_CODE || 'START25').toUpperCase()

// Version d'API stable : la dahlia 2026 (défaut de certains comptes) rejette le
// paramètre `coupon` de promotionCodes.create. On épingle une version connue OK
// pour toutes les opérations de ce script (sans impact sur l'app, qui pin la sienne).
const stripe = new Stripe(KEY, { apiVersion: '2024-06-20' })

// ── Produit + prix mensuel EUR, idempotent via metadata.caldra_plan ───────────
async function ensureProductPrice(planKey, name, amountCents) {
  const products = await stripe.products.search({ query: `metadata['caldra_plan']:'${planKey}'` })
  let product = products.data[0]
  if (product) {
    console.log(`• Produit ${name} déjà présent (${product.id})`)
  } else {
    product = await stripe.products.create({ name, metadata: { caldra_plan: planKey } })
    console.log(`✓ Produit ${name} créé (${product.id})`)
  }

  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 })
  let price = prices.data.find(
    p => p.unit_amount === amountCents && p.currency === 'eur' && p.recurring?.interval === 'month'
  )
  if (price) {
    console.log(`• Prix ${amountCents / 100}€/mois déjà présent (${price.id})`)
  } else {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: amountCents,
      currency: 'eur',
      recurring: { interval: 'month' },
    })
    console.log(`✓ Prix ${amountCents / 100}€/mois créé (${price.id})`)
  }
  return price.id
}

// ── Coupon -25 % à vie + code promo, idempotents ──────────────────────────────
async function ensureCouponAndPromo() {
  const couponId = 'caldra-early-25-forever'
  let coupon
  try {
    coupon = await stripe.coupons.retrieve(couponId)
    console.log(`• Coupon ${couponId} déjà présent`)
  } catch {
    coupon = await stripe.coupons.create({
      id: couponId,
      percent_off: 25,
      duration: 'forever',
      max_redemptions: 25,
      name: 'Early adopter −25 % à vie',
    })
    console.log(`✓ Coupon ${couponId} créé (−25 % à vie, max 25)`)
  }

  const existing = await stripe.promotionCodes.list({ code: PROMO_CODE, limit: 1 })
  if (existing.data[0]) {
    console.log(`• Code promo ${PROMO_CODE} déjà présent (${existing.data[0].id})`)
  } else {
    const promo = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: PROMO_CODE,
      max_redemptions: 25,
    })
    console.log(`✓ Code promo ${PROMO_CODE} créé (${promo.id})`)
  }
}

// ── Webhook endpoint, idempotent via URL ──────────────────────────────────────
async function ensureWebhook() {
  const events = [
    'checkout.session.completed',
    'customer.subscription.updated',
    'customer.subscription.deleted',
  ]
  const list = await stripe.webhookEndpoints.list({ limit: 100 })
  const existing = list.data.find(w => w.url === WEBHOOK_URL)
  if (existing) {
    console.log(`• Webhook déjà présent pour ${WEBHOOK_URL} (${existing.id})`)
    console.log('  ⚠️ Le secret n\'est lisible qu\'à la création. Si tu ne l\'as pas,')
    console.log('     supprime ce endpoint dans le dashboard et relance le script.')
    return null
  }
  const wh = await stripe.webhookEndpoints.create({ url: WEBHOOK_URL, enabled_events: events })
  console.log(`✓ Webhook créé pour ${WEBHOOK_URL} (${wh.id})`)
  return wh.secret // whsec_... — disponible uniquement maintenant
}

async function main() {
  console.log(`\n=== Configuration Stripe Caldra — mode ${LIVE ? 'LIVE 🔴' : 'TEST 🧪'} ===\n`)
  const proPrice = await ensureProductPrice('pro', 'Caldra Pro', 1900)
  const maxPrice = await ensureProductPrice('max', 'Caldra Max', 3400)
  await ensureCouponAndPromo()
  const whSecret = await ensureWebhook()

  console.log('\n──────────────────────────────────────────────')
  console.log('À coller dans Vercel (Settings → Environment Variables) + .env.local :\n')
  console.log(`STRIPE_PRO_PRICE_ID=${proPrice}`)
  console.log(`STRIPE_MAX_PRICE_ID=${maxPrice}`)
  if (whSecret) console.log(`STRIPE_WEBHOOK_SECRET=${whSecret}`)
  else console.log('STRIPE_WEBHOOK_SECRET=<inchangé — webhook déjà existant>')
  console.log('STRIPE_SECRET_KEY=<ta clé sk_live_… (déjà connue)>')
  console.log('──────────────────────────────────────────────\n')
  console.log(`Code promo early adopter : ${PROMO_CODE} (−25 % à vie, 25 max)`)
  console.log('Reste à faire à la main : activer le compte (infos société) et le Customer Portal (lien plus bas).\n')
}

main().catch(e => { console.error('\n❌ Erreur :', e.message); process.exit(1) })
