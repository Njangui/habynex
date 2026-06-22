import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface CityPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: city } = await supabase.from('cities').select('*').eq('slug', slug).single()
  if (!city) return { title: 'Ville introuvable — Habynex' }
  return {
    title: city.seo_title || `Logement à ${city.name} — Habynex`,
    description: city.seo_description || `Trouvez votre logement à ${city.name} avec Habynex.`,
  }
}

export default async function VillePage({ params }: CityPageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const [{ data: city }, { data: neighborhoods }, { data: listings }] = await Promise.all([
    supabase.from('cities').select('*').eq('slug', slug).single(),
    supabase.from('neighborhoods').select('*').eq('is_active', true).order('display_order'),
    supabase.from('listings').select(`*, media:listing_media(url, is_cover)`).eq('status', 'published').limit(20),
  ])

  if (!city) notFound()

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">{city.seo_title || `Logement à ${city.name}`}</h1>
      {city.seo_description && <p className="text-gray-600 mb-8">{city.seo_description}</p>}
      {/* ListingGrid sera implémenté dans la Phase 1 */}
      <p className="text-gray-500">{listings?.length ?? 0} annonces disponibles</p>
    </div>
  )
}

export const revalidate = 3600
