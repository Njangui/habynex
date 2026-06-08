import type { Metadata } from 'next'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'

export const metadata: Metadata = {
  title: 'Notifications — Habynex',
  description: 'Gérez vos préférences de notifications Habynex.',
}
export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-hb-50 dark:bg-hb-900 pt-4">
      <NotificationCenter />
    </div>
  )
}
