'use client'

import NextImage from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface OptimizedImageProps {
  src: string
  alt: string
  fill?: boolean
  width?: number
  height?: number
  className?: string
  priority?: boolean
  sizes?: string
  objectFit?: 'cover' | 'contain'
}

/**
 * Image optimisée pour connexions lentes et appareils bas de gamme :
 * - Skeleton animé pendant le chargement
 * - Blur placeholder bas qualité (LQIP)
 * - Format WebP/AVIF auto via Next.js
 * - Fallback élégant si erreur
 */
export function OptimizedImage({
  src, alt, fill, width, height, className,
  priority = false, sizes, objectFit = 'cover',
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  if (error) {
    return (
      <div className={cn('bg-gray-100 dark:bg-gray-800 flex items-center justify-center', className)}>
        <span className="text-3xl">🏠</span>
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Skeleton pendant chargement */}
      {!loaded && (
        <div className="absolute inset-0 skeleton" />
      )}
      <NextImage
        src={src}
        alt={alt}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        className={cn(
          'transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
          objectFit === 'cover' ? 'object-cover' : 'object-contain'
        )}
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        sizes={sizes ?? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'}
        quality={75} // Bon compromis qualité/poids pour connexions faibles
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        placeholder="blur"
        blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHZpZXdCb3g9IjAgMCAxMCAxMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNmMGYwZjAiLz48L3N2Zz4="
      />
    </div>
  )
}
