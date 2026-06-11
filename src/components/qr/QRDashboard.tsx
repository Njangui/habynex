'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { HabynexQRCode } from '@/components/ui/QRCode'
import { QRShareKit } from '@/components/ui/QRShareKit'
import { Globe, User, Search, UserPlus, Gift, Share2, Printer } from 'lucide-react'
import { cn } from '@/lib/utils'

const BASE_URL = 'https://habynex.com'

const OFFICIAL_QR_CODES = [
  { id: 'home', label: 'Habynex — Page principale', sublabel: 'habynex.com', url: BASE_URL, icon: Globe, color: 'bg-brand-50 text-brand-600', description: 'QR code officiel à imprimer sur flyers, cartes de visite, affiches.' },
  { id: 'search', label: 'Rechercher un logement', sublabel: 'habynex.com/rechercher', url: `${BASE_URL}/rechercher`, icon: Search, color: 'bg-blue-50 text-blue-600', description: 'Redirige directement vers la page de recherche de logements.' },
  { id: 'register', label: "S'inscrire sur Habynex", sublabel: 'habynex.com/inscription', url: `${BASE_URL}/inscription`, icon: UserPlus, color: 'bg-green-50 text-green-600', description: "QR code pour inviter de nouvelles personnes à s'inscrire." },
  { id: 'become-agent', label: 'Devenir agent Habynex', sublabel: 'habynex.com/devenir-agent', url: `${BASE_URL}/devenir-agent`, icon: User, color: 'bg-purple-50 text-purple-600', description: "Recrutement agents — à diffuser dans les quartiers." },
]

