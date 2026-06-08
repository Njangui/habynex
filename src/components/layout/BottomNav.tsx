'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, Heart, MessageSquare, User, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'

function ExplorerIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
      <path
        d="M16 3L3 12.5V28h10v-8h6v8h10V12.5L16 3z"
        stroke={active ? '#f95d1e' : '#717171'}
        strokeWidth="2"
        fill={active ? 'rgba(249,93,30,0.08)' : 'none'}
        strokeLinejoin="round"
      />
    </svg>
  )
}

type NavItem = {
  href: string
  label: string
  icon?: LucideIcon
  renderIcon?: (active: boolean) => JSX.Element
  fill?: boolean
  badge?: boolean
}

export function BottomNav() {
  const pathname = usePathname()
  const { user, unreadMessages } = useAuthStore()

  // Non connecté : Explorer + Favoris + Connexion
  const guestNav: NavItem[] = [
    {
      href: '/',
      label: 'Explorer',
      renderIcon: (a: boolean) => <ExplorerIcon active={a} />,
    },
    {
      href: '/favoris',
      label: 'Favoris',
      icon: Heart,
    },
    {
      href: '/connexion',
      label: 'Connexion',
      icon: User,
    },
  ]

  // Connecté : Explorer + Rechercher + Favoris + Messages + Profil
  const authNav: NavItem[] = [
    {
      href: '/',
      label: 'Explorer',
      renderIcon: (a: boolean) => <ExplorerIcon active={a} />,
    },
    {
      href: '/rechercher',
      label: 'Rechercher',
      icon: Search,
    },
    {
      href: '/favoris',
      label: 'Favoris',
      icon: Heart,
      fill: true,
    },
    {
      href: '/messages',
      label: 'Messages',
      icon: MessageSquare,
      badge: true,
    },
    {
      href: '/profil',
      label: 'Profil',
      icon: User,
    },
  ]

  const nav = user ? authNav : guestNav

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white dark:bg-hb-800 border-t border-hb-100 dark:border-hb-700 pb-safe">
      <div
        className="grid h-[60px] px-2"
        style={{ gridTemplateColumns: `repeat(${nav.length}, 1fr)` }}
      >
        {nav.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)

          const activeColor = isActive
            ? 'text-brand-500'
            : 'text-hb-400 dark:text-hb-400'

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-[3px] relative"
              aria-label={item.label}
            >
              <div className="relative">
                {item.renderIcon ? (
                  item.renderIcon(isActive)
                ) : item.icon ? (
                  <item.icon
                    size={22}
                    strokeWidth={1.8}
                    className={activeColor}
                    fill={item.fill && isActive ? '#f95d1e' : 'none'}
                  />
                ) : null}

                {item.badge && unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] bg-brand-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </div>

              <span
                className={cn(
                  'text-[10px] font-medium leading-none',
                  activeColor
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
