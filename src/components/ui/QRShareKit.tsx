'use client'

/**
 * QRShareKit — Partage complet QR code Habynex
 * Réseaux sociaux, WhatsApp, impression, téléchargement haute résolution
 * Génère aussi un template d'impression A4 / carte de visite / badge
 */

import { useState, useRef } from 'react'
import { HabynexQRCode } from '@/components/ui/QRCode'
import {
  Download, Printer, Share2, CheckCircle2, X,
  Smartphone, CreditCard, Shirt, ImageIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface QRShareKitProps {
  url: string
  title: string
  subtitle?: string
  description?: string
  onClose?: () => void
}

type PrintFormat = 'a4-flyer' | 'business-card' | 'badge' | 'poster'

const SOCIAL_PLATFORMS = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    color: 'bg-[#25D366]',
    icon: '💬',
    getUrl: (url: string, text: string) =>
      `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    color: 'bg-[#1877F2]',
    icon: '📘',
    getUrl: (url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: 'twitter',
    label: 'X (Twitter)',
    color: 'bg-black',
    icon: '𝕏',
    getUrl: (url: string, text: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    id: 'telegram',
    label: 'Telegram',
    color: 'bg-[#0088cc]',
    icon: '✈️',
    getUrl: (url: string, text: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    color: 'bg-[#0A66C2]',
    icon: '💼',
    getUrl: (url: string, text: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    id: 'sms',
    label: 'SMS',
    color: 'bg-gray-600',
    icon: '📱',
    getUrl: (url: string, text: string) =>
      `sms:?body=${encodeURIComponent(`${text} ${url}`)}`,
  },
]

const PRINT_FORMATS: { id: PrintFormat; label: string; desc: string; icon: React.ElementType; size: string }[] = [
  { id: 'a4-flyer', label: 'Flyer A4', desc: 'Grand format pour coller en quartier', icon: ImageIcon, size: '210×297mm' },
  { id: 'business-card', label: 'Carte de visite', desc: 'Format standard 85×55mm', icon: CreditCard, size: '85×55mm' },
  { id: 'badge', label: 'Badge agent', desc: 'À porter lors des visites', icon: Smartphone, size: '70×100mm' },
  { id: 'poster', label: 'Affiche A3', desc: 'Grande visibilité dans les rues', icon: Shirt, size: '297×420mm' },
]

export function QRShareKit({ url, title, subtitle, description, onClose }: QRShareKitProps) {
  const [copied, setCopied] = useState(false)
  const [activeFormat, setActiveFormat] = useState<PrintFormat>('a4-flyer')
  const [tab, setTab] = useState<'share' | 'print' | 'download'>('share')
  const printRef = useRef<HTMLDivElement>(null)

  const shareText = `${title}${subtitle ? ` — ${subtitle}` : ''}\nHabynex — Immobilier Cameroun`

  async function copyLink() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  async function nativeShare() {
    if (!navigator.share) { copyLink(); return }
    await navigator.share({ title, text: shareText, url })
  }

  function printDocument() {
    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) return

    const formats: Record<PrintFormat, { w: string; h: string; qrSize: number; fontSize: string }> = {
      'a4-flyer':       { w: '210mm', h: '297mm', qrSize: 280, fontSize: '28px' },
      'business-card':  { w: '85mm',  h: '55mm',  qrSize: 100, fontSize: '10px' },
      'badge':          { w: '70mm',  h: '100mm', qrSize: 140, fontSize: '13px' },
      'poster':         { w: '297mm', h: '420mm', qrSize: 400, fontSize: '36px' },
    }
    const fmt = formats[activeFormat]

    // Générer le QR SVG inline pour l'impression
    const { generateQR } = require('@/lib/qr/qrGenerator')
    const qrSvg = generateQR(url, { foreground: '#1a1a2e', background: '#ffffff' })

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title} — QR Code Habynex</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: ${fmt.w}; height: ${fmt.h};
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      background: #ffffff; font-family: Arial, sans-serif;
      padding: ${activeFormat === 'business-card' ? '4mm' : '10mm'};
    }
    .logo { color: #f95d1e; font-size: ${fmt.fontSize}; font-weight: 900; letter-spacing: -1px; margin-bottom: 4mm; }
    .logo span { color: #1a1a2e; }
    .qr-container { padding: 3mm; background: white; border-radius: 4mm; box-shadow: 0 0 0 1mm #f0f0f0; margin: 4mm 0; }
    .qr-container img, .qr-container svg { display: block; width: ${fmt.qrSize}px; height: ${fmt.qrSize}px; }
    .title { font-size: ${parseFloat(fmt.fontSize) * 0.9}px; font-weight: bold; color: #1a1a2e; text-align: center; margin: 2mm 0 1mm; }
    .subtitle { font-size: ${parseFloat(fmt.fontSize) * 0.65}px; color: #666; text-align: center; }
    .url { font-size: ${parseFloat(fmt.fontSize) * 0.5}px; color: #f95d1e; text-align: center; margin-top: 3mm; word-break: break-all; }
    .divider { width: 80%; height: 1px; background: #f0f0f0; margin: 3mm auto; }
    .footer { font-size: ${parseFloat(fmt.fontSize) * 0.5}px; color: #999; text-align: center; margin-top: 2mm; }
    .scan-text { font-size: ${parseFloat(fmt.fontSize) * 0.6}px; color: #f95d1e; font-weight: bold; margin-bottom: 2mm; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <div class="logo">habynex</div>
  <div class="scan-text">📱 Scanner ce QR code</div>
  <div class="qr-container">${qrSvg}</div>
  <div class="title">${title}</div>
  ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
  <div class="divider"></div>
  <div class="url">${url}</div>
  <div class="footer">habynex.com — Immobilier Cameroun</div>
</body>
</html>`)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }

  function downloadHighRes(format: 'png' | 'svg') {
    // Utiliser le composant HabynexQRCode pour le téléchargement
    const { generateQR, qrToDataURL } = require('@/lib/qr/qrGenerator')
    const svg = generateQR(url, { foreground: '#1a1a2e', background: '#ffffff' })
    const svgWithLogo = svg.replace('</svg>',
      `<rect x="46%" y="46%" width="8%" height="8%" rx="2" fill="#ffffff"/>
       <text x="50%" y="52.5%" text-anchor="middle" font-size="8%" font-family="Arial" font-weight="bold" fill="#f95d1e">H</text>
       </svg>`)

    if (format === 'svg') {
      const blob = new Blob([svgWithLogo], { type: 'image/svg+xml' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `habynex-qr-${title.toLowerCase().replace(/\s+/g, '-')}.svg`
      a.click()
    } else {
      // PNG haute résolution 2000x2000
      const canvas = document.createElement('canvas')
      canvas.width = 2000; canvas.height = 2000
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, 2000, 2000)
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, 2000, 2000)
        const a = document.createElement('a')
        a.download = `habynex-qr-${title.toLowerCase().replace(/\s+/g, '-')}-2000px.png`
        a.href = canvas.toDataURL('image/png')
        a.click()
      }
      img.src = qrToDataURL(svgWithLogo)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="w-full md:max-w-lg bg-white dark:bg-hb-800 rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-hb-100 dark:border-hb-700 flex-shrink-0">
          <div>
            <h2 className="font-bold text-hb-700 dark:text-white">Partager le QR code</h2>
            <p className="text-xs text-hb-400 mt-0.5 truncate max-w-[250px]">{title}</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-hb-400 hover:bg-hb-100 dark:hover:bg-hb-700">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-hb-100 dark:border-hb-700 flex-shrink-0">
          {[
            { id: 'share', label: '🌐 Réseaux' },
            { id: 'print', label: '🖨️ Imprimer' },
            { id: 'download', label: '⬇️ Télécharger' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={cn('flex-1 py-3 text-sm font-semibold transition-colors',
                tab === t.id
                  ? 'border-b-2 border-brand-500 text-brand-600'
                  : 'text-hb-400 hover:text-hb-600')}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Aperçu QR */}
          <HabynexQRCode
            value={url}
            size={160}
            showActions={false}
            className="mx-auto"
          />

          {/* Copier lien */}
          <div className="flex items-center gap-2 p-3 bg-hb-50 dark:bg-hb-700 rounded-2xl">
            <p className="flex-1 text-xs text-hb-500 dark:text-hb-300 truncate font-mono">{url}</p>
            <button onClick={copyLink}
              className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1',
                copied ? 'bg-green-500 text-white' : 'bg-hb-700 text-white hover:bg-hb-600')}>
              {copied ? <><CheckCircle2 size={12} /> Copié !</> : 'Copier'}
            </button>
          </div>

          {/* Onglet Réseaux */}
          {tab === 'share' && (
            <div className="space-y-3">
              <button onClick={nativeShare}
                className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-colors text-sm">
                <Share2 size={16} /> Partager via mon téléphone
              </button>
              <div className="grid grid-cols-3 gap-2">
                {SOCIAL_PLATFORMS.map(p => (
                  <a key={p.id}
                    href={p.getUrl(url, shareText)}
                    target="_blank" rel="noopener noreferrer"
                    className={cn('py-3 rounded-2xl text-white text-xs font-semibold text-center hover:opacity-90 transition-opacity flex flex-col items-center gap-1', p.color)}>
                    <span className="text-base">{p.icon}</span>
                    {p.label}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Onglet Impression */}
          {tab === 'print' && (
            <div className="space-y-4">
              <p className="text-xs text-hb-400 leading-relaxed">
                Choisissez le format adapté à votre usage — flyers de quartier, cartes de visite agents, badges ou grandes affiches.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {PRINT_FORMATS.map(f => (
                  <button key={f.id} onClick={() => setActiveFormat(f.id)}
                    className={cn('p-4 rounded-2xl border-2 text-left transition-all',
                      activeFormat === f.id
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20'
                        : 'border-hb-200 dark:border-hb-600 hover:border-hb-300')}>
                    <f.icon size={18} className={activeFormat === f.id ? 'text-brand-500' : 'text-hb-400'} />
                    <p className={cn('font-semibold text-sm mt-2', activeFormat === f.id ? 'text-brand-700 dark:text-brand-300' : 'text-hb-700 dark:text-white')}>
                      {f.label}
                    </p>
                    <p className="text-xs text-hb-400 mt-0.5">{f.desc}</p>
                    <p className="text-xs text-hb-300 mt-1 font-mono">{f.size}</p>
                  </button>
                ))}
              </div>
              <button onClick={printDocument}
                className="w-full py-3.5 bg-hb-700 hover:opacity-90 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-opacity text-sm">
                <Printer size={17} /> Imprimer {PRINT_FORMATS.find(f => f.id === activeFormat)?.label}
              </button>
              <p className="text-xs text-center text-hb-300">Une fenêtre d&apos;impression s&apos;ouvrira automatiquement</p>
            </div>
          )}

          {/* Onglet Télécharger */}
          {tab === 'download' && (
            <div className="space-y-3">
              <p className="text-xs text-hb-400 leading-relaxed">
                Téléchargez votre QR code en haute résolution pour l&apos;utiliser sur t-shirts, autocollants, dossiers, présentations...
              </p>
              <div className="space-y-3">
                {[
                  { format: 'png', label: 'PNG 2000×2000px', desc: 'Idéal pour impression, t-shirts, autocollants', badge: 'HAUTE RÉS.' },
                  { format: 'svg', label: 'SVG vectoriel', desc: 'Pour Illustrator, Inkscape, impression professionnelle', badge: 'INFINI' },
                ].map(d => (
                  <button key={d.format} onClick={() => downloadHighRes(d.format as 'png' | 'svg')}
                    className="w-full p-4 border-2 border-hb-200 dark:border-hb-600 rounded-2xl hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/20 transition-all flex items-center justify-between group">
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-hb-700 dark:text-white">{d.label}</p>
                        <span className="text-[10px] font-bold bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">{d.badge}</span>
                      </div>
                      <p className="text-xs text-hb-400 mt-0.5">{d.desc}</p>
                    </div>
                    <Download size={18} className="text-hb-400 group-hover:text-brand-500 transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl">
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  💡 <strong>Conseil impression t-shirt :</strong> Utilisez le SVG vectoriel chez un imprimeur sérigraphe pour une qualité parfaite quelle que soit la taille.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
