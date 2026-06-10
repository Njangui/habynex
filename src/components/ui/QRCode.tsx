'use client'

/**
 * Composant QR Code universel Habynex
 * Génère un QR code SVG avec logo Habynex centré
 * Téléchargeable en SVG/PNG
 */

import { useState, useEffect, useRef } from 'react'
import { Download, Copy, Check, RefreshCw } from 'lucide-react'
import { generateQR, qrToDataURL } from '@/lib/qr/qrGenerator'
import { cn } from '@/lib/utils'

interface QRCodeProps {
  value: string
  size?: number
  label?: string
  sublabel?: string
  showActions?: boolean
  showLogo?: boolean
  className?: string
  foreground?: string
  background?: string
}

const LOGO_B64 = "data:image/png;base64,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"

export function HabynexQRCode({
  value,
  size = 240,
  label,
  sublabel,
  showActions = true,
  showLogo = true,
  className,
  foreground = '#1a1a2e',
  background = '#ffffff',
}: QRCodeProps) {
  const [svg, setSvg] = useState('')
  const [copied, setCopied] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!value) return
    try {
      const qrSvg = generateQR(value, { foreground, background })
      setSvg(qrSvg)
    } catch (e) {
      console.error('QR error:', e)
    }
  }, [value, foreground, background])

  // Ajouter le logo Habynex au centre du QR
  const svgWithLogo = svg ? svg.replace(
    '</svg>',
    `<rect x="43%" y="43%" width="14%" height="14%" rx="3" fill="${background}"/>
     <image href={LOGO_B64} x="44%" y="44%" width="12%" height="12%"/>
     </svg>`
  ) : ''

  function downloadSVG() {
    if (!svgWithLogo) return
    const blob = new Blob([svgWithLogo], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `habynex-qr-${label?.toLowerCase().replace(/\s+/g, '-') ?? 'code'}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  function downloadPNG() {
    if (!svgWithLogo) return
    const canvas = document.createElement('canvas')
    const pxSize = size * 2 // 2x pour la qualité
    canvas.width = pxSize
    canvas.height = pxSize
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    const dataUrl = qrToDataURL(svgWithLogo)
    img.onload = () => {
      ctx.drawImage(img, 0, 0, pxSize, pxSize)
      const link = document.createElement('a')
      link.download = `habynex-qr-${label?.toLowerCase().replace(/\s+/g, '-') ?? 'code'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = dataUrl
  }

  async function copyURL() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      {/* QR Code */}
      <div
        ref={containerRef}
        className="relative bg-white rounded-2xl p-4 shadow-airbnb border border-hb-100"
        style={{ width: size, height: size }}
      >
        {svg ? (
          <div
            dangerouslySetInnerHTML={{ __html: svgWithLogo }}
            className="w-full h-full"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <RefreshCw size={24} className="animate-spin text-hb-300" />
          </div>
        )}
      </div>

      {/* Labels */}
      {(label || sublabel) && (
        <div className="text-center">
          {label && <p className="font-semibold text-sm text-hb-700 dark:text-white">{label}</p>}
          {sublabel && <p className="text-xs text-hb-400 mt-0.5">{sublabel}</p>}
        </div>
      )}

      {/* Actions */}
      {showActions && svg && (
        <div className="flex gap-2">
          <button onClick={downloadSVG}
            className="flex items-center gap-1.5 px-3 py-2 bg-hb-700 text-white text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity">
            <Download size={13} /> SVG
          </button>
          <button onClick={downloadPNG}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-500 text-white text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity">
            <Download size={13} /> PNG
          </button>
          <button onClick={copyURL}
            className="flex items-center gap-1.5 px-3 py-2 border border-hb-200 dark:border-hb-600 text-hb-600 dark:text-hb-300 text-xs font-medium rounded-xl hover:bg-hb-50 transition-colors">
            {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
            {copied ? 'Copié !' : 'URL'}
          </button>
        </div>
      )}
    </div>
  )
}
