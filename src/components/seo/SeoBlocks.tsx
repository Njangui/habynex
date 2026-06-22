import Link from 'next/link'
import { ALL_SEO_ARTICLES_FINAL } from '@/lib/seo/articles-data'

// ─── Mappers : convertit le nom neighborhood/ville → slug URL réel ──────────
const NEIGHBORHOOD_SLUG: Record<string, string> = {
  'Simbock': 'simbock',
  'Biyem-Assi': 'biyem-assi',
  'Bastos': 'bastos',
  'Jouvence': 'jouvence',
  'TKC': 'tkc',
  'Mvan': 'mvan',
  'Nlongkak': 'nlongkak',
  'Etoudi': 'etoudi',
  'Mvog-Ada': 'mvog-ada',
  'Nsam': 'nsam',
  'Awae': 'awae',
  'Omnisport': 'omnisport',
  'Melen': 'melen',
  'Emana': 'emana',
  'Nkolbisson': 'nkolbisson',
  'Bonanjo': 'bonanjo',
  'Akwa': 'akwa',
  'Bonapriso': 'bonapriso',
  'Makepe': 'makepe',
  'Logbessou': 'logbessou',
  'Kotto': 'kotto',
  'Deido': 'deido',
}

const CITY_SLUG: Record<string, string> = {
  'Bafoussam': 'bafoussam',
  'Garoua': 'garoua',
  'Bamenda': 'bamenda',
  'Ebolowa': 'ebolowa',
  'Maroua': 'maroua',
  'Bertoua': 'bertoua',
  'Ngaoundéré': 'ngaoundere',
  'Kribi': 'kribi',
  'Limbé': 'limbe',
  'Buéa': 'buea',
}

/** Retourne l'URL correcte selon la catégorie de l'article */
function articleUrl(a: { category: string; slug: string; neighborhood?: string; city: string }): string {
  if (a.category === 'guide-quartier' && a.neighborhood && NEIGHBORHOOD_SLUG[a.neighborhood]) {
    return `/quartier/${NEIGHBORHOOD_SLUG[a.neighborhood]}`
  }
  if (a.category === 'ville' && CITY_SLUG[a.city]) {
    return `/ville/${CITY_SLUG[a.city]}`
  }
  // guides-pratiques, proprietaire, habynex → page article blog
  return `/blog/${a.slug}`
}

