import type { Metadata, Viewport } from 'next'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { ServiceWorkerRegister } from '@/components/ui/ServiceWorkerRegister'
import '@/styles/globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://habynex.com'),
  title: { default: 'Habynex — Agence immobilière IA au Cameroun', template: '%s | Habynex' },
  description: 'Trouvez votre logement idéal au Cameroun avec Habynex. Annonces vérifiées à Yaoundé. Agents certifiés, IA intégrée.',
  keywords: ['immobilier Cameroun','logement Yaoundé','appartement Douala','location Cameroun','agence immobilière IA'],
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website', locale: 'fr_CM', url: 'https://habynex.com', siteName: 'Habynex',
    title: 'Habynex — Agence immobilière IA au Cameroun',
    description: 'Trouvez votre logement idéal au Cameroun avec Habynex.',
    images: [{ url: '/images/og-default.jpg', width: 1200, height: 630, alt: 'Habynex' }],
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1a' },
  ],
  width: 'device-width', initialScale: 1, maximumScale: 5,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        {/* PWA iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Habynex" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-startup-image" href="/icons/splash-1125x2436.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" />
        {/* Splash screen couleur pendant chargement */}
        <meta name="msapplication-TileColor" content="#f95d1e" />
        <meta name="msapplication-TileImage" content="/icons/icon-144.png" />
      </head>
      <body className="bg-white dark:bg-hb-800 text-hb-700 dark:text-hb-100 antialiased" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>
            {children}
          </AuthProvider>
          <ServiceWorkerRegister />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: { background: '#222222', color: '#fff', borderRadius: '12px', fontSize: '14px', fontFamily: 'Inter, sans-serif' },
              success: { iconTheme: { primary: '#f95d1e', secondary: '#fff' } },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
