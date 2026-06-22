'use client'

/**
 * VirtualTourViewer.tsx — Visite virtuelle 360°
 * Rendu d'images panoramiques équirectangulaires en CSS pur (drag to look around)
 * Pas de dépendance externe lourde — fonctionne avec n'importe quelle image 360° standard
 *
 * Structure attendue de `scenes` (jsonb) :
 * [
 *   { "id": "salon", "label": "Salon", "image_url": "https://...", "initial_yaw": 0 },
 *   { "id": "chambre1", "label": "Chambre 1", "image_url": "https://...", "initial_yaw": 90 }
 * ]
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { Maximize2, X, ChevronLeft, ChevronRight, RotateCcw, Move } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Scene {
  id: string
  label: string
  image_url: string
  initial_yaw?: number
}

interface VirtualTourViewerProps {
  scenes: Scene[]
  className?: string
}

export function VirtualTourViewer({ scenes, className }: VirtualTourViewerProps) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [yaw, setYaw] = useState(scenes[0]?.initial_yaw ?? 0) // rotation horizontale 0-360
  const [pitch, setPitch] = useState(0) // inclinaison verticale -30 à 30
  const [dragging, setDragging] = useState(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const activeScene = scenes[activeIdx]

  useEffect(() => {
    setYaw(activeScene?.initial_yaw ?? 0)
    setPitch(0)
  }, [activeIdx, activeScene?.initial_yaw])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setDragging(true)
    lastPos.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    setYaw(prev => (prev - dx * 0.25 + 360) % 360)
    setPitch(prev => Math.max(-30, Math.min(30, prev + dy * 0.15)))
    lastPos.current = { x: e.clientX, y: e.clientY }
  }, [dragging])

  const handlePointerUp = useCallback(() => setDragging(false), [])

  function resetView() {
    setYaw(activeScene?.initial_yaw ?? 0)
    setPitch(0)
  }

  if (!scenes.length) return null

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-hb-700 dark:text-white flex items-center gap-2">
          <Move size={18} className="text-brand-500" />
          Visite virtuelle 360°
        </h2>
        <button
          onClick={() => setFullscreen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-hb-100 dark:bg-hb-700 rounded-xl text-xs font-semibold text-hb-600 dark:text-hb-300 hover:bg-hb-200 dark:hover:bg-hb-600 transition-colors"
        >
          <Maximize2 size={12} /> Plein écran
        </button>
      </div>

      {/* Viewer compact */}
      <TourCanvas
        scene={activeScene}
        yaw={yaw}
        pitch={pitch}
        dragging={dragging}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        height={320}
        onReset={resetView}
      />

      {/* Navigation entre scènes */}
      {scenes.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {scenes.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setActiveIdx(i)}
              className={cn(
                'flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium border-2 transition-all whitespace-nowrap',
                i === activeIdx
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20 text-brand-600'
                  : 'border-hb-200 dark:border-hb-700 text-hb-500 hover:border-hb-300'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Modal plein écran */}
      {fullscreen && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 bg-black/80">
            <p className="text-white font-semibold text-sm">{activeScene?.label}</p>
            <div className="flex items-center gap-2">
              <button onClick={resetView} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                <RotateCcw size={16} />
              </button>
              <button onClick={() => setFullscreen(false)} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 relative">
            <TourCanvas
              scene={activeScene}
              yaw={yaw}
              pitch={pitch}
              dragging={dragging}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              height="100%"
              fullscreenMode
            />

            {scenes.length > 1 && (
              <>
                <button
                  onClick={() => setActiveIdx(i => (i - 1 + scenes.length) % scenes.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => setActiveIdx(i => (i + 1) % scenes.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}
          </div>

          {/* Liste des scènes en bas (plein écran) */}
          {scenes.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 py-3 bg-black/80">
              {scenes.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setActiveIdx(i)}
                  className={cn(
                    'flex-shrink-0 px-4 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap',
                    i === activeIdx ? 'bg-brand-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Canvas de rendu panoramique ──────────────────────────────────────
function TourCanvas({
  scene, yaw, pitch, dragging, onPointerDown, onPointerMove, onPointerUp,
  height, fullscreenMode = false, onReset,
}: {
  scene: Scene; yaw: number; pitch: number; dragging: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: () => void
  height: number | string
  fullscreenMode?: boolean
  onReset?: () => void
}) {
  if (!scene) return null

  // Translation de l'image panoramique en fonction du yaw/pitch
  // Une image équirectangulaire fait habituellement 2:1 (largeur:hauteur)
  // On déplace le background-position pour simuler la rotation de la "caméra"
  const bgPosX = (yaw / 360) * 100 // 0-100%
  const bgPosY = 50 + (pitch / 60) * 25 // centré avec léger décalage vertical

  return (
    <div
      className="relative rounded-2xl overflow-hidden bg-hb-900 select-none touch-none"
      style={{ height, cursor: dragging ? 'grabbing' : 'grab' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/* Image panoramique — répétée horizontalement pour la boucle 360° */}
      <div
        className="absolute inset-0 transition-none"
        style={{
          backgroundImage: `url(${scene.image_url})`,
          backgroundRepeat: 'repeat-x',
          backgroundSize: '200% 200%',
          backgroundPosition: `${bgPosX}% ${bgPosY}%`,
        }}
      />

      {/* Vignette / overlay pour effet immersif */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10 pointer-events-none" />

      {/* Indicateur drag (apparaît seulement la 1ère fois, non-fullscreen) */}
      {!fullscreenMode && !dragging && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-black/50 rounded-full pointer-events-none">
          <Move size={12} className="text-white" />
          <span className="text-white text-xs font-medium">Glissez pour explorer</span>
        </div>
      )}

      {!fullscreenMode && onReset && (
        <button
          onClick={e => { e.stopPropagation(); onReset() }}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
        >
          <RotateCcw size={13} />
        </button>
      )}
    </div>
  )
}
