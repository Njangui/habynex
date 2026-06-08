import type { Metadata } from 'next'
import { ProfilPage } from '@/components/profile/ProfilPage'

export const metadata: Metadata = {
  title: 'Mon profil — Habynex',
  robots: { index: false, follow: false },
}

export default function Profil() {
  return <ProfilPage />
}
