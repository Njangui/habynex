import type { Listing } from '@/types'
import { formatPrice } from '@/lib/utils'

// Schema.org RealEstateListing pour les annonces
export function generateListingStructuredData(listing: Listing) {
  const neighborhood = Array.isArray(listing.neighborhood)
    ? listing.neighborhood[0]
    : listing.neighborhood

  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: listing.title,
    description: listing.description ?? '',
    url: `https://habynex.com/bien/${listing.slug}`,
    datePosted: listing.published_at ?? listing.created_at,
    price: listing.price,
    priceCurrency: 'XAF',
    address: {
      '@type': 'PostalAddress',
      addressLocality: neighborhood?.name ?? 'Yaoundé',
      addressCountry: 'CM',
    },
    ...(listing.lat && listing.lng ? {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: listing.lat,
        longitude: listing.lng,
      }
    } : {}),
    numberOfRooms: listing.bedrooms ?? undefined,
    floorSize: listing.surface_m2 ? {
      '@type': 'QuantitativeValue',
      value: listing.surface_m2,
      unitCode: 'MTK',
    } : undefined,
    image: listing.media
      ?.filter(m => m.type === 'image')
      .sort(m => m.is_cover ? -1 : 1)
      .slice(0, 5)
      .map(m => m.url) ?? [],
    offeredBy: {
      '@type': 'Organization',
      name: 'Habynex',
      url: 'https://habynex.com',
    },
  }
}

// Schema.org Organization pour Habynex
export function generateOrganizationStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: 'Habynex',
    url: 'https://habynex.com',
    logo: 'https://habynex.com/icons/icon-512.png',
    description: 'La première agence immobilière augmentée par l\'intelligence artificielle au Cameroun.',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Yaoundé',
      addressCountry: 'CM',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'contact.habynex@gmail.com',
      telephone: '+237654888084',
      contactType: 'customer service',
      availableLanguage: ['French', 'English'],
    },
    sameAs: [
      'https://www.facebook.com/habynex',
      'https://www.instagram.com/habynex',
    ],
    areaServed: {
      '@type': 'City',
      name: 'Yaoundé',
      containedInPlace: { '@type': 'Country', name: 'Cameroun' },
    },
  }
}

// Schema.org BreadcrumbList
export function generateBreadcrumbStructuredData(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}
