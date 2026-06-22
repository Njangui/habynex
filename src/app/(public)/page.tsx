import type { Metadata } from 'next'
import { HomePageClient } from '@/components/listing/HomePageClient'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Habynex — Trouvez votre logement idéal au Cameroun',
  description: 'Habynex, l\'agence immobilière intelligente au Cameroun. Appartements, studios et villas vérifiés à Yaoundé et Douala. IA, visites terrain, agents certifiés.',
}

// Page d'accueil générée côté serveur pour le SEO
export default async function HomePage() {
  const supabase = await createClient()

  // Charger les données initiales pour chaque bloc
  const [{ data: popular }, { data: goodDeals }] = await Promise.all([
    supabase
      .from('listings')
      .select(`*, neighborhood:neighborhoods(name, slug), media:listing_media(url, is_cover, display_order)`)
      .eq('status', 'published')
      .order('view_count', { ascending: false })
      .limit(10),
    supabase
      .from('listings')
      .select(`*, neighborhood:neighborhoods(name, slug), media:listing_media(url, is_cover, display_order)`)
      .eq('status', 'published')
      .eq('transaction', 'rent')
      .order('price', { ascending: true })
      .limit(10),
  ])

  return (
    <HomePageClient
      popularListings={popular ?? []}
      goodDeals={goodDeals ?? []}
    />
  )
}
