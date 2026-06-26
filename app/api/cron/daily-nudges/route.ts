export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/push'

// Cron quotidien « nudges » : envoie sur le téléphone (push serveur, même app fermée)
// les jalons de streak, la reprise après une session difficile, l'inactivité et le
// bilan hebdo. Déduplication via la table notif_state. Tourne uniquement pour les
// utilisateurs ayant au moins un abonnement push.

const RISK_TYPES = new Set(['risk_exceeded', 'stop_not_respected', 'overleverage', 'no_stop', 'drawdown_alert', 'drawdown_override'])
const TILT_TYPES = new Set(['revenge_sizing', 'immediate_reentry', 'averaging_down', 'euphoria_sizing', 'accelerating_frequency'])
const MILESTONES = [3, 5, 7, 10, 14, 21, 30, 50, 100]

function computeScore(alerts: { level?: number }[]): number {
  const d = alerts.reduce((s, a) => { const l = a.level ?? 1; return s + (l === 3 ? 18 : l === 2 ? 8 : 3) }, 0)
  return Math.max(0, 100 - d)
}

type Day = { date: string; score: number; trades: number; critical: number; types: Set<string> }

function buildDays(trades: { entry_time?: string }[], alerts: { type?: string; level?: number; session_date?: string }[]): Day[] {
  const byDate = new Map<string, Day>()
  for (const t of trades) {
    const d = (t.entry_time || '').slice(0, 10)
    if (!d) continue
    if (!byDate.has(d)) byDate.set(d, { date: d, score: 100, trades: 0, critical: 0, types: new Set() })
    byDate.get(d)!.trades++
  }
  const aByDate = new Map<string, { type?: string; level?: number }[]>()
  for (const a of alerts) {
    const d = a.session_date
    if (!d) continue
    if (!aByDate.has(d)) aByDate.set(d, [])
    aByDate.get(d)!.push(a)
  }
  for (const [d, day] of byDate) {
    const da = aByDate.get(d) || []
    day.score = computeScore(da)
    day.critical = da.filter(a => (a.level ?? 1) === 3).length
    for (const a of da) if (a.type) day.types.add(a.type)
  }
  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date)) // plus récent d'abord
}

