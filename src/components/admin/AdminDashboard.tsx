'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { CheckCircle2, XCircle, Eye, Edit2, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { cn, formatPrice } from '@/lib/utils'
import toast from 'react-hot-toast'
import Image from 'next/image'
import Link from 'next/link'

interface PendingListing {
  id: string; slug: string; title: string; type: string; transaction: string
  price: number; status: string; created_at: string; ai_generated: boolean
  description: string | null; agent_id: string | null
  neighborhood: { name: string } | null
  media: { url: string; is_cover: boolean }[]
  agent: { full_name: string | null } | null
}

export function AdminDashboard() {
  const { user, roles } = useAuthStore()
  const router = useRouter()
  const supabase = createClient()

  const [tab, setTab] = useState<'pending' | 'published' | 'all'>('pending')
  const [listings, setListings] = useState<PendingListing[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<PendingListing>>({})

  useEffect(() => {
    if (!user || !roles.includes('admin') && !roles.includes('super_admin')) {
      router.push('/'); return
    }
    load()
  }, [user, roles, tab])

  async function load() {
    setLoading(true)
    let q = supabase.from('listings').select(`
      id, slug, title, type, transaction, price, status, created_at, ai_generated, description, agent_id,
      neighborhood:neighborhoods(name),
      media:listing_media(url, is_cover),
      agent:profiles!agent_id(full_name)
    `).order('created_at', { ascending: false })

    if (tab === 'pending') q = q.eq('status', 'pending')
    else if (tab === 'published') q = q.eq('status', 'published')
    q = q.limit(50)

    const { data } = await q
    setListings((data ?? []) as any)
    setLoading(false)
  }

  async function approve(id: string) {
    setProcessing(id)
    const { error } = await supabase.from('listings').update({ status: 'published', published_at: new Date().toISOString() }).eq('id', id)
    if (error) toast.error('Erreur')
    else { toast.success('Annonce publiée !'); load() }
    setProcessing(null)
  }

  async function reject(id: string) {
    setProcessing(id)
    const { error } = await supabase.from('listings').update({ status: 'rejected' }).eq('id', id)
    if (error) toast.error('Erreur')
    else { toast.success('Annonce rejetée'); load() }
    setProcessing(null)
  }

  async function deleteL(id: string) {
    if (!confirm('Supprimer définitivement cette annonce ?')) return
    setProcessing(id)
    const { error } = await supabase.from('listings').delete().eq('id', id)
    if (error) toast.error('Erreur')
    else { toast.success('Supprimée'); load() }
    setProcessing(null)
  }

  async function saveEdit(id: string) {
    setProcessing(id)
    const { error } = await supabase.from('listings').update({
      title: editData.title,
      description: (editData as any).description,
      price: editData.price,
    }).eq('id', id)
    if (error) toast.error('Erreur')
    else { toast.success('Modifiée !'); setEditId(null); load() }
    setProcessing(null)
  }

  const TABS = [
    { key: 'pending', label: 'En attente', color: 'text-amber-600' },
    { key: 'published', label: 'Publiées', color: 'text-green-600' },
    { key: 'all', label: 'Toutes', color: 'text-hb-600' },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-hb-700 dark:text-white">Dashboard Admin</h1>
          <p className="text-sm text-hb-400 mt-1">Gestion des annonces Habynex</p>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 mb-6 border-b border-hb-100 dark:border-hb-700">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={cn('px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors', tab === t.key
              ? `border-brand-500 ${t.color}` : 'border-transparent text-hb-400 hover:text-hb-600')}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-brand-500" /></div>
      ) : listings.length === 0 ? (
        <div className="text-center py-20 text-hb-400">Aucune annonce dans cette catégorie.</div>
      ) : (
        <div className="space-y-4">
          {listings.map(l => {
            const cover = l.media?.find(m => m.is_cover)?.url ?? l.media?.[0]?.url
            const isEditing = editId === l.id
            return (
              <div key={l.id} className="bg-white dark:bg-hb-800 rounded-2xl border border-hb-100 dark:border-hb-700 p-5 shadow-card">
                <div className="flex gap-4">
                  {/* Photo */}
                  <div className="relative w-24 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-hb-100">
                    {cover
                      ? <Image src={cover} alt={l.title} fill className="object-cover" sizes="96px" />
                      : <div className="absolute inset-0 flex items-center justify-center text-3xl">🏠</div>
                    }
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input value={(editData as any).title ?? l.title}
                          onChange={e => setEditData(p => ({ ...p, title: e.target.value }))}
                          className="w-full px-3 py-1.5 text-sm border border-hb-200 rounded-lg outline-none focus:border-brand-400 dark:bg-hb-700 dark:border-hb-600" />
                        <textarea value={(editData as any).description ?? l.description ?? ''}
                          onChange={e => setEditData(p => ({ ...p, description: e.target.value } as any))}
                          rows={2}
                          className="w-full px-3 py-1.5 text-sm border border-hb-200 rounded-lg outline-none focus:border-brand-400 resize-none dark:bg-hb-700 dark:border-hb-600" />
                        <input type="number" value={(editData as any).price ?? l.price}
                          onChange={e => setEditData(p => ({ ...p, price: parseInt(e.target.value) }))}
                          className="w-32 px-3 py-1.5 text-sm border border-hb-200 rounded-lg outline-none focus:border-brand-400 dark:bg-hb-700 dark:border-hb-600" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', l.status === 'pending' ? 'bg-amber-100 text-amber-700' : l.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                            {l.status === 'pending' ? '⏳ En attente' : l.status === 'published' ? '✅ Publié' : '❌ Rejeté'}
                          </span>
                          {l.ai_generated && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">✨ IA</span>}
                        </div>
                        <h3 className="font-semibold text-hb-700 dark:text-white text-sm mb-0.5 truncate">{l.title}</h3>
                        <p className="text-xs text-hb-400 mb-1">
                          {(l.neighborhood as any)?.name ?? '—'} · {formatPrice(l.price)} · Agent: {(l.agent as any)?.full_name ?? '—'}
                        </p>
                        {l.description && <p className="text-xs text-hb-400 line-clamp-2">{l.description}</p>}
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {l.status === 'pending' && (
                      <>
                        <button onClick={() => approve(l.id)} disabled={processing === l.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50">
                          {processing === l.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                          Approuver
                        </button>
                        <button onClick={() => reject(l.id)} disabled={processing === l.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50">
                          <XCircle size={12} /> Rejeter
                        </button>
                      </>
                    )}
                    {isEditing ? (
                      <>
                        <button onClick={() => saveEdit(l.id)} disabled={processing === l.id}
                          className="px-3 py-1.5 bg-brand-500 text-white text-xs font-semibold rounded-lg hover:bg-brand-600">
                          💾 Sauvegarder
                        </button>
                        <button onClick={() => setEditId(null)} className="px-3 py-1.5 border border-hb-200 text-xs rounded-lg hover:bg-hb-50">
                          Annuler
                        </button>
                      </>
                    ) : (
                      <button onClick={() => { setEditId(l.id); setEditData(l) }}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-hb-200 dark:border-hb-600 text-hb-600 dark:text-hb-300 text-xs rounded-lg hover:bg-hb-50 dark:hover:bg-hb-700">
                        <Edit2 size={12} /> Modifier
                      </button>
                    )}
                    <Link href={`/bien/${l.slug}`} target="_blank"
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-hb-200 dark:border-hb-600 text-hb-600 dark:text-hb-300 text-xs rounded-lg hover:bg-hb-50 dark:hover:bg-hb-700">
                      <Eye size={12} /> Voir
                    </Link>
                    <button onClick={() => deleteL(l.id)} disabled={processing === l.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-red-500 text-xs rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20">
                      <Trash2 size={12} /> Supprimer
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
