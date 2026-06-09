'use client'

/**
 * QRShareKit — Partage complet QR code Habynex
 * Réseaux sociaux, WhatsApp, impression, téléchargement haute résolution
 * Génère aussi un template d'impression A4 / carte de visite / badge
 */

import { useState, useRef } from 'react'
import { generateQR, qrToDataURL } from '@/lib/qr/qrGenerator'
import { HabynexQRCode } from '@/components/ui/QRCode'
import {
  Download, Printer, Share2, CheckCircle2, X,
  Smartphone, CreditCard, Shirt, ImageIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'

const LOGO_B64 = "data:image/png;base64,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"

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
    .logo { margin-bottom: 4mm; display: flex; align-items: center; justify-content: center; }
    .logo img { height: 40px; object-fit: contain; }
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
  <div class="logo"><img src="${LOGO_B64}" alt="Habynex" style="height:40px;object-fit:contain" /></div>
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
    const svg = generateQR(url, { foreground: '#1a1a2e', background: '#ffffff' })
    const svgWithLogo = svg.replace('</svg>',
      `<rect x="43%" y="43%" width="14%" height="14%" rx="3" fill="#ffffff"/>
       <image href="${LOGO_B64}" x="44%" y="44%" width="12%" height="12%"/>
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
