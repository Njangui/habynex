'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useFiltersStore } from '@/stores/filters'

const LISTING_TYPES = [
  { value: '',           label: 'Tous',         emoji: '🏘️' },
  { value: 'apartment',  label: 'Appartements', emoji: '🏢' },
  { value: 'studio',     label: 'Studios',      emoji: '🛏️' },
  { value: 'room',       label: 'Chambres',     emoji: '🚪' },
  { value: 'villa',      label: 'Villas',       emoji: '🏡' },
  { value: 'duplex',     label: 'Duplex',       emoji: '🏠' },
  { value: 'commercial', label: 'Commerces',    emoji: '🏪' },
]

const TRANSACTIONS = [
  { value: '',           label: 'Toutes',       emoji: '🔍' },
  { value: 'rent',       label: 'Location',     emoji: '🔑' },
  { value: 'sale',       label: 'Vente',        emoji: '💰' },
  { value: 'coliving',   label: 'Colocation',   emoji: '👥' },
  { value: 'short_stay', label: 'Court séjour', emoji: '📅' },
  { value: 'furnished',  label: 'Meublé',       emoji: '🛋️' },
]

export function HeroSection() {
  const router = useRouter()
  const { activeType, activeTransaction, setType, setTransaction } = useFiltersStore()

  function handleType(v: string) {
    setType(v !== '' && v === activeType ? '' : v)
  }

  function handleTransaction(v: string) {
    setTransaction(v !== '' && v === activeTransaction ? '' : v)
  }

  return (
    <div className="bg-white dark:bg-hb-800 border-b border-hb-100 dark:border-hb-700">
      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 md:px-10 py-3 md:py-5">
        {/* Types de bien */}
        <div className="mt-6 border-b border-hb-100 dark:border-hb-700">
          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0 md:justify-center">
            {LISTING_TYPES.map(t => (
              <button key={t.value} onClick={() => handleType(t.value)}
                className={cn(
                  'flex flex-col items-center gap-1.5 px-5 py-3 md:px-7 md:py-4 min-w-[80px] md:min-w-[96px] border-b-2 transition-all flex-shrink-0',
                  activeType === t.value
                    ? 'border-hb-700 text-hb-700 dark:text-white dark:border-white'
                    : 'border-transparent text-hb-400 hover:text-hb-600 hover:border-hb-200 dark:hover:text-hb-200'
                )}>
                <span className="text-2xl md:text-3xl">{t.emoji}</span>
                <span className="text-[11px] md:text-[13px] font-medium whitespace-nowrap">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Modalités */}
        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar md:justify-center">
          {TRANSACTIONS.map(t => (
            <button key={t.value} onClick={() => handleTransaction(t.value)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 md:px-5 md:py-2.5 rounded-full text-xs md:text-sm font-medium border transition-all flex-shrink-0',
                activeTransaction === t.value
                  ? 'bg-hb-700 dark:bg-white text-white dark:text-hb-700 border-hb-700 dark:border-white'
                  : 'border-hb-200 dark:border-hb-600 text-hb-500 dark:text-hb-300 hover:border-hb-400 bg-white dark:bg-hb-700'
              )}>
              <span>{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
