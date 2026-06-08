'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="text-6xl mb-4">⚠️</div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Une erreur s&apos;est produite</h1>
      <p className="text-gray-500 text-sm mb-6 max-w-xs">
        Quelque chose s&apos;est mal passé. Réessayez ou revenez à l&apos;accueil.
      </p>
      <div className="flex gap-3">
        <button onClick={reset} className="px-5 py-2.5 bg-brand-500 text-white font-medium rounded-xl hover:bg-brand-600 transition-colors text-sm">
          Réessayer
        </button>
        <Link href="/" className="px-5 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl text-sm">
          Accueil
        </Link>
      </div>
    </div>
  )
}
