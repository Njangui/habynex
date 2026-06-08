'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, formatPrice, listingTypeLabel, transactionLabel } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { useListings } from '@/hooks/useListings'
import { WatermarkedImage } from '@/components/ui/WatermarkedImage'
import type { Listing } from '@/types'

interface ListingCardProps {
  listing: Listing
  className?: string
  priority?: boolean
}

export function ListingCard({ listing, className, priority }: ListingCardProps) {
  const { user } = useAuthStore()
  const { toggleFavorite, favoriteIds } = useListings()

  const isFav = favoriteIds.has(listing.id)

  const [imgIdx, setImgIdx] = useState(0)

  const images =
    listing.media
      ?.sort((a, b) => (b.is_cover ? 1 : 0) - (a.is_cover ? 1 : 0))
      .map((m) => m.url) ?? []

  const neighborhood = Array.isArray(listing.neighborhood)
    ? listing.neighborhood[0]
    : listing.neighborhood

  const city = Array.isArray(neighborhood?.city)
    ? neighborhood?.city[0]
    : neighborhood?.city

  function prevImg(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    setImgIdx((i) => Math.max(0, i - 1))
  }

  function nextImg(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    setImgIdx((i) => Math.min(images.length - 1, i + 1))
  }

  async function handleFav(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      window.location.href = '/connexion'
      return
    }

    await toggleFavorite(listing.id, user.id)
  }

  return (
    <Link
      href={`/bien/${listing.slug}`}
      className={cn('block group', className)}
    >
      {/* IMAGE */}
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-hb-100">
        {images.length > 0 ? (
          <WatermarkedImage
            src={images[imgIdx]}
            alt={listing.title}
            fill
            className="object-cover"
            priority={priority}
            mode="corner"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-hb-100 text-5xl">
            🏠
          </div>
        )}

        {/* FAVORI */}
        <button
          onClick={handleFav}
          className="absolute top-3 right-3 z-10 transition-transform hover:scale-110"
          aria-label={
            isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'
          }
        >
          <Heart
            size={24}
            strokeWidth={2}
            className={isFav ? 'text-brand-500' : 'text-white drop-shadow'}
            fill={isFav ? '#f95d1e' : 'rgba(0,0,0,0.3)'}
          />
        </button>

        {/* BADGE IA */}
        {listing.ai_generated && (
          <div className="absolute top-3 left-3 bg-white rounded-lg px-2 py-1 text-xs font-semibold text-hb-700 shadow-airbnb">
            ✨ IA
          </div>
        )}

        {/* NAVIGATION IMAGES */}
        {images.length > 1 && (
          <>
            {imgIdx > 0 && (
              <button
                onClick={prevImg}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft size={16} />
              </button>
            )}

            {imgIdx < images.length - 1 && (
              <button
                onClick={nextImg}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight size={16} />
              </button>
            )}

            {/* DOTS */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {images.slice(0, 5).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-full transition-all',
                    i === imgIdx
                      ? 'w-2 h-2 bg-white'
                      : 'w-1.5 h-1.5 bg-white/60'
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* CONTENU */}
      <div className="mt-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-hb-700 text-sm leading-snug line-clamp-1">
            {listingTypeLabel(listing.type)} ·{' '}
            {neighborhood?.name ?? 'Yaoundé'}
            {city ? `, ${city.name}` : ''}
          </p>

          {listing.favorite_count > 0 && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <span className="text-hb-700 text-sm">★</span>
              <span className="text-sm text-hb-700">
                {(listing.favorite_count / 10).toFixed(1)}
              </span>
            </div>
          )}
        </div>

        <p className="text-sm text-hb-400 line-clamp-1 mt-0.5">
          {listing.description
            ? listing.description.slice(0, 60) +
              (listing.description.length > 60 ? '…' : '')
            : `${
                listing.bedrooms
                  ? `${listing.bedrooms} chambre${
                      listing.bedrooms > 1 ? 's' : ''
                    } · `
                  : ''
              }${
                listing.surface_m2
                  ? `${listing.surface_m2} m²`
                  : ''
              }`}
        </p>

        <p className="text-sm text-hb-400 mt-0.5">
          {listing.furnished ? 'Meublé · ' : ''}
          {transactionLabel(listing.transaction)}
        </p>

        <p className="text-sm mt-1.5">
          <span className="font-semibold text-hb-700">
            {formatPrice(listing.price)}
          </span>

          {listing.transaction === 'rent' && (
            <span className="text-hb-400"> / mois</span>
          )}

          {listing.price_negotiable && (
            <span className="text-hb-300 text-xs ml-1">
              (négociable)
            </span>
          )}
        </p>
      </div>
    </Link>
  )
}

export function ListingCardSkeleton() {
  return (
    <div>
      <div className="aspect-square rounded-2xl skeleton" />

      <div className="mt-2.5 space-y-1.5">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
        <div className="skeleton h-3 w-2/3 rounded" />
        <div className="skeleton h-4 w-1/3 rounded mt-1" />
      </div>
    </div>
  )
}
