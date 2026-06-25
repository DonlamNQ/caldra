import React from 'react'
import { Document, Page, View, Text, StyleSheet, Svg, Rect, Path, Line } from '@react-pdf/renderer'

export interface DayData {
  date: string   // '2026-05-04'
  label: string  // 'Lun 04/05'
  score: number
  pnl: number
  tradeCount: number
  wins: number
  alertCount: number
}

export interface AlertTypeData {
  type: string
  label: string
  count: number
  maxLevel: number
}

export interface TradeItem {
  date: string
  time: string
  symbol: string
  direction: 'long' | 'short'
  size: number
  pnl: number
  alertCount: number
}

export interface WeeklyReportData {
  weekLabel: string
  periodTitle?: string   // 'RAPPORT HEBDOMADAIRE' (défaut) | 'RAPPORT MENSUEL'
  bucketUnit?: string    // 'JOUR' (défaut) | 'SEMAINE' — libellé de l'axe du graphe score
  generatedAt: string
  userEmail: string
  days: DayData[]
  summary: {
    avgScore: number
    totalPnl: number
    winRate: number
    totalTrades: number
    totalAlerts: number
    criticalAlerts: number
  }
  alertsByType: AlertTypeData[]
  trades: TradeItem[]
}

const A = '#7c3aed'
const G = '#059669'
const R = '#dc2626'
const O = '#d97706'
const T = '#1a1a2e'
const M = '#64748b'
const B = '#e8e4f3'

function scoreCol(s: number) { return s >= 70 ? G : s >= 40 ? O : R }

const s = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    paddingTop: 36,
    paddingBottom: 48,
    paddingLeft: 36,
    paddingRight: 36,
    fontSize: 10,
    color: T,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: B,
    borderBottomStyle: 'solid',
  },
  logo: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: A },
  logoSub: { fontSize: 7, color: M, marginTop: 4 },
  headerRight: { alignItems: 'flex-end' },
  weekLabel: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: T },
  genAt: { fontSize: 8, color: M, marginTop: 2 },

  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 7,
    color: M,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
  },

  cards: { flexDirection: 'row' },
  card: {
    flex: 1,
    backgroundColor: '#f8f7ff',
    borderWidth: 1,
    borderColor: B,
    borderStyle: 'solid',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
  },
  cardLast: { marginRight: 0 },
  cardLabel: { fontSize: 7, color: M, fontFamily: 'Helvetica-Bold', marginBottom: 5 },
  cardValue: { fontSize: 22, fontFamily: 'Helvetica-Bold' },
  cardSub: { fontSize: 8, color: M, marginTop: 3 },

  chartsRow: { flexDirection: 'row' },
  chartBox: {
    flex: 1,
    backgroundColor: '#f8f7ff',
    borderWidth: 1,
    borderColor: B,
    borderStyle: 'solid',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
  },
  chartBoxLast: { marginRight: 0 },
  chartTitle: { fontSize: 7, color: M, fontFamily: 'Helvetica-Bold', marginBottom: 8 },
  chartLabels: { flexDirection: 'row', marginTop: 4 },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0edf8',
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: 2,
  },
  tableHeaderCell: { fontSize: 7, color: M, fontFamily: 'Helvetica-Bold' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: B,
    borderBottomStyle: 'solid',
    alignItems: 'center',
  },
  tableCell: { fontSize: 9, color: T },

  badge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 99,
    alignSelf: 'flex-start',
  },

  emptyState: { alignItems: 'center', paddingVertical: 30 },

  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: B,
    borderTopStyle: 'solid',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: { fontSize: 7.5, color: M },
})

function ScoreBarChart({ days }: { days: DayData[] }) {
  const W = 210, H = 55, baseY = 50, maxBarH = 42
  const n = days.length
  if (n === 0) return null

  const barW = Math.min(24, (W - 10) / n - 6)
  const totalBarW = n * (barW + 6) - 6
  const startX = (W - totalBarW) / 2

  return (
    <View>
      <Svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }}>
        <Line x1="0" y1={String(baseY)} x2={String(W)} y2={String(baseY)} stroke={B} strokeWidth="0.5" />
        {days.map((d, i) => {
          const x = startX + i * (barW + 6)
          const barH = d.tradeCount > 0 ? Math.max(2, (d.score / 100) * maxBarH) : 2
          const y = baseY - barH
          const col = d.tradeCount > 0 ? scoreCol(d.score) : B
          return (
            <Rect
              key={i}
              x={String(x.toFixed(1))}
              y={String(y.toFixed(1))}
              width={String(barW)}
              height={String(barH.toFixed(1))}
              fill={col}
              rx="2"
            />
          )
        })}
      </Svg>
      <View style={s.chartLabels}>
        {days.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 6.5, color: M }}>{d.label}</Text>
            {d.tradeCount > 0 && (
              <Text style={{ fontSize: 7, color: scoreCol(d.score), fontFamily: 'Helvetica-Bold' }}>
                {d.score}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  )
}

