import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Connexion — Habynex',
  robots: { index: false, follow: false },
}

export default function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  return <LoginForm />
}