const streakNo = (days: Day[], bad: Set<string>): number => {
  let s = 0
  for (const d of days) { if ([...d.types].some(t => bad.has(t))) break; s++ }
  return s
}
const disciplineStreak = (days: Day[]): number => {
  let s = 0
  for (const d of days) { if (d.score >= 70 && d.critical === 0) s++; else break }
  return s
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // ?test=<email> → envoi forcé d'une notif de test UNIQUEMENT à cet utilisateur
  // (vérif du pipeline push, sans spammer les autres abonnés).
  const testEmail = new URL(req.url).searchParams.get('test')
  if (testEmail) {
    const { data: { users } } = await service.auth.admin.listUsers({ perPage: 1000 })
    const target = users.find(u => u.email?.toLowerCase() === testEmail.toLowerCase())
    if (!target) return NextResponse.json({ ok: false, error: 'user introuvable' }, { status: 404 })

    // &samples=1 → envoie les 4 vraies notifs avec des valeurs d'exemple (aperçu).
    if (new URL(req.url).searchParams.get('samples') === '1') {
      await sendPushToUser(target.id, 'Caldra — Jalon atteint', 'Solide — 7 sessions sans dépasser ton risque. Ta gestion tient.', 1)
      await sendPushToUser(target.id, 'Caldra', 'Dernière session difficile. Reprends posément — respecte ta fenêtre et ton risque.', 1)
      await sendPushToUser(target.id, 'Caldra', '5 jours sans trader. Reprends en revoyant tes règles avant de te relancer.', 1)
      await sendPushToUser(target.id, 'Caldra — Ta semaine en bref', 'Score moyen 82/100 · 3 jour(s) propre(s) sur 4.', 1)
      return NextResponse.json({ ok: true, samples: true, email: testEmail })
    }

    await sendPushToUser(target.id, 'Caldra — Test', 'Notification de test. Si tu vois ça, le push serveur fonctionne. 🔔', 1)
    return NextResponse.json({ ok: true, test: true, email: testEmail })
  }

  // Seulement les users abonnés au push (sinon rien à envoyer).
  const { data: subs } = await service.from('push_subscriptions').select('user_id')
  const userIds = [...new Set((subs || []).map(s => s.user_id))]
  if (userIds.length === 0) return NextResponse.json({ ok: true, sent: 0, users: 0 })

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const dow = today.getUTCDay() // 0 = dimanche, 1 = lundi
  const since = new Date(Date.now() - 45 * 86_400_000).toISOString().slice(0, 10)

  let sent = 0

  for (const uid of userIds) {
    const [{ data: trades }, { data: alerts }] = await Promise.all([
      service.from('trades').select('entry_time').eq('user_id', uid).gte('entry_time', since).order('entry_time'),
      service.from('alerts').select('type, level, session_date').eq('user_id', uid).gte('session_date', since),
    ])
    const days = buildDays(trades || [], alerts || [])
    if (days.length === 0) continue

    const { data: stateRows } = await service.from('notif_state').select('kind, value').eq('user_id', uid)
    const state = new Map((stateRows || []).map(r => [r.kind, r.value]))
    const setState = (kind: string, value: string) =>
      service.from('notif_state').upsert({ user_id: uid, kind, value, updated_at: new Date().toISOString() }, { onConflict: 'user_id,kind' })

    // 1) Jalons de streak
    const streaks = [
      { kind: 'streak_discipline', val: disciplineStreak(days), msg: (n: number) => `Bravo — ${n} sessions maîtrisées d'affilée. Garde le cap.` },
      { kind: 'streak_risque',     val: streakNo(days, RISK_TYPES), msg: (n: number) => `Solide — ${n} sessions sans dépasser ton risque. Ta gestion tient.` },
      { kind: 'streak_sangfroid',  val: streakNo(days, TILT_TYPES), msg: (n: number) => `Beau sang-froid — ${n} sessions sans réaction impulsive.` },
    ]
    for (const st of streaks) {
      const reached = MILESTONES.filter(m => m <= st.val).pop()
      if (!reached || reached <= Number(state.get(st.kind) || 0)) continue
      await sendPushToUser(uid, 'Caldra — Jalon atteint', st.msg(reached), 1)
      await setState(st.kind, String(reached))
      sent++
    }

    // 2) Reprise après une session difficile (la dernière session, récente)
    const last = days[0]
    const lastDaysAgo = Math.floor((Date.parse(todayStr) - Date.parse(last.date)) / 86_400_000)
    if (lastDaysAgo <= 2 && (last.score < 40 || last.critical > 0) && state.get('hard') !== last.date) {
      await sendPushToUser(uid, 'Caldra', 'Dernière session difficile. Reprends posément — respecte ta fenêtre et ton risque.', 1)
      await setState('hard', last.date)
      sent++
    }

    // 3) Inactivité ≥ 5 jours
    if (lastDaysAgo >= 5 && state.get('idle') !== last.date) {
      await sendPushToUser(uid, 'Caldra', `${lastDaysAgo} jours sans trader. Reprends en revoyant tes règles avant de te relancer.`, 1)
      await setState('idle', last.date)
      sent++
    }

    // 4) Bilan hebdo (le lundi, sur la semaine écoulée lun→dim)
    if (dow === 1) {
      const monday = new Date(today)
      monday.setUTCDate(today.getUTCDate() - 7)
      monday.setUTCHours(0, 0, 0, 0)
      const weekKey = monday.toISOString().slice(0, 10)
      const sunStr = new Date(monday.getTime() + 6 * 86_400_000).toISOString().slice(0, 10)
      const wk = days.filter(d => d.date >= weekKey && d.date <= sunStr)
      if (wk.length > 0 && state.get('weekly') !== weekKey) {
        const avg = Math.round(wk.reduce((s, d) => s + d.score, 0) / wk.length)
        const clean = wk.filter(d => d.score >= 70 && d.critical === 0).length
        await sendPushToUser(uid, 'Caldra — Ta semaine en bref', `Score moyen ${avg}/100 · ${clean} jour(s) propre(s) sur ${wk.length}.`, 1)
        await setState('weekly', weekKey)
        sent++
      }
    }
  }

  return NextResponse.json({ ok: true, sent, users: userIds.length })
}
