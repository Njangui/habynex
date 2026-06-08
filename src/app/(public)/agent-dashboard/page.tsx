import type { Metadata } from 'next'
import { AgentDashboard } from '@/components/agent/AgentDashboard'

export const metadata: Metadata = {
  title: 'Dashboard Agent — Habynex',
  robots: { index: false, follow: false },
}

export default function AgentDashboardPage() {
  return <AgentDashboard />
}
