'use client'

import { HeroSection } from './HeroSection'
import { ListingBlocks } from './ListingBlocks'
import { SeoHomeBlocks } from '@/components/seo/SeoBlocks'
import type { Listing } from '@/types'

interface HomePageClientProps {
  popularListings: Listing[]
  goodDeals: Listing[]
}

export function HomePageClient({ popularListings, goodDeals }: HomePageClientProps) {
  return (
    <>
      <HeroSection />
      <ListingBlocks
        popularListings={popularListings}
        goodDeals={goodDeals}
      />
      <SeoHomeBlocks />
    </>
  )
}
