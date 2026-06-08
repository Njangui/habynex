import type { Metadata } from 'next'
import { SearchPage } from '@/components/search/SearchPage'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Rechercher un logement — Habynex',
  description: 'Trouvez votre logement idéal au Cameroun. Filtrez par quartier, prix, type de bien. Recherche assistée par IA.',
}

interface SearchPageProps {
  searchParams: Promise<{
    q?: string
    type?: string
    transaction?: string
    quartier?: string
    min?: string
    max?: string
  }>
}

export default async function RechercherPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: rawNeighborhoods } = await supabase
    .from('neighborhoods')
    .select('id, name, slug, city:cities(name)')
    .eq('is_active', true)
    .order('display_order')

  // Supabase retourne les relations comme un tableau — on normalise en objet simple
  const neighborhoods = (rawNeighborhoods ?? []).map((n) => ({
    id: n.id as string,
    name: n.name as string,
    slug: n.slug as string,
    city: Array.isArray(n.city) ? (n.city[0] ?? null) : n.city,
  }))

  return <SearchPage neighborhoods={neighborhoods} initialParams={params} />
}
