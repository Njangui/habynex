'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Globe, Menu, Moon, Sun, Search } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { UserAvatar } from '@/components/auth/UserAvatar'

export function Navbar() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const { user, profile, unreadMessages, unreadNotifications } = useAuthStore()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])
  useEffect(() => { setMenuOpen(false) }, [pathname])

  return (
    <>
      <header className={cn(
        'fixed top-0 left-0 right-0 z-50 bg-white dark:bg-hb-800 transition-shadow duration-200',
        scrolled ? 'shadow-airbnb' : 'border-b border-hb-100 dark:border-hb-700'
      )}>
        <div className="max-w-[1760px] mx-auto px-4 sm:px-6 md:px-10 h-[76px] flex items-center justify-between gap-3">

          {/* Logo vrai */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <Image src="/habynex-icon.png" alt="Habynex" width={36} height={36} className="w-9 h-9 object-contain" priority />
            <span className="text-brand-500 font-bold text-xl tracking-tight hidden sm:block">habynex</span>
          </Link>

          {/* Barre recherche compacte — même niveau que le logo */}
          <div className="flex-1 max-w-[480px] mx-4 hidden md:block">
            <Link href="/rechercher"
              className="flex items-center border border-hb-200 dark:border-hb-600 rounded-full px-4 py-2.5 shadow-pill hover:shadow-airbnb-hover transition-shadow bg-white dark:bg-hb-700 gap-3 group">
              <Search size={15} className="text-hb-400 flex-shrink-0" />
              <span className="text-sm text-hb-300 flex-1">Ville, quartier, type de bien…</span>
              <div className="w-7 h-7 bg-brand-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-brand-600 transition-colors">
                <Search size={12} className="text-white" />
              </div>
            </Link>
          </div>

          {/* Actions droite */}
          <div className="flex items-center gap-1">
            {/* Desktop uniquement */}
            <Link href="/devenir-agent"
              className="hidden md:flex items-center px-4 py-2.5 rounded-full text-sm font-medium text-hb-600 dark:text-hb-300 hover:bg-hb-50 dark:hover:bg-hb-700 transition-colors whitespace-nowrap">
              Devenir agent
            </Link>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="hidden md:flex w-10 h-10 rounded-full text-hb-500 hover:bg-hb-50 dark:hover:bg-hb-700 transition-colors items-center justify-center" aria-label="Thème">
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button className="hidden md:flex w-10 h-10 rounded-full text-hb-500 hover:bg-hb-50 dark:hover:bg-hb-700 transition-colors items-center justify-center" aria-label="Langue">
              <Globe size={17} />
            </button>
            {/* Cloche de notification déplacée dans la page Messages */}

            {/* Mobile : boutons supprimés (dark/langue/notif) — déplacés dans les pages dédiées */}

            {/* Mobile : juste avatar */}
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden ml-1" aria-label="Menu">
              <UserAvatar profile={profile} size={32} />
            </button>

            {/* Desktop : pill hamburger + avatar */}
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="hidden md:flex items-center gap-2.5 border border-hb-200 dark:border-hb-600 rounded-full px-3 py-2 ml-1 hover:shadow-airbnb-hover transition-all bg-white dark:bg-hb-700"
              aria-label="Menu">
              <Menu size={16} className="text-hb-500" />
              <UserAvatar profile={profile} size={30} />
            </button>
          </div>
        </div>
      </header>

      {/* Dropdown */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="fixed top-[82px] right-4 md:right-10 z-50 w-64 bg-white dark:bg-hb-800 rounded-2xl shadow-airbnb-xl border border-hb-100 dark:border-hb-700 overflow-hidden animate-slide-down">
            {user ? (
              <>
                <div className="px-5 py-4 border-b border-hb-100 dark:border-hb-700">
                  <p className="font-semibold text-sm text-hb-700 dark:text-white">{profile?.full_name ?? 'Mon compte'}</p>
                  {profile?.referral_code && <p className="text-xs text-hb-400 mt-0.5">Code : {profile.referral_code}</p>}
                </div>
                <div className="py-2">
                  {[
                    { href: '/profil',              label: 'Mon profil' },
                    { href: '/favoris',             label: '❤️ Mes favoris' },
                    { href: '/messages',            label: `💬 Messages${unreadMessages > 0 ? ` (${unreadMessages})` : ''}` },
                    { href: '/profil?tab=visites',  label: '📅 Mes visites' },
                    { href: '/profil?tab=parrainage',label: '🎁 Parrainage' },
                    { href: '/devenir-agent',       label: '🏅 Devenir agent' },
                  ].map(item => (
                    <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                      className="block px-5 py-2.5 text-sm text-hb-600 dark:text-hb-300 hover:bg-hb-50 dark:hover:bg-hb-700 transition-colors">
                      {item.label}
                    </Link>
                  ))}
                  <div className="my-1 h-px bg-hb-100 dark:bg-hb-700" />
                  <SignOutButton onClose={() => setMenuOpen(false)} />
                </div>
              </>
            ) : (
              <div className="py-2">
                <Link href="/inscription" onClick={() => setMenuOpen(false)}
                  className="block px-5 py-2.5 text-sm font-semibold text-hb-700 dark:text-white hover:bg-hb-50 dark:hover:bg-hb-700 transition-colors">
                  S&apos;inscrire
                </Link>
                <Link href="/connexion" onClick={() => setMenuOpen(false)}
                  className="block px-5 py-2.5 text-sm text-hb-600 dark:text-hb-300 hover:bg-hb-50 dark:hover:bg-hb-700 transition-colors">
                  Se connecter
                </Link>
                <div className="my-1 h-px bg-hb-100 dark:bg-hb-700" />
                <Link href="/devenir-agent" onClick={() => setMenuOpen(false)}
                  className="block px-5 py-2.5 text-sm text-hb-600 dark:text-hb-300 hover:bg-hb-50 dark:hover:bg-hb-700 transition-colors">
                  Devenir agent
                </Link>
              </div>
            )}
          </div>
        </>
      )}
      <div className="h-[76px]" />
    </>
  )
}

function SignOutButton({ onClose }: { onClose: () => void }) {
  const { reset } = useAuthStore()
  async function go() {
    const { createClient } = await import('@/lib/supabase/client')
    await createClient().auth.signOut()
    reset(); onClose(); window.location.href = '/'
  }
  return (
    <button onClick={go}
      className="w-full text-left px-5 py-2.5 text-sm text-red-500 hover:bg-hb-50 dark:hover:bg-hb-700 transition-colors">
      Déconnexion
    </button>
  )
}
