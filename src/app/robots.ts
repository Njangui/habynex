import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/profil/',
          '/messages/',
          '/notifications/',
          '/favoris/',
          '/connexion',
          '/inscription',
        ],
      },
    ],
    sitemap: 'https://habynex.com/sitemap.xml',
    host: 'https://habynex.com',
  }
}
