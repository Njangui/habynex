import type { Metadata } from 'next'
import { AddListingForm } from '@/components/agent/AddListingForm'

export const metadata: Metadata = {
  title: 'Publier une annonce — Habynex',
  robots: { index: false, follow: false },
}

export default function NouvelleAnnoncePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-hb-700 dark:text-white mb-1">
        Publier une annonce 🏠
      </h1>
      <p className="text-hb-400 mb-6">Ajoutez un nouveau bien à la plateforme Habynex.</p>
      <AddListingForm />
    </div>
  )
}