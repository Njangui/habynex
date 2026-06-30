'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Send, Loader2, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
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
}

export function ChatBox({ listingId, listingTitle, listingContext, onClose }: ChatBoxProps) {
  const { user } = useAuthStore()
  const supabase = createClient()
  const bottomRef = useRef<HTMLDivElement>(null)

  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(true)

  // Rediriger si non connecté
  useEffect(() => {
    if (!user) { window.location.href = '/connexion'; return }
    initConversation()
  }, [])

  async function initConversation() {
    if (!user) return
    setInitLoading(true)
    try {
      // Chercher une conv existante ou en créer une
      let { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('listing_id', listingId)
        .eq('client_id', user.id)
        .single()

      if (!existing) {
        const { data: created } = await supabase
          .from('conversations')
          .insert({ listing_id: listingId, client_id: user.id })
          .select('id')
          .single()
        existing = created
      }

      if (!existing) return
      setConversationId(existing.id)

      // Charger l'historique
      const { data: history } = await supabase
        .from('messages')
        .select('id, role, content, created_at, sender_id')
        .eq('conversation_id', existing.id)
        .order('created_at', { ascending: true })
        .limit(30)

      if (history && history.length > 0) {
        setMessages(history as Msg[])
      } else {
        // Message de bienvenue IA
        setMessages([{
          id: 'welcome',
          role: 'ai',
          content: `Bonjour ! Je suis l'assistant Habynex 👋\n\nJe suis là pour répondre à vos questions sur **${listingTitle}**. N'hésitez pas à me demander des informations sur le bien, le quartier, ou pour organiser une visite !`,
          created_at: new Date().toISOString(),
        }])
      }
    } finally {
      setInitLoading(false)
    }
  }

  // Scroll automatique
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Realtime
  useEffect(() => {
    if (!conversationId) return
    const channel = supabase
      .channel(`conv-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, payload => {
        setMessages(prev => {
          const incoming = payload.new as Msg
          const existsById = prev.find(m => m.id === incoming.id)
          if (existsById) return prev
          // Remplace le message optimiste temporaire correspondant (même
          // contenu, même rôle) plutôt que de l'ajouter en double
          const tempMatch = prev.find(m =>
            m.id.startsWith('temp-') && m.role === incoming.role && m.content === incoming.content
          )
          if (tempMatch) {
            return prev.map(m => (m.id === tempMatch.id ? incoming : m))
          }
          return [...prev, incoming]
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [conversationId])

  async function sendMessage() {
    if (!input.trim() || !conversationId || loading) return
    const content = input.trim()
    setInput('')

    // Message utilisateur optimiste
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
      sender_id: user?.id,
    }])

    // Sauvegarder en DB
    const { error: insertErr } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user?.id,
      role: 'user',
      content,
    })

    if (insertErr) {
      console.error('[ChatBox] insert user message failed:', insertErr)
      toast.error("Votre message n'a pas pu être envoyé. Réessayez.")
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setInput(content)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, message: content, listingContext }),
      })
      const data = await res.json()

      // La réponse IA (si trouvée) est déjà insérée côté serveur
      // (client admin / service role). On ne l'insère plus ici — le
      // canal realtime ci-dessus va l'ajouter automatiquement à `messages`.
      // On affiche juste une erreur si jamais l'API a échoué.
      if (data.error) {
        console.error('[ChatBox] /api/ai/chat error:', data.error)
      }

      if (data.escalated) {
        toast('Un conseiller prend le relais 👤', { icon: 'ℹ️' })
      }
    } catch {
      toast.error('Erreur de connexion. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full md:max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col md:max-h-[600px] animate-slide-up"
        style={{ maxHeight: 'calc(100dvh - 64px)', marginBottom: '64px' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-100 dark:bg-brand-900 rounded-full flex items-center justify-center">
              <Sparkles size={14} className="text-brand-500" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900 dark:text-white">Assistant Habynex</p>
              <p className="text-xs text-trust-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-trust-500 rounded-full inline-block" />
                En ligne
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {initLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-brand-500" />
            </div>
          ) : (
            messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} userId={user?.id} />
            ))
          )}
          {loading && (
            <div className="flex gap-2 items-end">
              <div className="w-7 h-7 bg-brand-100 dark:bg-brand-900 rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkles size={12} className="text-brand-500" />
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions rapides */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
            {[
              'Est-il disponible ?',
              'Quel est le quartier ?',
              'Je veux visiter',
              'Charges comprises ?',
            ].map(s => (
              <button
                key={s}
                onClick={() => setInput(s)}
                className="flex-shrink-0 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full hover:bg-brand-50 hover:text-brand-600 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-800">
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Posez votre question..."
              rows={1}
              className="flex-1 resize-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all max-h-28"
              style={{ minHeight: '44px' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="w-11 h-11 flex-shrink-0 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 text-white rounded-xl flex items-center justify-center transition-colors"
              aria-label="Envoyer"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ msg, userId }: { msg: Msg; userId?: string }) {
  const isUser = msg.role === 'user' && msg.sender_id === userId
  return (
    <div className={cn('flex gap-2 items-end', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {!isUser && (
        <div className="w-7 h-7 bg-brand-100 dark:bg-brand-900 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5">
          <Sparkles size={12} className="text-brand-500" />
        </div>
      )}
      <div className={cn(
        'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
        isUser
          ? 'bg-brand-500 text-white rounded-br-sm'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white rounded-bl-sm'
      )}>
        <p className="whitespace-pre-wrap">{msg.content}</p>
        <p className={cn('text-[10px] mt-1 text-right', isUser ? 'text-white/60' : 'text-gray-400')}>
          {timeAgo(msg.created_at)}
        </p>
      </div>
    </div>
  )
}