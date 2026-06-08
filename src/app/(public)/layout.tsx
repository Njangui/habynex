import { Navbar } from '@/components/layout/Navbar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Footer } from '@/components/layout/Footer'
import { PwaBanner } from '@/components/ui/PwaBanner'
import { NotifPermissionToast } from '@/components/ui/NotifPermissionToast'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-hb-800">
      <PwaBanner />
      <Navbar />
      <NotifPermissionToast />
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>
      <Footer />
      <BottomNav />
    </div>
  )
}
