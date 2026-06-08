import type { Metadata } from 'next'
import { RegisterForm } from '@/components/auth/RegisterForm'

export const metadata: Metadata = {
  title: 'Inscription — Habynex',
  robots: { index: false, follow: false },
}

export default function InscriptionPage() {
  return <RegisterForm />
}
