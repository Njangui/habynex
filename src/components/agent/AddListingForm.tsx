'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { ImageUploader } from '@/components/ui/ImageUploader'
import { useRecommendations } from '@/hooks/useRecommendations'
import {
  Loader2, CheckCircle2, Sparkles, MapPin, Navigation,
  ChevronDown, ChevronUp, Info, Zap
} from 'lucide-react'
import { cn, formatPrice } from '@/lib/utils'
import toast from 'react-hot-toast'

// ─── Constantes ───────────────────────────────────────────────────────────────
const TYPES = [
  { value: 'apartment', label: '🏢 Appartement' },
  { value: 'studio',    label: '🛋️ Studio' },
  { value: 'room',      label: '🛏️ Chambre' },
  { value: 'villa',     label: '🏡 Villa' },
  { value: 'duplex',    label: '🏠 Duplex' },
  { value: 'commercial',label: '🏪 Local commercial' },
]

const TRANSACTIONS = [
  { value: 'rent',       label: '🔑 Location' },
  { value: 'sale',       label: '💰 Vente' },
  { value: 'furnished',  label: '🛋️ Meublé' },
  { value: 'coliving',   label: '👥 Colocation' },
  { value: 'short_stay', label: '📅 Court séjour' },
]

const NEIGHBORHOODS_YAOUNDE = [
  'Simbock', 'Biyem-Assi', 'Jouvence', 'Bastos', 'TKC', 'Mvan',
  'Nlongkak', 'Etoudi', 'Mvog-Ada', 'Nsam', 'Awae', 'Nkol-Eton',
  'Omnisport', 'Melen', 'Emana', 'Nkolbisson', 'Odza', 'Essos',
  'Mendong', 'Mimboman', 'Ekounou', 'Carrière', 'Tsinga', 'Kondengui',
  'Centre-ville', 'Mbankolo', 'Mfandena', 'Nkoldongo', 'Autre',
]

const AMENITIES = [
  { key: 'wifi',          label: '📶 Wi-Fi' },
  { key: 'parking',       label: '🚗 Parking' },
  { key: 'security',      label: '🔒 Gardiennage' },
  { key: 'water_24h',     label: '💧 Eau 24h/24' },
  { key: 'electricity',   label: '⚡ Électricité AES' },
  { key: 'generator',     label: '🔋 Groupe électrogène' },
  { key: 'air_conditioning', label: '❄️ Climatisation' },
  { key: 'garden',        label: '🌿 Jardin' },
  { key: 'terrace',       label: '🏞️ Terrasse/Véranda' },
]

// Centre Yaoundé par défaut
const DEFAULT_LAT = 3.8667
const DEFAULT_LNG = 11.5167