export function QRDashboard() {
  const { user, profile, roles } = useAuthStore()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'official' | 'agent' | 'referral'>('official')
  const [agentData, setAgentData] = useState<any>(null)
  const [shareKit, setShareKit] = useState<{ url: string; title: string; subtitle?: string } | null>(null)

  const isAgent = roles.includes('agent') || roles.includes('admin') || roles.includes('super_admin')

  useEffect(() => {
    if (isAgent && user) {
      supabase.from('agents').select('missions_completed, rating_avg, status, neighborhood:neighborhoods(name)').eq('id', user.id).single()
        .then(({ data }) => setAgentData(data))
    }
  }, [isAgent, user])

  const agentQrUrl = user ? `${BASE_URL}/agent/${user.id}` : `${BASE_URL}/devenir-agent`
  const referralCode = (profile as any)?.referral_code ?? ''
  const referralUrl = referralCode ? `${BASE_URL}/inscription?ref=${referralCode}` : `${BASE_URL}/inscription`

  const TABS = [
    { id: 'official', label: '🏢 Officiels Habynex' },
    ...(isAgent ? [{ id: 'agent', label: '👤 Mon QR Agent' }] : []),
    { id: 'referral', label: '🎁 Parrainage' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-hb-700 dark:text-white flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">QR</span>
            </div>
            Mes QR Codes Habynex
          </h1>
          <p className="text-sm text-hb-400 mt-1">Générez, téléchargez et partagez vos QR codes officiels.</p>
        </div>
        <button onClick={() => window.print()}
          className="hidden md:flex items-center gap-2 px-4 py-2 border border-hb-200 dark:border-hb-600 rounded-xl text-sm text-hb-600 dark:text-hb-300 hover:bg-hb-50 dark:hover:bg-hb-700 transition-colors">
          <Printer size={16} /> Imprimer tout
        </button>
      </div>

      <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar border-b border-hb-100 dark:border-hb-700">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className={cn('px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors',
              activeTab === t.id ? 'border-brand-500 text-brand-600' : 'border-transparent text-hb-400 hover:text-hb-600')}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'official' && (
        <div className="space-y-6">
          <p className="text-sm text-hb-400 bg-hb-50 dark:bg-hb-700 rounded-2xl p-4">
            💡 Imprimez ces QR codes sur vos flyers, cartes de visite, affiches de quartier ou vitrine d&apos;agence.
          </p>
          <div className="grid sm:grid-cols-2 gap-6">
            {OFFICIAL_QR_CODES.map(qr => (
              <div key={qr.id} className="bg-white dark:bg-hb-800 rounded-2xl border border-hb-100 dark:border-hb-700 p-6 shadow-card">
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', qr.color)}>
                    <qr.icon size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-hb-700 dark:text-white">{qr.label}</p>
                    <p className="text-xs text-hb-400">{qr.sublabel}</p>
                  </div>
                </div>
                <p className="text-xs text-hb-400 mb-5 leading-relaxed">{qr.description}</p>
                <HabynexQRCode value={qr.url} size={200} label={qr.label} showActions className="mx-auto" />
                <button onClick={() => setShareKit({ url: qr.url, title: qr.label, subtitle: qr.sublabel })}
                  className="w-full mt-4 py-2.5 border border-hb-200 dark:border-hb-600 rounded-xl text-sm font-semibold text-hb-600 dark:text-hb-300 hover:bg-hb-50 dark:hover:bg-hb-700 transition-colors flex items-center justify-center gap-2">
                  <Share2 size={15} /> Partager ce QR code
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'agent' && isAgent && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-hb-700 to-hb-800 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl flex-shrink-0">
                {(profile as any)?.full_name?.charAt(0)?.toUpperCase() ?? '👤'}
              </div>
              <div>
                <p className="font-bold text-lg">{(profile as any)?.full_name ?? 'Agent Habynex'}</p>
                <p className="text-white/70 text-sm">Agent certifié Habynex</p>
                {agentData?.neighborhood?.name && <p className="text-white/60 text-xs mt-0.5">📍 {agentData.neighborhood.name}</p>}
              </div>
            </div>
            {agentData && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
                <div className="text-center">
                  <p className="text-2xl font-bold">{agentData.missions_completed ?? 0}</p>
                  <p className="text-xs text-white/60">Visites réalisées</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{agentData.rating_avg?.toFixed(1) ?? '—'}</p>
                  <p className="text-xs text-white/60">Note moyenne ⭐</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-hb-800 rounded-2xl border border-hb-100 dark:border-hb-700 p-6">
            <h3 className="font-semibold text-hb-700 dark:text-white mb-2">Mon QR code agent</h3>
            <p className="text-xs text-hb-400 mb-5 leading-relaxed">
              Les clients scannent ce QR code pour voir votre profil public : avis, missions réalisées, quartier de couverture et bouton de contact direct.
            </p>
            <HabynexQRCode
              value={agentQrUrl}
              size={220}
              label={(profile as any)?.full_name ?? 'Agent Habynex'}
              sublabel="Scanner pour voir mon profil"
              showActions
              className="mx-auto"
            />
            <button onClick={() => setShareKit({ url: agentQrUrl, title: (profile as any)?.full_name ?? 'Agent Habynex', subtitle: 'Mon profil agent Habynex' })}
              className="w-full mt-4 py-2.5 border border-hb-200 dark:border-hb-600 rounded-xl text-sm font-semibold text-hb-600 dark:text-hb-300 hover:bg-hb-50 dark:hover:bg-hb-700 transition-colors flex items-center justify-center gap-2">
              <Share2 size={15} /> Partager mon QR code
            </button>

            {/* Carte d'identité agent imprimable */}
            <div className="mt-6 p-4 border-2 border-dashed border-hb-200 dark:border-hb-600 rounded-2xl">
              <p className="text-xs font-semibold text-hb-500 dark:text-hb-400 mb-3 text-center uppercase tracking-wide">Carte d&apos;agent — À imprimer</p>
              <div className="flex items-center justify-between gap-4 p-4 bg-hb-700 rounded-xl text-white">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-brand-400 font-bold text-lg">habynex</span>
                    <span className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">CERTIFIÉ</span>
                  </div>
                  <p className="font-bold text-base">{(profile as any)?.full_name ?? 'Nom de l\'agent'}</p>
                  <p className="text-xs text-white/60 mt-0.5">Agent immobilier certifié</p>
                  {(profile as any)?.phone && <p className="text-xs text-white/70 mt-1">📞 {(profile as any).phone}</p>}
                  {agentData?.neighborhood?.name && <p className="text-xs text-white/70">📍 {agentData.neighborhood.name}</p>}
                </div>
                <div className="flex-shrink-0">
                  <HabynexQRCode value={agentQrUrl} size={80} showActions={false} foreground="#ffffff" background="#1a1a2e" />
                </div>
              </div>
              <button onClick={() => window.print()}
                className="w-full mt-3 py-2 border border-hb-200 dark:border-hb-600 rounded-xl text-xs text-hb-500 hover:bg-hb-50 flex items-center justify-center gap-2 transition-colors">
                <Printer size={12} /> Imprimer la carte agent
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'referral' && (
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl flex gap-3">
            <Gift size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-700 dark:text-amber-400 text-sm mb-1">Programme de parrainage</p>
              <p className="text-xs text-amber-600 dark:text-amber-300 leading-relaxed">
                Partagez ce QR code. Chaque ami inscrit via votre lien compte comme filleul.
                <strong> 5 filleuls = 1 visite terrain gratuite offerte.</strong>
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-hb-800 rounded-2xl border border-hb-100 dark:border-hb-700 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-semibold text-hb-700 dark:text-white">Mon code parrainage</p>
                <span className="font-mono text-2xl font-bold text-brand-500 tracking-widest">{referralCode || 'XXXXXX'}</span>
              </div>
              <button onClick={() => navigator.clipboard.writeText(referralUrl)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 transition-colors">
                <Share2 size={15} /> Partager
              </button>
            </div>

            <HabynexQRCode
              value={referralUrl}
              size={220}
              label={`Code parrainage : ${referralCode}`}
              sublabel="Scanner pour rejoindre Habynex"
              showActions
              className="mx-auto"
            />
            <button onClick={() => setShareKit({ url: referralUrl, title: `Code parrainage ${referralCode}`, subtitle: 'Rejoindre Habynex' })}
              className="w-full mt-4 py-2.5 border border-hb-200 dark:border-hb-600 rounded-xl text-sm font-semibold text-hb-600 dark:text-hb-300 hover:bg-hb-50 dark:hover:bg-hb-700 transition-colors flex items-center justify-center gap-2">
              <Share2 size={15} /> Partager mon QR code
            </button>
            <p className="text-center text-xs text-hb-300 mt-4 break-all font-mono">{referralUrl}</p>
          </div>
        </div>
      )}

      {shareKit && (
        <QRShareKit
          url={shareKit.url}
          title={shareKit.title}
          subtitle={shareKit.subtitle}
          onClose={() => setShareKit(null)}
        />
      )}
    </div>
  )
}