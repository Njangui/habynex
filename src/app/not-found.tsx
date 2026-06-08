import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-white dark:bg-gray-950">
      <div className="text-8xl mb-6">🏚️</div>
      <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-3">404</h1>
      <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">Page introuvable</p>
      <p className="text-gray-400 text-sm mb-8 max-w-xs">
        Cette annonce n&apos;existe peut-être plus ou l&apos;adresse a changé.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/" className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-colors">
          Retour à l&apos;accueil
        </Link>
        <Link href="/rechercher" className="px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
          Rechercher un logement
        </Link>
      </div>
    </div>
  )
}
