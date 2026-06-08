import type { Metadata } from 'next'
import { DevenirAgentPage } from '@/components/agent/DevenirAgentPage'

export const metadata: Metadata = {
  title: 'Devenir agent Habynex — Rejoignez notre réseau',
  description: 'Rejoignez le réseau d\'agents terrain certifiés Habynex. Travaillez dans votre quartier, gagnez des commissions attractives et bénéficiez du support de notre IA.',
}

export default function DevenirAgent() {
  return <DevenirAgentPage />
}
