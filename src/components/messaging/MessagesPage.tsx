'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { Search, Sparkles, MessageSquare, Send, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { timeAgo, cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type ListingData = {
  id: string
  title: string
  slug: string
  price: number
  transaction: string
  media: { url: string; is_cover: boolean }[]
}

type ConvWithListing = {
  id: string
  listing_id: string
  client_id: string
  ai_active: boolean
  escalated_to: string | null
  last_message_at: string | null
  unread_count: number
  created_at: string

  // IMPORTANT : Supabase retourne un ARRAY
  listing: ListingData[]
}

export function MessagesPage() {
  const { user, unreadNotifications } = useAuthStore()
  const router = useRouter()
  const supabase = createClient()

  const [conversations, setConversations] = useState<ConvWithListing[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<ConvWithListing | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/connexion')
      return
    }

    loadConversations()
  }, [user])

  async function loadConversations() {
    if (!user) return

    setLoading(true)

    // S'assurer que la session Supabase est initialisée (auth.uid() disponible
    // pour la policy RLS) avant de lancer la query.
    // Sans ça, auth.uid() peut être null si la session n'est pas encore hydratée
    // côté client, et la policy conv_select_own retourne 0 résultats.
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.warn('[MessagesPage] no Supabase session yet, retrying in 1s')
      setTimeout(() => loadConversations(), 1000)
      return
    }

    console.log('[MessagesPage] querying conversations for user:', session.user.id)

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id,
        listing_id,
        client_id,
        ai_active,
        escalated_to,
        last_message_at,
        unread_count,
        created_at,
        listing:listings(
          id,
          title,
          slug,
          price,
          transaction,
          media:listing_media(
            url,
            is_cover
          )
        )
      `)
      .eq('client_id', user.id)
      .order('last_message_at', { ascending: false })

    if (error) {
      console.error('[MessagesPage] load conversations error:', JSON.stringify(error))
      // Afficher l'erreur exacte pour diagnostic
      if (typeof window !== 'undefined') {
        const msg = (error as any)?.message || (error as any)?.code || JSON.stringify(error)
        console.warn('[MessagesPage] Supabase error detail:', msg)
      }
      setConversations([])
      setLoading(false)
      return
    }

    console.log('[MessagesPage] loaded', data?.length, 'conversations')
    setConversations((data as unknown as ConvWithListing[]) ?? [])

    setLoading(false)
  }

  const filtered = conversations.filter(conv => {
    const listing = conv.listing?.[0]

    return listing?.title
      ?.toLowerCase()
      .includes(query.toLowerCase())
  })

  return (
    <div className="max-w-5xl mx-auto px-0 md:px-4 py-0 md:py-6 min-h-[calc(100vh-4rem)]">
      <div className="flex h-[calc(100vh-8rem)] md:h-auto md:min-h-[600px] bg-white dark:bg-gray-900 md:rounded-3xl md:border border-gray-100 dark:border-gray-800 md:shadow-card overflow-hidden">

        {/* LISTE */}
        <div
          className={cn(
            'flex flex-col border-r border-gray-100 dark:border-gray-800',
            selected ? 'hidden md:flex md:w-80' : 'flex-1 md:w-80'
          )}
        >
          <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Messages
              </h1>
              <Link href="/notifications" className="relative w-9 h-9 flex items-center justify-center rounded-full text-hb-500 hover:bg-hb-50 dark:hover:bg-hb-700 transition-colors" aria-label="Notifications">
                <Bell size={18} />
                {unreadNotifications > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full" />}
              </Link>
            </div>

            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5">
              <Search size={15} className="text-gray-400 flex-shrink-0" />

              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Rechercher..."
                className="flex-1 bg-transparent text-sm outline-none text-gray-800 dark:text-white placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex gap-3 p-4 border-b border-gray-50 dark:border-gray-800"
                >
                  <div className="skeleton w-12 h-12 rounded-xl flex-shrink-0" />

                  <div className="flex-1 space-y-2 pt-1">
                    <div className="skeleton h-3 w-3/4 rounded" />
                    <div className="skeleton h-3 w-1/2 rounded" />
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <MessageSquare
                  size={40}
                  className="text-gray-200 dark:text-gray-700 mb-3"
                />

                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Aucun message
                </p>

                <p className="text-xs text-gray-400">
                  Contactez un bien pour démarrer
                </p>
              </div>
            ) : (
              filtered.map(conv => {
                const listing = conv.listing?.[0]

                const cover =
                  listing?.media?.find(m => m.is_cover)?.url ??
                  listing?.media?.[0]?.url

                const isSelected = selected?.id === conv.id

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelected(conv)}
                    className={cn(
                      'w-full flex gap-3 px-4 py-3.5 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left',
                      isSelected && 'bg-brand-50 dark:bg-brand-950/30'
                    )}
                  >
                    <div className="relative w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700">
                      {cover ? (
                        <Image
                          src={cover}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl">
                          🏠
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight">
                          {listing?.title ?? 'Annonce'}
                        </p>

                        {conv.last_message_at && (
                          <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">
                            {timeAgo(conv.last_message_at)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                          {conv.ai_active ? (
                            <>
                              <Sparkles
                                size={10}
                                className="text-brand-400 flex-shrink-0"
                              />
                              Assistant IA
                            </>
                          ) : (
                            'Conseiller Habynex'
                          )}
                        </p>

                        {(conv.unread_count ?? 0) > 0 && (
                          <span className="min-w-[18px] h-[18px] bg-brand-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 flex-shrink-0">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* CHAT */}
        {selected ? (
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setSelected(null)}
                className="md:hidden w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                ←
              </button>

              <div>
                <p className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1">
                  {selected.listing?.[0]?.title}
                </p>

                <p className="text-xs text-gray-500">
                  {selected.ai_active
                    ? '🤖 Assistant IA • En ligne'
                    : '👤 Conseiller Habynex'}
                </p>
              </div>
            </div>

            <InlineChatBox conversationId={selected.id} />
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center flex-col gap-3 text-center px-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
              <MessageSquare
                size={28}
                className="text-gray-300 dark:text-gray-600"
              />
            </div>

            <p className="font-semibold text-gray-700 dark:text-gray-300">
              Sélectionnez une conversation
            </p>

            <p className="text-sm text-gray-400 max-w-xs">
              Choisissez une annonce dans la liste pour voir vos échanges
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function InlineChatBox({ conversationId }: { conversationId: string }) {
  const { user } = useAuthStore()
  const supabase = createClient()

  const bottomRef = useRef<HTMLDivElement>(null)

  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadMessages()

    const channel = supabase
      .channel(`inline-conv-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        payload => {
          setMessages(prev => {
            const incoming = payload.new as any
            if (prev.find((m: any) => m.id === incoming.id)) {
              return prev
            }
            const tempMatch = prev.find((m: any) =>
              typeof m.id === 'string' && m.id.startsWith('temp-') &&
              m.role === incoming.role && m.content === incoming.content
            )
            if (tempMatch) {
              return prev.map((m: any) => (m.id === tempMatch.id ? incoming : m))
            }
            return [...prev, incoming]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth',
    })
  }, [messages])

  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(50)

    setMessages(data ?? [])
  }

  async function send() {
    if (!input.trim() || loading) return

    const content = input.trim()

    setInput('')
    setLoading(true)

    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
      sender_id: user?.id,
    }])

    const { error: insertErr } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user?.id,
      role: 'user',
      content,
    })

    if (insertErr) {
      console.error('[MessagesPage] insert user message failed:', insertErr)
      setMessages(prev => prev.filter((m: any) => m.id !== tempId))
      setInput(content)
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          message: content,
        }),
      })

      const data = await res.json()
      // La réponse IA (si trouvée) est déjà insérée côté serveur — le
      // canal realtime ci-dessus l'ajoute automatiquement. Plus besoin
      // de l'insérer ici (c'était bloqué silencieusement par RLS).
      if (data.error) {
        console.error('[MessagesPage] /api/ai/chat error:', data.error)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg: any) => {
          const isUser =
            msg.role === 'user' &&
            msg.sender_id === user?.id

          return (
            <div
              key={msg.id}
              className={cn(
                'flex gap-2 items-end',
                isUser ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              {!isUser && (
                <div className="w-6 h-6 bg-brand-100 dark:bg-brand-900 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5">
                  <Sparkles
                    size={11}
                    className="text-brand-500"
                  />
                </div>
              )}

              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
                  isUser
                    ? 'bg-brand-500 text-white rounded-br-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white rounded-bl-sm'
                )}
              >
                <p className="whitespace-pre-wrap">
                  {msg.content}
                </p>
              </div>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder="Écrivez votre message..."
          className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none"
        />

        <button
          onClick={send}
          disabled={!input.trim() || loading}
          className="w-10 h-10 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  )
}