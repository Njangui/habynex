import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/server'

export const revalidate = 3600 // Régénérer toutes les heures

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminClient()
  const baseUrl = 'https://habynex.com'

  // Pages statiques
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/rechercher`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/devenir-agent`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/connexion`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/inscription`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 },
  ]

  // Annonces publiées
  const { data: listings } = await supabase
    .from('listings')
    .select('slug, updated_at')
    .eq('status', 'published')
    .not('slug', 'is', null)

  const listingPages: MetadataRoute.Sitemap = (listings ?? []).map((l: { slug: string; updated_at: string }) => ({
    url: `${baseUrl}/bien/${l.slug}`,
    lastModified: new Date(l.updated_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  // Quartiers
  const { data: neighborhoods } = await supabase
    .from('neighborhoods')
    .select('slug, created_at')
    .eq('is_active', true)

  const neighborhoodPages: MetadataRoute.Sitemap = (neighborhoods ?? []).map((n: { slug: string; created_at: string }) => ({
    url: `${baseUrl}/quartier/${n.slug}`,
    lastModified: new Date(n.created_at),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  // Villes
  const { data: cities } = await supabase
    .from('cities')
    .select('slug, created_at')
    .eq('is_active', true)

  const cityPages: MetadataRoute.Sitemap = (cities ?? []).map((c: { slug: string; created_at: string }) => ({
    url: `${baseUrl}/ville/${c.slug}`,
    lastModified: new Date(c.created_at),
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  // Blog
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('slug, updated_at')
    .eq('published', true)

  const blogPages: MetadataRoute.Sitemap = (posts ?? []).map((p: { slug: string; updated_at: string }) => ({
    url: `${baseUrl}/blog/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  return [...staticPages, ...listingPages, ...neighborhoodPages, ...cityPages, ...blogPages]
}
