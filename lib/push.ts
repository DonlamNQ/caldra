export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  level: number,
  url = '/dashboard'
): Promise<void> {
  const appId = process.env.ONESIGNAL_APP_ID
  const apiKey = process.env.ONESIGNAL_REST_API_KEY
  if (!appId || !apiKey) return

  await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_id: appId,
      include_aliases: { external_id: [userId] },
      target_channel: 'push',
      headings: { en: title, fr: title },
      contents: { en: body, fr: body },
      url: `https://getcaldra.com${url}`,
      priority: level >= 3 ? 10 : 7,
    }),
  }).catch(err => console.error('[onesignal] push error:', err))
}
