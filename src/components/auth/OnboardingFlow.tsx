'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight, MapPin, Home, DollarSign, Sparkles, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'
import type { UserCriteria } from '@/types'

const LISTING_TYPES = [
  { value: 'apartment', label: 'Appartement', emoji: '🏢' },
  { value: 'studio',    label: 'Studio',      emoji: '🛏️' },
  { value: 'room',      label: 'Chambre',     emoji: '🚪' },
  { value: 'villa',     label: 'Villa',       emoji: '🏡' },
  { value: 'duplex',    label: 'Duplex',      emoji: '🏠' },
  { value: 'commercial',label: 'Commerce',    emoji: '🏪' },
]

const TRANSACTIONS = [
  { value: 'rent',       label: 'Louer',       emoji: '🔑' },
  { value: 'sale',       label: 'Acheter',     emoji: '💰' },
  { value: 'coliving',   label: 'Colocation',  emoji: '👥' },
  { value: 'short_stay', label: 'Court séjour', emoji: '📅' },
  { value: 'furnished',  label: 'Meublé',      emoji: '🛋️' },
]

const NEIGHBORHOODS = [
  { slug: 'simbock',    name: 'Simbock',    desc: 'Quartier calme, proche centre' },
  { slug: 'jouvence',   name: 'Jouvence',   desc: 'Résidentiel, commerces proches' },
  { slug: 'biyem-assi', name: 'Biyem-Assi', desc: 'Bien desservi, animation' },
  { slug: 'tkc',        name: 'TKC',        desc: 'Quartier en développement' },
]

const BUDGETS = [
  { label: '- de 50k',    min: 0,      max: 50000 },
  { label: '50k - 100k',  min: 50000,  max: 100000 },
  { label: '100k - 200k', min: 100000, max: 200000 },
  { label: '200k - 400k', min: 200000, max: 400000 },
  { label: '+ de 400k',   min: 400000, max: 9999999 },
]

const LIFESTYLES = [
  { value: 'étudiant',        label: 'Étudiant(e)',     emoji: '📚' },
  { value: 'jeune professionnel', label: 'Jeune pro',   emoji: '💼' },
  { value: 'famille',         label: 'Famille',         emoji: '👨‍👩‍👧' },
  { value: 'célibataire',     label: 'Célibataire',     emoji: '🧑' },
  { value: 'investisseur',    label: 'Investisseur',    emoji: '📈' },
  { value: 'expatrié',        label: 'Expatrié',        emoji: '🌍' },
]

const PRIORITIES = [
  { value: 'calme',       label: 'Calme',          emoji: '🌿' },
  { value: 'transport',   label: 'Transports',      emoji: '🚌' },
  { value: 'sécurité',    label: 'Sécurité',        emoji: '🔒' },
  { value: 'commerce',    label: 'Commerces proches',emoji: '🛒' },
  { value: 'internet',    label: 'Bonne connexion', emoji: '📶' },
  { value: 'parking',     label: 'Parking',         emoji: '🅿️' },
]

const STEPS = [
  { id: 'welcome',      title: 'Bienvenue 👋',            subtitle: 'Configurons votre espace en 2 minutes' },
  { id: 'lifestyle',    title: 'Qui êtes-vous ?',          subtitle: 'Pour personnaliser vos recommandations' },
  { id: 'type',         title: 'Quel type de bien ?',      subtitle: 'Sélectionnez tout ce qui vous intéresse' },
  { id: 'transaction',  title: 'Vous souhaitez…',          subtitle: 'Louer, acheter ou autre ?' },
  { id: 'neighborhood', title: 'Vos quartiers préférés',   subtitle: 'À Yaoundé pour commencer' },
  { id: 'budget',       title: 'Votre budget',             subtitle: 'En FCFA par mois' },
  { id: 'priorities',   title: 'Vos priorités',            subtitle: 'Ce qui compte le plus pour vous' },
  { id: 'done',         title: 'C\'est parti ! ✨',         subtitle: 'Votre IA est prête' },
]

