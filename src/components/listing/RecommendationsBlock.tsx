'use client'

// ================================================================
// RecommendationsBlock.tsx
// Bloc "Annonces recommandées pour vous" à insérer dans :
//  - ListingDetail (sous les détails du bien)
//  - HomePage (bloc "for_you" personnalisé)
// ================================================================

import { useEffect } from 'react'
import { Sparkles, TrendingUp } from 'lucide-react'
import { useRecommendations } from '@/hooks/useRecommendations'
import { ListingCard } from '@/components/listing/ListingCard'
import type { Listing } from '@/types'
import { cn } from '@/lib/utils'

interface RecommendationsBlockProps {
  currentListingId?: string
  title?: string
  limit?: number
  className?: string
}

export function RecommendationsBlock({
  currentListingId,
  title = 'Annonces recommandées pour vous',
  limit = 6,
  className,
}: RecommendationsBlockProps) {
  const { recommendations, recoLoading, loadRecommendations } = useRecommendations()

  useEffect(() => {
    loadRecommendations(currentListingId, limit)
  }, [currentListingId, limit])

  if (!recoLoading && recommendations.length === 0) return null

  return (
    <section className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-brand-100 dark:bg-brand-900 rounded-xl flex items-center justify-center">
          <Sparkles size={14} className="text-brand-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
      </div>

      {recoLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden">
              <div className="skeleton h-44 w-full" />
              <div className="p-3 space-y-2">
                <div className="skeleton h-3 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </section>
  )
}
