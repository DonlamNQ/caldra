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

const HEADS = ['Sym.', 'Dir.', 'Taille', 'Entrée', 'Sortie', 'PnL', 'Heure']

export default function TradeLog({ trades }: TradeLogProps) {
  if (trades.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '2.5rem 1rem' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.04)', border: '0.5px solid rgba(255,255,255,.09)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 11, height: 5, borderRadius: 2, background: 'rgba(255,255,255,.15)' }} />
        </div>
        <span style={{ color: 'rgba(226,224,218,.22)', fontSize: 12 }}>Aucun trade aujourd'hui</span>
      </div>
    )
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr>
          {HEADS.map(h => (
            <th key={h} style={{ textAlign: 'left', color: 'rgba(226,224,218,.25)', fontWeight: 400, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', padding: '10px 12px', borderBottom: '0.5px solid rgba(255,255,255,.07)', fontFamily: "'DM Sans',sans-serif" }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {trades.map((t, i) => {
          const pnl = t.pnl ?? 0
          const isOpen = !t.exit_price
          const pnlColor = pnl > 0 ? '#10b981' : pnl < 0 ? '#f43f5e' : 'rgba(226,224,218,.35)'

          return (
            <tr key={t.id ?? i} className="dsh-row" style={{ transition: 'background .12s' }}>
              <td style={{ padding: '9px 12px', color: 'rgba(226,224,218,.85)', fontWeight: 500, fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, borderBottom: '0.5px solid rgba(255,255,255,.04)', letterSpacing: .3 }}>
                {t.symbol}
              </td>
              <td style={{ padding: '9px 12px', borderBottom: '0.5px solid rgba(255,255,255,.04)' }}>
                {t.direction ? (
                  <span style={{
                    background: t.direction === 'long' ? 'rgba(16,185,129,.1)' : 'rgba(244,63,94,.1)',
                    color: t.direction === 'long' ? '#10b981' : '#f43f5e',
                    border: `0.5px solid ${t.direction === 'long' ? 'rgba(16,185,129,.25)' : 'rgba(244,63,94,.25)'}`,
                    borderRadius: 4, padding: '2px 7px', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1,
                  }}>{t.direction}</span>
                ) : '—'}
              </td>
              <td style={{ padding: '9px 12px', color: 'rgba(226,224,218,.45)', fontFamily: "'JetBrains Mono',monospace", borderBottom: '0.5px solid rgba(255,255,255,.04)' }}>{t.size}</td>
              <td style={{ padding: '9px 12px', color: 'rgba(226,224,218,.45)', fontFamily: "'JetBrains Mono',monospace", borderBottom: '0.5px solid rgba(255,255,255,.04)', fontVariantNumeric: 'tabular-nums' }}>{t.entry_price}</td>
              <td style={{ padding: '9px 12px', borderBottom: '0.5px solid rgba(255,255,255,.04)' }}>
                {isOpen
                  ? <span style={{ color: 'rgba(56,189,248,.7)', fontSize: 9, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', background: 'rgba(56,189,248,.07)', border: '0.5px solid rgba(56,189,248,.18)', borderRadius: 4, padding: '2px 7px' }}>ouvert</span>
                  : <span style={{ color: 'rgba(226,224,218,.45)', fontFamily: "'JetBrains Mono',monospace", fontVariantNumeric: 'tabular-nums' }}>{t.exit_price}</span>
                }
              </td>
              <td style={{ padding: '9px 12px', color: pnlColor, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace", borderBottom: '0.5px solid rgba(255,255,255,.04)', fontVariantNumeric: 'tabular-nums' }}>
                {isOpen ? '—' : fmt(t.pnl)}
              </td>
              <td style={{ padding: '9px 12px', color: 'rgba(226,224,218,.25)', fontFamily: "'JetBrains Mono',monospace", borderBottom: '0.5px solid rgba(255,255,255,.04)', fontVariantNumeric: 'tabular-nums' }}>
                {fmtTime(t.entry_time)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
