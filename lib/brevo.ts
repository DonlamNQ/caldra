interface WeeklyReportEmailOpts {
  to: string
  weekLabel: string
  weekStart: string
  pdfBase64: string
  stats: {
    avgScore: number
    totalPnl: number
    winRate: number
    totalTrades: number
    totalAlerts: number
    criticalAlerts: number
  }
}

export async function sendWeeklyReportEmail(opts: WeeklyReportEmailOpts): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey || !opts.to) return

  const { stats } = opts
  const pnlSign = stats.totalPnl >= 0 ? '+' : ''
  const pnlColor = stats.totalPnl >= 0 ? '#00d17a' : '#ff5a3d'
  const scoreColor = stats.avgScore >= 70 ? '#00d17a' : stats.avgScore >= 40 ? '#ffab00' : '#ff5a3d'
  const filename = `caldra-rapport-${opts.weekStart}.pdf`

  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Caldra', email: 'noreply@getcaldra.com' },
      to: [{ email: opts.to }],
      subject: `Rapport hebdomadaire · ${opts.weekLabel}`,
      attachment: [{ content: opts.pdfBase64, name: filename }],
      htmlContent: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#06060c;margin:0;padding:32px 16px;font-family:'DM Sans',system-ui,sans-serif">
  <div style="max-width:520px;margin:0 auto">

    <div style="margin-bottom:24px">
      <span style="font-size:11px;letter-spacing:3px;color:#7c3aed;text-transform:uppercase">Caldra</span>
      <span style="font-size:11px;color:#475569;margin-left:12px">Rapport hebdomadaire</span>
    </div>

    <div style="background:#10101e;border:1px solid #1e1e35;border-radius:12px;padding:28px;position:relative;overflow:hidden;margin-bottom:16px">
      <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#7c3aedcc,transparent)"></div>

      <div style="font-size:13px;font-weight:400;color:#94a3b8;margin-bottom:6px;letter-spacing:.3px">${opts.weekLabel}</div>
      <div style="font-size:24px;font-weight:300;color:#eae8f5;margin-bottom:20px">Votre bilan de la semaine</div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px">
        <div style="background:#0d0d1a;border:1px solid #1e1e35;border-radius:8px;padding:14px;text-align:center">
          <div style="font-size:10px;color:#475569;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Score</div>
          <div style="font-size:26px;font-weight:300;color:${scoreColor}">${stats.avgScore}<span style="font-size:12px;color:#475569">/100</span></div>
        </div>
        <div style="background:#0d0d1a;border:1px solid #1e1e35;border-radius:8px;padding:14px;text-align:center">
          <div style="font-size:10px;color:#475569;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">PnL</div>
          <div style="font-size:26px;font-weight:300;color:${pnlColor}">${pnlSign}€${Math.abs(stats.totalPnl).toFixed(0)}</div>
        </div>
        <div style="background:#0d0d1a;border:1px solid #1e1e35;border-radius:8px;padding:14px;text-align:center">
          <div style="font-size:10px;color:#475569;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Win rate</div>
          <div style="font-size:26px;font-weight:300;color:#eae8f5">${stats.winRate}%</div>
        </div>
      </div>

      <div style="font-size:12px;color:#64748b;margin-bottom:20px;text-align:center">
        ${stats.totalTrades} trade${stats.totalTrades > 1 ? 's' : ''} · ${stats.totalAlerts} alerte${stats.totalAlerts > 1 ? 's' : ''}${stats.criticalAlerts > 0 ? ` · <span style="color:#ff5a3d">${stats.criticalAlerts} critique${stats.criticalAlerts > 1 ? 's' : ''}</span>` : ''}
      </div>

      <div style="font-size:11px;color:#64748b;background:#0a0a18;border:1px solid #1e1e35;border-radius:6px;padding:10px 14px;margin-bottom:20px">
        📎 Rapport complet en pièce jointe — score jour par jour, journal des trades, détail des alertes comportementales.
      </div>

      <a href="https://getcaldra.com/dashboard"
         style="display:block;text-align:center;padding:13px;background:rgba(124,58,237,.08);border:1px solid rgba(124,58,237,.25);border-radius:8px;color:#7c3aed;text-decoration:none;font-size:13px;letter-spacing:.5px">
        Ouvrir le dashboard →
      </a>
    </div>

    <div style="text-align:center;font-size:10px;color:#334155">
      Caldra · <a href="https://getcaldra.com" style="color:#334155;text-decoration:none">getcaldra.com</a>
    </div>

  </div>
