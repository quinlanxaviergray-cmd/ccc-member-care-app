import './globals.css'

export const metadata = {
  title: 'Member Care',
  description: 'Church member care tracker',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}