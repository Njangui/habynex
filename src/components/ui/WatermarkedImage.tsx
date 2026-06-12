'use client'

import Image from 'next/image'
import { cn, BLUR_DATA_URL, LOW_DATA_QUALITY } from '@/lib/utils'

interface WatermarkedImageProps {
  src: string
  alt: string
  className?: string
  fill?: boolean
  width?: number
  height?: number
  sizes?: string
  priority?: boolean
  disabled?: boolean
  mode?: 'grid' | 'corner'
}

export function WatermarkedImage({
  src,
  alt,
  className,
  fill,
  width,
  height,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  priority = false,
  disabled = false,
  mode = 'corner',
}: WatermarkedImageProps) {
  return (
    <div
      className={cn('relative overflow-hidden', fill && 'absolute inset-0', className)}
      onContextMenu={e => e.preventDefault()}
    >
      {fill ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes={sizes}
          priority={priority}
          loading={priority ? 'eager' : 'lazy'}
          quality={LOW_DATA_QUALITY}
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          width={width ?? 400}
          height={height ?? 300}
          className="object-cover w-full h-full"
          sizes={sizes}
          priority={priority}
          loading={priority ? 'eager' : 'lazy'}
          quality={LOW_DATA_QUALITY}
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
        />
      )}

      {!disabled && (
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
          style={mode === 'corner' ? cornerStyle : gridStyle}
        />
      )}
    </div>
  )
}

const cornerStyle: React.CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='30'%3E%3Ctext x='4' y='20' font-family='Arial' font-size='11' font-weight='bold' fill='white' opacity='0.45' letter-spacing='1'%3EHABYNEX%3C/text%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'bottom 8px right 8px',
  backgroundSize: '100px 24px',
}

const gridStyle: React.CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='120'%3E%3Cg transform='rotate(-22 100 60)' opacity='0.15'%3E%3Ctext x='10' y='50' font-family='Arial' font-size='13' font-weight='bold' fill='white' letter-spacing='2'%3EHABYNEX%3C/text%3E%3Ctext x='10' y='68' font-family='Arial' font-size='9' fill='white'%3Ehabynex.com%3C/text%3E%3C/g%3E%3C/svg%3E")`,
  backgroundRepeat: 'repeat',
  backgroundSize: '200px 120px',
}
