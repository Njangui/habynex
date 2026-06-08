'use client'

import { useState } from 'react'
import { X, Calendar, Phone, Loader2, Check, AlertCircle } from 'lucide-react'
import { formatPrice, cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import toast from 'react-hot-toast'
import type { Listing } from '@/types'

interface BookingModalProps {
  listing: Listing
  onClose: () => void
}

const PRICES: Record<number, number> = { 1: 3000, 2: 5000, 3: 7000 }

export function BookingModal({ listing, onClose }: BookingModalProps) {
  const { user, profile } = useAuthStore()
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details')
  const [nbListings, setNbListings] = useState(1)
  const [phone, setPhone] = useState(profile?.phone?.replace('+237', '') ?? '')
  const [operator, setOperator] = useState<'mtn' | 'orange'>('mtn')
  const [useFreeVisit, setUseFreeVisit] = useState(false)
  const [loading, setLoading] = useState(false)
  const [bookingRef, setBookingRef] = useState('')

  const price = useFreeVisit ? 0 : PRICES[nbListings]
  const hasFreeVisit = (profile?.free_visits_balance ?? 0) > 0

  if (!user) {
    window.location.href = '/connexion'
    return null
  }

  async function handlePay() {
    if (!phone && !useFreeVisit) { toast.error('Entrez votre numéro de téléphone'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/payments/campay/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingIds: [listing.id],
          phoneNumber: `237${phone.replace(/\s/g, '')}`,
          operator,
          isFree: useFreeVisit,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Erreur paiement'); return }

      setBookingRef(data.bookingId)
      setStep('success')
    } catch {
      toast.error('Erreur réseau. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
      <div className="w-full md:max-w-md bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl shadow-2xl animate-slide-up max-h-[88vh] flex flex-col">
        {/* Handle bar mobile */}
        <div className="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-white">
            {step === 'success' ? 'Réservation confirmée !' : 'Réserver une visite'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-6">
        {step === 'success' ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-trust-50 rounded-full flex items-center justify-center mx-auto">
              <Check size={28} className="text-trust-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">Visite réservée avec succès !</p>
              <p className="text-sm text-gray-500">Un agent Habynex va vous contacter très prochainement pour confirmer le créneau.</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-xs text-gray-500 font-mono">
              Réf: {bookingRef.slice(0, 8).toUpperCase()}
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-colors text-sm"
            >
              Fermer
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Bien sélectionné */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Bien à visiter</p>
              <p className="font-medium text-sm text-gray-900 dark:text-white line-clamp-1">{listing.title}</p>
              <p className="text-xs text-brand-500 font-semibold mt-1">{formatPrice(listing.price)}/mois</p>
            </div>

            {/* Nombre de biens */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Combien de biens voulez-vous visiter ?</p>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(n => (
                  <button
                    key={n}
                    onClick={() => setNbListings(n)}
                    className={cn(
                      'py-3 rounded-xl border-2 text-sm font-medium transition-colors',
                      nbListings === n
                        ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                    )}
                  >
                    {n} bien{n > 1 ? 's' : ''}
                    <br />
                    <span className="text-xs font-normal">{useFreeVisit ? 'Gratuit' : `${PRICES[n].toLocaleString()} F`}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Visite gratuite */}
            {hasFreeVisit && (
              <label className="flex items-center gap-3 p-3 bg-trust-50 dark:bg-trust-950/20 rounded-xl cursor-pointer">
                <div
                  onClick={() => setUseFreeVisit(!useFreeVisit)}
                  className={cn(
                    'w-10 h-6 rounded-full transition-colors flex items-center',
                    useFreeVisit ? 'bg-trust-500' : 'bg-gray-200 dark:bg-gray-700'
                  )}
                >
                  <span className={cn('w-4 h-4 bg-white rounded-full shadow transition-transform mx-1', useFreeVisit ? 'translate-x-4' : '')} />
                </div>
                <div>
                  <p className="text-sm font-medium text-trust-700 dark:text-trust-400">Utiliser ma visite gratuite</p>
                  <p className="text-xs text-trust-600 dark:text-trust-500">{profile?.free_visits_balance} visite(s) disponible(s)</p>
                </div>
              </label>
            )}

            {/* Paiement — masqué si visite gratuite */}
            {!useFreeVisit && (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Opérateur de paiement</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['mtn', 'orange'] as const).map(op => (
                      <button
                        key={op}
                        onClick={() => setOperator(op)}
                        className={cn(
                          'py-3 rounded-xl border-2 text-sm font-semibold transition-colors',
                          operator === op
                            ? op === 'mtn' ? 'border-yellow-400 bg-yellow-50 text-yellow-700' : 'border-orange-400 bg-orange-50 text-orange-700'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                        )}
                      >
                        {op === 'mtn' ? '🟡 MTN Money' : '🟠 Orange Money'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Numéro de téléphone
                  </label>
                  <div className="flex">
                    <span className="flex items-center px-3 bg-gray-100 dark:bg-gray-700 border border-r-0 border-gray-200 dark:border-gray-600 rounded-l-xl text-sm text-gray-500">
                      🇨🇲 +237
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="6 XX XX XX XX"
                      className="flex-1 px-4 py-3 rounded-r-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Avertissement paiement — bien visible */}
            <div className="flex gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-800">
              <span className="text-lg flex-shrink-0">⚠️</span>
              <div>
                <p className="text-xs font-bold text-red-700 dark:text-red-400 mb-0.5">Ne payez jamais un agent directement</p>
                <p className="text-xs text-red-600 dark:text-red-300 leading-relaxed">
                  Tous les paiements se font uniquement sur la plateforme. Un pourboire volontaire est possible, mais jamais obligatoire. Les paiements hors plateforme ne sont pas couverts par Habynex.
                </p>
              </div>
            </div>
            {/* Remboursement */}
            <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl">
              <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Les frais de visite vous sont intégralement remboursés en cas d&apos;annonce frauduleuse prouvée.
              </p>
            </div>

            {/* Total + Payer */}
            <div className="space-y-3 pt-1">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Total à payer</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {useFreeVisit ? 'GRATUIT' : `${price.toLocaleString()} FCFA`}
                </span>
              </div>
              <button
                onClick={handlePay}
                disabled={loading || (!useFreeVisit && !phone)}
                className={cn(
                  'w-full py-3.5 rounded-xl font-semibold text-white transition-all text-sm flex items-center justify-center gap-2',
                  loading || (!useFreeVisit && !phone)
                    ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                    : 'bg-brand-500 hover:bg-brand-600 active:scale-[0.98]'
                )}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
                {loading ? 'Traitement...' : useFreeVisit ? 'Confirmer la visite' : `Payer ${price.toLocaleString()} FCFA`}
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
