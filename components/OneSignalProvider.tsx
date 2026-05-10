'use client'

import { useEffect } from 'react'

export default function OneSignalProvider({ userId }: { userId: string }) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
    if (!appId) return

    const script = document.createElement('script')
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'
    script.defer = true
    document.head.appendChild(script)

    window.OneSignalDeferred = window.OneSignalDeferred || []
    window.OneSignalDeferred.push(async function (OneSignal: OneSignalType) {
      await OneSignal.init({ appId, serviceWorkerPath: '/OneSignalSDKWorker.js' })
      await OneSignal.login(userId)
    })

    return () => { document.head.removeChild(script) }
  }, [userId])

  return null
}

declare global {
  interface Window {
    OneSignalDeferred: ((os: OneSignalType) => void)[]
  }
}

interface OneSignalType {
  init(opts: { appId: string; serviceWorkerPath?: string }): Promise<void>
  login(userId: string): Promise<void>
}
