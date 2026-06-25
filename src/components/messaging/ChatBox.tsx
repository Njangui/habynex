'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Send, Loader2, MessageSquare, User, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'next/navigation'
import { timeAgo, cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface ChatBoxProps {
  listingId: string
  listingTitle: string
  listingContext?: Record<string, unknown>
  onClose: () => void
}

interface Msg {
  id: string
  role: 'user' | 'ai' | 'admin'
  content: string
  created_at: string
  sender_id?: string | null
  metadata?: any
}

export function ChatBox({ listingId, listingTitle, listingContext, onClose }: ChatBoxProps) {
  const { user } = useAuthStore()
  const supabase = createClient()
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement>(null)

  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(true)
  const [conversationReady, setConversationReady] = useState(false)

  // Rediriger si non connecté
  useEffect(() => {
    if (!user) {
      window.location.href = `/connexion?redirect=${encodeURIComponent(window.location.pathname)}`
      return
    }
    initConversation()
  }, [])

  async function initConversation() {
    if (!user) return
    setInitLoading(true)
    try {
      // Chercher une conversation existante
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('listing_id', listingId)
        .eq('client_id', user.id)
        .single()

      if (existing) {
        setConversationId(existing.id)
        // Charger l'historique existant
        const { data: history } = await supabase
          .from('messages')
          .select('id, role, content, created_at, sender_id, metadata')
          .eq('conversation_id', existing.id)
          .order('created_at', { ascending: true })
          .limit(50)
        setMessages((history as Msg[]) ?? [])
        setConversationReady(true)
      } else {
        // Pas encore de conversation — elle sera créée au 1er message
        setMessages([])
        setConversationReady(true)
      }
    } catch (err) {
      console.error('initConversation error:', err)
    } finally {
      setInitLoading(false)
    }
  }

  // Scroll automatique
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Realtime — nouveaux messages (admin qui répond)
  useEffect(() => {
    if (!conversationId) return
    const channel = supabase
      .channel(`conv-chatbox-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, payload => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev
          return [...prev, payload.new as Msg]
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [conversationId])

  async function sendMessage() {
    if (!input.trim() || loading || !user) return
    const content = input.trim()
    setInput('')
    setLoading(true)

    // Affichage optimiste
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
      sender_id: user.id,
    }])

    try {
      // Récupérer le token d'auth
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          listingId,
          message: content,
          conversationId, // null si 1er message → la route crée la conv
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Erreur lors de l\'envoi')
        setMessages(prev => prev.filter(m => m.id !== tempId))
        return
      }

      // Mettre à jour l'ID de la conversation (important si 1er message)
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId)
      }

      // Supprimer le message optimiste (il sera rechargé via realtime)
      setMessages(prev => prev.filter(m => m.id !== tempId))

    } catch {
      toast.error('Erreur de connexion. Réessayez.')
      setMessages(prev => prev.filter(m => m.id !== tempId))
    } finally {
      setLoading(false)
    }
  }

  function goToMessages() {
    onClose()
    router.push('/messages')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="w-full md:max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col animate-slide-up"
        style={{ maxHeight: 'calc(100dvh - 64px)', marginBottom: '64px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-100 dark:bg-brand-900/40 rounded-full flex items-center justify-center flex-shrink-0">
              <MessageSquare size={16} className="text-brand-500" />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900 dark:text-white">
                Contacter l&apos;équipe Habynex
              </p>
              <p className="text-xs text-gray-400 line-clamp-1">{listingTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Bouton aller dans Messages */}
            {conversationId && (
              <button
                onClick={goToMessages}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-xl hover:bg-brand-50 hover:text-brand-600 transition-colors"
              >
                Messages <ChevronRight size={12} />
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
          {initLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={22} className="animate-spin text-brand-500" />
            </div>
          ) : messages.length === 0 ? (
            /* État vide — invitation à poser une question */
            <div className="flex flex-col items-center justify-center h-full text-center py-8 gap-3">
              <div className="w-14 h-14 bg-brand-50 dark:bg-brand-950/30 rounded-full flex items-center justify-center">
                <MessageSquare size={22} className="text-brand-500" />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-700 dark:text-white mb-1">
                  Posez votre question
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Un conseiller Habynex vous répondra.<br />
                  La conversation sera sauvegardée dans vos messages.
                </p>
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} userId={user?.id} />
            ))
          )}

          {/* Indicateur chargement envoi */}
          {loading && (
            <div className="flex gap-2 items-center text-xs text-gray-400">
              <Loader2 size={12} className="animate-spin" />
              <span>Envoi en cours…</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggestions rapides — uniquement si pas encore de messages */}
        {!initLoading && messages.length === 0 && (
          <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar flex-shrink-0">
            {[
              'Est-il disponible ?',
              'Quel est le quartier ?',
              'Je veux visiter',
              'Eau et électricité ?',
            ].map(s => (
              <button
                key={s}
                onClick={() => setInput(s)}
                className="flex-shrink-0 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-950/30 dark:hover:text-brand-400 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Lien vers Messages si conversation existante */}
        {conversationId && messages.length > 0 && (
          <button
            onClick={goToMessages}
            className="mx-4 mb-2 flex items-center justify-center gap-2 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-brand-50 dark:hover:bg-brand-950/20 text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 text-xs font-medium rounded-xl transition-colors flex-shrink-0"
          >
            <MessageSquare size={12} />
            Voir la conversation complète dans Mes Messages
            <ChevronRight size={12} />
          </button>
        )}

        {/* Input */}
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="Écrivez votre question…"
              rows={1}
              className="flex-1 resize-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all text-gray-700 dark:text-white placeholder:text-gray-400"
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="w-11 h-11 flex-shrink-0 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 text-white rounded-2xl flex items-center justify-center transition-colors"
            >
              {loading
                ? <Loader2 size={16} className="animate-spin" />
                : <Send size={16} />
              }
            </button>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-2">
            Un conseiller Habynex vous répondra dans les meilleurs délais
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Bulle de message ─────────────────────────────────────────────────

function MessageBubble({ msg, userId }: { msg: Msg; userId?: string }) {
  const isUser = msg.role === 'user' && msg.sender_id === userId
  const isFaq = msg.role === 'ai' && msg.metadata?.source === 'faq'
  const isAdmin = msg.role === 'admin' || (msg.role === 'ai' && !isFaq)

  return (
    <div className={cn('flex gap-2 items-end', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {!isUser && (
        <div className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5 text-xs font-bold',
          isFaq
            ? 'bg-amber-100 dark:bg-amber-950/30 text-amber-600'
            : 'bg-blue-100 dark:bg-blue-950/30 text-blue-600'
        )}>
          {isFaq ? '📋' : <User size={12} />}
        </div>
      )}

      <div className={cn(
        'max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
        isUser
          ? 'bg-brand-500 text-white rounded-br-sm'
          : isFaq
            ? 'bg-amber-50 dark:bg-amber-950/20 text-gray-800 dark:text-white rounded-bl-sm border border-amber-200 dark:border-amber-800/40'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white rounded-bl-sm'
      )}>
        {/* Badge source */}
        {isFaq && (
          <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 mb-1 uppercase tracking-wide">
            📋 Réponse automatique
          </p>
        )}
        {isAdmin && (
          <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 mb-1 uppercase tracking-wide">
            👤 Conseiller Habynex
          </p>
        )}

        <p className="whitespace-pre-wrap">{msg.content}</p>
        <p className={cn(
          'text-[10px] mt-1 text-right',
          isUser ? 'text-white/60' : 'text-gray-400'
        )}>
          {timeAgo(msg.created_at)}
        </p>
      </div>
    </div>
  )
}