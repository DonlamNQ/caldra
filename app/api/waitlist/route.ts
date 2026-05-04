import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}))
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
  }

  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    return NextResponse.json({ ok: true })
  }

  const normalized = email.toLowerCase().trim()

  // Créer le contact dans Brevo
  const contactRes = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: normalized, updateEnabled: true }),
  })

  if (!contactRes.ok && contactRes.status !== 204) {
    return NextResponse.json({ error: 'Brevo error' }, { status: 500 })
  }

  // Email de bienvenue
  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Caldra', email: 'hello@getcaldra.com' },
      to: [{ email: normalized }],
      subject: 'Tu es sur la liste — Caldra',
      htmlContent: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#06060c;margin:0;padding:32px 16px;font-family:'DM Sans',system-ui,sans-serif">
  <div style="max-width:480px;margin:0 auto">

    <div style="margin-bottom:28px">
      <span style="font-size:11px;letter-spacing:4px;color:rgba(124,58,237,.7);text-transform:uppercase;font-weight:300">Caldra</span>
    </div>

    <div style="background:#10101e;border:0.5px solid #1e1e35;border-radius:14px;padding:32px;position:relative;overflow:hidden">
      <div style="position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(124,58,237,.5),transparent)"></div>

      <h1 style="font-size:24px;font-weight:200;color:#fff;letter-spacing:-0.5px;line-height:1.25;margin:0 0 16px">
        Tu es sur la liste.
      </h1>

      <p style="font-size:15px;color:rgba(226,232,240,.55);line-height:1.75;margin:0 0 24px;font-weight:300">
        On t'envoie ton accès dès l'ouverture — probablement cette semaine.<br>
        En attendant, quelques patterns que Caldra va surveiller pour toi :
      </p>

      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:28px">
        ${[
          ['Revenge sizing', 'Taille qui augmente après une perte — chemin le plus court pour exploser une journée.'],
          ['Re-entrée immédiate', 'Reprendre un trade moins de 2 min après la sortie — impulsion, pas analyse.'],
          ['Drawdown journalier', 'Perte qui approche ta limite — configurable selon ton capital.'],
        ].map(([t, d]) => `
        <div style="padding:12px 14px;border-left:2px solid rgba(124,58,237,.4);background:rgba(124,58,237,.04);border-radius:0 8px 8px 0">
          <div style="font-size:13px;font-weight:500;color:rgba(226,232,240,.8);margin-bottom:3px">${t}</div>
          <div style="font-size:12px;color:rgba(226,232,240,.35);line-height:1.5">${d}</div>
        </div>`).join('')}
      </div>

      <p style="font-size:13px;color:rgba(226,232,240,.3);font-style:italic;margin:0">
        La discipline ne se force pas. Elle se protège.
      </p>
    </div>

    <div style="margin-top:20px;text-align:center;font-size:11px;color:#334155">
      Caldra &nbsp;·&nbsp;
      <a href="https://getcaldra.com" style="color:#334155;text-decoration:none">getcaldra.com</a>
      &nbsp;·&nbsp;
      <a href="mailto:hello@getcaldra.com" style="color:#334155;text-decoration:none">hello@getcaldra.com</a>
    </div>

  </div>
</body>
</html>`,
    }),
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}
