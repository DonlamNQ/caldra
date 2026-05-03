interface AlertEmailOpts {
  to: string
  alertType: string
  level: number
  message: string
  sessionDate: string
  detail?: Record<string, unknown>
}

export async function sendAlertEmail(opts: AlertEmailOpts): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey || !opts.to) return

  const levelColor = opts.level >= 3 ? '#ff5a3d' : opts.level >= 2 ? '#ffab00' : '#94a3b8'
  const levelBg    = opts.level >= 3 ? 'rgba(255,90,61,.12)' : opts.level >= 2 ? 'rgba(255,171,0,.1)' : 'rgba(148,163,184,.08)'
  const levelBorder = opts.level >= 3 ? 'rgba(255,90,61,.3)' : opts.level >= 2 ? 'rgba(255,171,0,.25)' : 'rgba(148,163,184,.2)'
  const typeFmt = opts.alertType.replace(/_/g, ' ').toUpperCase()
  const subject = opts.level >= 3
    ? `STOP — ${typeFmt} · Caldra`
    : `L${opts.level} · ${typeFmt} · Caldra`

  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Caldra', email: 'alerts@getcaldra.com' },
      to: [{ email: opts.to }],
      subject,
      htmlContent: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#06060c;margin:0;padding:32px 16px;font-family:'DM Sans',system-ui,sans-serif">
  <div style="max-width:520px;margin:0 auto">

    <div style="margin-bottom:24px">
      <span style="font-size:11px;letter-spacing:3px;color:#7c3aed;text-transform:uppercase">Caldra</span>
      <span style="font-size:11px;color:#475569;margin-left:12px">${opts.sessionDate}</span>
    </div>

    <div style="background:#10101e;border:1px solid #1e1e35;border-radius:12px;padding:28px;position:relative;overflow:hidden">
      <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,${levelColor}cc,transparent)"></div>

      <div style="display:inline-block;padding:4px 12px;border-radius:99px;background:${levelBg};border:1px solid ${levelBorder};color:${levelColor};font-size:11px;letter-spacing:1px;margin-bottom:16px">
        L${opts.level} · ${typeFmt}
      </div>

      <div style="font-size:22px;font-weight:300;color:#eae8f5;line-height:1.4;margin-bottom:20px">
        ${opts.message}
      </div>

      <a href="https://getcaldra.com/dashboard"
         style="display:block;text-align:center;padding:13px;background:rgba(124,58,237,.08);border:1px solid rgba(124,58,237,.25);border-radius:8px;color:#ff5a3d;text-decoration:none;font-size:13px;letter-spacing:.5px">
        Ouvrir le dashboard →
      </a>
    </div>

    <div style="margin-top:20px;text-align:center;font-size:10px;color:#334155">
      Caldra · <a href="https://getcaldra.com" style="color:#334155;text-decoration:none">getcaldra.com</a>
      &nbsp;·&nbsp; <a href="https://getcaldra.com/settings/rules" style="color:#334155;text-decoration:none">Gérer les alertes</a>
    </div>

  </div>
</body>
</html>`,
    }),
  }).catch(() => {})
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
