import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata: Metadata = {
  title: 'v0 App',
  description: 'Created with v0',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <header className="bg-blue-600 text-white p-4">
          <div className="container mx-auto flex flex-wrap items-center justify-between">
            <div className="flex items-center">
              <a href="/" className="text-xl font-bold">HapDaily</a>
              <span className="ml-2 text-sm">AI-Powered Soccer Predictions</span>
            </div>
            <nav>
              <ul className="flex space-x-6">
                <li><a href="/" className="hover:underline">Dashboard</a></li>
                <li><a href="/manage-odds" className="hover:underline">Manage Odds</a></li>
              </ul>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  )
}
