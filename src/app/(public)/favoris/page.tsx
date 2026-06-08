import type { Metadata } from 'next'
import { FavorisPage } from '@/components/listing/FavorisPage'

export const metadata: Metadata = {
  title: 'Mes favoris — Habynex',
  robots: { index: false, follow: false },
}

export default function Favoris() {
  return <FavorisPage />
}
