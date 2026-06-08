'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, Download } from 'lucide-react'

export function PwaBanner() {
  const [show, setShow] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    // Ne pas afficher si déjà installé
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches
    if (isInstalled) return

    // Ne pas réafficher si rejeté aujourd'hui
    const dismissed = localStorage.getItem('pwa-dismissed')
    if (dismissed === new Date().toDateString()) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream
    setIsIos(ios)

    if (ios) {
      const t = setTimeout(() => setShow(true), 4000)
      return () => clearTimeout(t)
    }

    // Android/Desktop : écouter beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setShow(false))

    // Fallback : afficher après 5s même sans beforeinstallprompt
    // (Chrome peut avoir déjà déclenché l'event avant le montage)
    const fallback = setTimeout(() => {
      setShow(prev => {
        if (prev) return prev // déjà affiché via beforeinstallprompt
        return true
      })
    }, 5000)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      clearTimeout(fallback)
    }
  }, [])

  async function handleInstall() {
    if (isIos) { dismiss(); return } // iOS : juste fermer, l'utilisateur sait comment faire
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setShow(false)
  }

  function dismiss() {
    setShow(false)
    localStorage.setItem('pwa-dismissed', new Date().toDateString())
  }

  if (!show) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-white dark:bg-hb-800 border-b border-hb-100 dark:border-hb-700 shadow-airbnb animate-slide-down">
      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3">
        <button onClick={dismiss} className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-hb-400 hover:bg-hb-100 dark:hover:bg-hb-700 transition-colors" aria-label="Fermer">
          <X size={16} />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Image src="/habynex-icon.png" alt="Habynex" width={32} height={32} className="w-8 h-8 object-contain" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-hb-700 dark:text-white leading-tight">
              Téléchargez l&apos;application
            </p>
            <p className="text-xs text-hb-400 truncate">
              {isIos ? 'Appuyez sur Partager puis "Ajouter à l\'écran"' : 'Accès facile et rapide à Habynex'}
            </p>
          </div>
        </div>
        <button onClick={handleInstall}
          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-hb-700 dark:bg-white text-white dark:text-hb-700 text-sm font-semibold rounded-full hover:opacity-90 transition-opacity">
          <Download size={14} />
          {isIos ? 'Comment faire' : 'Utiliser l\'app'}
        </button>
      </div>
    </div>
  )
}
