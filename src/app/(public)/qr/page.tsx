import type { Metadata } from 'next'
import { QRDashboard } from '@/components/qr/QRDashboard'

export const metadata: Metadata = {
  title: 'QR Codes — Habynex',
  description: 'Générez et partagez vos QR codes Habynex officiels.',
}
export default function QRPage() { return <QRDashboard /> }
