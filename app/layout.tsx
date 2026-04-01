import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Caldra — Tu ne vois pas quand tu dérailles. Lui si.",
  description: "Caldra détecte tes comportements dangereux en temps réel — avant que le tilt, le revenge trading ou une décision émotionnelle ne détruise ta session.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
