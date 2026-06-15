'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2, Check } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

export function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const refCode = searchParams.get('ref') || ''
  const supabase = createClient()

  const [fullName, setFullName]       = useState('')
  const [email, setEmail]             = useState('')
  const [phone, setPhone]             = useState('')
  const [password, setPassword]       = useState('')
  const [showPwd, setShowPwd]         = useState(false)
  const [referralCode, setReferralCode] = useState(refCode)
  const [loading, setLoading]         = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const strong = password.length >= 8

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!strong) { toast.error('Mot de passe trop court (min. 8 caractères)'); return }
    if (!acceptedTerms) { toast.error('Vous devez accepter les termes et conditions'); return }
    setLoading(true)
    try {
      // Vérifier code de parrainage via API (bypass RLS — un non-connecté ne peut pas lire profiles)
      let referredBy: string | null = null
      if (referralCode.trim()) {
        const res = await fetch(`/api/referral/check?code=${encodeURIComponent(referralCode.trim())}`)
        const json = await res.json()
        if (!json.valid) {
          toast.error('Code de parrainage invalide')
          setLoading(false)
          return
        }
        referredBy = json.referrerId
      }

      // Créer le compte
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName, phone } },
      })
      if (error) { toast.error(error.message); return }

      // Lier le parrainage via API serveur (service_role bypass RLS)
      // On attend un peu que le trigger ait créé le profil
      if (referredBy && data.user) {
        await new Promise(r => setTimeout(r, 800)) // laisser le trigger s'exécuter
        await fetch('/api/referral/link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: data.user.id, referrerId: referredBy }),
        })
      }

      toast.success('Compte créé ! Bienvenue sur Habynex 🎉')
      // → Redirection vers onboarding pour que l'IA collecte les critères
      router.push('/onboarding')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white dark:bg-hb-800 rounded-3xl shadow-airbnb-lg border border-hb-100 dark:border-hb-700 p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image src="/habynex-icon.png" alt="Habynex" width={52} height={52} className="w-12 h-12 object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-hb-700 dark:text-white text-center mb-1">Créer un compte</h1>
        <p className="text-hb-400 text-sm text-center mb-8">Rejoignez des milliers d&apos;utilisateurs Habynex</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-hb-600 dark:text-hb-300 mb-1.5">Nom complet</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
              placeholder="Jean Dupont" autoComplete="name"
              className="w-full px-4 py-3 border border-hb-200 dark:border-hb-600 rounded-xl text-sm text-hb-700 dark:text-white bg-white dark:bg-hb-700 placeholder:text-hb-300 outline-none focus:border-hb-500 transition-colors" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-hb-600 dark:text-hb-300 mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="vous@email.com" autoComplete="email"
              className="w-full px-4 py-3 border border-hb-200 dark:border-hb-600 rounded-xl text-sm text-hb-700 dark:text-white bg-white dark:bg-hb-700 placeholder:text-hb-300 outline-none focus:border-hb-500 transition-colors" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-hb-600 dark:text-hb-300 mb-1.5">Téléphone</label>
            <div className="flex">
              <span className="flex items-center px-3 bg-hb-50 dark:bg-hb-700 border border-r-0 border-hb-200 dark:border-hb-600 rounded-l-xl text-sm text-hb-500 dark:text-hb-400">
                🇨🇲 +237
              </span>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="6 XX XX XX XX"
                className="flex-1 px-4 py-3 border border-hb-200 dark:border-hb-600 rounded-r-xl text-sm text-hb-700 dark:text-white bg-white dark:bg-hb-700 placeholder:text-hb-300 outline-none focus:border-hb-500 transition-colors" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-hb-600 dark:text-hb-300 mb-1.5">Mot de passe</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="Min. 8 caractères" autoComplete="new-password"
                className={cn('w-full px-4 py-3 pr-11 border rounded-xl text-sm bg-white dark:bg-hb-700 text-hb-700 dark:text-white placeholder:text-hb-300 outline-none transition-colors',
                  password.length > 0 ? strong ? 'border-trust-500' : 'border-red-400' : 'border-hb-200 dark:border-hb-600 focus:border-hb-500')} />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-hb-400 hover:text-hb-600 transition-colors">
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {password.length > 0 && !strong && (
              <p className="text-xs text-red-500 mt-1">Minimum 8 caractères requis</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-hb-600 dark:text-hb-300 mb-1.5">
              Code de parrainage <span className="text-hb-300 font-normal">(optionnel)</span>
            </label>
            <input type="text" value={referralCode} onChange={e => setReferralCode(e.target.value.toUpperCase())}
              placeholder="Ex: AB12CD" maxLength={6}
              className="w-full px-4 py-3 border border-hb-200 dark:border-hb-600 rounded-xl text-sm font-mono tracking-widest uppercase text-hb-700 dark:text-white bg-white dark:bg-hb-700 placeholder:text-hb-300 outline-none focus:border-hb-500 transition-colors" />
          </div>

          {/* Termes et conditions — obligatoire */}
          <label className="flex items-start gap-3 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={e => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-hb-300 text-brand-500 flex-shrink-0 cursor-pointer"
            />
            <span className="text-sm text-hb-500 dark:text-hb-400 leading-snug">
              J&apos;ai lu et j&apos;accepte les{' '}
              <Link href="/termes-et-conditions" target="_blank" className="text-brand-500 hover:text-brand-600 font-semibold underline transition-colors">
                termes et conditions d&apos;utilisation
              </Link>{' '}
              de Habynex.{' '}
              <span className="text-red-400 font-semibold">*</span>
            </span>
          </label>

          <button type="submit" disabled={loading || !email || !fullName || !strong || !acceptedTerms}
            className={cn('w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all mt-2',
              loading || !email || !fullName || !strong
                ? 'bg-hb-200 dark:bg-hb-700 cursor-not-allowed text-hb-400'
                : 'bg-brand-500 hover:bg-brand-600 active:scale-[0.98]')}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Création…
              </span>
            ) : 'Créer mon compte gratuitement'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-hb-500 dark:text-hb-400">
          Déjà un compte ?{' '}
          <Link href="/connexion" className="text-hb-700 dark:text-white font-semibold underline hover:text-brand-500 transition-colors">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}