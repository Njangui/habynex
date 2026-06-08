/**
 * Compression intelligente d'images côté client
 * Optimisé pour connexions instables et appareils bas de gamme (Cameroun)
 * - Conversion WebP automatique
 * - Qualité adaptative selon taille du fichier
 * - Resize si trop grande résolution
 * - Retour de la progression pour UX
 */

export interface CompressOptions {
  maxWidthPx?: number      // largeur max (défaut: 1920)
  maxHeightPx?: number     // hauteur max (défaut: 1080)
  qualityHigh?: number     // qualité si < 500KB (défaut: 0.85)
  qualityMid?: number      // qualité si 500KB–2MB (défaut: 0.75)
  qualityLow?: number      // qualité si > 2MB (défaut: 0.60)
  maxSizeKB?: number       // taille cible max en KB (défaut: 400)
  outputFormat?: 'webp' | 'jpeg'
}

export interface CompressResult {
  file: File
  originalSizeKB: number
  compressedSizeKB: number
  reductionPercent: number
  width: number
  height: number
}

/**
 * Compresse une image avec canvas — aucune lib externe
 */
export async function compressImage(
  input: File,
  options: CompressOptions = {}
): Promise<CompressResult> {
  const {
    maxWidthPx = 1920,
    maxHeightPx = 1080,
    qualityHigh = 0.85,
    qualityMid = 0.75,
    qualityLow = 0.60,
    maxSizeKB = 400,
    outputFormat = 'webp',
  } = options

  const originalSizeKB = Math.round(input.size / 1024)

  // Choisir la qualité selon la taille originale
  let quality: number
  if (originalSizeKB < 500) quality = qualityHigh
  else if (originalSizeKB < 2000) quality = qualityMid
  else quality = qualityLow

  // Charger l'image dans un élément <img>
  const img = await loadImage(input)

  // Calculer les nouvelles dimensions (conserver ratio)
  let { width, height } = img
  if (width > maxWidthPx || height > maxHeightPx) {
    const ratio = Math.min(maxWidthPx / width, maxHeightPx / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  // Dessiner sur canvas et compresser
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, width, height)

  // Première compression
  let blob = await canvasToBlob(canvas, outputFormat, quality)

  // Si encore trop lourd, réduire encore la qualité progressivement
  let attempts = 0
  while (blob.size / 1024 > maxSizeKB && quality > 0.30 && attempts < 5) {
    quality = Math.max(quality - 0.10, 0.30)
    blob = await canvasToBlob(canvas, outputFormat, quality)
    attempts++
  }

  const compressedSizeKB = Math.round(blob.size / 1024)
  const reductionPercent = Math.round((1 - blob.size / input.size) * 100)

  const fileName = input.name.replace(/\.[^.]+$/, `.${outputFormat}`)
  const file = new File([blob], fileName, { type: `image/${outputFormat}` })

  return { file, originalSizeKB, compressedSizeKB, reductionPercent, width, height }
}

/**
 * Compresse plusieurs images en parallèle (max 3 à la fois pour bas de gamme)
 */
export async function compressMultiple(
  files: File[],
  options: CompressOptions = {},
  onProgress?: (done: number, total: number) => void
): Promise<CompressResult[]> {
  const results: CompressResult[] = []
  const batchSize = 3 // Limiter pour appareils bas de gamme

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(f => compressImage(f, options)))
    results.push(...batchResults)
    onProgress?.(Math.min(i + batchSize, files.length), files.length)
  }

  return results
}

// ── Helpers ──────────────────────────────────────────────────────
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image invalide')) }
    img.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, format: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Canvas vide')),
      `image/${format}`,
      quality
    )
  })
}