export function OnboardingFlow() {
  const router = useRouter()
  const { user, profile, setProfile } = useAuthStore()
  const supabase = createClient()

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [criteria, setCriteria] = useState<Partial<UserCriteria & { lifestyle: string; priorities: string[] }>>({
    types: [],
    neighborhood_ids: [],
    neighborhood_names: [],
    priorities: [],
  })

  const next = useCallback(() => setStep(s => Math.min(s + 1, STEPS.length - 1)), [])
  const back = useCallback(() => setStep(s => Math.max(s - 1, 0)), [])

  function toggle<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]
  }

  async function save() {
    if (!user) { router.push('/connexion'); return }
    setSaving(true)
    try {
      const { data } = await supabase
        .from('profiles')
        .update({ criteria: { ...criteria, city_id: undefined, city_name: 'Yaoundé' } })
        .eq('id', user.id)
        .select()
        .single()
      if (data) setProfile(data)
      next()
    } finally {
      setSaving(false)
    }
  }

  const progress = (step / (STEPS.length - 1)) * 100

  if (step === STEPS.length - 1) {
    return (
      <div className="min-h-screen bg-white dark:bg-hb-800 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 bg-brand-50 dark:bg-brand-950 rounded-full flex items-center justify-center mb-6">
          <Sparkles size={36} className="text-brand-500" />
        </div>
        <Image src="/habynex-icon.png" alt="Habynex" width={60} height={60} className="mb-4" />
        <h1 className="text-3xl font-bold text-hb-700 dark:text-white mb-3">Votre IA est prête !</h1>
        <p className="text-hb-400 mb-2 max-w-sm">
          Notre assistant a analysé vos critères. Vous allez recevoir des recommandations ultra-personnalisées.
        </p>
        <p className="text-sm text-hb-300 mb-8">Vous pouvez modifier ces préférences à tout moment dans votre profil.</p>
        <button
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-2 px-8 py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-full text-base transition-all active:scale-[0.97]">
          Découvrir mes annonces <ArrowRight size={18} />
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-hb-800 flex flex-col">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-hb-100 dark:bg-hb-700">
        <div className="h-full bg-brand-500 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-8 pb-4">
        {step > 0 ? (
          <button onClick={back} className="text-sm text-hb-500 hover:text-hb-700 transition-colors font-medium">
            ← Retour
          </button>
        ) : <div />}
        <button onClick={() => router.push('/')} className="text-sm text-hb-400 hover:text-hb-600 transition-colors">
          Passer
        </button>
      </div>

      {/* Contenu */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 max-w-2xl mx-auto w-full">
        <div className="w-full animate-fade-in" key={step}>
          <h1 className="text-2xl md:text-3xl font-bold text-hb-700 dark:text-white mb-1">{STEPS[step].title}</h1>
          <p className="text-hb-400 mb-8">{STEPS[step].subtitle}</p>

          {/* Étape 0 : Welcome */}
          {step === 0 && (
            <div className="text-center space-y-6">
              <Image src="/habynex-icon.png" alt="Habynex" width={80} height={80} className="mx-auto" />
              <div className="space-y-3 text-left">
                {[
                  { emoji: '🤖', text: 'Notre IA sélectionne les biens selon VOS critères exacts' },
                  { emoji: '🏠', text: 'Recommandations dans vos quartiers préférés à Yaoundé' },
                  { emoji: '📱', text: 'Notifications en temps réel quand un bien correspond' },
                ].map(item => (
                  <div key={item.emoji} className="flex items-center gap-3 p-4 bg-hb-50 dark:bg-hb-700 rounded-2xl">
                    <span className="text-2xl">{item.emoji}</span>
                    <p className="text-sm text-hb-600 dark:text-hb-300">{item.text}</p>
                  </div>
                ))}
              </div>
              <button onClick={next}
                className="w-full py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-2xl text-base transition-all active:scale-[0.97]">
                Commencer la configuration ✨
              </button>
            </div>
          )}

          {/* Étape 1 : Lifestyle */}
          {step === 1 && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                {LIFESTYLES.map(l => (
                  <button key={l.value} onClick={() => setCriteria(c => ({ ...c, lifestyle: l.value }))}
                    className={cn('flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all',
                      criteria.lifestyle === l.value
                        ? 'border-hb-700 dark:border-white bg-hb-50 dark:bg-hb-700'
                        : 'border-hb-200 dark:border-hb-600 hover:border-hb-400')}>
                    <span className="text-3xl">{l.emoji}</span>
                    <span className="text-sm font-medium text-hb-700 dark:text-hb-200">{l.label}</span>
                  </button>
                ))}
              </div>
              <button onClick={next} disabled={!criteria.lifestyle}
                className="w-full py-3.5 bg-hb-700 dark:bg-white text-white dark:text-hb-700 font-bold rounded-2xl disabled:opacity-40 transition-all">
                Continuer <ChevronRight className="inline" size={16} />
              </button>
            </div>
          )}

          {/* Étape 2 : Type de bien */}
          {step === 2 && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                {LISTING_TYPES.map(t => {
                  const selected = criteria.types?.includes(t.value as any)
                  return (
                    <button key={t.value}
                      onClick={() => setCriteria(c => ({ ...c, types: toggle(c.types ?? [], t.value as any) }))}
                      className={cn('flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all relative',
                        selected ? 'border-hb-700 dark:border-white bg-hb-50 dark:bg-hb-700' : 'border-hb-200 dark:border-hb-600 hover:border-hb-400')}>
                      {selected && <Check size={14} className="absolute top-2 right-2 text-hb-700 dark:text-white" />}
                      <span className="text-3xl">{t.emoji}</span>
                      <span className="text-sm font-medium text-hb-700 dark:text-hb-200">{t.label}</span>
                    </button>
                  )
                })}
              </div>
              <button onClick={next} disabled={(criteria.types?.length ?? 0) === 0}
                className="w-full py-3.5 bg-hb-700 dark:bg-white text-white dark:text-hb-700 font-bold rounded-2xl disabled:opacity-40 transition-all">
                Continuer <ChevronRight className="inline" size={16} />
              </button>
            </div>
          )}

          {/* Étape 3 : Transaction */}
          {step === 3 && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                {TRANSACTIONS.map(t => (
                  <button key={t.value}
                    onClick={() => setCriteria(c => ({ ...c, transaction: t.value as any }))}
                    className={cn('flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all',
                      criteria.transaction === t.value
                        ? 'border-hb-700 dark:border-white bg-hb-50 dark:bg-hb-700'
                        : 'border-hb-200 dark:border-hb-600 hover:border-hb-400')}>
                    <span className="text-3xl">{t.emoji}</span>
                    <span className="text-sm font-medium text-hb-700 dark:text-hb-200">{t.label}</span>
                  </button>
                ))}
              </div>
              <button onClick={next} disabled={!criteria.transaction}
                className="w-full py-3.5 bg-hb-700 dark:bg-white text-white dark:text-hb-700 font-bold rounded-2xl disabled:opacity-40 transition-all">
                Continuer <ChevronRight className="inline" size={16} />
              </button>
            </div>
          )}

          {/* Étape 4 : Quartiers */}
          {step === 4 && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {NEIGHBORHOODS.map(n => {
                  const sel = criteria.neighborhood_names?.includes(n.name)
                  return (
                    <button key={n.slug}
                      onClick={() => setCriteria(c => ({
                        ...c,
                        neighborhood_names: toggle(c.neighborhood_names ?? [], n.name),
                      }))}
                      className={cn('flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all',
                        sel ? 'border-hb-700 dark:border-white bg-hb-50 dark:bg-hb-700' : 'border-hb-200 dark:border-hb-600 hover:border-hb-400')}>
                      <MapPin size={18} className={sel ? 'text-brand-500' : 'text-hb-400'} />
                      <div>
                        <p className="font-semibold text-sm text-hb-700 dark:text-white">{n.name}</p>
                        <p className="text-xs text-hb-400">{n.desc}</p>
                      </div>
                      {sel && <Check size={16} className="ml-auto text-hb-700 dark:text-white" />}
                    </button>
                  )
                })}
              </div>
              <button onClick={next}
                className="w-full py-3.5 bg-hb-700 dark:bg-white text-white dark:text-hb-700 font-bold rounded-2xl transition-all">
                {(criteria.neighborhood_names?.length ?? 0) > 0 ? 'Continuer' : 'Passer cette étape'}
                <ChevronRight className="inline" size={16} />
              </button>
            </div>
          )}

          {/* Étape 5 : Budget */}
          {step === 5 && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                {BUDGETS.map(b => {
                  const selected = criteria.budget_min === b.min && criteria.budget_max === b.max
                  return (
                    <button key={b.label}
                      onClick={() => setCriteria(c => ({ ...c, budget_min: b.min, budget_max: b.max }))}
                      className={cn('py-4 px-3 rounded-2xl border-2 font-semibold text-sm transition-all',
                        selected ? 'border-hb-700 dark:border-white bg-hb-50 dark:bg-hb-700 text-hb-700 dark:text-white' : 'border-hb-200 dark:border-hb-600 text-hb-500 dark:text-hb-300 hover:border-hb-400')}>
                      {b.label} FCFA
                    </button>
                  )
                })}
              </div>
              <button onClick={next} disabled={criteria.budget_max === undefined}
                className="w-full py-3.5 bg-hb-700 dark:bg-white text-white dark:text-hb-700 font-bold rounded-2xl disabled:opacity-40 transition-all">
                Continuer <ChevronRight className="inline" size={16} />
              </button>
            </div>
          )}

          {/* Étape 6 : Priorités */}
          {step === 6 && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                {PRIORITIES.map(p => {
                  const sel = criteria.priorities?.includes(p.value)
                  return (
                    <button key={p.value}
                      onClick={() => setCriteria(c => ({ ...c, priorities: toggle(c.priorities ?? [], p.value) }))}
                      className={cn('flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all relative',
                        sel ? 'border-hb-700 dark:border-white bg-hb-50 dark:bg-hb-700' : 'border-hb-200 dark:border-hb-600 hover:border-hb-400')}>
                      {sel && <Check size={14} className="absolute top-2 right-2 text-hb-700 dark:text-white" />}
                      <span className="text-2xl">{p.emoji}</span>
                      <span className="text-xs font-medium text-hb-700 dark:text-hb-200 text-center">{p.label}</span>
                    </button>
                  )
                })}
              </div>
              <button onClick={save} disabled={saving}
                className="w-full py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-2xl text-base transition-all active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? (
                  <><div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sauvegarde…</>
                ) : (
                  <>Finaliser mon profil ✨</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Indicateurs de progression */}
      <div className="flex justify-center gap-1.5 pb-8">
        {STEPS.slice(0, -1).map((_, i) => (
          <div key={i} className={cn('rounded-full transition-all',
            i === step ? 'w-5 h-1.5 bg-hb-700 dark:bg-white' : i < step ? 'w-1.5 h-1.5 bg-hb-400' : 'w-1.5 h-1.5 bg-hb-200 dark:bg-hb-600'
          )} />
        ))}
      </div>
    </div>
  )
}
