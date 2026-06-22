import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

// Détecte si la chaîne est un UUID (ancienne URL indexée par Google avant migration vers slugs)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
import { createClient } from '@/lib/supabase/server'
import { ListingDetail } from '@/components/listing/ListingDetail'
import { generateListingStructuredData } from '@/lib/seo/structured-data'

interface ListingPageProps {
  params: Promise<{ slug: string }>
}

// Génération des métadonnées dynamiques (SSR — pour SEO)
export async function generateMetadata({ params }: ListingPageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: listing } = await supabase
    .from('listings')
    .select('title, description, meta_title, meta_description, price, transaction, neighborhood:neighborhoods(name)')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!listing) return { title: 'Annonce introuvable — Habynex' }

  const neighborhood = Array.isArray(listing.neighborhood)
    ? listing.neighborhood[0]
    : listing.neighborhood

  return {
    title: listing.meta_title || listing.title,
    description: listing.meta_description || listing.description?.substring(0, 160),
    openGraph: {
      title: listing.meta_title || listing.title,
      description: listing.meta_description || listing.description?.substring(0, 160) || '',
      type: 'website',
      siteName: 'Habynex',
      locale: 'fr_FR',
    },
    twitter: {
      card: 'summary_large_image',
      title: listing.meta_title || listing.title,
      description: listing.meta_description || listing.description?.substring(0, 160) || '',
    },
  }
}

export default async function BienPage({ params }: ListingPageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // ── Redirection UUID → slug ──────────────────────────────────────────────
  // Google a indexé /property/{uuid} puis /bien/{uuid} (avant la migration slugs).
  // On cherche le vrai slug en DB et on redirige en 301 pour corriger l'index Google.
  if (UUID_REGEX.test(slug)) {
    const { data: found } = await supabase
      .from('listings')
      .select('slug')
      .eq('id', slug)
      .single()
    if (found?.slug) {
      redirect(`/bien/${found.slug}`)   // 301 permanent → Google met à jour l'index
    } else {
      notFound()
    }
  }
  // ────────────────────────────────────────────────────────────────────────

  const { data: listing } = await supabase
    .from('listings')
    .select(`
      *,
      neighborhood:neighborhoods(id, name, slug, city:cities(name)),
      media:listing_media(id, url, type, is_cover, display_order),
      virtual_tour:virtual_tours(id, scenes, is_active)
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!listing) notFound()

  // Enregistrer la vue (non-bloquant)
  supabase.from('listing_views').insert({ listing_id: listing.id }).then(() => {})

  const structuredData = generateListingStructuredData(listing)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <ListingDetail listing={listing} />
    </>
  )
}

// ISR — Revalider toutes les heures
export const revalidate = 3600
