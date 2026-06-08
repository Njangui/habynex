/**
 * Watermark côté client — appliqué avant affichage
 * Protège les images contre les captures d'écran frauduleuses
 * Ne modifie PAS l'image en base — overlay Canvas dynamique
 */

export interface WatermarkOptions {
  text?: string          // texte principal (défaut: "HABYNEX")
  subtext?: string       // sous-texte (défaut: "Plateforme officielle")
  opacity?: number       // 0-1 (défaut: 0.18 — visible mais discret)
  color?: string         // couleur du texte (défaut: blanc)
  fontSize?: number      // taille de base en px (défaut: 18)
  repeat?: boolean       // répéter en grille (défaut: true)
  showLogo?: boolean     // afficher l'icône habynex (défaut: true)
}

/**
 * Applique un watermark sur une image et retourne un data URL
 * S'utilise avec <img src={watermarkedUrl} />
 */
export async function applyWatermark(
  imageUrl: string,
  options: WatermarkOptions = {}
): Promise<string> {
  const {
    text = 'HABYNEX',
    subtext = 'habynex.com',
    opacity = 0.18,
    color = '#ffffff',
    fontSize = 18,
    repeat = true,
  } = options

  const img = await loadImageFromUrl(imageUrl)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth || img.width
  canvas.height = img.naturalHeight || img.height
  const ctx = canvas.getContext('2d')!

  // Dessiner l'image originale
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  // Configurer le watermark
  ctx.globalAlpha = opacity
  ctx.fillStyle = color
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 4

  const scaleFactor = Math.max(canvas.width / 800, 0.8)
  const scaledFont = Math.round(fontSize * scaleFactor)

  if (repeat) {
    // Mode grille — watermark répété en diagonale
    ctx.save()
    const patternSpacingX = canvas.width / 3
    const patternSpacingY = canvas.height / 4

    for (let row = -1; row <= 4; row++) {
      for (let col = -1; col <= 3; col++) {
        const x = col * patternSpacingX + (row % 2) * (patternSpacingX / 2)
        const y = row * patternSpacingY

        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(-25 * Math.PI / 180)

        ctx.font = `bold ${scaledFont}px Inter, Arial, sans-serif`
        ctx.fillText(text, 0, 0)

        ctx.font = `${Math.round(scaledFont * 0.65)}px Inter, Arial, sans-serif`
        ctx.fillText(subtext, 0, scaledFont + 4)

        ctx.restore()
      }
    }
    ctx.restore()
  } else {
    // Mode coin bas-droit — watermark unique
    ctx.save()
    ctx.font = `bold ${scaledFont}px Inter, Arial, sans-serif`
    const metrics = ctx.measureText(text)
    const padding = 16
    const x = canvas.width - metrics.width - padding
    const y = canvas.height - padding * 2

    ctx.fillText(text, x, y)
    ctx.font = `${Math.round(scaledFont * 0.7)}px Inter, Arial, sans-serif`
    ctx.fillText(subtext, x, y + scaledFont + 4)
    ctx.restore()
  }

  ctx.globalAlpha = 1.0
  return canvas.toDataURL('image/jpeg', 0.92)
}

/**
 * Hook React pour watermarker automatiquement une URL d'image
 */
import { useState, useEffect } from 'react'

export function useWatermarkedImage(
  src: string | null | undefined,
  options: WatermarkOptions = {},
  enabled = true
): { url: string | null; loading: boolean } {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!src || !enabled) {
      setUrl(src ?? null)
      return
    }

    let cancelled = false
    setLoading(true)

    applyWatermark(src, options)
      .then(watermarked => {
        if (!cancelled) { setUrl(watermarked); setLoading(false) }
      })
      .catch(() => {
        // Si erreur (CORS etc.), afficher l'image originale sans watermark
        if (!cancelled) { setUrl(src); setLoading(false) }
      })

    return () => { cancelled = true }
  }, [src, enabled])

  return { url, loading }
}

// ── Helper ───────────────────────────────────────────────────────
function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Impossible de charger: ${url}`))
    img.src = url
  })
}
