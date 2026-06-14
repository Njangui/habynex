import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MapPin, ChevronRight, Home } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ListingCard } from '@/components/listing/ListingCard'
import { MapView } from '@/components/map/MapView'
import { generateBreadcrumbStructuredData, generateFaqStructuredData } from '@/lib/seo/structured-data'
import { getNeighborhoodContent } from '@/lib/seo/neighborhood-content'
import type { Listing } from '@/types'

interface QuartierPageProps {
  params: Promise<{ slug: string }>
}

// Groupes de quartiers proches — utilisés pour la sidebar "Quartiers à proximité"
const NEIGHBOR_GROUPS: string[][] = [
  ['simbock', 'jouvence', 'biyem-assi', 'tkc'],
  ['awae', 'nkol-eton', 'odza', 'emana'],
]

function getNearbySlugs(slug: string): string[] {
  const group = NEIGHBOR_GROUPS.find((g) => g.includes(slug))
  return group ?? NEIGHBOR_GROUPS[0]
}

export async function generateMetadata({ params }: QuartierPageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: n } = await supabase.from('neighborhoods').select('*').eq('slug', slug).single()
  if (!n) return { title: 'Quartier introuvable — Habynex' }
  return {
    title: n.seo_title || `Logement à ${n.name} Yaoundé — Habynex`,
    description: n.seo_description || `Trouvez votre logement à ${n.name}, Yaoundé avec Habynex.`,
    alternates: { canonical: `https://habynex.com/quartier/${slug}` },
    openGraph: {
      title: n.seo_title || `Logement à ${n.name} — Habynex`,
      description: n.seo_description || '',
    },
  }
}

