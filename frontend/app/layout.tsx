import type { Metadata, Viewport } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import LayoutWrapper from '@/components/LayoutWrapper'

const manrope = Manrope({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'Terminalschema',
  description: 'Rättvis bandfördelning baserad på belastning',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Terminalschema' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#003087' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1020' },
  ],
}

const themeScript = `
(function(){try{
  var s=localStorage.getItem('theme');
  var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark',d);
}catch(e){}})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv" suppressHydrationWarning className={manrope.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased">
        <LayoutWrapper>{children}</LayoutWrapper>
        <Toaster richColors position="bottom-center" offset={96} />
      </body>
    </html>
  )
}
