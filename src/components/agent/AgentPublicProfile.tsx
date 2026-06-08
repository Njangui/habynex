'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AgentRatingSummary } from '@/components/agent/AgentRating'
import { HabynexQRCode } from '@/components/ui/QRCode'
import {
  Star, MapPin, Phone, MessageSquare, Shield,
  Award, CheckCircle2, Calendar, Share2, QrCode
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props { agentId: string }

export function AgentPublicProfile({ agentId }: Props) {
  const supabase = createClient()
  const [data, setData] = useState<any>(null)
  const [showQR, setShowQR] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [loading, setLoading] = useState(true)

  const profileUrl = `https://habynex.com/agent/${agentId}`

  useEffect(() => { load() }, [agentId])

  async function load() {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, phone, avatar_url, created_at')
      .eq('id', agentId).single()

    const { data: agent } = await supabase
      .from('agents')
      .select('missions_completed, rating_avg, status, weekly_availability, neighborhood:neighborhoods(name, city:cities(name))')
      .eq('id', agentId).single()

    const { data: ratings } = await supabase
      .from('agent_ratings')
      .select('stars, comment, created_at, client:profiles!client_id(full_name)')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(5)

    const { data: listings } = await supabase
      .from('listings')
      .select('id, slug, title, type, transaction, price, media:listing_media(url, is_cover)')
      .eq('agent_id', agentId)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(4)

    setData({ profile, agent, ratings: ratings ?? [], listings: listings ?? [] })
    setLoading(false)
  }

  async function handleShare() {
    setSharing(true)
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${data?.profile?.full_name ?? 'Agent'} — Habynex`,
          text: `Contactez ${data?.profile?.full_name ?? 'cet agent'}, agent immobilier certifié Habynex au Cameroun.`,
          url: profileUrl,
        })
      } else {
        await navigator.clipboard.writeText(profileUrl)
      }
    } finally {
      setSharing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!data?.profile) return <div className="text-center py-20 text-hb-400">Agent introuvable</div>

  const { profile, agent, ratings, listings } = data
  const memberSince = new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const neighborhood = agent?.neighborhood
  const avgRating = agent?.rating_avg ?? (ratings.length ? ratings.reduce((s: number, r: any) => s + r.stars, 0) / ratings.length : 0)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-32">

      {/* Header agent */}
      <div className="relative bg-gradient-to-br from-hb-700 via-hb-800 to-hb-900 rounded-3xl p-6 text-white mb-6 overflow-hidden">
        {/* Fond décoratif */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-brand-500/20 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-10 w-24 h-24 bg-white/5 rounded-full translate-y-1/2" />

        <div className="relative flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/20 border-2 border-white/30">
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt={profile.full_name ?? ''} width={80} height={80} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white">
                  {profile.full_name?.charAt(0)?.toUpperCase() ?? '👤'}
                </div>
              )}
            </div>
            {agent?.status === 'active' && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <CheckCircle2 size={12} className="text-white" />
              </div>
            )}
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold truncate">{profile.full_name ?? 'Agent Habynex'}</h1>
            </div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="bg-green-500/20 text-green-300 text-xs px-2 py-0.5 rounded-full font-semibold border border-green-500/30">
                ✓ Agent certifié
              </span>
            </div>
            {neighborhood && (
              <p className="text-white/70 text-xs flex items-center gap-1">
                <MapPin size={12} />
                {neighborhood.name}{neighborhood.city?.name ? `, ${neighborhood.city.name}` : ''}
              </p>
            )}
            <p className="text-white/50 text-xs mt-1 flex items-center gap-1">
              <Calendar size={11} />
              Membre depuis {memberSince}
            </p>
          </div>

          {/* Actions partage */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            <button onClick={handleShare}
              className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors">
              <Share2 size={16} />
            </button>
            <button onClick={() => setShowQR(!showQR)}
              className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors">
              <QrCode size={16} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="relative grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-white/20">
          <div className="text-center">
            <p className="text-2xl font-bold">{agent?.missions_completed ?? 0}</p>
            <p className="text-xs text-white/60">Visites</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold flex items-center justify-center gap-1">
              {avgRating > 0 ? avgRating.toFixed(1) : '—'}
              {avgRating > 0 && <Star size={14} className="text-yellow-400 fill-yellow-400" />}
            </p>
            <p className="text-xs text-white/60">Note</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{ratings.length}</p>
            <p className="text-xs text-white/60">Avis</p>
          </div>
        </div>
      </div>

      {/* QR code panneau */}
      {showQR && (
        <div className="bg-white dark:bg-hb-800 rounded-2xl border border-hb-100 dark:border-hb-700 p-5 mb-6 shadow-airbnb">
          <p className="text-sm font-semibold text-hb-700 dark:text-white mb-4 text-center">QR code — Profil de {profile.full_name?.split(' ')[0]}</p>
          <HabynexQRCode
            value={profileUrl}
            size={200}
            label={profile.full_name ?? 'Agent Habynex'}
            sublabel="Scanner pour voir ce profil"
            showActions
            className="mx-auto"
          />
          {/* Partage social */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: 'WhatsApp', color: 'bg-green-500', url: `https://wa.me/?text=${encodeURIComponent(`Contactez ${profile.full_name}, agent Habynex certifié 🏠\n${profileUrl}`)}` },
              { label: 'Facebook', color: 'bg-blue-600', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}` },
              { label: 'Telegram', color: 'bg-sky-500', url: `https://t.me/share/url?url=${encodeURIComponent(profileUrl)}&text=${encodeURIComponent(`Agent Habynex certifié — ${profile.full_name}`)}` },
            ].map(s => (
              <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
                className={cn('py-2 rounded-xl text-white text-xs font-semibold text-center hover:opacity-90 transition-opacity', s.color)}>
                {s.label}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Garanties */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { icon: Shield, label: 'Identité vérifiée', desc: 'CNI + selfie validés' },
          { icon: Award, label: 'Contrat signé', desc: 'Engagé envers Habynex' },
          { icon: CheckCircle2, label: 'Formations reçues', desc: 'Process Habynex' },
          { icon: Star, label: 'Noté par les clients', desc: `${ratings.length} avis vérifiés` },
        ].map((g, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-hb-50 dark:bg-hb-700 rounded-2xl">
            <div className="w-9 h-9 bg-trust-100 dark:bg-trust-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <g.icon size={17} className="text-trust-600 dark:text-trust-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-hb-700 dark:text-white">{g.label}</p>
              <p className="text-xs text-hb-400">{g.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Avis */}
      {ratings.length > 0 && (
        <div className="mb-6">
          <h2 className="font-bold text-hb-700 dark:text-white mb-4 flex items-center gap-2">
            <Star size={16} className="text-yellow-400 fill-yellow-400" />
            Avis clients ({ratings.length})
          </h2>
          <AgentRatingSummary agentId={agentId} />
        </div>
      )}

      {/* Annonces de l'agent */}
      {listings.length > 0 && (
        <div className="mb-6">
          <h2 className="font-bold text-hb-700 dark:text-white mb-4">Biens présentés par {profile.full_name?.split(' ')[0]}</h2>
          <div className="grid grid-cols-2 gap-3">
            {listings.map((l: any) => {
              const cover = l.media?.find((m: any) => m.is_cover)?.url ?? l.media?.[0]?.url
              return (
                <Link key={l.id} href={`/bien/${l.slug}`}
                  className="rounded-2xl overflow-hidden border border-hb-100 dark:border-hb-700 hover:shadow-airbnb transition-shadow">
                  <div className="relative aspect-square bg-hb-100">
                    {cover && <Image src={cover} alt={l.title} fill className="object-cover" sizes="200px" />}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold text-hb-700 dark:text-white truncate">{l.title}</p>
                    <p className="text-xs font-bold text-brand-500 mt-1">{l.price?.toLocaleString()} FCFA</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* CTA contact fixe */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 bg-white dark:bg-hb-800 border-t border-hb-100 dark:border-hb-700 px-4 py-3 z-40">
        <div className="max-w-2xl mx-auto flex gap-3">
          {profile.phone && (
            <a href={`https://wa.me/237${profile.phone.replace(/^0/, '').replace(/\s/g, '')}?text=${encodeURIComponent(`Bonjour ${profile.full_name?.split(' ')[0]}, j'ai trouvé votre profil sur Habynex et j'aimerais planifier une visite.`)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 text-sm transition-colors">
              <Phone size={16} /> WhatsApp
            </a>
          )}
          <Link href={`/messages?agent=${agentId}`}
            className="flex-1 py-3 bg-hb-700 dark:bg-brand-500 hover:opacity-90 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 text-sm transition-opacity">
            <MessageSquare size={16} /> Message
          </Link>
        </div>
      </div>
    </div>
  )
}
