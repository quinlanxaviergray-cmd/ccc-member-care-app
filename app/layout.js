import './globals.css'

export const metadata = {
  title: 'BurdenBear',
  description: 'Church member care tracker',
    icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}