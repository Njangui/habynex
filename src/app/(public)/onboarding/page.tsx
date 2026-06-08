import { OnboardingFlow } from '@/components/auth/OnboardingFlow'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Bienvenue sur Habynex — Configurez vos préférences',
  robots: { index: false, follow: false },
}

export default function OnboardingPage() {
  return <OnboardingFlow />
}
