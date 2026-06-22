import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'
export const alt = 'Habynex — Immobilier Cameroun'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage() {
  const supabase = await createClient()

  // Quelques stats réelles pour la bannière
  const [{ count: listingsCount }, { count: visitsCount }] = await Promise.all([
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('visit_bookings').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
  ])

  return new ImageResponse(
    (
      <div style={{
        width: 1200, height: 630, display: 'flex',
        background: 'linear-gradient(135deg, #111827 0%, #1c2938 50%, #1a1f2e 100%)',
        fontFamily: 'system-ui, sans-serif', overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Cercle décoratif */}
        <div style={{
          position: 'absolute', right: -100, top: -100,
          width: 500, height: 500, borderRadius: '50%',
          background: '#f95d1e22', border: '1px solid #f95d1e44',
        }} />
        <div style={{
          position: 'absolute', right: 50, bottom: -150,
          width: 300, height: 300, borderRadius: '50%',
          background: '#f95d1e11',
        }} />

        <div style={{
          position: 'relative', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', width: '100%', padding: '60px 80px',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: '#f95d1e', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 30, color: 'white', fontWeight: 900,
            }}>H</div>
            <span style={{ fontSize: 32, fontWeight: 800, color: '#f9fafb', letterSpacing: -0.5 }}>habynex</span>
            <div style={{
              marginLeft: 12, background: '#f95d1e22', border: '1px solid #f95d1e55',
              borderRadius: 99, padding: '6px 16px',
              fontSize: 14, color: '#f95d1e', fontWeight: 600,
            }}>Immobilier Cameroun</div>
          </div>

          {/* Tagline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 58, fontWeight: 900, color: '#f9fafb', lineHeight: 1.1, letterSpacing: -2 }}>
              Trouvez votre
              <br />
              <span style={{ color: '#f95d1e' }}>logement idéal</span>
              <br />
              au Cameroun
            </div>
            <div style={{ fontSize: 22, color: '#9ca3af', fontWeight: 400, maxWidth: 500 }}>
              Annonces vérifiées · Agents certifiés · IA intégrée
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 24 }}>
            {[
              { icon: '🏠', value: `+${(listingsCount ?? 0).toLocaleString()}`, label: 'Annonces actives' },
              { icon: '✅', value: `+${(visitsCount ?? 0).toLocaleString()}`, label: 'Visites réalisées' },
              { icon: '💰', value: '3 000 FCFA', label: 'Par visite terrain' },
              { icon: '📉', value: '−50%', label: 'Sur les commissions' },
            ].map(s => (
              <div key={s.label} style={{
                display: 'flex', flexDirection: 'column', gap: 4,
                background: '#ffffff0a', border: '1px solid #ffffff14',
                borderRadius: 16, padding: '16px 24px', flex: 1,
              }}>
                <span style={{ fontSize: 22 }}>{s.icon}</span>
                <span style={{ fontSize: 26, fontWeight: 800, color: '#f95d1e' }}>{s.value}</span>
                <span style={{ fontSize: 14, color: '#6b7280' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      headers: { 'Cache-Control': 'public, max-age=3600' },
    }
  )
}
