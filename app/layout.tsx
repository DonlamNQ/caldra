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
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,200;0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