export default async function QuartierPage({ params }: QuartierPageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const [{ data: neighborhood }, { data: listings }] = await Promise.all([
    supabase.from('neighborhoods').select('*, city:cities(name, slug)').eq('slug', slug).single(),
    supabase
      .from('listings')
      .select(`
        id, slug, title, type, transaction, price, price_negotiable,
        neighborhood_id, lat, lng, bedrooms, bathrooms, surface_m2,
        furnished, view_count, favorite_count, published_at, amenities,
        description, address_hint, floor, status, created_at, updated_at,
        owner_id, city_id, contact_phone, contact_whatsapp,
        neighborhood:neighborhoods(id, name, slug),
        media:listing_media(url, is_cover, display_order)
      `)
      .eq('status', 'published')
      .eq('neighborhood_id', (await supabase.from('neighborhoods').select('id').eq('slug', slug).single()).data?.id)
      .order('published_at', { ascending: false })
      .limit(24),
  ])

  if (!neighborhood) notFound()

  const city = Array.isArray(neighborhood.city) ? neighborhood.city[0] : neighborhood.city
  const content = getNeighborhoodContent(slug)
  const breadcrumb = generateBreadcrumbStructuredData([
    { name: 'Accueil', url: 'https://habynex.com' },
    { name: 'Yaoundé', url: `https://habynex.com/ville/${city?.slug ?? 'yaounde'}` },
    { name: neighborhood.name, url: `https://habynex.com/quartier/${slug}` },
  ])
  const faqSchema = content && content.faq.length > 0 ? generateFaqStructuredData(content.faq) : null

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6" aria-label="Fil d'Ariane">
          <Link href="/" className="hover:text-brand-500 transition-colors">Accueil</Link>
          <ChevronRight size={14} />
          <Link href={`/ville/${city?.slug ?? 'yaounde'}`} className="hover:text-brand-500 transition-colors">
            {city?.name ?? 'Yaoundé'}
          </Link>
          <ChevronRight size={14} />
          <span className="text-gray-900 dark:text-white font-medium">{neighborhood.name}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={20} className="text-brand-500" />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Logement à {neighborhood.name}
            </h1>
          </div>
          {neighborhood.seo_description && (
            <p className="text-gray-500 max-w-2xl leading-relaxed">{neighborhood.seo_description}</p>
          )}
          {content && (
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed mt-2">{content.intro}</p>
          )}
          <div className="flex items-center gap-3 mt-3">
            <span className="px-3 py-1 bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 text-sm font-medium rounded-full">
              {listings?.length ?? 0} annonce{(listings?.length ?? 0) > 1 ? 's' : ''} disponible{(listings?.length ?? 0) > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Listings */}
          <div className="lg:col-span-2">
            {(listings?.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-50 dark:bg-gray-900 rounded-3xl">
                <Home size={40} className="text-gray-200 dark:text-gray-700 mb-3" />
                <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Aucune annonce disponible</p>
                <p className="text-sm text-gray-400 mb-4">Soyez le premier à être notifié quand un bien arrive à {neighborhood.name}</p>
                <Link href="/rechercher" className="px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">
                  Voir toutes les annonces
                </Link>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-5">
                {(listings as unknown as Listing[]).map((listing, i) => (
                  <ListingCard key={listing.id} listing={listing} priority={i < 4} />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar — carte + infos quartier */}
          <div className="space-y-5">
            {neighborhood.lat && neighborhood.lng && (
              <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-5 shadow-card">
                <h2 className="font-bold text-gray-900 dark:text-white mb-3">Situation</h2>
                <MapView
                  lat={neighborhood.lat}
                  lng={neighborhood.lng}
                  title={neighborhood.name}
                  zoom={14}
                  height="220px"
                />
              </div>
            )}

            {/* Quartiers voisins */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-5 shadow-card">
              <h2 className="font-bold text-gray-900 dark:text-white mb-3">Quartiers à proximité</h2>
              <div className="space-y-2">
                {getNearbySlugs(slug)
                  .filter(s => s !== slug)
                  .map(s => (
                    <Link
                      key={s}
                      href={`/quartier/${s}`}
                      className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                    >
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                        {s.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <ChevronRight size={14} className="text-gray-300 group-hover:text-brand-500 transition-colors" />
                    </Link>
                  ))}
              </div>
            </div>

            {/* CTA */}
            <div className="bg-brand-500 rounded-3xl p-5 text-white">
              <p className="font-bold mb-1">Vous avez un bien à {neighborhood.name} ?</p>
              <p className="text-white/80 text-sm mb-4">Confiez-le à Habynex. Nous gérons tout — photos, annonce, locataire.</p>
              <a
                href={`https://wa.me/237654888084?text=${encodeURIComponent(`Bonjour, j'ai un bien à ${neighborhood.name} à confier à Habynex.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center py-2.5 bg-white text-brand-600 font-semibold rounded-xl text-sm hover:bg-brand-50 transition-colors"
              >
                Nous contacter →
              </a>
            </div>
          </div>
        </div>

        {/* Contenu détaillé du quartier — pour le SEO et l'information des visiteurs */}
        {content && (
          <div className="mt-12 grid lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-card">
              <h2 className="font-bold text-gray-900 dark:text-white mb-2">Vivre à {neighborhood.name}</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">{content.ambiance}</p>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">Transports</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{content.transport}</p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-card">
              <h2 className="font-bold text-gray-900 dark:text-white mb-2">Prix des loyers à {neighborhood.name}</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">{content.priceRange}</p>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">Idéal pour</h3>
              <div className="flex flex-wrap gap-2">
                {content.goodFor.map((g) => (
                  <span key={g} className="px-3 py-1 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-full">
                    {g}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* FAQ — questions fréquentes sur le quartier */}
        {content && content.faq.length > 0 && (
          <div className="mt-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-card">
            <h2 className="font-bold text-gray-900 dark:text-white mb-4">Questions fréquentes sur {neighborhood.name}</h2>
            <div className="space-y-4">
              {content.faq.map((item) => (
                <div key={item.question}>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{item.question}</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export const revalidate = 3600