function PnlLineChart({ days }: { days: DayData[] }) {
  const W = 210, H = 55, baseY = 50, chartH = 42
  const tradingDays = days.filter(d => d.tradeCount > 0)

  const cums: number[] = [0]
  for (const d of tradingDays) cums.push(cums[cums.length - 1] + d.pnl)

  const minV = Math.min(0, ...cums)
  const maxV = Math.max(0, ...cums)
  const range = maxV - minV || 1
  const finalPnl = cums[cums.length - 1]
  const lineCol = finalPnl >= 0 ? G : R
  const fmtPnl = (v: number) => `${v >= 0 ? '+€' : '-€'}${Math.abs(v).toFixed(0)}`

  if (cums.length < 2) {
    return (
      <View>
        <Svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }}>
          <Line x1="0" y1={String(baseY)} x2={String(W)} y2={String(baseY)} stroke={B} strokeWidth="0.5" />
        </Svg>
        <View style={{ alignItems: 'center', marginTop: 4 }}>
          <Text style={{ fontSize: 7, color: M }}>Pas assez de données</Text>
        </View>
      </View>
    )
  }

  const n = cums.length
  const pts = cums.map((v, i) => ({
    x: 5 + (i / (n - 1)) * (W - 10),
    y: baseY - ((v - minV) / range) * chartH,
  }))
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const zeroY = baseY - ((0 - minV) / range) * chartH

  return (
    <View>
      <Svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }}>
        <Line x1="0" y1={String(baseY)} x2={String(W)} y2={String(baseY)} stroke={B} strokeWidth="0.5" />
        {minV < 0 && maxV > 0 && (
          <Line
            x1="0" y1={String(zeroY.toFixed(1))}
            x2={String(W)} y2={String(zeroY.toFixed(1))}
            stroke={B} strokeWidth="0.5" strokeDasharray="3 4"
          />
        )}
        <Path
          d={linePath}
          stroke={lineCol}
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Rect
          x={String((pts[pts.length - 1].x - 2.5).toFixed(1))}
          y={String((pts[pts.length - 1].y - 2.5).toFixed(1))}
          width="5" height="5" rx="2.5"
          fill={lineCol}
        />
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ fontSize: 7, color: M }}>€0</Text>
        <Text style={{ fontSize: 8, color: lineCol, fontFamily: 'Helvetica-Bold' }}>
          {fmtPnl(finalPnl)}
        </Text>
      </View>
    </View>
  )
}

const LEVEL_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: '#fef3c7', text: '#d97706' },
  2: { bg: '#fee2e2', text: '#dc2626' },
  3: { bg: '#f3e8ff', text: '#7c3aed' },
}

const LEVEL_LABELS: Record<number, string> = {
  1: 'Vigilance',
  2: 'Grave',
  3: 'Critique',
}

