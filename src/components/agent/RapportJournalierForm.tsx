'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, Loader2, Send, MapPin, Star,
  AlertCircle, Lightbulb, MessageSquare, Clock
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const TRANSPORT_OPTIONS = ['Moto personnelle', 'Voiture personnelle', 'Transport en commun', 'À pied', 'Taxi']
const YAOUNDÉ_NEIGHBORHOODS = [
  'Bastos', 'Biyem-Assi', 'Carrière', 'Centre-ville', 'Ekounou',
  'Emombo', 'Essos', 'Jouvence', 'Kondengui', 'Mbankolo',
  'Mendong', 'Mfandena', 'Mimboman', 'Nkoldongo', 'Nsam',
  'Odza', 'Omnisports', 'Simbock', 'Tsinga', 'Autre',
]

const MOOD_OPTIONS = [
  { value: 1, emoji: '😞', label: 'Difficile' },
  { value: 2, emoji: '😐', label: 'Moyen' },
  { value: 3, emoji: '😊', label: 'Correct' },
  { value: 4, emoji: '😄', label: 'Bien' },
  { value: 5, emoji: '🌟', label: 'Excellent' },
]

export function RapportJournalierForm() {
  const { user, profile, roles } = useAuthStore()
  const router = useRouter()
  const supabase = createClient()

  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const isAgent = roles.includes('agent')
  const isPhotographer = roles.includes('photographer')

  const [form, setForm] = useState({
    mission_count: 1,
    successful_missions: 0,
    neighborhoods_covered: [] as string[],
    client_feedback: '',
    issues_encountered: '',
    suggestions: '',
    mood_score: 3,
    transport_mode: '',
  })

  useEffect(() => {
    if (!user) { router.push('/connexion'); return }
    checkAlreadySubmitted()
  }, [user])

  async function checkAlreadySubmitted() {
    if (!user) return
    const { data } = await supabase
      .from('field_reports')
      .select('id')
      .eq('agent_id', user.id)
      .eq('report_date', today)
      .single()
    if (data) setAlreadySubmitted(true)
  }

  function toggleNeighborhood(n: string) {
    setForm(prev => ({
      ...prev,
      neighborhoods_covered: prev.neighborhoods_covered.includes(n)
        ? prev.neighborhoods_covered.filter(x => x !== n)
        : [...prev.neighborhoods_covered, n],
    }))
  }

  async function handleSubmit() {
    if (!user) return
    if (form.neighborhoods_covered.length === 0) {
      toast.error('Sélectionnez au moins un quartier')
      return
    }
    if (!form.transport_mode) {
      toast.error('Indiquez votre moyen de transport')
      return
    }
    if (form.successful_missions > form.mission_count) {
      toast.error('Les missions réussies ne peuvent pas dépasser le total')
      return
    }

    setLoading(true)
    try {
      const roleType = isPhotographer ? 'photographer' : 'agent'

      const { error } = await supabase.from('field_reports').insert({
        agent_id: user.id,
        report_date: today,
        mission_count: form.mission_count,
        successful_missions: form.successful_missions,
        neighborhoods_covered: form.neighborhoods_covered,
        client_feedback: form.client_feedback.trim(),
        issues_encountered: form.issues_encountered.trim(),
        suggestions: form.suggestions.trim(),
        mood_score: form.mood_score,
        transport_mode: form.transport_mode,
        role_type: roleType,
        submitted_at: new Date().toISOString(),
      })

      if (error) throw error

      // Notifier l'admin
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'super_admin'])

      if (admins?.length) {
        await supabase.from('notifications').insert(
          admins.map((a: { user_id: string }) => ({
            user_id: a.user_id,
            title: `📋 Rapport terrain — ${profile?.full_name ?? 'Agent'}`,
            body: `${form.mission_count} missions (${form.successful_missions} succès) · ${form.neighborhoods_covered.slice(0, 2).join(', ')}`,
            action_url: `${process.env.NEXT_PUBLIC_ADMIN_URL ?? ''}/rapports-terrain`,
            channel: 'in_app',
          }))
        )
      }

      setSubmitted(true)
      toast.success('Rapport envoyé avec succès !')
    } catch (e: any) {
      toast.error('Erreur : ' + (e?.message ?? 'inconnue'))
    } finally {
      setLoading(false)
    }
  }

  if (!isAgent && !isPhotographer) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <AlertCircle size={40} className="text-amber-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-hb-700 dark:text-white mb-2">Accès réservé</h2>
        <p className="text-hb-400 text-sm">Cette page est réservée aux agents et photographes Habynex.</p>
      </div>
    )
  }

  if (alreadySubmitted) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <CheckCircle2 size={56} className="text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-hb-700 dark:text-white mb-2">Rapport déjà soumis</h2>
        <p className="text-hb-400 text-sm">Vous avez déjà envoyé votre rapport pour aujourd'hui ({new Date(today).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}).</p>
        <p className="text-hb-300 text-xs mt-2">Revenez demain après votre journée de service.</p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-5xl">📋</div>
        <CheckCircle2 size={56} className="text-green-500 mx-auto" />
        <h2 className="text-xl font-bold text-hb-700 dark:text-white">Rapport envoyé !</h2>
        <p className="text-hb-400 text-sm">
          Merci {profile?.full_name?.split(' ')[0]} ! Votre rapport a été transmis à l'équipe Habynex.
          L'IA va l'analyser pour améliorer nos stratégies.
        </p>
        <button onClick={() => router.push('/agent-dashboard')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white rounded-2xl font-semibold text-sm hover:opacity-90 transition-opacity">
          Retour au dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-brand-500/10 rounded-2xl flex items-center justify-center">
            <Clock size={20} className="text-brand-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-hb-700 dark:text-white">Rapport de la journée</h1>
            <p className="text-sm text-hb-400">
              {new Date(today).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <p className="text-sm text-hb-400 bg-hb-50 dark:bg-hb-800 rounded-2xl px-4 py-3 mt-3 border border-hb-100 dark:border-hb-700">
          📊 Votre rapport est envoyé directement à l'équipe Habynex et analysé par notre IA pour améliorer nos stratégies et votre accompagnement.
        </p>
      </div>

      <div className="space-y-6">
        {/* ── Section 1 : Missions ── */}
        <Section title="📅 Missions du jour" icon={null}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-hb-500 dark:text-hb-400 mb-1.5 uppercase tracking-wide">
                Nombre de missions
              </label>
              <div className="flex items-center gap-2">
                <button onClick={() => setForm(p => ({ ...p, mission_count: Math.max(0, p.mission_count - 1) }))}
                  className="w-9 h-9 rounded-xl bg-hb-100 dark:bg-hb-700 text-hb-600 dark:text-hb-300 font-bold text-lg hover:bg-hb-200 transition-colors">−</button>
                <span className="text-xl font-bold text-hb-700 dark:text-white w-8 text-center">{form.mission_count}</span>
                <button onClick={() => setForm(p => ({ ...p, mission_count: p.mission_count + 1 }))}
                  className="w-9 h-9 rounded-xl bg-hb-100 dark:bg-hb-700 text-hb-600 dark:text-hb-300 font-bold text-lg hover:bg-hb-200 transition-colors">+</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-hb-500 dark:text-hb-400 mb-1.5 uppercase tracking-wide">
                Missions réussies (client retenu)
              </label>
              <div className="flex items-center gap-2">
                <button onClick={() => setForm(p => ({ ...p, successful_missions: Math.max(0, p.successful_missions - 1) }))}
                  className="w-9 h-9 rounded-xl bg-hb-100 dark:bg-hb-700 text-hb-600 dark:text-hb-300 font-bold text-lg hover:bg-hb-200 transition-colors">−</button>
                <span className={cn('text-xl font-bold w-8 text-center', form.successful_missions > 0 ? 'text-green-600' : 'text-hb-700 dark:text-white')}>
                  {form.successful_missions}
                </span>
                <button onClick={() => setForm(p => ({ ...p, successful_missions: Math.min(p.mission_count, p.successful_missions + 1) }))}
                  className="w-9 h-9 rounded-xl bg-hb-100 dark:bg-hb-700 text-hb-600 dark:text-hb-300 font-bold text-lg hover:bg-hb-200 transition-colors">+</button>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Section 2 : Quartiers ── */}
        <Section title="📍 Quartiers couverts" icon={MapPin}>
          <div className="flex flex-wrap gap-2">
            {YAOUNDÉ_NEIGHBORHOODS.map(n => (
              <button key={n} onClick={() => toggleNeighborhood(n)}
                className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  form.neighborhoods_covered.includes(n)
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'border-hb-200 dark:border-hb-600 text-hb-600 dark:text-hb-400 hover:border-brand-300')}>
                {n}
              </button>
            ))}
          </div>
          {form.neighborhoods_covered.length > 0 && (
            <p className="text-xs text-hb-400 mt-2">
              ✓ {form.neighborhoods_covered.length} quartier{form.neighborhoods_covered.length > 1 ? 's' : ''} sélectionné{form.neighborhoods_covered.length > 1 ? 's' : ''}
            </p>
          )}
        </Section>

        {/* ── Section 3 : Transport ── */}
        <Section title="🚌 Moyen de transport" icon={null}>
          <div className="flex flex-wrap gap-2">
            {TRANSPORT_OPTIONS.map(t => (
              <button key={t} onClick={() => setForm(p => ({ ...p, transport_mode: t }))}
                className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  form.transport_mode === t
                    ? 'bg-hb-700 dark:bg-white text-white dark:text-hb-900 border-hb-700 dark:border-white'
                    : 'border-hb-200 dark:border-hb-600 text-hb-600 dark:text-hb-400 hover:border-hb-400')}>
                {t}
              </button>
            ))}
          </div>
        </Section>

        {/* ── Section 4 : Moral ── */}
        <Section title="😊 Comment s'est passée votre journée ?" icon={Star}>
          <div className="flex gap-3 flex-wrap">
            {MOOD_OPTIONS.map(m => (
              <button key={m.value} onClick={() => setForm(p => ({ ...p, mood_score: m.value }))}
                className={cn('flex flex-col items-center gap-1 px-4 py-3 rounded-2xl border-2 transition-all',
                  form.mood_score === m.value
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20 shadow-sm'
                    : 'border-hb-100 dark:border-hb-700 hover:border-hb-300')}>
                <span className="text-2xl">{m.emoji}</span>
                <span className={cn('text-xs font-medium', form.mood_score === m.value ? 'text-brand-500' : 'text-hb-400')}>{m.label}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* ── Section 5 : Retours clients ── */}
        <Section title="💬 Retours des clients" icon={MessageSquare}>
          <textarea
            value={form.client_feedback}
            onChange={e => setForm(p => ({ ...p, client_feedback: e.target.value }))}
            rows={3}
            placeholder="Qu'est-ce que les clients ont apprécié ou critiqué ? Des questions fréquentes ?"
            className="w-full px-4 py-3 border border-hb-200 dark:border-hb-600 rounded-2xl text-sm text-hb-700 dark:text-hb-200 bg-white dark:bg-hb-800 outline-none focus:border-brand-400 transition-colors resize-none placeholder:text-hb-300"
          />
        </Section>

        {/* ── Section 6 : Problèmes ── */}
        <Section title="⚠️ Problèmes rencontrés" icon={AlertCircle}>
          <textarea
            value={form.issues_encountered}
            onChange={e => setForm(p => ({ ...p, issues_encountered: e.target.value }))}
            rows={3}
            placeholder="Accès refusé à un bien ? Propriétaire injoignable ? Biens mal décrits ? Autre..."
            className="w-full px-4 py-3 border border-hb-200 dark:border-hb-600 rounded-2xl text-sm text-hb-700 dark:text-hb-200 bg-white dark:bg-hb-800 outline-none focus:border-brand-400 transition-colors resize-none placeholder:text-hb-300"
          />
        </Section>

        {/* ── Section 7 : Suggestions ── */}
        <Section title="💡 Vos suggestions" icon={Lightbulb}>
          <textarea
            value={form.suggestions}
            onChange={e => setForm(p => ({ ...p, suggestions: e.target.value }))}
            rows={3}
            placeholder="Des idées pour améliorer le service, les missions, la plateforme ?"
            className="w-full px-4 py-3 border border-hb-200 dark:border-hb-600 rounded-2xl text-sm text-hb-700 dark:text-hb-200 bg-white dark:bg-hb-800 outline-none focus:border-brand-400 transition-colors resize-none placeholder:text-hb-300"
          />
        </Section>

        {/* ── Bouton submit ── */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-3xl transition-colors flex items-center justify-center gap-3 text-base shadow-lg shadow-brand-500/25 disabled:opacity-50">
          {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          {loading ? 'Envoi en cours…' : 'Soumettre mon rapport'}
        </button>

        <p className="text-xs text-center text-hb-300">
          Ce rapport est confidentiel et utilisé uniquement par l'équipe Habynex pour améliorer vos conditions de travail.
        </p>
      </div>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-hb-800 rounded-3xl border border-hb-100 dark:border-hb-700 p-5 space-y-4 shadow-card">
      <h3 className="font-bold text-hb-700 dark:text-white text-sm flex items-center gap-2">
        {Icon && <Icon size={15} className="text-brand-500" />}
        {title}
      </h3>
      {children}
    </div>
  )
}
