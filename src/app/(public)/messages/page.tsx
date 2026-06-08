import type { Metadata } from 'next'
import { MessagesPage } from '@/components/messaging/MessagesPage'

export const metadata: Metadata = {
  title: 'Messages — Habynex',
  robots: { index: false, follow: false },
}

export default function Messages() {
  return <MessagesPage />
}
