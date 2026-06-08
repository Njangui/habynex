import Link from 'next/link'
import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-hb-50 dark:bg-hb-900 flex flex-col">
      <header className="py-5 px-6 border-b border-hb-100 dark:border-hb-800 bg-white dark:bg-hb-800">
        <Link href="/" className="inline-flex items-center gap-2">
          <Image src="/habynex-icon.png" alt="Habynex" width={32} height={32} className="w-8 h-8 object-contain" />
          <span className="text-brand-500 font-bold text-xl">habynex</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </main>
    </div>
  )
}
