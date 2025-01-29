import { GeistSans } from 'geist/font/sans'
import './globals.css'
import { Toaster } from 'sonner'

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000'

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: 'Dialect - AI-powered team collaboration',
  description: 'The fastest way for small teams to think bigger',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={GeistSans.className}>
      <body className="bg-background text-foreground">
        <main>{children}</main>
        <Toaster theme="dark" position="top-right" />
      </body>
    </html>
  )
}
