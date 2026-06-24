'use client'

/**
 * BookingModal — Réservation de visite(s)
 * L'utilisateur sélectionne 1 à 3 biens PUIS paie tout en une fois.
 * Tarifs : 1 bien = 3000 FCFA, 2 biens = 5000 FCFA, 3 biens = 7000 FCFA
 */

import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  X, Calendar, Phone, Loader2, Check, AlertCircle,
  Plus, Minus, MapPin, BedDouble, Maximize2, ChevronRight,
  ShoppingBag, Tag,
} from 'lucide-react'
import { formatPrice, cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { Listing } from '@/types'

interface BookingModalProps {
  listing: Listing           // Bien principal (déjà sélectionné)
  onClose: () => void
}

const PRICES: Record<number, number> = { 1: 3000, 2: 5000, 3: 7000 }
const MAX_LISTINGS = 3

export function BookingModal({ listing, onClose }: BookingModalProps) {
  const { user, profile } = useAuthStore()
  const supabase = createClient()

  const [step, setStep] = useState<'select' | 'payment' | 'success'>('select')
  const [selectedListings, setSelectedListings] = useState<Listing[]>([listing])
  const [suggestions, setSuggestions] = useState<Listing[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [operator, setOperator] = useState<'mtn' | 'orange'>('mtn')
  const [transactionRef, setTransactionRef] = useState('')
  const [useFreeVisit, setUseFreeVisit] = useState(false)
  const [loading, setLoading] = useState(false)
  const [bookingRef, setBookingRef] = useState('')

  const nbListings = selectedListings.length
  const price = useFreeVisit ? 0 : (PRICES[nbListings] ?? 7000)
  const hasFreeVisit = (profile?.free_visits_balance ?? 0) > 0

  if (!user) { window.location.href = '/connexion'; return null }

  // Charger des suggestions de biens à visiter en même temps
  useEffect(() => {
    loadSuggestions()
  }, [])

  async function loadSuggestions() {
    setSuggestionsLoading(true)
    const nbh = Array.isArray(listing.neighborhood) ? listing.neighborhood[0] : listing.neighborhood as any

    // Chercher des biens similaires dans le même quartier ou même type
    const { data } = await supabase
      .from('listings')
      .select(`
        id, slug, title, type, transaction, price, price_negotiable,
        bedrooms, surface_m2, furnished,
        neighborhood:neighborhoods!listings_neighborhood_id_fkey(name),
        media:listing_media(url, is_cover, display_order)
      `)
      .eq('status', 'published')
      .neq('id', listing.id)
      .or(`neighborhood_id.eq.${listing.neighborhood_id ?? 'none'},type.eq.${listing.type}`)
      .order('view_count', { ascending: false })
      .limit(6)

    setSuggestions((data ?? []) as unknown as Listing[])
    setSuggestionsLoading(false)
  }

  function toggleListing(l: Listing) {
    const isSelected = selectedListings.find(s => s.id === l.id)
    if (isSelected) {
      // Ne pas désélectionner le bien principal
      if (l.id === listing.id) return
      setSelectedListings(prev => prev.filter(s => s.id !== l.id))
    } else {
      if (selectedListings.length >= MAX_LISTINGS) {
        toast.error(`Maximum ${MAX_LISTINGS} biens par visite`)
        return
      }
      setSelectedListings(prev => [...prev, l])
    }
  }

  async function handlePay() {
    if (!useFreeVisit && !transactionRef.trim()) {
      toast.error('Entrez votre référence de transaction MoMo')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/payments/manual/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingIds: selectedListings.map(l => l.id),
          transactionRef: transactionRef.trim(),
          operator,
          isFree: useFreeVisit,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Erreur lors de la soumission'); return }
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
      <div className="w-full md:max-w-lg bg-white dark:bg-hb-800 rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-hb-100 dark:border-hb-700 flex-shrink-0">
          <div>
            <p className="font-bold text-hb-700 dark:text-white text-base">
              {step === 'select' ? '🗓️ Réserver des visites' : step === 'payment' ? '💳 Paiement' : '✅ Confirmée !'}
            </p>
            {step === 'select' && (
              <p className="text-xs text-hb-400 mt-0.5">
                Ajoutez jusqu&apos;à {MAX_LISTINGS} biens — payez en une fois
              </p>
            )}
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full text-hb-400 hover:bg-hb-100 dark:hover:bg-hb-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* ── ÉTAPE 1 : Sélection des biens ── */}
        {step === 'select' && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-5">

              {/* Panier — biens sélectionnés */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingBag size={15} className="text-brand-500" />
                  <p className="text-sm font-bold text-hb-700 dark:text-white">
                    Mes biens à visiter ({nbListings}/{MAX_LISTINGS})
                  </p>
                </div>

                <div className="space-y-2">
                  {selectedListings.map(l => {
                    const cover = l.media?.find(m => m.is_cover)?.url ?? l.media?.[0]?.url
                    const nbh = Array.isArray(l.neighborhood) ? l.neighborhood[0] : l.neighborhood as any
                    return (
                      <div key={l.id} className="flex items-center gap-3 p-3 bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-800/40 rounded-2xl">
                        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-hb-100">
                          {cover
                            ? <Image src={cover} alt="" width={48} height={48} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-xl">🏠</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-hb-700 dark:text-white line-clamp-1">{l.title}</p>
                          <p className="text-xs text-hb-400 flex items-center gap-1 mt-0.5">
                            <MapPin size={9} />{nbh?.name ?? ''}
                          </p>
                          <p className="text-xs font-bold text-brand-500 mt-0.5">{formatPrice(l.price)}</p>
                        </div>
                        {l.id !== listing.id && (
                          <button onClick={() => toggleListing(l)}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-950/30 text-red-400 hover:bg-red-200 transition-colors flex-shrink-0">
                            <X size={13} />
                          </button>
                        )}
                        {l.id === listing.id && (
                          <span className="text-[9px] text-brand-500 font-bold bg-brand-100 dark:bg-brand-950/30 px-2 py-0.5 rounded-full flex-shrink-0">
                            Principal
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Récapitulatif tarif */}
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-green-700 dark:text-green-400">
                      {nbListings === 1 ? '1 bien → 3 000 FCFA' : nbListings === 2 ? '2 biens → 5 000 FCFA (-17%)' : '3 biens → 7 000 FCFA (-22%)'}
                    </span>
                    <span className="text-sm font-bold text-green-700 dark:text-green-400">
                      {useFreeVisit ? 'Gratuit ✅' : formatPrice(price)}
                    </span>
                  </div>
                  {nbListings > 1 && (
                    <p className="text-[10px] text-green-600 dark:text-green-500 mt-0.5">
                      🎉 Économisez {formatPrice(nbListings * 3000 - price)} en groupant vos visites !
                    </p>
                  )}
                </div>
              </div>

              {/* Suggestions à ajouter */}
              {nbListings < MAX_LISTINGS && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Plus size={14} className="text-hb-400" />
                    <p className="text-sm font-semibold text-hb-600 dark:text-hb-300">
                      Ajouter un autre bien à visiter
                    </p>
                    <span className="text-[10px] text-hb-400 ml-auto">+{formatPrice(PRICES[nbListings + 1] - price)}</span>
                  </div>

                  {suggestionsLoading ? (
                    <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-hb-300" /></div>
                  ) : (
                    <div className="space-y-2">
                      {suggestions
                        .filter(s => !selectedListings.find(sel => sel.id === s.id))
                        .slice(0, 4)
                        .map(s => {
                          const cover = s.media?.find(m => m.is_cover)?.url ?? s.media?.[0]?.url
                          const nbh = Array.isArray(s.neighborhood) ? s.neighborhood[0] : s.neighborhood as any
                          return (
                            <button key={s.id} onClick={() => toggleListing(s)}
                              className="w-full flex items-center gap-3 p-3 bg-white dark:bg-hb-700/50 border border-hb-100 dark:border-hb-700 rounded-2xl hover:border-brand-300 dark:hover:border-brand-700 transition-all text-left group">
                              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-hb-100">
                                {cover
                                  ? <Image src={cover} alt="" width={48} height={48} className="w-full h-full object-cover" />
                                  : <div className="w-full h-full flex items-center justify-center text-xl">🏠</div>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-hb-700 dark:text-white line-clamp-1">{s.title}</p>
                                <p className="text-xs text-hb-400 flex items-center gap-1 mt-0.5">
                                  <MapPin size={9} />{nbh?.name ?? ''}
                                  {s.bedrooms != null && <><BedDouble size={9} /> {s.bedrooms} ch.</>}
                                </p>
                                <p className="text-xs font-bold text-brand-500 mt-0.5">{formatPrice(s.price)}</p>
                              </div>
                              <div className="w-7 h-7 flex items-center justify-center rounded-full bg-hb-100 dark:bg-hb-700 group-hover:bg-brand-500 group-hover:text-white text-hb-400 transition-all flex-shrink-0">
                                <Plus size={13} />
                              </div>
                            </button>
                          )
                        })}
                    </div>
                  )}
                </div>
              )}

              {nbListings >= MAX_LISTINGS && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl text-center">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    🎯 Maximum {MAX_LISTINGS} biens atteint — Excellent choix !
                  </p>
                </div>
              )}

              {/* Visite gratuite */}
              {hasFreeVisit && (
                <button
                  onClick={() => setUseFreeVisit(!useFreeVisit)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left',
                    useFreeVisit
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20'
                      : 'border-hb-200 dark:border-hb-700 hover:border-brand-300'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                    useFreeVisit ? 'border-brand-500 bg-brand-500' : 'border-hb-300'
                  )}>
                    {useFreeVisit && <Check size={11} className="text-white" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-hb-700 dark:text-white">
                      🎁 Utiliser ma visite gratuite
                    </p>
                    <p className="text-[10px] text-hb-400 mt-0.5">
                      {profile?.free_visits_balance} visite{(profile?.free_visits_balance ?? 0) > 1 ? 's' : ''} gratuite{(profile?.free_visits_balance ?? 0) > 1 ? 's' : ''} disponible{(profile?.free_visits_balance ?? 0) > 1 ? 's' : ''}
                    </p>
                  </div>
                </button>
              )}
            </div>

            {/* Footer sticky */}
            <div className="sticky bottom-0 p-5 bg-white dark:bg-hb-800 border-t border-hb-100 dark:border-hb-700">
              <button
                onClick={() => setStep('payment')}
                className="w-full py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors text-sm"
              >
                Continuer vers le paiement
                <ChevronRight size={16} />
              </button>
              <p className="text-center text-[10px] text-hb-400 mt-2">
                {nbListings} bien{nbListings > 1 ? 's' : ''} sélectionné{nbListings > 1 ? 's' : ''} · {useFreeVisit ? 'Gratuit' : formatPrice(price)}
              </p>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 2 : Paiement ── */}
        {step === 'payment' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Récapitulatif */}
            <div className="bg-hb-50 dark:bg-hb-700/40 rounded-2xl p-4">
              <p className="text-xs font-semibold text-hb-500 dark:text-hb-300 uppercase tracking-wide mb-3">Récapitulatif</p>
              {selectedListings.map(l => (
                <div key={l.id} className="flex items-center justify-between py-1.5">
                  <p className="text-xs text-hb-600 dark:text-hb-300 line-clamp-1 flex-1 mr-2">{l.title}</p>
                  <p className="text-xs font-semibold text-hb-700 dark:text-white">3 000 FCFA</p>
                </div>
              ))}
              {nbListings > 1 && (
                <div className="flex items-center justify-between py-1.5 border-t border-hb-100 dark:border-hb-700 mt-1">
                  <p className="text-xs text-green-600 dark:text-green-400">Remise groupée</p>
                  <p className="text-xs font-semibold text-green-600 dark:text-green-400">
                    -{formatPrice(nbListings * 3000 - price)}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between py-2 border-t border-hb-200 dark:border-hb-600 mt-1">
                <p className="text-sm font-bold text-hb-700 dark:text-white">Total</p>
                <p className="text-base font-bold text-brand-500">{useFreeVisit ? 'Gratuit' : formatPrice(price)}</p>
              </div>
            </div>

            {!useFreeVisit && (
              <>
                {/* Instructions paiement */}
                <div className="rounded-2xl border-2 border-dashed border-hb-200 dark:border-hb-600 p-4 space-y-3">
                  <p className="text-xs font-bold text-hb-700 dark:text-white uppercase tracking-wide">
                    Étape 1 — Payez {formatPrice(price)} sur l&apos;un de ces numéros
                  </p>

                  {/* Choix opérateur + numéro */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setOperator('mtn')}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all',
                        operator === 'mtn'
                          ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20'
                          : 'border-hb-200 dark:border-hb-600 hover:border-yellow-300'
                      )}>
                      <span className="text-2xl">🟡</span>
                      <span className="text-xs font-bold text-hb-700 dark:text-white">MTN MoMo</span>
                      <span className="text-sm font-mono font-bold text-yellow-700 dark:text-yellow-300">
                        {process.env.NEXT_PUBLIC_MTN_MOMO_NUMBER ?? '6XX XXX XXX'}
                      </span>
                      {operator === 'mtn' && <Check size={14} className="text-yellow-500" />}
                    </button>

                    <button
                      onClick={() => setOperator('orange')}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all',
                        operator === 'orange'
                          ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/20'
                          : 'border-hb-200 dark:border-hb-600 hover:border-orange-300'
                      )}>
                      <span className="text-2xl">🟠</span>
                      <span className="text-xs font-bold text-hb-700 dark:text-white">Orange Money</span>
                      <span className="text-sm font-mono font-bold text-orange-700 dark:text-orange-300">
                        {process.env.NEXT_PUBLIC_ORANGE_MONEY_NUMBER ?? '6XX XXX XXX'}
                      </span>
                      {operator === 'orange' && <Check size={14} className="text-orange-500" />}
                    </button>
                  </div>
                </div>

                {/* Référence transaction */}
                <div>
                  <p className="text-xs font-bold text-hb-700 dark:text-white uppercase tracking-wide mb-2">
                    Étape 2 — Entrez votre référence de transaction
                  </p>
                  <div className="flex items-center gap-2 border-2 border-hb-200 dark:border-hb-600 rounded-2xl px-4 py-3 focus-within:border-brand-500 transition-colors bg-white dark:bg-hb-700">
                    <Phone size={16} className="text-hb-400 flex-shrink-0" />
                    <input
                      value={transactionRef}
                      onChange={e => setTransactionRef(e.target.value.toUpperCase())}
                      placeholder="Ex: CI26061234567"
                      className="flex-1 outline-none bg-transparent text-hb-700 dark:text-white text-sm font-mono"
                    />
                  </div>
                  <p className="text-xs text-hb-400 mt-1.5 ml-1">
                    La référence s&apos;affiche dans votre SMS de confirmation MoMo
                  </p>
                </div>
              </>
            )}

            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl">
              <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Votre réservation sera confirmée sous <strong>30 minutes</strong> après vérification du paiement.
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('select')}
                className="flex-1 py-3.5 border-2 border-hb-200 dark:border-hb-600 text-hb-600 dark:text-hb-300 font-semibold rounded-2xl hover:bg-hb-50 dark:hover:bg-hb-700 transition-colors text-sm">
                Retour
              </button>
              <button
                onClick={handlePay}
                disabled={loading || (!useFreeVisit && !transactionRef.trim())}
                className="flex-1 py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors text-sm">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {loading ? 'Envoi…' : useFreeVisit ? 'Confirmer (Gratuit)' : 'Soumettre le paiement'}
              </button>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 3 : Succès ── */}
        {step === 'success' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
            <div className={cn(
              'w-20 h-20 rounded-full flex items-center justify-center',
              useFreeVisit ? 'bg-green-100 dark:bg-green-950/30' : 'bg-amber-100 dark:bg-amber-950/30'
            )}>
              {useFreeVisit
                ? <Check size={36} className="text-green-500" />
                : <AlertCircle size={36} className="text-amber-500" />}
            </div>
            <div>
              <p className="text-xl font-bold text-hb-700 dark:text-white mb-1">
                {useFreeVisit ? 'Visite confirmée !' : 'Demande envoyée !'}
              </p>
              <p className="text-sm text-hb-400">
                {nbListings} bien{nbListings > 1 ? 's' : ''} · Réf: <strong className="font-mono text-hb-600 dark:text-white">{bookingRef?.slice(0, 8).toUpperCase()}</strong>
              </p>
            </div>
            <p className="text-xs text-hb-400 bg-hb-50 dark:bg-hb-700 rounded-xl px-4 py-3">
              {useFreeVisit
                ? 'Un agent Habynex vous contactera dans les 24h pour fixer les rendez-vous. 📞'
                : '⏳ Nous vérifions votre paiement MoMo. Vous recevrez une confirmation dans les 30 minutes.'}
            </p>
            {selectedListings.map(l => (
              <div key={l.id} className="w-full text-left p-3 bg-brand-50 dark:bg-brand-950/20 rounded-xl">
                <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 line-clamp-1">{l.title}</p>
              </div>
            ))}
            <button onClick={onClose}
              className="w-full py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-2xl transition-colors">
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}