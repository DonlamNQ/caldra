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
  openGraph: {
    type: 'website',
    url: 'https://getcaldra.com',
    title: 'Caldra — Monitoring comportemental pour traders',
    description: 'Caldra détecte en temps réel le revenge trading, l\'overtrading, les re-entrées impulsives et le tilt — avant que ça coûte.',
    siteName: 'Caldra',
    images: [{ url: 'https://getcaldra.com/og.png', width: 1200, height: 630, alt: 'Caldra — Session Monitor' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Caldra — Monitoring comportemental pour traders',
    description: 'Caldra détecte en temps réel le revenge trading, le tilt, l\'overtrading — avant que ça coûte.',
    images: ['https://getcaldra.com/og.png'],
  },
  keywords: ['trading', 'discipline trading', 'revenge trading', 'tilt trading', 'monitoring trader', 'caldra', 'session trading'],
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