// ─── Composant principal ──────────────────────────────────────────────────────
export function AddListingForm() {
  const supabase = createClient()
  const { user, profile } = useAuthStore()
  const router = useRouter()
  const { invalidateCache } = useRecommendations()

  const [step, setStep] = useState<'form' | 'ai' | 'done'>('form')
  const [photos, setPhotos] = useState<File[]>([])
  const [aiDescription, setAiDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [canAutoPublish, setCanAutoPublish] = useState(false)
  const [loadingGPS, setLoadingGPS] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({
    title: '',
    type: '',
    transaction: '',
    price: '',
    price_negotiable: false,
    neighborhood: '',
    address_hint: '',
    bedrooms: '',
    bathrooms: '',
    surface_m2: '',
    floor: '',
    furnished: false,
    description_raw: '',
    owner_name: '',
    owner_phone: '',
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
    amenities: {
      wifi: false, parking: false, security: false,
      water_24h: false, electricity: false, generator: false,
      air_conditioning: false, garden: false, terrace: false,
    },
  })

  // ── Vérifier si l'agent peut publier directement ──
  useEffect(() => {
    if (!user) return
    supabase.from('agents').select('can_auto_publish').eq('id', user.id).single()
      .then(({ data }) => setCanAutoPublish(!!data?.can_auto_publish))
  }, [user])

  // ── Charger Leaflet dynamiquement ──
  useEffect(() => {
    if (typeof window === 'undefined') return
    if ((window as any).L) { setMapReady(true); return }
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => setMapReady(true)
    document.head.appendChild(script)
  }, [])

  // ── Initialiser la carte Leaflet ──
  useEffect(() => {
    if (!mapReady || !mapContainerRef.current || mapRef.current) return
    const L = (window as any).L
    const map = L.map(mapContainerRef.current, { zoomControl: true }).setView([form.lat, form.lng], 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map)

    const icon = L.divIcon({
      html: `<div style="width:28px;height:28px;background:#f95d1e;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
      iconSize: [28, 28], iconAnchor: [14, 28],
    })
    const marker = L.marker([form.lat, form.lng], { icon, draggable: true }).addTo(map)
    marker.on('dragend', (e: any) => {
      const pos = e.target.getLatLng()
      setForm(prev => ({ ...prev, lat: pos.lat, lng: pos.lng }))
    })
    map.on('click', (e: any) => {
      marker.setLatLng(e.latlng)
      setForm(prev => ({ ...prev, lat: e.latlng.lat, lng: e.latlng.lng }))
    })
    mapRef.current = map
    markerRef.current = marker
  }, [mapReady])

  // ── Mettre à jour le marker quand lat/lng change ──
  useEffect(() => {
    if (!markerRef.current || !mapRef.current) return
    markerRef.current.setLatLng([form.lat, form.lng])
    mapRef.current.panTo([form.lat, form.lng])
  }, [form.lat, form.lng])

  function set(key: string, val: any) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  // ── Géolocalisation GPS ──
  function useMyLocation() {
    if (!navigator.geolocation) { toast.error('GPS non disponible'); return }
    setLoadingGPS(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(prev => ({ ...prev, lat: pos.coords.latitude, lng: pos.coords.longitude }))
        toast.success('Position GPS utilisée ✓')
        setLoadingGPS(false)
      },
      () => { toast.error('Impossible d\'obtenir votre position'); setLoadingGPS(false) }
    )
  }

  // ── Enrichissement IA ──
  async function enrichWithAI() {
    if (!form.type || !form.transaction || !form.neighborhood || !form.price) {
      toast.error('Remplissez le type, transaction, quartier et prix')
      return
    }
    setStep('ai')
    try {
      const amenitiesList = Object.entries(form.amenities)
        .filter(([, v]) => v).map(([k]) => k).join(', ') || 'standard'

      const prompt = `Tu es un expert en immobilier au Cameroun. Rédige une description professionnelle et attrayante (3-4 phrases) pour cette annonce en français.\n\nBien : ${form.type} - ${form.transaction} - ${form.neighborhood}, Yaoundé\nPrix : ${parseInt(form.price).toLocaleString()} FCFA${form.price_negotiable ? ' (négociable)' : ''}\nChambres: ${form.bedrooms || '?'} | Salles de bain: ${form.bathrooms || '?'} | Surface: ${form.surface_m2 || '?'}m² | Étage: ${form.floor || 'RDC'}\nMeublé: ${form.furnished ? 'Oui' : 'Non'} | Équipements: ${amenitiesList}\nProprietaire: ${form.owner_name || 'N/A'}\nDescription brute: ${form.description_raw || 'Aucune'}\n\nRédige uniquement la description, sans titre.`

      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, listingContext: null, conversationId: null }),
      })
      const data = await res.json()
      setAiDescription(data.reply ?? data.message ?? form.description_raw)
    } catch {
      toast.error('Erreur IA — vous pouvez continuer sans enrichissement')
      setAiDescription(form.description_raw)
    }
  }

  // ── Génération FAQ (fire-and-forget) ──
  async function triggerFaqGeneration(listingId: string) {
    fetch('/api/ai/generate-faq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId }),
    }).catch(err => console.warn('[FAQ] génération échouée (non-critique):', err))
  }

  // ── Soumission ──
  async function submitListing() {
    if (!user) { toast.error('Connectez-vous'); return }
    if (!form.type || !form.transaction || !form.price || !form.neighborhood) {
      toast.error('Remplissez les champs obligatoires'); return
    }

    setSubmitting(true)
    try {
      // 1. Trouver neighborhood_id
      const slug = form.neighborhood.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-')
      const { data: nbh } = await supabase.from('neighborhoods').select('id').eq('slug', slug).maybeSingle()
      const neighborhoodId = nbh?.id ?? null

      // 2. Statut selon permission
      const status = canAutoPublish ? 'published' : 'pending_review'
      const published_at = canAutoPublish ? new Date().toISOString() : null
      const published_by = canAutoPublish ? user.id : null

      const listingSlug = `${form.type}-${form.neighborhood.toLowerCase().replace(/\s+/g, '-')}-${form.price}-${Date.now().toString().slice(-6)}`

      const { data: listing, error } = await supabase.from('listings').insert({
        title: form.title || `${TYPES.find(t=>t.value===form.type)?.label?.replace(/[^\w\s]/g,'').trim() ?? form.type} à ${form.neighborhood}`,
        slug: listingSlug,
        type: form.type,
        transaction: form.transaction,
        price: parseInt(form.price),
        price_negotiable: form.price_negotiable,
        neighborhood_id: neighborhoodId,
        address_hint: form.address_hint || null,
        lat: form.lat,
        lng: form.lng,
        bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
        bathrooms: form.bathrooms ? parseInt(form.bathrooms) : null,
        surface_m2: form.surface_m2 ? parseFloat(form.surface_m2) : null,
        floor: form.floor ? parseInt(form.floor) : null,
        furnished: form.furnished,
        description: aiDescription || form.description_raw || null,
        amenities: form.amenities,
        status,
        published_at,
        published_by,
        ai_generated: !!aiDescription,
        owner_name: form.owner_name || null,
        owner_phone: form.owner_phone || null,
        submitted_by_agent: user.id,
      }).select('id, slug').single()

      if (error) throw error

      // 3. Upload photos — séquentiel pour éviter les collisions de noms de fichiers
      // ⚠️ NE PAS utiliser Promise.all ici : Date.now() retourne le même timestamp
      // pour toutes les photos simultanées → collision → images écrasées
      if (photos.length > 0 && listing) {
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i]
          const uniqueSuffix = `${i}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
          const path = `${listing.id}/${uniqueSuffix}.webp`

          const { data: upload, error: uploadError } = await supabase.storage
            .from('listing-media')
            .upload(path, photo, { upsert: true, contentType: 'image/webp' })

          if (uploadError) {
            console.error(`Upload photo ${i + 1} échoué:`, uploadError.message)
            continue
          }

          if (upload) {
            const { data: { publicUrl } } = supabase.storage
              .from('listing-media')
              .getPublicUrl(path)

            const { error: insertError } = await supabase.from('listing_media').insert({
              listing_id: listing.id,
              url: publicUrl,
              type: 'image',
              is_cover: i === 0,
              display_order: i,
            })
            if (insertError) console.error(`Insert media ${i + 1} échoué:`, insertError.message)
          }
        }
      }

      // 4. Notifications
      if (canAutoPublish) {
        // Notifier l'agent que son annonce est publiée
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: '🏠 Annonce publiée !',
          body: `Votre annonce "${form.title || `${form.type} à ${form.neighborhood}`}" est maintenant visible sur Habynex.`,
          action_url: `/bien/${listing.slug}`,
          channel: 'in_app',
        })
      } else {
        // Notifier les admins
        const { data: admins } = await supabase.from('user_roles').select('user_id').in('role', ['admin', 'super_admin'])
        if (admins?.length) {
          await supabase.from('notifications').insert(
            admins.map((a: { user_id: string }) => ({
              user_id: a.user_id,
              title: '🏠 Nouvelle annonce à valider',
              body: `${profile?.full_name ?? 'Un agent'} a soumis : ${form.type} à ${form.neighborhood} — ${parseInt(form.price).toLocaleString()} FCFA`,
              action_url: `${process.env.NEXT_PUBLIC_ADMIN_URL ?? ''}/annonces`,
              channel: 'in_app',
            }))
          )
        }
        // Notifier l'agent que sa demande est en attente
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: '⏳ Annonce en cours de validation',
          body: `Votre annonce "${form.type} à ${form.neighborhood}" est en attente de validation (sous 24h).`,
          channel: 'in_app',
        })
      }

      triggerFaqGeneration(listing.id)
      // Le pool de recommandations en cache (localStorage + Zustand) est
      // maintenant périmé puisqu'une nouvelle annonce vient d'être ajoutée.
      invalidateCache()
      setStep('done')
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur lors de la soumission')
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setStep('form')
    setAiDescription('')
    setPhotos([])
    setForm({
      title: '', type: '', transaction: '', price: '', price_negotiable: false,
      neighborhood: '', address_hint: '', bedrooms: '', bathrooms: '',
      surface_m2: '', floor: '', furnished: false, description_raw: '',
      owner_name: '', owner_phone: '', lat: DEFAULT_LAT, lng: DEFAULT_LNG,
      amenities: { wifi:false, parking:false, security:false, water_24h:false, electricity:false, generator:false, air_conditioning:false, garden:false, terrace:false },
    })
    if (markerRef.current) markerRef.current.setLatLng([DEFAULT_LAT, DEFAULT_LNG])
    if (mapRef.current) mapRef.current.setView([DEFAULT_LAT, DEFAULT_LNG], 13)
  }

  // ── Page "done" ──
  if (step === 'done') {
    return (
      <div className="text-center py-16 space-y-5 max-w-sm mx-auto">
        <div className="text-5xl">{canAutoPublish ? '🚀' : '📤'}</div>
        <CheckCircle2 size={56} className={cn('mx-auto', canAutoPublish ? 'text-brand-500' : 'text-green-500')} />
        <h2 className="text-xl font-bold text-hb-700 dark:text-white">
          {canAutoPublish ? 'Annonce publiée !' : 'Annonce soumise avec succès !'}
        </h2>
        <p className="text-sm text-hb-400">
          {canAutoPublish
            ? 'Votre annonce est maintenant visible sur Habynex. Vous pouvez la retrouver dans "Mes annonces".'
            : 'Votre annonce est en attente de validation. Elle sera visible sous 24h après approbation.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={resetForm}
            className="px-5 py-2.5 bg-brand-500 text-white rounded-full font-semibold text-sm hover:bg-brand-600 transition-colors">
            + Nouvelle annonce
          </button>
          <button onClick={() => router.push('/agent-dashboard')}
            className="px-5 py-2.5 border-2 border-hb-200 dark:border-hb-600 text-hb-600 dark:text-hb-300 rounded-full font-semibold text-sm hover:bg-hb-50 dark:hover:bg-hb-700 transition-colors">
            Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-7 pb-16">

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-hb-700 dark:text-white flex items-center gap-2">
          <Sparkles size={20} className="text-brand-500" />
          Ajouter une annonce
        </h2>
        <p className="text-sm text-hb-400 mt-1">L'IA Habynex enrichira automatiquement votre description avant soumission.</p>
        {canAutoPublish && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-800 rounded-xl">
            <Zap size={14} className="text-brand-500 flex-shrink-0" />
            <p className="text-xs text-brand-600 dark:text-brand-400 font-medium">
              Publication directe activée — vos annonces seront publiées immédiatement sans validation.
            </p>
          </div>
        )}
      </div>

      {/* ── Section 1 : Informations de base ── */}
      <FormSection title="📋 Informations de base">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Titre de l'annonce</Label>
            <Input placeholder="Ex: Beau studio meublé climatisé à Simbock" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div>
            <Label required>Type de bien</Label>
            <Select value={form.type} onChange={e => set('type', e.target.value)}>
              <option value="">Choisir...</option>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </div>
          <div>
            <Label required>Transaction</Label>
            <Select value={form.transaction} onChange={e => set('transaction', e.target.value)}>
              <option value="">Choisir...</option>
              {TRANSACTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </div>
          <div>
            <Label required>Prix (FCFA)</Label>
            <Input type="number" placeholder="Ex: 65000" value={form.price} onChange={e => set('price', e.target.value)} />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Checkbox id="negotiable" checked={form.price_negotiable} onChange={e => set('price_negotiable', e.target.checked)} />
            <label htmlFor="negotiable" className="text-sm font-medium text-hb-600 dark:text-hb-300 cursor-pointer">Prix négociable</label>
          </div>
        </div>
      </FormSection>

      {/* ── Section 2 : Détails du bien ── */}
      <FormSection title="🏠 Détails du bien">
        <div className="grid grid-cols-2 gap-4">
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
          <div>
            <Label>Étage</Label>
            <Input type="number" min="0" placeholder="0 = RDC" value={form.floor} onChange={e => set('floor', e.target.value)} />
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <Checkbox id="furnished" checked={form.furnished} onChange={e => set('furnished', e.target.checked)} />
            <label htmlFor="furnished" className="text-sm font-medium text-hb-600 dark:text-hb-300 cursor-pointer">Bien meublé</label>
          </div>
        </div>
      </FormSection>

      {/* ── Section 3 : Équipements ── */}
      <FormSection title="✅ Équipements disponibles">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {AMENITIES.map(a => (
            <label key={a.key} className={cn(
              'flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors text-sm',
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
      </FormSection>

      {/* ── Section 4 : Localisation ── */}
      <FormSection title="📍 Localisation">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <Label required>Quartier</Label>
            <Select value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)}>
              <option value="">Choisir...</option>
              {NEIGHBORHOODS_YAOUNDE.map(n => <option key={n} value={n}>{n}</option>)}
            </Select>
          </div>
          <div>
            <Label>Repère / adresse approximative</Label>
            <Input placeholder="Ex: Près du marché central" value={form.address_hint} onChange={e => set('address_hint', e.target.value)} />
          </div>
        </div>

        {/* Carte */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Position sur la carte <span className="text-hb-300 font-normal">(cliquez ou déplacez le marqueur)</span></Label>
            <button type="button" onClick={useMyLocation} disabled={loadingGPS}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 text-white rounded-xl text-xs font-semibold hover:bg-brand-600 transition-colors disabled:opacity-50">
              {loadingGPS ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
              Ma position
            </button>
          </div>
          <div ref={mapContainerRef}
            className="w-full h-64 rounded-2xl border-2 border-hb-200 dark:border-hb-600 overflow-hidden bg-hb-100 dark:bg-hb-800"
            style={{ zIndex: 0 }}>
            {!mapReady && (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-hb-300" />
              </div>
            )}
          </div>
          <p className="text-xs text-hb-400 mt-1.5 flex items-center gap-1">
            <MapPin size={11} />
            Lat: {form.lat.toFixed(6)} · Lng: {form.lng.toFixed(6)}
          </p>
        </div>
      </FormSection>

      {/* ── Section 5 : Propriétaire ── */}
      <FormSection title="👤 Informations propriétaire">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Nom du propriétaire</Label>
            <Input placeholder="Ex: M. Kamga" value={form.owner_name} onChange={e => set('owner_name', e.target.value)} />
          </div>
          <div>
            <Label>Téléphone du propriétaire</Label>
            <Input type="tel" placeholder="Ex: 6XX XXX XXX" value={form.owner_phone} onChange={e => set('owner_phone', e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-hb-300 flex items-center gap-1 mt-1">
          <Info size={11} /> Ces informations sont visibles uniquement par l'équipe Habynex.
        </p>
      </FormSection>

      {/* ── Section 6 : Description ── */}
      <FormSection title="📝 Description">
        <Label>Description brute (l'IA va l'enrichir)</Label>
        <textarea value={form.description_raw} onChange={e => set('description_raw', e.target.value)}
          placeholder="Décrivez le bien en quelques mots simples. Ex: Beau studio au 2e étage, vue dégagée, proximité école..."
          rows={3}
          className="w-full px-4 py-3 border border-hb-200 dark:border-hb-600 rounded-2xl text-sm bg-white dark:bg-hb-800 outline-none focus:border-brand-400 resize-none text-hb-600 dark:text-hb-200 placeholder:text-hb-300"
        />
      </FormSection>

      {/* ── Section 7 : Photos ── */}
      <FormSection title="📷 Photos du bien">
        <ImageUploader maxFiles={10} maxSizeKB={400} onFilesReady={setPhotos} label="Ajouter des photos (compression automatique)" />
        <p className="text-xs text-hb-300 mt-1">La 1ère photo sera la photo de couverture. Maximum 10 photos.</p>
      </FormSection>

      {/* ── Description IA générée ── */}
      {aiDescription && (
        <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-purple-500" />
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400">Description enrichie par l'IA ✓</span>
          </div>
          <textarea value={aiDescription} onChange={e => setAiDescription(e.target.value)}
            rows={4} className="w-full bg-transparent text-sm text-purple-700 dark:text-purple-300 outline-none resize-none" />
          <p className="text-xs text-purple-400 mt-1">Vous pouvez modifier cette description.</p>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          {step === 'form' && (
            <button onClick={enrichWithAI}
              className="flex-1 py-3.5 border-2 border-brand-400 text-brand-600 dark:text-brand-400 font-semibold rounded-2xl hover:bg-brand-50 dark:hover:bg-brand-950/20 transition-colors flex items-center justify-center gap-2">
              <Sparkles size={17} />
              Enrichir avec l'IA
            </button>
          )}
          <button onClick={submitListing}
            disabled={submitting || !form.type || !form.transaction || !form.price || !form.neighborhood}
            className="flex-1 py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-40 shadow-lg shadow-brand-500/25">
            {submitting ? <Loader2 size={17} className="animate-spin" /> : canAutoPublish ? <Zap size={17} /> : <CheckCircle2 size={17} />}
            {canAutoPublish ? 'Publier maintenant' : 'Soumettre pour validation'}
          </button>
        </div>
        <p className="text-xs text-center text-hb-300">
          {canAutoPublish
            ? '⚡ Votre annonce sera publiée immédiatement et visible sur Habynex.'
            : '⚠️ L\'annonce sera visible uniquement après validation par l\'équipe Habynex (sous 24h).'}
        </p>
      </div>
    </div>
  )
}

// ─── Sous-composants ──────────────────────────────────────────────────────────
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-hb-800 rounded-3xl border border-hb-100 dark:border-hb-700 p-5 space-y-4 shadow-card">
      <h3 className="font-bold text-hb-700 dark:text-white text-sm">{title}</h3>
      {children}
    </div>
  )
}
function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-hb-600 dark:text-hb-300 mb-1.5">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  )
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
function Checkbox({ id, checked, onChange }: { id: string; checked: boolean; onChange: (e: any) => void }) {
  return (
    <input type="checkbox" id={id} checked={checked} onChange={onChange}
      className="w-4 h-4 rounded border-hb-300 text-brand-500 accent-brand-500" />
  )
}
