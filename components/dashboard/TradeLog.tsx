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

interface TradeLogProps {
  trades: TradeRow[]
}

function formatPnl(pnl?: number) {
  if (pnl == null) return '—'
  const sign = pnl >= 0 ? '+' : ''
  return `${sign}${pnl.toFixed(2)}`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const HEADERS = ['Symbole', 'Dir.', 'Taille', 'Entrée', 'Sortie', 'PnL', 'Heure']

export default function TradeLog({ trades }: TradeLogProps) {
  if (trades.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,.04)', border: '0.5px solid rgba(255,255,255,.09)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 12, height: 5, borderRadius: 2, background: 'rgba(255,255,255,.18)' }} />
        </div>
        <span style={{ color: 'rgba(232,230,224,.25)', fontSize: 12 }}>Aucun trade aujourd'hui</span>
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {HEADERS.map(h => (
              <th key={h} style={{
                textAlign: 'left',
                color: 'rgba(232,230,224,.28)',
                fontWeight: 400,
                fontSize: 9,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                padding: '0 10px 10px',
                borderBottom: '0.5px solid rgba(255,255,255,.07)',
                whiteSpace: 'nowrap',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.map((t, i) => {
            const pnl = t.pnl ?? 0
            const pnlColor = pnl > 0 ? '#22c55e' : pnl < 0 ? '#ef4444' : 'rgba(232,230,224,.38)'
            const isOpen = !t.exit_price

            return (
              <tr key={t.id ?? i} className="dsh-row" style={{ background: 'transparent', transition: 'background .15s' }}>
                <td style={{ padding: '9px 10px', color: '#e8e6e0', fontWeight: 500, letterSpacing: .3, fontVariantNumeric: 'tabular-nums', borderBottom: '0.5px solid rgba(255,255,255,.04)' }}>
                  {t.symbol}
                </td>
                <td style={{ padding: '9px 10px', borderBottom: '0.5px solid rgba(255,255,255,.04)' }}>
                  {t.direction ? (
                    <span style={{
                      background: t.direction === 'long' ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)',
                      color: t.direction === 'long' ? '#4ade80' : '#f87171',
                      border: `0.5px solid ${t.direction === 'long' ? 'rgba(34,197,94,.25)' : 'rgba(239,68,68,.25)'}`,
                      borderRadius: 4, padding: '2px 7px',
                      fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1,
                    }}>
                      {t.direction}
                    </span>
                  ) : <span style={{ color: 'rgba(232,230,224,.25)' }}>—</span>}
                </td>
                <td style={{ padding: '9px 10px', color: 'rgba(232,230,224,.5)', fontVariantNumeric: 'tabular-nums', borderBottom: '0.5px solid rgba(255,255,255,.04)' }}>
                  {t.size}
                </td>
                <td style={{ padding: '9px 10px', color: 'rgba(232,230,224,.5)', fontVariantNumeric: 'tabular-nums', borderBottom: '0.5px solid rgba(255,255,255,.04)' }}>
                  {t.entry_price}
                </td>
                <td style={{ padding: '9px 10px', borderBottom: '0.5px solid rgba(255,255,255,.04)' }}>
                  {isOpen ? (
                    <span style={{ color: 'rgba(96,165,250,.8)', fontSize: 9, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', background: 'rgba(59,130,246,.08)', border: '0.5px solid rgba(59,130,246,.2)', borderRadius: 4, padding: '2px 7px' }}>
                      ouvert
                    </span>
                  ) : (
                    <span style={{ color: 'rgba(232,230,224,.5)', fontVariantNumeric: 'tabular-nums' }}>{t.exit_price}</span>
                  )}
                </td>
                <td style={{ padding: '9px 10px', color: pnlColor, fontWeight: 600, fontVariantNumeric: 'tabular-nums', borderBottom: '0.5px solid rgba(255,255,255,.04)' }}>
                  {isOpen ? '—' : formatPnl(t.pnl)}
                </td>
                <td style={{ padding: '9px 10px', color: 'rgba(232,230,224,.28)', fontVariantNumeric: 'tabular-nums', borderBottom: '0.5px solid rgba(255,255,255,.04)' }}>
                  {formatTime(t.entry_time)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
