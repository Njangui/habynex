'use client'

/**
 * Formulaire d'ajout d'annonce par un agent
 * L'IA enrichit la description → envoyé en attente de validation admin
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { ImageUploader } from '@/components/ui/ImageUploader'
import { Loader2, CheckCircle2, Sparkles, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const TYPES = [
  { value: 'apartment', label: 'Appartement' },
  { value: 'studio', label: 'Studio' },
  { value: 'room', label: 'Chambre' },
  { value: 'villa', label: 'Villa' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'commercial', label: 'Local commercial' },
]

const TRANSACTIONS = [
  { value: 'rent', label: 'Location' },
  { value: 'sale', label: 'Vente' },
  { value: 'furnished', label: 'Meublé' },
  { value: 'coliving', label: 'Colocation' },
  { value: 'short_stay', label: 'Court séjour' },
]

const NEIGHBORHOODS = [
  'Simbock', 'Biyem-Assi', 'Jouvence', 'Bastos', 'TKC', 'Mvan',
  'Nlongkak', 'Etoudi', 'Mvog-Ada', 'Nsam', 'Awae', 'Nkol-Eton',
  'Omnisport', 'Melen', 'Emana', 'Nkolbisson', 'Odza', 'Essos',
]

export function AddListingForm() {
  const supabase = createClient()
  const { user, profile } = useAuthStore()
  const router = useRouter()

  const [step, setStep] = useState<'form' | 'ai' | 'done'>('form')
  const [photos, setPhotos] = useState<File[]>([])
  const [aiDescription, setAiDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    title: '',
    type: '',
    transaction: '',
    price: '',
    neighborhood: '',
    address_hint: '',
    bedrooms: '',
    bathrooms: '',
    surface_m2: '',
    furnished: false,
    description_raw: '',
    amenities: {
      wifi: false, parking: false, security: false,
      water_24h: false, electricity: false, generator: false,
    },
  })

  function set(key: string, val: any) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function enrichWithAI() {
    if (!form.type || !form.transaction || !form.neighborhood || !form.price) {
      toast.error('Remplissez au moins le type, transaction, quartier et prix')
      return
    }
    setStep('ai')
    try {
      const prompt = `Tu es un expert en immobilier au Cameroun. Rédige une description professionnelle, attrayante et précise pour cette annonce immobilière en français camerounais. Sois concis (3-4 phrases max) mais accrocheur.

Informations :
- Type : ${form.type}
- Transaction : ${form.transaction}
- Quartier : ${form.neighborhood}, Yaoundé
- Prix : ${form.price} FCFA
- Chambres : ${form.bedrooms || 'non précisé'}
- Salles de bain : ${form.bathrooms || 'non précisé'}
- Surface : ${form.surface_m2 || 'non précisée'} m²
- Meublé : ${form.furnished ? 'Oui' : 'Non'}
- Description brute de l'agent : ${form.description_raw || 'Aucune'}
- Équipements : ${Object.entries(form.amenities).filter(([,v]) => v).map(([k]) => k).join(', ') || 'standard'}

Rédige uniquement la description, sans titre ni introduction.`

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          listingContext: null,
          conversationId: null,
        }),
      })
      const data = await res.json()
      const text = data.reply ?? data.message ?? ''
      setAiDescription(text)
    } catch {
      toast.error('Erreur IA — vous pouvez continuer sans enrichissement')
      setAiDescription(form.description_raw)
    }
  }

  async function submitListing() {
    if (!user) { toast.error('Connectez-vous'); return }
    setSubmitting(true)
    try {
      // 1. Trouver le neighborhood_id
      const neighborhoodSlug = form.neighborhood.toLowerCase().replace(/\s+/g, '-')
      const { data: nbh } = await supabase
        .from('neighborhoods').select('id').eq('slug', neighborhoodSlug).maybeSingle()
      const neighborhoodId = nbh?.id ?? null

      // 2. Créer l'annonce en statut 'pending'
      const slug = `${form.type}-${form.neighborhood.toLowerCase().replace(/\s+/g, '-')}-${form.price}-fcfa-${Date.now().toString().slice(-6)}`
      const { data: listing, error } = await supabase.from('listings').insert({
        title: form.title || `${form.type} à ${form.neighborhood}`,
        slug,
        type: form.type,
        transaction: form.transaction,
        price: parseInt(form.price),
        neighborhood_id: neighborhoodId,
        address_hint: form.address_hint || null,
        bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
        bathrooms: form.bathrooms ? parseInt(form.bathrooms) : null,
        surface_m2: form.surface_m2 ? parseFloat(form.surface_m2) : null,
        furnished: form.furnished,
        description: aiDescription || form.description_raw,
        amenities: form.amenities,
        status: 'pending', // En attente validation admin
        ai_generated: true,
        agent_id: user.id,
      }).select('id').single()

      if (error) throw error

      // 3. Uploader les photos
      if (photos.length > 0 && listing) {
        await Promise.all(photos.map(async (photo, i) => {
          const path = `${listing.id}/${Date.now()}-${i}.webp`
          const { data: upload } = await supabase.storage
            .from('listing-media').upload(path, photo, { upsert: true })
          if (upload) {
            const { data: { publicUrl } } = supabase.storage
              .from('listing-media').getPublicUrl(path)
            await supabase.from('listing_media').insert({
              listing_id: listing.id,
              url: publicUrl,
              type: 'image',
              is_cover: i === 0,
              display_order: i,
            })
          }
        }))
      }

      setStep('done')
      toast.success('Annonce envoyée pour validation !')
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur lors de la soumission')
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'done') {
    return (
      <div className="text-center py-16 space-y-4">
        <CheckCircle2 size={56} className="text-green-500 mx-auto" />
        <h2 className="text-xl font-bold text-hb-700 dark:text-white">Annonce soumise avec succès !</h2>
        <p className="text-sm text-hb-400 max-w-sm mx-auto">
          Votre annonce est en attente de validation par l'équipe Habynex.
          Elle apparaîtra sur le site une fois approuvée, généralement sous 24h.
        </p>
        <button onClick={() => { setStep('form'); setForm({ title: '', type: '', transaction: '', price: '', neighborhood: '', address_hint: '', bedrooms: '', bathrooms: '', surface_m2: '', furnished: false, description_raw: '', amenities: { wifi: false, parking: false, security: false, water_24h: false, electricity: false, generator: false } }); setPhotos([]); setAiDescription('') }}
          className="px-6 py-3 bg-brand-500 text-white rounded-full font-semibold text-sm hover:bg-brand-600 transition-colors">
          Ajouter une autre annonce
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-xl font-bold text-hb-700 dark:text-white flex items-center gap-2">
          <Sparkles size={20} className="text-brand-500" />
          Ajouter une annonce
        </h2>
        <p className="text-sm text-hb-400 mt-1">L'IA Habynex enrichira automatiquement votre description avant soumission.</p>
      </div>

      {/* Infos de base */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Titre de l'annonce (optionnel)</Label>
          <Input placeholder="Ex: Beau studio meublé à Simbock" value={form.title} onChange={e => set('title', e.target.value)} />
        </div>
        <div>
          <Label>Type de bien *</Label>
          <Select value={form.type} onChange={e => set('type', e.target.value)}>
            <option value="">Choisir...</option>
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </div>
        <div>
          <Label>Transaction *</Label>
          <Select value={form.transaction} onChange={e => set('transaction', e.target.value)}>
            <option value="">Choisir...</option>
            {TRANSACTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </div>
        <div>
          <Label>Quartier *</Label>
          <Select value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)}>
            <option value="">Choisir...</option>
            {NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
          </Select>
        </div>
        <div>
          <Label>Prix (FCFA) *</Label>
          <Input type="number" placeholder="Ex: 65000" value={form.price} onChange={e => set('price', e.target.value)} />
        </div>
        <div className="col-span-2">
          <Label>Adresse approximative</Label>
          <Input placeholder="Ex: Près de l'école publique de Simbock" value={form.address_hint} onChange={e => set('address_hint', e.target.value)} />
        </div>
        <div>
          <Label>Chambres</Label>
          <Input type="number" min="0" placeholder="0" value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)} />
        </div>
        <div>
          <Label>Salles de bain</Label>
          <Input type="number" min="0" placeholder="0" value={form.bathrooms} onChange={e => set('bathrooms', e.target.value)} />
        </div>
        <div>
          <Label>Surface (m²)</Label>
          <Input type="number" min="0" placeholder="Ex: 35" value={form.surface_m2} onChange={e => set('surface_m2', e.target.value)} />
        </div>
        <div className="flex items-center gap-3 pt-6">
          <input type="checkbox" id="furnished" checked={form.furnished} onChange={e => set('furnished', e.target.checked)}
            className="w-4 h-4 rounded border-hb-300 text-brand-500" />
          <label htmlFor="furnished" className="text-sm font-medium text-hb-600 dark:text-hb-300 cursor-pointer">Meublé</label>
        </div>
      </div>

      {/* Équipements */}
      <div>
        <Label>Équipements disponibles</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
          {[
            { key: 'wifi', label: '📶 Wi-Fi' },
            { key: 'parking', label: '🚗 Parking' },
            { key: 'security', label: '🔒 Sécurité' },
            { key: 'water_24h', label: '💧 Eau 24h/24' },
            { key: 'electricity', label: '⚡ Électricité' },
            { key: 'generator', label: '🔋 Groupe électrogène' },
          ].map(a => (
            <label key={a.key} className={cn('flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors text-sm',
              (form.amenities as any)[a.key]
                ? 'border-brand-400 bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-300'
                : 'border-hb-200 dark:border-hb-600 text-hb-500 hover:border-hb-300'
            )}>
              <input type="checkbox" checked={(form.amenities as any)[a.key]}
                onChange={e => set('amenities', { ...form.amenities, [a.key]: e.target.checked })}
                className="hidden" />
              {a.label}
            </label>
          ))}
        </div>
      </div>

      {/* Description brute */}
      <div>
        <Label>Description brute (l'IA va l'enrichir)</Label>
        <textarea value={form.description_raw} onChange={e => set('description_raw', e.target.value)}
          placeholder="Décrivez le bien en quelques mots simples. L'IA se chargera d'en faire une belle description..."
          rows={4}
          className="w-full px-4 py-3 border border-hb-200 dark:border-hb-600 rounded-2xl text-sm bg-white dark:bg-hb-800 outline-none focus:border-brand-400 resize-none text-hb-600 dark:text-hb-200 placeholder:text-hb-300"
        />
      </div>

      {/* Photos */}
      <div>
        <Label>Photos du bien</Label>
        <ImageUploader maxFiles={10} maxSizeKB={400} onFilesReady={setPhotos} label="Ajouter des photos (compression automatique)" />
      </div>

      {/* Description IA générée */}
      {aiDescription && (
        <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-purple-500" />
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400">Description enrichie par l'IA</span>
          </div>
          <textarea value={aiDescription} onChange={e => setAiDescription(e.target.value)}
            rows={4}
            className="w-full bg-transparent text-sm text-purple-700 dark:text-purple-300 outline-none resize-none"
          />
          <p className="text-xs text-purple-400 mt-1">Vous pouvez modifier cette description avant de soumettre.</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {step === 'form' && (
          <button onClick={enrichWithAI}
            className="flex-1 py-3.5 border-2 border-brand-400 text-brand-600 dark:text-brand-400 font-semibold rounded-2xl hover:bg-brand-50 dark:hover:bg-brand-950/20 transition-colors flex items-center justify-center gap-2">
            <Sparkles size={17} />
            Enrichir avec l'IA
          </button>
        )}
        <button onClick={submitListing} disabled={submitting || !form.type || !form.transaction || !form.price || !form.neighborhood}
          className="flex-1 py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-40">
          {submitting ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}
          Soumettre pour validation
        </button>
      </div>

      <p className="text-xs text-center text-hb-300">
        ⚠️ L'annonce sera visible sur le site uniquement après validation par l'équipe Habynex.
      </p>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-hb-600 dark:text-hb-300 mb-1.5">{children}</label>
}
function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props} className={cn('w-full px-4 py-2.5 border border-hb-200 dark:border-hb-600 rounded-xl text-sm bg-white dark:bg-hb-800 outline-none focus:border-brand-400 text-hb-600 dark:text-hb-200 placeholder:text-hb-300', className)} />
  )
}
function Select({ children, className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn('w-full px-4 py-2.5 border border-hb-200 dark:border-hb-600 rounded-xl text-sm bg-white dark:bg-hb-800 outline-none focus:border-brand-400 text-hb-600 dark:text-hb-200', className)}>
      {children}
    </select>
  )
}
