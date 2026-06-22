'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const error = searchParams.get('error')
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      // Vérification rate limiting avant la tentative de connexion
      const rlRes = await fetch('/api/auth/check-rate-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, action: 'login' }),
      })
      const rlData = await rlRes.json()
      if (!rlData.allowed) {
        toast.error(rlData.error ?? 'Trop de tentatives. Réessayez plus tard.')
        return
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        toast.error(error.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect' : error.message)
        return
      }
      toast.success('Connexion réussie !')
      router.push(redirect)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white dark:bg-hb-800 rounded-3xl shadow-airbnb-lg border border-hb-100 dark:border-hb-700 p-8">
        <div className="flex justify-center mb-6">
          <Image src="/habynex-icon.png" alt="Habynex" width={52} height={52} className="w-12 h-12 object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-hb-700 dark:text-white text-center mb-1">Bon retour 👋</h1>
        <p className="text-hb-400 text-sm text-center mb-8">Connectez-vous à votre compte Habynex</p>

        {error === 'unauthorized' && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
            ⚠️ Accès non autorisé.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-hb-600 dark:text-hb-300 mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="vous@email.com" autoComplete="email"
              className="w-full px-4 py-3 border border-hb-200 dark:border-hb-600 rounded-xl text-sm text-hb-700 dark:text-white bg-white dark:bg-hb-700 placeholder:text-hb-300 outline-none focus:border-hb-500 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-hb-600 dark:text-hb-300 mb-1.5">Mot de passe</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••" autoComplete="current-password"
                className="w-full px-4 py-3 pr-11 border border-hb-200 dark:border-hb-600 rounded-xl text-sm text-hb-700 dark:text-white bg-white dark:bg-hb-700 placeholder:text-hb-300 outline-none focus:border-hb-500 transition-colors" />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-hb-400 hover:text-hb-600 transition-colors">
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading || !email || !password}
            className={cn('w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all mt-2',
              loading || !email || !password ? 'bg-hb-200 dark:bg-hb-700 cursor-not-allowed text-hb-400' : 'bg-brand-500 hover:bg-brand-600 active:scale-[0.98]')}>
            {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Connexion…</span> : 'Se connecter'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-hb-500 dark:text-hb-400">
          Pas encore de compte ?{' '}
          <Link href="/inscription" className="text-hb-700 dark:text-white font-semibold underline hover:text-brand-500 transition-colors">
            S&apos;inscrire gratuitement
          </Link>
        </p>
      </div>
    </div>
  )
}
