'use client'

/**
 * Composant QR Code Habynex — Style Vercel
 * QR code propre avec coins arrondis, logo centré sur fond blanc, bordure subtile
 * Téléchargeable SVG / PNG haute qualité
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Download, Copy, Check, RefreshCw } from 'lucide-react'
import { generateQR } from '@/lib/qr/qrGenerator'
import { cn } from '@/lib/utils'

interface QRCodeProps {
  value: string
  size?: number
  label?: string
  sublabel?: string
  showActions?: boolean
  showLogo?: boolean
  className?: string
}

// Logo Habynex en base64 (SVG compact)
const LOGO_SVG = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23f95d1e'/><text x='50' y='67' font-size='52' text-anchor='middle' fill='white' font-family='Arial,sans-serif' font-weight='bold'>H</text></svg>`

export function HabynexQRCode({
  value,
  size = 240,
  label,
  sublabel,
  showActions = true,
  showLogo = true,
  className,
}: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const [copied, setCopied] = useState(false)
  const [svgString, setSvgString] = useState('')

  const draw = useCallback(() => {
    if (!value || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const DPR = 2 // Retina
    const px = size * DPR
    canvas.width = px
    canvas.height = px
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`

    // ── Fond blanc avec coins arrondis ─────────────────────────────
    ctx.clearRect(0, 0, px, px)
    ctx.fillStyle = '#ffffff'
    const r = 18 * DPR
    ctx.beginPath()
    ctx.moveTo(r, 0)
    ctx.lineTo(px - r, 0)
    ctx.quadraticCurveTo(px, 0, px, r)
    ctx.lineTo(px, px - r)
    ctx.quadraticCurveTo(px, px, px - r, px)
    ctx.lineTo(r, px)
    ctx.quadraticCurveTo(0, px, 0, r)
    ctx.lineTo(0, r)
    ctx.quadraticCurveTo(0, 0, r, 0)
    ctx.closePath()
    ctx.fill()

    // ── Générer le QR brut en SVG → rasteriser ──────────────────────
    try {
      const svg = generateQR(value, { foreground: '#111827', background: '#ffffff', margin: 2 })
      setSvgString(svg)

      const img = new Image()
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)

      img.onload = () => {
        URL.revokeObjectURL(url)
        const padding = 16 * DPR
        ctx.drawImage(img, padding, padding, px - padding * 2, px - padding * 2)

        // ── Logo centré ──────────────────────────────────────────────
        if (showLogo) {
          const logoSize = px * 0.16
          const logoX = (px - logoSize) / 2
          const logoY = (px - logoSize) / 2

          // Fond blanc derrière le logo (carré arrondi)
          ctx.fillStyle = '#ffffff'
          ctx.beginPath()
          const lr = 6 * DPR
          ctx.moveTo(logoX - lr, logoY - lr)
          ctx.roundRect(logoX - lr, logoY - lr, logoSize + lr * 2, logoSize + lr * 2, lr)
          ctx.fill()

          // Logo
          const logoImg = new Image()
          logoImg.onload = () => {
            ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize)
            setReady(true)
          }
          logoImg.src = LOGO_SVG
        } else {
          setReady(true)
        }
      }
      img.src = url
    } catch (e) {
      console.error('QR render error:', e)
    }
  }, [value, size, showLogo])

  useEffect(() => {
    setReady(false)
    draw()
  }, [draw])

  function downloadPNG() {
    if (!canvasRef.current) return
    const link = document.createElement('a')
    link.download = `habynex-qr-${label?.toLowerCase().replace(/\s+/g, '-') ?? 'code'}.png`
    link.href = canvasRef.current.toDataURL('image/png')
    link.click()
  }

  function downloadSVG() {
    if (!svgString) return
    const blob = new Blob([svgString], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `habynex-qr-${label?.toLowerCase().replace(/\s+/g, '-') ?? 'code'}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function copyURL() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      {/* QR Code canvas */}
      <div className="relative" style={{ width: size, height: size }}>
        {/* Ombre + bordure style Vercel */}
        <div className="absolute inset-0 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg" />
        <canvas
          ref={canvasRef}
          className="rounded-2xl"
          style={{ display: ready ? 'block' : 'none', width: size, height: size }}
        />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900 rounded-2xl">
            <RefreshCw size={22} className="animate-spin text-gray-300" />
          </div>
        )}
      </div>

      {/* Labels */}
      {(label || sublabel) && (
        <div className="text-center">
          {label && <p className="font-semibold text-sm text-gray-800 dark:text-white">{label}</p>}
          {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
        </div>
      )}

      {/* Actions */}
      {showActions && ready && (
        <div className="flex gap-2">
          <button onClick={downloadPNG}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity">
            <Download size={12} /> PNG
          </button>
          <button onClick={downloadSVG}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-xl transition-colors">
            <Download size={12} /> SVG
          </button>
          <button onClick={copyURL}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
            {copied ? 'Copié !' : 'URL'}
          </button>
        </div>
      )}
    </div>
  )
}