export function SeoHomeBlocks() {
  const popular = ALL_SEO_ARTICLES_FINAL.filter(a => a.category === 'guide-quartier' && a.city === 'Yaoundé').slice(0, 8)
  const guides = ALL_SEO_ARTICLES_FINAL.filter(a => a.category === 'guide-pratique').slice(0, 6)
  const cities = ALL_SEO_ARTICLES_FINAL.filter(a => a.category === 'ville').slice(0, 6)
  const awae = ALL_SEO_ARTICLES_FINAL.filter(a => a.neighborhood === 'Awae').slice(0, 6)

  return (
    <div className="bg-white dark:bg-hb-800 border-t border-hb-100 dark:border-hb-700 py-14 mt-10">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 space-y-12">

        <div>
          <h2 className="text-lg font-bold text-hb-700 dark:text-white mb-4">Trouver un logement par quartier à Yaoundé</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {popular.map(a => (
              <Link key={a.slug} href={articleUrl(a)}
                className="p-3 bg-hb-50 dark:bg-hb-700 rounded-xl text-sm text-hb-600 dark:text-hb-300 hover:bg-brand-50 dark:hover:bg-brand-950/20 hover:text-brand-600 transition-colors">
                🏘️ {a.neighborhood}
              </Link>
            ))}
          </div>
        </div>

        <div className="p-6 bg-gradient-to-r from-brand-50 to-orange-50 dark:from-brand-950/20 dark:to-orange-950/20 rounded-2xl border border-brand-100 dark:border-brand-900/30">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🆕</span>
            <h2 className="text-lg font-bold text-hb-700 dark:text-white">Awae — Le nouveau quartier prometteur de Yaoundé</h2>
          </div>
          <p className="text-sm text-hb-500 dark:text-hb-300 mb-4">
            Awae est un quartier en plein développement aux portes de Yaoundé. Prix accessibles, cadre verdoyant et fort potentiel d&apos;investissement.
          </p>
          <div className="flex flex-wrap gap-2">
            {awae.map(a => (
              <Link key={a.slug} href={articleUrl(a)}
                className="px-3 py-1.5 bg-white dark:bg-hb-700 rounded-full text-xs text-hb-600 dark:text-hb-300 border border-brand-200 dark:border-brand-800 hover:bg-brand-50 transition-colors">
                {a.title.split('—')[0].trim()}
              </Link>
            ))}
            <Link href="/rechercher?neighborhood=awae" className="px-3 py-1.5 bg-brand-500 text-white rounded-full text-xs font-semibold hover:bg-brand-600 transition-colors">
              Voir tout sur Awae →
            </Link>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-hb-700 dark:text-white mb-4">Guides pratiques immobilier au Cameroun</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {guides.map(a => (
              <Link key={a.slug} href={articleUrl(a)}
                className="flex items-start gap-2 p-3 bg-hb-50 dark:bg-hb-700 rounded-xl hover:bg-brand-50 dark:hover:bg-brand-950/20 transition-colors group">
                <span className="text-base flex-shrink-0">📖</span>
                <span className="text-xs text-hb-600 dark:text-hb-300 group-hover:text-brand-600 leading-relaxed">{a.title}</span>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-hb-700 dark:text-white mb-4">Immobilier dans d&apos;autres villes du Cameroun</h2>
          <div className="flex flex-wrap gap-2">
            {cities.map(a => (
              <Link key={a.slug} href={articleUrl(a)}
                className="px-4 py-2 bg-hb-50 dark:bg-hb-700 rounded-full text-sm text-hb-600 dark:text-hb-300 hover:bg-brand-50 hover:text-brand-600 transition-colors border border-hb-100 dark:border-hb-600">
                📍 {a.city}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-8 pt-6 border-t border-hb-100 dark:border-hb-700">
          <div>
            <h3 className="text-sm font-bold text-hb-600 dark:text-hb-300 mb-3 uppercase tracking-wide">Yaoundé</h3>
            <ul className="space-y-1.5">
              {['simbock', 'biyem-assi', 'jouvence', 'bastos', 'tkc', 'awae'].map(q => (
                <li key={q}><Link href={`/rechercher?neighborhood=${q}`} className="text-xs text-hb-400 hover:text-brand-500 transition-colors capitalize">Appartements {q}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold text-hb-600 dark:text-hb-300 mb-3 uppercase tracking-wide">Types de biens</h3>
            <ul className="space-y-1.5">
              {[
                ['Appartements à louer', '/rechercher?type=apartment&transaction=rent'],
                ['Studios meublés', '/rechercher?type=studio&transaction=furnished'],
                ['Villas à louer', '/rechercher?type=villa&transaction=rent'],
                ['Chambres à louer', '/rechercher?type=room'],
                ['Duplex disponibles', '/rechercher?type=duplex'],
                ['Locaux commerciaux', '/rechercher?type=commercial'],
              ].map(([label, url]) => (
                <li key={url}><Link href={url} className="text-xs text-hb-400 hover:text-brand-500 transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold text-hb-600 dark:text-hb-300 mb-3 uppercase tracking-wide">Ressources</h3>
            <ul className="space-y-1.5">
              {[
                ['Guides locataires', '/blog?category=guide-pratique'],
                ['Conseils propriétaires', '/blog?category=proprietaire'],
                ['Termes et conditions', '/termes'],
                ['Devenir agent', '/devenir-agent'],
                ['Nous contacter', 'https://wa.me/237654888084'],
              ].map(([label, url]) => (
                <li key={url}><Link href={url} className="text-xs text-hb-400 hover:text-brand-500 transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
