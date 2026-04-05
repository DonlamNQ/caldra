'use client'

export interface TradeRow {
  id: string
  symbol: string
  direction?: 'long' | 'short'
  size: number
  entry_price: number
  exit_price?: number
  pnl?: number
  entry_time: string
  status?: string
}

interface TradeLogProps { trades: TradeRow[] }

function fmt(pnl?: number) {
  if (pnl == null) return '—'
  return `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const HEADS = ['HEURE', 'SYM', 'DIR', 'QTÉ', 'ENTRÉE', 'SORTIE', 'P&L']

export default function TradeLog({ trades }: TradeLogProps) {
  const MONO = "'IBM Plex Mono', monospace"
  const borderRow = '1px solid #2a2200'
  const textMuted = 'rgba(232,223,192,.35)'

  if (trades.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '2.5rem 1rem' }}>
        <div style={{ width: 24, height: 1, background: '#3d3000' }} />
        <span style={{ color: 'rgba(232,223,192,.2)', fontSize: 11, fontFamily: MONO, letterSpacing: '.05em' }}>aucun trade aujourd'hui</span>
      </div>
    )
  }

  return (
    <>
      <style>{`.tl-row:hover td{background:rgba(245,166,35,.03)!important}`}</style>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, fontFamily: MONO }}>
        <thead>
          <tr>
            {HEADS.map(h => (
              <th key={h} style={{
                textAlign: 'left', color: 'rgba(245,166,35,.4)', fontWeight: 400,
                fontSize: 8, letterSpacing: '.18em', textTransform: 'uppercase',
                padding: '8px 10px', borderBottom: '1px solid #3d3000',
                fontFamily: MONO, whiteSpace: 'nowrap',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.map((t, i) => {
            const pnl = t.pnl ?? 0
            const isOpen = !t.exit_price
            const pnlColor = pnl > 0 ? '#7acc3a' : pnl < 0 ? '#dc3218' : textMuted

            return (
              <tr key={t.id ?? i} className="tl-row">
                <td style={{ padding: '8px 10px', color: textMuted, borderBottom: borderRow, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {fmtTime(t.entry_time)}
                </td>
                <td style={{ padding: '8px 10px', color: 'rgba(232,223,192,.85)', fontWeight: 500, borderBottom: borderRow, letterSpacing: '.06em' }}>
                  {t.symbol}
                </td>
                <td style={{ padding: '8px 10px', borderBottom: borderRow }}>
                  {t.direction ? (
                    <span style={{
                      color: t.direction === 'long' ? '#7acc3a' : '#dc3218',
                      border: `1px solid ${t.direction === 'long' ? 'rgba(122,204,58,.25)' : 'rgba(220,50,24,.25)'}`,
                      padding: '1px 5px', fontSize: 8, letterSpacing: '.15em', textTransform: 'uppercase',
                      fontFamily: MONO,
                    }}>{t.direction === 'long' ? 'LONG' : 'SHRT'}</span>
                  ) : '—'}
                </td>
                <td style={{ padding: '8px 10px', color: textMuted, borderBottom: borderRow, fontVariantNumeric: 'tabular-nums' }}>
                  {t.size}
                </td>
                <td style={{ padding: '8px 10px', color: textMuted, borderBottom: borderRow, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {t.entry_price}
                </td>
                <td style={{ padding: '8px 10px', borderBottom: borderRow }}>
                  {isOpen
                    ? <span style={{ color: 'rgba(245,166,35,.5)', fontSize: 8, letterSpacing: '.15em', border: '1px solid rgba(245,166,35,.2)', padding: '1px 5px' }}>OPEN</span>
                    : <span style={{ color: textMuted, fontVariantNumeric: 'tabular-nums' }}>{t.exit_price}</span>
                  }
                </td>
                <td style={{ padding: '8px 10px', color: pnlColor, fontWeight: 600, borderBottom: borderRow, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {isOpen ? '—' : fmt(t.pnl)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </>
  )
}
