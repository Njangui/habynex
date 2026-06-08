import Link from 'next/link'
import Image from 'next/image'

const LINKS = {
  plateforme: [
    { href: '/rechercher', label: 'Rechercher un logement' },
    { href: '/devenir-agent', label: 'Devenir agent terrain' },
    { href: '/blog', label: 'Blog immobilier' },
    { href: '/profil?tab=parrainage', label: 'Programme de parrainage' },
  ],
  quartiers: [
    { href: '/quartier/simbock', label: 'Simbock' },
    { href: '/quartier/jouvence', label: 'Jouvence' },
    { href: '/quartier/biyem-assi', label: 'Biyem-Assi' },
    { href: '/quartier/tkc', label: 'TKC' },
  ],
  ressources: [
    { href: '/blog', label: 'Guide du locataire' },
    { href: '/blog', label: 'Guide du propriétaire' },
    { href: '/devenir-agent', label: 'Rejoindre notre équipe' },
    { href: '/#contact', label: 'Nous contacter' },
  ],
  legal: [
    { href: '/mentions-legales', label: 'Mentions légales' },
    { href: '/confidentialite', label: 'Confidentialité' },
    { href: '/cgu', label: 'CGU' },
  ],
}

export function Footer() {
  return (
    <footer className="bg-hb-50 dark:bg-hb-900 border-t border-hb-100 dark:border-hb-800 mt-16">
      <div className="max-w-[1760px] mx-auto px-6 md:px-10 py-12">
        {/* Grille liens */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <h4 className="text-xs font-semibold text-hb-700 dark:text-white uppercase tracking-wider mb-4">
              Plateforme
            </h4>
            <ul className="space-y-3">
              {LINKS.plateforme.map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-hb-500 dark:text-hb-400 hover:text-hb-700 dark:hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-hb-700 dark:text-white uppercase tracking-wider mb-4">
              Quartiers
            </h4>
            <ul className="space-y-3">
              {LINKS.quartiers.map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-hb-500 dark:text-hb-400 hover:text-hb-700 dark:hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-hb-700 dark:text-white uppercase tracking-wider mb-4">
              Ressources
            </h4>
            <ul className="space-y-3">
              {LINKS.ressources.map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-hb-500 dark:text-hb-400 hover:text-hb-700 dark:hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-hb-700 dark:text-white uppercase tracking-wider mb-4">
              Légal
            </h4>
            <ul className="space-y-3">
              {LINKS.legal.map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-hb-500 dark:text-hb-400 hover:text-hb-700 dark:hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Ligne du bas — style Airbnb */}
        <div className="pt-6 border-t border-hb-200 dark:border-hb-700 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/habynex-icon.png" alt="Habynex" width={28} height={28} className="w-7 h-7 object-contain" />
            <span className="text-sm text-hb-500 dark:text-hb-400">
              © {new Date().getFullYear()} Habynex · La première agence immobilière augmentée par l&apos;IA au Cameroun
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Contact */}
            <a href="mailto:contact.habynex@gmail.com"
              className="text-sm text-hb-500 dark:text-hb-400 hover:text-hb-700 dark:hover:text-white transition-colors">
              contact.habynex@gmail.com
            </a>
            <span className="text-hb-200 dark:text-hb-700">·</span>
            <a href="https://wa.me/237654888084" target="_blank" rel="noopener noreferrer"
              className="text-sm text-hb-500 dark:text-hb-400 hover:text-hb-700 dark:hover:text-white transition-colors">
              +237 654 888 084
            </a>
            <span className="text-hb-200 dark:text-hb-700 hidden md:inline">·</span>
            {/* Réseaux */}
            <div className="hidden md:flex items-center gap-3">
              <a href="https://facebook.com/habynex" target="_blank" rel="noopener noreferrer"
                className="text-hb-400 hover:text-hb-700 dark:hover:text-white transition-colors" aria-label="Facebook">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href="https://instagram.com/habynex" target="_blank" rel="noopener noreferrer"
                className="text-hb-400 hover:text-hb-700 dark:hover:text-white transition-colors" aria-label="Instagram">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
