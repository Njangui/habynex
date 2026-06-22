import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'
export const alt = 'Habynex — Annonce immobilière'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const TRANSACTION_LABELS: Record<string, string> = {
  rent: 'Location', sale: 'Vente', furnished: 'Meublé',
  coliving: 'Colocation', short_stay: 'Court séjour',
}

export default async function OGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: listing } = await supabase
    .from('listings')
    .select(`
      title, price, transaction, type, bedrooms, surface_m2, furnished,
      neighborhood:neighborhoods(name, city:cities(name)),
      media:listing_media(url, is_cover, display_order)
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  // Image de couverture
  const medias = (listing?.media ?? []) as any[]
  const cover = medias.find((m: any) => m.is_cover)?.url
    ?? medias.sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))[0]?.url

  const nbh = Array.isArray(listing?.neighborhood)
    ? (listing?.neighborhood as any[])[0]
    : (listing?.neighborhood as any)
  const city = Array.isArray(nbh?.city) ? nbh?.city[0] : nbh?.city

  const price = listing?.price
    ? `${listing.price.toLocaleString('fr-FR')} FCFA`
    : ''
  const tx = TRANSACTION_LABELS[listing?.transaction ?? ''] ?? ''
  const location = [nbh?.name, city?.name].filter(Boolean).join(', ')

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200, height: 630,
          display: 'flex', flexDirection: 'column',
          background: '#ffffff', position: 'relative',
          fontFamily: 'system-ui, sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* Photo de fond (si disponible) */}
        {cover && (
          <img
            src={cover}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover', opacity: 0.3,
            }}
          />
        )}

        {/* Overlay gradient */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, #111827 0%, #1f2937cc 60%, #f95d1e22 100%)',
        }} />

        {/* Contenu */}
        <div style={{
          position: 'relative', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', height: '100%', padding: '60px 72px',
        }}>

          {/* Header — Logo + badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: '#f95d1e', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 28, color: 'white', fontWeight: 900,
              }}>H</div>
              <span style={{ fontSize: 28, fontWeight: 700, color: '#f9fafb', letterSpacing: -0.5 }}>
                habynex
              </span>
            </div>
            {tx && (
              <div style={{
                background: '#f95d1e', color: 'white',
                borderRadius: 99, padding: '8px 20px',
                fontSize: 18, fontWeight: 700, letterSpacing: 0.3,
              }}>
                {tx}
              </div>
            )}
          </div>

          {/* Titre de l'annonce */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              fontSize: listing?.title && listing.title.length > 60 ? 38 : 46,
              fontWeight: 800, color: '#f9fafb',
              lineHeight: 1.15, letterSpacing: -1,
              maxWidth: 900,
            }}>
              {listing?.title ?? 'Annonce immobilière'}
            </div>

            {/* Localisation */}
            {location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 20, color: '#f95d1e' }}>📍</div>
                <span style={{ fontSize: 22, color: '#d1d5db', fontWeight: 500 }}>{location}</span>
              </div>
            )}

            {/* Caractéristiques */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 8 }}>
              {listing?.bedrooms != null && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: '#ffffff18', borderRadius: 10, padding: '8px 16px',
                }}>
                  <span style={{ fontSize: 18, color: '#9ca3af' }}>🛏</span>
                  <span style={{ fontSize: 18, color: '#e5e7eb', fontWeight: 600 }}>
                    {listing.bedrooms} chambre{listing.bedrooms > 1 ? 's' : ''}
                  </span>
                </div>
              )}
              {listing?.surface_m2 != null && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: '#ffffff18', borderRadius: 10, padding: '8px 16px',
                }}>
                  <span style={{ fontSize: 18, color: '#9ca3af' }}>📐</span>
                  <span style={{ fontSize: 18, color: '#e5e7eb', fontWeight: 600 }}>{listing.surface_m2} m²</span>
                </div>
              )}
              {listing?.furnished && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: '#ffffff18', borderRadius: 10, padding: '8px 16px',
                }}>
                  <span style={{ fontSize: 18, color: '#9ca3af' }}>🛋</span>
                  <span style={{ fontSize: 18, color: '#e5e7eb', fontWeight: 600 }}>Meublé</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer — Prix + CTA */}
          <div style={{
            display: 'flex', alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}>
            <div>
              {price && (
                <>
                  <div style={{ fontSize: 16, color: '#9ca3af', fontWeight: 500, marginBottom: 4 }}>Prix</div>
                  <div style={{ fontSize: 50, fontWeight: 900, color: '#f95d1e', letterSpacing: -2 }}>
                    {price}
                    {listing?.transaction === 'rent' && (
                      <span style={{ fontSize: 22, fontWeight: 500, color: '#6b7280' }}> /mois</span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* CTA */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6,
            }}>
              <div style={{
                background: '#f95d1e', color: 'white',
                borderRadius: 16, padding: '16px 32px',
                fontSize: 20, fontWeight: 700,
              }}>
                Voir l&apos;annonce →
              </div>
              <span style={{ fontSize: 14, color: '#6b7280' }}>habynex.com</span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    }
  )
}
