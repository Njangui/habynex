'use client'

/**
 * Composant d'upload d'images avec compression automatique
 * - Compression WebP avant upload (gain 60-80% de taille)
 * - Barre de progression avec taux de compression affiché
 * - Preview immédiat
 * - Optimisé pour connexions lentes Cameroun
 */

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Upload, X, CheckCircle2, Loader2, ImagePlus, Zap } from 'lucide-react'
import { compressImage, compressMultiple, type CompressResult } from '@/lib/image/compress'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface ImageUploaderProps {
  onFilesReady: (files: File[]) => void
  maxFiles?: number
  maxSizeKB?: number
  className?: string
  label?: string
}

interface PreviewItem {
  id: string
  preview: string
  result: CompressResult
  status: 'compressing' | 'ready'
}

export function ImageUploader({
  onFilesReady,
  maxFiles = 10,
  maxSizeKB = 400,
  className,
  label = 'Ajouter des photos',
}: ImageUploaderProps) {
  const [items, setItems] = useState<PreviewItem[]>([])
  const [compressing, setCompressing] = useState(false)
  const [progress, setProgress] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef(false)
  const [dragging, setDragging] = useState(false)

  const processFiles = useCallback(async (rawFiles: FileList | File[]) => {
    const files = Array.from(rawFiles).filter(f => f.type.startsWith('image/'))
    if (!files.length) return

    const remaining = maxFiles - items.length
    if (remaining <= 0) { toast.error(`Maximum ${maxFiles} photos`); return }
    const toProcess = files.slice(0, remaining)

    setCompressing(true)
    setProgress(0)

    try {
      const results = await compressMultiple(
        toProcess,
        { maxSizeKB, outputFormat: 'webp', maxWidthPx: 1920, maxHeightPx: 1080 },
        (done, total) => setProgress(Math.round((done / total) * 100))
      )

      const newItems: PreviewItem[] = await Promise.all(
        results.map(async (result) => ({
          id: Math.random().toString(36).slice(2),
          preview: URL.createObjectURL(result.file),
          result,
          status: 'ready' as const,
        }))
      )

      setItems(prev => {
        const updated = [...prev, ...newItems]
        onFilesReady(updated.map(i => i.result.file))
        return updated
      })

      const totalReduction = Math.round(
        results.reduce((acc, r) => acc + r.reductionPercent, 0) / results.length
      )
      toast.success(`✓ ${results.length} photo(s) — poids réduit de ${totalReduction}%`)
    } catch {
      toast.error('Erreur lors de la compression')
    } finally {
      setCompressing(false)
      setProgress(0)
    }
  }, [items.length, maxFiles, maxSizeKB, onFilesReady])

  function removeItem(id: string) {
    setItems(prev => {
      const updated = prev.filter(i => i.id !== id)
      updated.forEach(i => { /* keep preview */ })
      onFilesReady(updated.map(i => i.result.file))
      return updated
    })
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Zone de drop */}
      <div
        onDragOver={e => { e.preventDefault(); if (!dragRef.current) { dragRef.current = true; setDragging(true) } }}
        onDragLeave={() => { dragRef.current = false; setDragging(false) }}
        onDrop={e => { e.preventDefault(); dragRef.current = false; setDragging(false); processFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all',
          dragging
            ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20'
            : 'border-hb-200 dark:border-hb-600 hover:border-brand-400 hover:bg-hb-50 dark:hover:bg-hb-700/50',
          compressing && 'pointer-events-none'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => e.target.files && processFiles(e.target.files)}
        />

        {compressing ? (
          <div className="space-y-3">
            <Loader2 size={32} className="animate-spin text-brand-500 mx-auto" />
            <p className="text-sm font-medium text-hb-600 dark:text-hb-300">Compression en cours…</p>
            <div className="w-full bg-hb-100 dark:bg-hb-700 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-hb-400">{progress}%</p>
          </div>
        ) : (
          <div className="space-y-2">
            <ImagePlus size={32} className="text-hb-300 mx-auto" />
            <p className="text-sm font-semibold text-hb-600 dark:text-hb-300">{label}</p>
            <p className="text-xs text-hb-400">Glissez ou cliquez · JPG, PNG, HEIC</p>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <Zap size={12} className="text-brand-500" />
              <p className="text-xs text-brand-500 font-medium">Compression automatique WebP</p>
            </div>
          </div>
        )}
      </div>

      {/* Previews */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {items.map((item, i) => (
            <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden group bg-hb-100">
              <Image src={item.preview} alt={`Photo ${i + 1}`} fill className="object-cover" sizes="120px" />

              {/* Badge compression */}
              <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-1">
                <Zap size={9} className="text-green-400" />
                -{item.result.reductionPercent}%
              </div>

              {/* Taille compressée */}
              <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-md">
                {item.result.compressedSizeKB}KB
              </div>

              {/* Bouton supprimer */}
              <button
                onClick={e => { e.stopPropagation(); removeItem(item.id) }}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
              >
                <X size={12} />
              </button>

              {item.status === 'ready' && (
                <div className="absolute bottom-1 right-1">
                  <CheckCircle2 size={14} className="text-green-400 drop-shadow" />
                </div>
              )}
            </div>
          ))}

          {/* Ajouter plus */}
          {items.length < maxFiles && (
            <button
              onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-hb-200 dark:border-hb-600 flex flex-col items-center justify-center gap-1 hover:border-brand-400 transition-colors"
            >
              <Upload size={18} className="text-hb-400" />
              <span className="text-[10px] text-hb-400">Ajouter</span>
            </button>
          )}
        </div>
      )}

      {/* Stats globales */}
      {items.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-xl">
          <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
          <p className="text-xs text-green-700 dark:text-green-400">
            <strong>{items.length}</strong> photo(s) ·{' '}
            Total compressé :{' '}
            <strong>{items.reduce((a, i) => a + i.result.compressedSizeKB, 0)}KB</strong>
            {' '}au lieu de{' '}
            <strong>{items.reduce((a, i) => a + i.result.originalSizeKB, 0)}KB</strong>
          </p>
        </div>
      )}
    </div>
  )
}
