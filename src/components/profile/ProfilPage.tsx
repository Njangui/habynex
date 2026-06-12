'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  User, Settings, Calendar, Gift, Shield, ChevronRight,
  Copy, Check, Camera, Loader2, Bell, Moon, Globe, Sun, BellOff,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const TABS = [
  { key: 'overview', label: 'Aperçu', icon: User },
  { key: 'visites', label: 'Mes visites', icon: Calendar },
  { key: 'parrainage', label: 'Parrainage', icon: Gift },
  { key: 'settings', label: 'Paramètres', icon: Settings },
]

export function ProfilPage() {
  const { user, profile, setProfile } = useAuthStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { theme, setTheme, resolvedTheme } = useTheme()

  const [tab, setTab] = useState(searchParams.get('tab') ?? 'overview')
  const [codeCopied, setCodeCopied] = useState(false)
  const [editName, setEditName] = useState(false)
  const [newName, setNewName] = useState(profile?.full_name ?? '')
  const [saving, setSaving] = useState(false)
  const [visites, setVisites] = useState<any[]>([])
  const [visitesLoading, setVisitesLoading] = useState(false)
  const [filleuls, setFilleuls] = useState<{ id: string; full_name: string; created_at: string }[]>([])
  const [filleulsLoading, setFilleulsLoading] = useState(false)

  // Notifications push
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [pushSupported, setPushSupported] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
      setPushSupported(true)
      setPushEnabled(Notification.permission === 'granted')
    }
  }, [])

  async function togglePushNotifications() {
    if (!user) return
    setPushLoading(true)
    try {
      if (pushEnabled) {
        // Désactiver : supprimer la subscription
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await sub.unsubscribe()
          await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          })
        }
        setPushEnabled(false)
        toast('Notifications désactivées', { icon: '🔕' })
      } else {
        // Activer : demander la permission et s'abonner
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          toast.error('Permission refusée. Activez les notifications dans les paramètres du navigateur.')
          return
        }
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        })
        const json = sub.toJSON()
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            endpoint: sub.endpoint,
            p256dh: (json.keys as any)?.p256dh ?? '',
            auth: (json.keys as any)?.auth ?? '',
          }),
        })
        setPushEnabled(true)
        toast.success('Notifications activées ! 🔔')
      }
    } catch (err) {
      console.error('Push toggle error:', err)
      toast.error('Erreur lors de la configuration des notifications')
    } finally {
      setPushLoading(false)
    }
  }

  useEffect(() => {
    if (!user) { router.push('/connexion'); return }
  }, [user])

  useEffect(() => {
    if (tab === 'visites' && user) loadVisites()
    if (tab === 'parrainage' && user) loadFilleuls()
  }, [tab, user])

  async function loadVisites() {
    if (!user) return
    setVisitesLoading(true)
    const { data } = await supabase
      .from('visit_bookings')
      .select('id, status, scheduled_at, nb_listings, amount_paid, is_free, created_at')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })
    setVisites(data ?? [])
    setVisitesLoading(false)
  }

  async function loadFilleuls() {
    if (!user) return
    setFilleulsLoading(true)
    // Récupérer les profils dont referred_by = mon id
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, created_at')
      .eq('referred_by', user.id)
      .order('created_at', { ascending: false })
    setFilleuls(data ?? [])
    setFilleulsLoading(false)
  }

  async function saveName() {
    if (!user || !newName.trim()) return
    setSaving(true)
    const { data } = await supabase
      .from('profiles')
      .update({ full_name: newName.trim() })
      .eq('id', user.id)
      .select()
      .single()
    if (data) setProfile(data)
    setSaving(false)
    setEditName(false)
    toast.success('Nom mis à jour')
  }

  async function copyReferralCode() {
    if (!profile?.referral_code) return
    await navigator.clipboard.writeText(profile.referral_code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
    toast.success('Code copié !')
  }

  // Utilise l'URL réelle du site (fonctionne sur vercel.app ET sur le domaine custom)
  const referralLink = typeof window !== 'undefined'
    ? `${window.location.origin}/inscription?ref=${profile?.referral_code}`
    : `https://habynex-rose.vercel.app/inscription?ref=${profile?.referral_code}`

  if (!user) return null

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email?.[0]?.toUpperCase() ?? 'U'

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header profil style Airbnb */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-8 p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-card">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white dark:border-gray-800 shadow-md">
            {profile?.avatar_url ? (
              <Image src={profile.avatar_url} alt="Avatar" fill className="object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-2xl font-bold">
                {initials}
              </div>
            )}
          </div>
          <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform" aria-label="Changer la photo">
            <Camera size={13} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <div className="flex-1 text-center sm:text-left min-w-0">
          {editName ? (
            <div className="flex items-center gap-2 mb-1">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="text-xl font-bold bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-1 outline-none focus:ring-2 focus:ring-brand-500/30 flex-1"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditName(false) }}
              />
              <button onClick={saveName} disabled={saving} className="px-3 py-1.5 bg-brand-500 text-white text-sm rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-60">
                {saving ? <Loader2 size={14} className="animate-spin" /> : 'OK'}
              </button>
              <button onClick={() => setEditName(false)} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm rounded-xl hover:bg-gray-200 transition-colors">
                ✕
              </button>
            </div>
          ) : (
            <button onClick={() => setEditName(true)} className="group flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-brand-500 transition-colors">
                {profile?.full_name ?? 'Votre nom'}
              </h1>
              <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">Modifier</span>
            </button>
          )}
          <p className="text-gray-500 text-sm">{user.email}</p>
          {profile?.phone && <p className="text-gray-400 text-xs mt-0.5">+237 {profile.phone}</p>}

          {/* Stats */}
          <div className="flex justify-center sm:justify-start gap-6 mt-4">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{profile?.free_visits_balance ?? 0}</p>
              <p className="text-xs text-gray-400">Visite{(profile?.free_visits_balance ?? 0) > 1 ? 's' : ''} gratuite{(profile?.free_visits_balance ?? 0) > 1 ? 's' : ''}</p>
            </div>
            <div className="w-px bg-gray-200 dark:bg-gray-700" />
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{visites.length}</p>
              <p className="text-xs text-gray-400">Visite{visites.length > 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 mb-6 overflow-x-auto no-scrollbar">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
              tab === t.key
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            <t.icon size={15} />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Contenu tab */}
      {tab === 'overview' && (
        <div className="space-y-3">
          {[
            { icon: Calendar, label: 'Mes visites', desc: 'Suivre vos réservations de visite', action: () => setTab('visites') },
            { icon: Gift, label: 'Parrainage', desc: 'Invitez vos amis et gagnez des visites gratuites', action: () => setTab('parrainage') },
            { icon: Shield, label: 'Devenir agent', desc: 'Rejoignez le réseau Habynex', href: '/devenir-agent' },
            { icon: Settings, label: 'Paramètres', desc: 'Notifications, langue, thème', action: () => setTab('settings') },
          ].map(item => (
            <button
              key={item.label}
              onClick={item.action ?? (() => item.href && router.push(item.href))}
              className="w-full flex items-center gap-4 p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-all text-left group shadow-card hover:shadow-card-hover"
            >
              <div className="w-10 h-10 bg-brand-50 dark:bg-brand-950 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-brand-100 dark:group-hover:bg-brand-900 transition-colors">
                <item.icon size={18} className="text-brand-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-gray-900 dark:text-white">{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
              </div>
              <ChevronRight size={16} className="text-gray-300 group-hover:text-brand-500 transition-colors" />
            </button>
          ))}
        </div>
      )}

      {tab === 'visites' && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Mes réservations de visite</h2>
          {visitesLoading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)
          ) : visites.length === 0 ? (
            <div className="text-center py-16">
              <Calendar size={40} className="text-gray-200 dark:text-gray-700 mx-auto mb-3" />
              <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Aucune visite réservée</p>
              <p className="text-sm text-gray-400">Trouvez un bien et réservez votre première visite</p>
            </div>
          ) : (
            visites.map(v => (
              <div key={v.id} className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <VisiteStatusBadge status={v.status} />
                      {v.is_free && <span className="px-2 py-0.5 bg-trust-50 dark:bg-trust-950/30 text-trust-600 dark:text-trust-400 text-xs rounded-full font-medium">Gratuite</span>}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {v.nb_listings} bien{v.nb_listings > 1 ? 's' : ''} à visiter
                      {v.scheduled_at && ` · ${new Date(v.scheduled_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white flex-shrink-0">
                    {v.is_free ? 'Gratuit' : `${v.amount_paid.toLocaleString()} FCFA`}
                  </p>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 font-mono">Réf: {v.id.slice(0, 8).toUpperCase()}</p>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'parrainage' && (
        <div className="space-y-5">
          {/* Hero parrainage */}
          <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-3xl p-6 text-white text-center">
            <div className="text-4xl mb-3">🎁</div>
            <h2 className="text-xl font-bold mb-2">Invitez vos amis</h2>
            <p className="text-white/80 text-sm max-w-xs mx-auto">
              Pour chaque tranche de <strong>5 amis inscrits</strong>, vous gagnez <strong>1 visite terrain gratuite</strong>
            </p>
          </div>

          {/* Code & lien */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-card space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Votre code de parrainage</p>
              <button
                onClick={copyReferralCode}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-brand-400 rounded-xl transition-colors group"
              >
                <span className="text-2xl font-bold font-mono tracking-widest text-gray-800 dark:text-white">
                  {profile?.referral_code ?? '------'}
                </span>
                <div className={cn('flex items-center gap-1 text-sm font-medium transition-colors', codeCopied ? 'text-trust-500' : 'text-brand-500 group-hover:text-brand-600')}>
                  {codeCopied ? <><Check size={15} /> Copié !</> : <><Copy size={15} /> Copier</>}
                </div>
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Partager le lien</p>
              <div className="flex gap-2">
                {[
                  { label: 'WhatsApp', color: 'bg-green-500', href: `https://wa.me/?text=${encodeURIComponent(`Rejoignez Habynex avec mon code ${profile?.referral_code} 🏠 ${referralLink}`)}` },
                  { label: 'Facebook', color: 'bg-blue-600', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}` },
                  { label: 'Copier lien', color: 'bg-gray-700', action: async () => { await navigator.clipboard.writeText(referralLink); toast.success('Lien copié !') } },
                ].map(btn => (
                  btn.href ? (
                    <a key={btn.label} href={btn.href} target="_blank" rel="noopener noreferrer"
                      className={`flex-1 py-2.5 ${btn.color} text-white text-xs font-semibold rounded-xl text-center hover:opacity-90 transition-opacity`}>
                      {btn.label}
                    </a>
                  ) : (
                    <button key={btn.label} onClick={btn.action}
                      className={`flex-1 py-2.5 ${btn.color} text-white text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity`}>
                      {btn.label}
                    </button>
                  )
                ))}
              </div>
            </div>
          </div>

          {/* Solde */}
          <div className="bg-trust-50 dark:bg-trust-950/20 border border-trust-100 dark:border-trust-900 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-trust-500 rounded-full flex items-center justify-center text-white text-xl flex-shrink-0">🎟️</div>
            <div>
              <p className="text-sm text-trust-700 dark:text-trust-400 font-medium">Visites gratuites disponibles</p>
              <p className="text-3xl font-bold text-trust-600 dark:text-trust-300">{profile?.free_visits_balance ?? 0}</p>
            </div>
          </div>

          {/* Compteur filleuls + progression */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>👥</span> Mes filleuls
              </p>
              <span className="text-2xl font-bold text-brand-500">{filleuls.length}</span>
            </div>

            {/* Barre de progression vers la prochaine visite gratuite */}
            {(() => {
              const progress = filleuls.length % 5
              const nextReward = 5 - progress
              return (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                    <span>{progress}/5 pour la prochaine visite gratuite</span>
                    <span>{nextReward} restant{nextReward > 1 ? 's' : ''}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5">
                    <div
                      className="bg-gradient-to-r from-brand-400 to-brand-600 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${(progress / 5) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px]',
                        i <= progress
                          ? 'border-brand-500 bg-brand-500 text-white'
                          : 'border-gray-200 dark:border-gray-700 text-gray-300'
                      )}>
                        {i <= progress ? '✓' : i}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Liste des filleuls */}
            {filleulsLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => (
                  <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filleuls.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-4xl mb-2">🤝</p>
                <p className="text-sm text-gray-400">Aucun filleul pour l&apos;instant</p>
                <p className="text-xs text-gray-300 mt-1">Partagez votre code pour commencer !</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filleuls.map((f, i) => (
                  <div key={f.id} className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="w-8 h-8 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {f.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {f.full_name || 'Utilisateur'}
                      </p>
                      <p className="text-xs text-gray-400">
                        Inscrit le {new Date(f.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-brand-500 bg-brand-50 dark:bg-brand-950/30 px-2 py-0.5 rounded-full flex-shrink-0">
                      #{i + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Paramètres</h2>

          {/* ── Thème ─────────────────────────────────────────────────── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-card">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0">
                {resolvedTheme === 'dark'
                  ? <Moon size={18} className="text-gray-600 dark:text-gray-300" />
                  : <Sun size={18} className="text-amber-500" />}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-gray-900 dark:text-white">Apparence</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {resolvedTheme === 'dark' ? 'Mode sombre activé' : 'Mode clair activé'}
                </p>
              </div>
              {/* Toggle thème */}
              <button
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className={cn(
                  'relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0',
                  resolvedTheme === 'dark' ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'
                )}
                aria-label="Basculer thème"
              >
                <span className={cn(
                  'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
                  resolvedTheme === 'dark' ? 'translate-x-6' : 'translate-x-0.5'
                )} />
              </button>
            </div>

            {/* Sélecteur 3 options */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { value: 'light', label: 'Clair', icon: Sun },
                { value: 'dark', label: 'Sombre', icon: Moon },
                { value: 'system', label: 'Système', icon: Settings },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-medium border transition-all',
                    theme === opt.value
                      ? 'bg-brand-50 dark:bg-brand-950/30 border-brand-400 text-brand-600 dark:text-brand-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                  )}
                >
                  <opt.icon size={16} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Notifications push ─────────────────────────────────────── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-card">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0">
                {pushEnabled
                  ? <Bell size={18} className="text-brand-500" />
                  : <BellOff size={18} className="text-gray-400" />}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-gray-900 dark:text-white">Notifications push</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {!pushSupported
                    ? 'Non supporté sur ce navigateur'
                    : pushEnabled
                      ? 'Activées — vous recevrez des alertes'
                      : 'Désactivées'}
                </p>
              </div>
              {pushSupported && (
                <button
                  onClick={togglePushNotifications}
                  disabled={pushLoading}
                  className={cn(
                    'relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 disabled:opacity-60',
                    pushEnabled ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'
                  )}
                  aria-label="Activer/désactiver les notifications"
                >
                  {pushLoading
                    ? <span className="absolute inset-0 flex items-center justify-center"><Loader2 size={12} className="animate-spin text-white" /></span>
                    : <span className={cn(
                        'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
                        pushEnabled ? 'translate-x-6' : 'translate-x-0.5'
                      )} />
                  }
                </button>
              )}
            </div>

            {pushEnabled && (
              <div className="mt-3 p-3 bg-brand-50 dark:bg-brand-950/20 rounded-xl">
                <p className="text-xs text-brand-600 dark:text-brand-400">
                  🔔 Vous serez notifié pour : nouveaux messages, confirmation de visite, nouvelles annonces correspondant à vos critères.
                </p>
              </div>
            )}

            {!pushSupported && (
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl">
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ Votre navigateur ne supporte pas les notifications push. Essayez Chrome ou Firefox.
                </p>
              </div>
            )}
          </div>

          {/* ── Langue ─────────────────────────────────────────────────── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-card">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0">
                <Globe size={18} className="text-gray-600 dark:text-gray-300" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-gray-900 dark:text-white">Langue</p>
                <p className="text-xs text-gray-400 mt-0.5">Français (FR)</p>
              </div>
              <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
            </div>
          </div>

          {/* ── Sécurité ─────────────────────────────────────────────── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-card">
            <button
              onClick={() => toast('Bientôt disponible', { icon: '🔒' })}
              className="w-full flex items-center gap-4 text-left"
            >
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield size={18} className="text-gray-600 dark:text-gray-300" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-gray-900 dark:text-white">Sécurité</p>
                <p className="text-xs text-gray-400 mt-0.5">Mot de passe, sessions actives</p>
              </div>
              <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function VisiteStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending_payment: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30',
    paid: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30',
    scheduled: 'bg-purple-50 text-purple-600 dark:bg-purple-950/30',
    confirmed: 'bg-trust-50 text-trust-600 dark:bg-trust-950/30',
    completed: 'bg-gray-100 text-gray-600 dark:bg-gray-800',
    cancelled: 'bg-red-50 text-red-500 dark:bg-red-950/30',
    refunded: 'bg-orange-50 text-orange-500',
  }
  const labels: Record<string, string> = {
    pending_payment: 'En attente', paid: 'Payée', scheduled: 'Planifiée',
    confirmed: 'Confirmée', completed: 'Effectuée', cancelled: 'Annulée', refunded: 'Remboursée',
  }
  return (
    <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', styles[status] ?? 'bg-gray-100 text-gray-500')}>
      {labels[status] ?? status}
    </span>
  )
}