export function WeeklyReport({ data }: { data: WeeklyReportData }) {
  const { summary: sum } = data
  const fmtPnl = (v: number) => `${v >= 0 ? '+€' : '-€'}${Math.abs(v).toFixed(0)}`
  const pnlCol = sum.totalPnl >= 0 ? G : R

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View>
            <Text style={s.logo}>CALDRA</Text>
            <Text style={s.logoSub}>{data.periodTitle ?? 'RAPPORT HEBDOMADAIRE'}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.weekLabel}>{data.weekLabel}</Text>
            <Text style={s.genAt}>Généré le {data.generatedAt}</Text>
            <Text style={[s.genAt, { marginTop: 1 }]}>{data.userEmail}</Text>
          </View>
        </View>

        {/* ── Vue d'ensemble ─────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>VUE D'ENSEMBLE</Text>
          <View style={s.cards}>
            <View style={s.card}>
              <Text style={s.cardLabel}>SCORE MOYEN</Text>
              <Text style={[s.cardValue, { color: scoreCol(sum.avgScore) }]}>
                {sum.avgScore}
                <Text style={{ fontSize: 11, color: M, fontFamily: 'Helvetica' }}>/100</Text>
              </Text>
            </View>
            <View style={s.card}>
              <Text style={s.cardLabel}>PNL TOTAL</Text>
              <Text style={[s.cardValue, { color: pnlCol }]}>{fmtPnl(sum.totalPnl)}</Text>
            </View>
            <View style={s.card}>
              <Text style={s.cardLabel}>WIN RATE</Text>
              <Text style={[s.cardValue, { color: T }]}>{sum.winRate}%</Text>
              <Text style={s.cardSub}>{sum.totalTrades} trade{sum.totalTrades !== 1 ? 's' : ''}</Text>
            </View>
            <View style={[s.card, s.cardLast]}>
              <Text style={s.cardLabel}>ALERTES</Text>
              <Text style={[s.cardValue, { color: sum.criticalAlerts > 0 ? R : T }]}>
                {sum.totalAlerts}
              </Text>
              {sum.criticalAlerts > 0 && (
                <Text style={[s.cardSub, { color: R }]}>
                  {sum.criticalAlerts} critique{sum.criticalAlerts > 1 ? 's' : ''}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* ── Graphiques ─────────────────────────────────────────────── */}
        <View style={[s.section, s.chartsRow]}>
          <View style={s.chartBox}>
            <Text style={s.chartTitle}>SCORE PAR {data.bucketUnit ?? 'JOUR'}</Text>
            <ScoreBarChart days={data.days} />
          </View>
          <View style={[s.chartBox, s.chartBoxLast]}>
            <Text style={s.chartTitle}>PNL CUMULATIF</Text>
            <PnlLineChart days={data.days} />
          </View>
        </View>

        {/* ── Alertes comportementales ───────────────────────────────── */}
        {data.alertsByType.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>ALERTES COMPORTEMENTALES</Text>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderCell, { flex: 3 }]}>TYPE</Text>
              <Text style={[s.tableHeaderCell, { flex: 1 }]}>TOTAL</Text>
              <Text style={[s.tableHeaderCell, { flex: 2 }]}>NIVEAU MAX</Text>
            </View>
            {data.alertsByType.map((a, i) => {
              const lc = LEVEL_COLORS[a.maxLevel] ?? LEVEL_COLORS[1]
              return (
                <View
                  key={i}
                  style={[s.tableRow, { backgroundColor: i % 2 === 0 ? '#ffffff' : '#faf9ff' }]}
                >
                  <Text style={[s.tableCell, { flex: 3 }]}>{a.label}</Text>
                  <Text style={[s.tableCell, { flex: 1, fontFamily: 'Helvetica-Bold' }]}>{a.count}</Text>
                  <View style={{ flex: 2 }}>
                    <View style={[s.badge, { backgroundColor: lc.bg }]}>
                      <Text style={{ fontSize: 7.5, color: lc.text, fontFamily: 'Helvetica-Bold' }}>
                        L{a.maxLevel} — {LEVEL_LABELS[a.maxLevel]}
                      </Text>
                    </View>
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* ── Journal des trades ─────────────────────────────────────── */}
        {data.trades.length > 0 ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>
              JOURNAL DES TRADES ({data.trades.length})
            </Text>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderCell, { flex: 1.5 }]}>DATE/HEURE</Text>
              <Text style={[s.tableHeaderCell, { flex: 1.2 }]}>SYMBOLE</Text>
              <Text style={[s.tableHeaderCell, { flex: 1 }]}>DIR.</Text>
              <Text style={[s.tableHeaderCell, { flex: 0.8 }]}>TAILLE</Text>
              <Text style={[s.tableHeaderCell, { flex: 1 }]}>PNL</Text>
              <Text style={[s.tableHeaderCell, { flex: 0.8 }]}>ALERTES</Text>
            </View>
            {data.trades.map((t, i) => {
              const pCol = t.pnl > 0 ? G : t.pnl < 0 ? R : M
              return (
                <View
                  key={i}
                  style={[s.tableRow, { backgroundColor: i % 2 === 0 ? '#ffffff' : '#faf9ff' }]}
                >
                  <Text style={[s.tableCell, { flex: 1.5, color: M }]}>{t.date} {t.time}</Text>
                  <Text style={[s.tableCell, { flex: 1.2, fontFamily: 'Helvetica-Bold' }]}>{t.symbol}</Text>
                  <Text style={[s.tableCell, { flex: 1, color: t.direction === 'long' ? G : R }]}>
                    {t.direction === 'long' ? 'Long' : 'Short'}
                  </Text>
                  <Text style={[s.tableCell, { flex: 0.8 }]}>×{t.size}</Text>
                  <Text style={[s.tableCell, { flex: 1, color: pCol, fontFamily: 'Helvetica-Bold' }]}>
                    {t.pnl > 0 ? '+' : ''}{t.pnl.toFixed(2)}
                  </Text>
                  <Text style={[s.tableCell, { flex: 0.8, color: t.alertCount > 0 ? R : M }]}>
                    {t.alertCount > 0 ? String(t.alertCount) : '—'}
                  </Text>
                </View>
              )
            })}
          </View>
        ) : (
          <View style={s.emptyState}>
            <Text style={{ fontSize: 12, color: M }}>Aucun trade sur la période</Text>
          </View>
        )}

        {/* ── Footer fixe ────────────────────────────────────────────── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Caldra · getcaldra.com</Text>
          <Text style={s.footerText}>{data.weekLabel}</Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
              `Page ${pageNumber} sur ${totalPages}`
            }
          />
        </View>

      </Page>
    </Document>
  )
}
