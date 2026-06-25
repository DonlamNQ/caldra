import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const BG = '#08080d', SF = '#0d0d1a', BORD = 'rgba(255,255,255,.07)'
const TX = '#eae8f5', TE = 'rgba(234,232,245,.35)', TD = 'rgba(234,232,245,.6)'
const VIO = '#7c3aed', GRN = '#00d17a', RED = '#dc503c'

const Logo = () => (
  <div style={{ textAlign: 'center', marginBottom: 40 }}>
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch' }}>
      <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 8, textTransform: 'uppercase', color: TX }}>
        Cald<span style={{ color: VIO }}>ra</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, textTransform: 'uppercase', color: 'rgba(234,232,245,.55)', marginTop: 5 }}>
        {'SESSION'.split('').map((c, i) => <span key={i}>{c}</span>)}
      </div>
    </div>
  </div>
)

const Shell = ({ children, maxW = 480 }: { children: React.ReactNode; maxW?: number }) => (
  <>
    <style>{`*{box-sizing:border-box;margin:0;padding:0}`}</style>
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "var(--font-geist-sans),'Geist',sans-serif", color: TX, padding: '40px 0' }}>
      <div style={{ width: '100%', maxWidth: maxW, padding: '0 24px' }}>
        <Logo />
        {children}
      </div>
    </div>
  </>
)

function PlanCard({ name, price, featured, features, plan }: {
  name: string; price: string; featured?: boolean; features: string[]; plan: 'pro' | 'max'
}) {
  return (
    <div style={{ flex: 1, minWidth: 260, background: SF, border: `1px solid ${featured ? `${RED}55` : BORD}`, borderRadius: 14, padding: '24px 22px', position: 'relative', overflow: 'hidden' }}>
      {featured && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${RED},transparent)` }} />}
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: featured ? RED : TD, marginBottom: 8 }}>{name}</div>
      <div style={{ fontSize: 28, fontWeight: 600, color: TX, marginBottom: 16 }}>{price}<span style={{ fontSize: 13, color: TE, fontWeight: 400 }}>/mois</span></div>
      <ul style={{ listStyle: 'none', marginBottom: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {features.map((f, i) => (
          <li key={i} style={{ fontSize: 12.5, color: TD, display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.4 }}>
            <span style={{ color: featured ? RED : VIO, flexShrink: 0 }}>✓</span>{f}
          </li>
        ))}
      </ul>
      <a href={`/api/billing/checkout?plan=${plan}`} style={{
        display: 'block', textAlign: 'center', padding: '11px', borderRadius: 8, fontSize: 13, fontWeight: 500,
        textDecoration: 'none', background: featured ? RED : 'transparent', color: featured ? '#fff' : TX,
        border: featured ? 'none' : `1px solid ${BORD}`,
      }}>
        Essayer 7 jours gratuitement →
      </a>
    </div>
  )
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>
}) {
  const params = await searchParams
  const isSuccess = params.success === '1'

  // ── Paiement réussi ────────────────────────────────────────────────────────
  if (isSuccess) {
    return (
      <Shell>
        <div style={{ background: SF, border: `1px solid ${BORD}`, borderRadius: 16, padding: '52px 44px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${GRN}80, transparent)` }} />
          <div style={{ width: 52, height: 52, borderRadius: '50%', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${GRN}12`, border: `1px solid ${GRN}33` }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GRN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: TX, textAlign: 'center', marginBottom: 8 }}>Abonnement activé</div>
          <div style={{ fontSize: 13, color: TE, textAlign: 'center', lineHeight: 1.6, marginBottom: 32 }}>Ton accès est maintenant actif. Bonne session.</div>
          <Link href="/onboarding" style={{ display: 'block', textAlign: 'center', padding: '11px', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none', background: VIO, color: '#fff' }}>Configurer mon compte →</Link>
        </div>
      </Shell>
    )
  }

  // ── Sinon : qui est l'utilisateur, et est-il déjà abonné ? ─────────────────────
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cs) { try { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/billing')

  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: profile } = await service
    .from('user_profiles').select('subscription_status').eq('user_id', user.id).maybeSingle()
  const status = profile?.subscription_status
  const entitled = status === 'trialing' || status === 'active' || status === 'past_due'

  // Déjà abonné → on entre directement dans l'app.
  if (entitled) redirect('/dashboard')

  // ── Choix du plan (comptes sans abonnement actif) ──────────────────────────────
  const isCanceled = params.canceled === '1'
  return (
    <Shell maxW={760}>
      <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 20, fontWeight: 600, color: TX }}>Choisis ton plan</div>
      <div style={{ textAlign: 'center', marginBottom: 28, fontSize: 13, color: TE, lineHeight: 1.6 }}>
        {isCanceled ? 'Paiement annulé — aucun montant débité. ' : ''}7 jours d&apos;essai gratuit · carte requise · annulable avant J+7.
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <PlanCard name="Pro" price="19€" plan="pro"
          features={['11 détecteurs comportementaux', 'Dashboard temps réel', 'Rapport mensuel', 'Historique illimité']} />
        <PlanCard name="Max" price="34€" plan="max" featured
          features={['Tout le plan Pro inclus', '18 détecteurs comportementaux', 'Rapport hebdomadaire', 'Débrief de session']} />
      </div>
      <div style={{ textAlign: 'center', marginTop: 22 }}>
        <Link href="/login" style={{ fontSize: 11.5, color: TE, textDecoration: 'none' }}>← Changer de compte</Link>
      </div>
    </Shell>
  )
}
