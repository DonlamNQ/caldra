import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'

export const metadata: Metadata = {
  title: "Caldra — Tu ne vois pas quand tu dérailles. Lui si.",
  description: "Caldra détecte tes comportements dangereux en temps réel — avant que le tilt, le revenge trading ou une décision émotionnelle ne détruise ta session.",
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Caldra',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#06060c',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body style={{ background: '#08080d', margin: 0 }}>{children}</body>
    </html>
  )
}
