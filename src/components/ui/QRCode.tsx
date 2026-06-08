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
    `<rect x="46%" y="46%" width="8%" height="8%" rx="2" fill="${background}"/>
     <text x="50%" y="52.5%" text-anchor="middle" font-size="8%" font-family="Arial" font-weight="bold" fill="#f95d1e">H</text>
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
