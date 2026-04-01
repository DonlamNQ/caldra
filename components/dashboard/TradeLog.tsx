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

function formatPnl(pnl?: number): string {
  if (pnl == null) return '—'
  const sign = pnl >= 0 ? '+' : ''
  return `${sign}${pnl.toFixed(2)}`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function TradeLog({ trades }: TradeLogProps) {
  if (trades.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#374151', padding: '32px 0', fontSize: 13 }}>
        Aucun trade aujourd'hui
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {['Symbole', 'Dir.', 'Taille', 'Entrée', 'Sortie', 'PnL', 'Heure'].map(h => (
              <th
                key={h}
                style={{
                  textAlign: 'left',
                  color: '#475569',
                  fontWeight: 500,
                  padding: '6px 8px',
                  borderBottom: '1px solid #1e1e35',
                  whiteSpace: 'nowrap',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.map((t, i) => {
            const pnl = t.pnl ?? 0
            const pnlColor = pnl > 0 ? '#22c55e' : pnl < 0 ? '#ef4444' : '#64748b'
            const isOpen = !t.exit_price

            return (
              <tr
                key={t.id ?? i}
                style={{
                  background: i % 2 === 0 ? 'transparent' : '#0a0a14',
                  transition: 'background 0.15s',
                }}
              >
                <td style={{ padding: '7px 8px', color: '#e2e8f0', fontWeight: 600, fontFamily: 'monospace' }}>
                  {t.symbol}
                </td>
                <td style={{ padding: '7px 8px' }}>
                  <span
                    style={{
                      background: t.direction === 'long' ? '#052e16' : '#1a0505',
                      color: t.direction === 'long' ? '#4ade80' : '#f87171',
                      borderRadius: 4,
                      padding: '1px 6px',
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    {t.direction ?? '—'}
                  </span>
                </td>
                <td style={{ padding: '7px 8px', color: '#94a3b8', fontFamily: 'monospace' }}>
                  {t.size}
                </td>
                <td style={{ padding: '7px 8px', color: '#94a3b8', fontFamily: 'monospace' }}>
                  {t.entry_price}
                </td>
                <td style={{ padding: '7px 8px', color: '#94a3b8', fontFamily: 'monospace' }}>
                  {isOpen ? (
                    <span style={{ color: '#3b82f6', fontSize: 10, fontWeight: 600 }}>OUVERT</span>
                  ) : (
                    t.exit_price
                  )}
                </td>
                <td style={{ padding: '7px 8px', color: pnlColor, fontFamily: 'monospace', fontWeight: 600 }}>
                  {isOpen ? '—' : formatPnl(t.pnl)}
                </td>
                <td style={{ padding: '7px 8px', color: '#475569', fontFamily: 'monospace' }}>
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