</body>
</html>`,
    }),
  }).catch(() => {})
}

interface AlertEmailOpts {
  to: string
  alertType: string
  level: number
  message: string
  sessionDate: string
  detail?: Record<string, unknown>
  extraAlerts?: { type: string; level: number; message: string }[]
}

export async function sendAlertEmail(opts: AlertEmailOpts): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey || !opts.to) return

  const typeFmt = opts.alertType.replace(/_/g, ' ')
  const levelLabel = opts.level >= 3 ? 'Alerte critique' : opts.level >= 2 ? 'Alerte importante' : 'Alerte'
  const levelColor = opts.level >= 3 ? '#dc3218' : opts.level >= 2 ? '#e07b00' : '#7c3aed'
  const subject = opts.level >= 3
    ? `⛔ Caldra — Arrêt immédiat requis`
    : `Caldra — ${levelLabel} détectée`

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Caldra', email: 'noreply@getcaldra.com' },
      to: [{ email: opts.to }],
      subject,
      htmlContent: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif}</style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">

        <!-- Header -->
        <tr><td style="padding:24px 32px;border-bottom:1px solid #f0f0f0">
          <span style="font-size:13px;font-weight:700;letter-spacing:3px;color:#7c3aed;text-transform:uppercase">CALDRA</span>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px 32px 24px">
          <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:${levelColor};font-weight:600">${levelLabel}</p>
          <p style="margin:0 0 20px;font-size:20px;font-weight:400;color:#111827;line-height:1.45">${opts.message}</p>

          <table cellpadding="0" cellspacing="0" style="margin-bottom:24px">
            <tr>
              <td style="padding:3px 0;font-size:13px;color:#6b7280;width:110px">Détecteur</td>
              <td style="padding:3px 0;font-size:13px;color:#111827;font-weight:500;text-transform:capitalize">${typeFmt}</td>
            </tr>
            <tr>
              <td style="padding:3px 0;font-size:13px;color:#6b7280">Niveau</td>
              <td style="padding:3px 0;font-size:13px;color:${levelColor};font-weight:600">L${opts.level} / 3</td>
            </tr>
            <tr>
              <td style="padding:3px 0;font-size:13px;color:#6b7280">Session</td>
              <td style="padding:3px 0;font-size:13px;color:#111827">${opts.sessionDate}</td>
            </tr>
          </table>

          ${opts.level >= 3 ? `<p style="margin:0 0 24px;font-size:13px;color:#dc3218;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:12px 16px;line-height:1.5">Ton drawdown maximum a été atteint. Arrête de trader pour cette session.</p>` : ''}

          ${opts.extraAlerts && opts.extraAlerts.length > 0 ? `
          <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden">
            <tr><td style="padding:8px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px">Autres alertes cette session</td></tr>
            ${opts.extraAlerts.map(a => `<tr><td style="padding:8px 14px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#374151"><span style="color:${a.level >= 3 ? '#dc3218' : '#e07b00'};font-weight:600;margin-right:8px">L${a.level}</span>${a.message}</td></tr>`).join('')}
          </table>` : ''}

          <a href="https://getcaldra.com/dashboard" style="display:inline-block;padding:11px 22px;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:500">Voir le dashboard</a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;background:#fafafa">
          <p style="margin:0;font-size:11px;color:#9ca3af">
            Caldra · <a href="https://getcaldra.com" style="color:#9ca3af">getcaldra.com</a>
            &nbsp;·&nbsp; <a href="https://getcaldra.com/settings/rules" style="color:#9ca3af">Gérer les alertes</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    }),
  }).catch(err => console.error('[brevo] sendAlertEmail fetch error:', err))
  if (res && !res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`[brevo] sendAlertEmail HTTP ${res.status}:`, body)
  }
}

export async function sendWebhookAlert(
  webhookUrl: string,
  alertType: string,
  level: number,
  message: string,
  sessionDate: string
): Promise<void> {
  if (!webhookUrl) return

  const emoji = level >= 3 ? '🔴' : level >= 2 ? '🟠' : '🟡'
  const typeFmt = alertType.replace(/_/g, ' ').toUpperCase()

  const isDiscord = webhookUrl.includes('discord.com')
  const body = isDiscord
    ? {
        username: 'Caldra',
        embeds: [{
          color: level >= 3 ? 0xff5a3d : level >= 2 ? 0xffab00 : 0x94a3b8,
          title: `${emoji} L${level} · ${typeFmt}`,
          description: message,
          footer: { text: `Caldra · Session ${sessionDate}` },
          url: 'https://getcaldra.com/dashboard',
        }],
      }
    : {
        username: 'Caldra',
        icon_emoji: ':bar_chart:',
        text: `${emoji} *L${level} · ${typeFmt}*\n${message}\n<https://getcaldra.com/dashboard|Ouvrir le dashboard>`,
      }

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {})
}
