'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { CheckCircle2, Download, PenLine, Loader2, X, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface AgentContractProps {
  agentName: string
  agentId: string
  onSigned?: () => void
}

export function AgentContract({ agentName, agentId, onSigned }: AgentContractProps) {
  const supabase = createClient()
  const { user } = useAuthStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [signing, setSigning] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [fingerprint, setFingerprint] = useState('')
  const [loading, setLoading] = useState(false)
  const [signed, setSigned] = useState(false)
  const [signedAt, setSignedAt] = useState('')
  const [contractId, setContractId] = useState('')
  const lastPoint = useRef<{ x: number; y: number } | null>(null)

  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  useEffect(() => {
    // Générer une empreinte unique de l'appareil
    const fp = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
    ].join('|')
    setFingerprint(btoa(fp).slice(0, 32))
  }, [])

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    setIsDrawing(true)
    lastPoint.current = getPos(e)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!isDrawing || !canvasRef.current || !lastPoint.current) return
    const ctx = canvasRef.current.getContext('2d')!
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1a1a2e'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    lastPoint.current = pos
    setHasSignature(true)
  }

  function stopDraw() { setIsDrawing(false); lastPoint.current = null }

  function clearSignature() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  async function handleSign() {
    if (!hasSignature || !agreed) {
      toast.error('Veuillez signer et cocher les cases')
      return
    }
    setLoading(true)
    try {
      const signatureData = canvasRef.current?.toDataURL('image/png') ?? ''
      const id = crypto.randomUUID ? crypto.randomUUID() : `contract-${Date.now()}`
      const at = new Date().toISOString()

      // Sauvegarder en base
      const { error } = await supabase.from('agent_contracts').upsert({
        id,
        agent_id: agentId,
        signature_data: signatureData,
        fingerprint,
        signed_at: at,
        ip_info: null,
        status: 'signed',
      })
      if (error) throw error

      setContractId(id)
      setSignedAt(at)
      setSigned(true)
      toast.success('Contrat signé avec succès !')
      onSigned?.()
    } catch {
      toast.error('Erreur lors de la signature')
    } finally {
      setLoading(false)
    }
  }

  async function downloadPDF() {
    // Génération PDF côté client avec la fenêtre d'impression
    const printContent = document.getElementById('habynex-contract')
    if (!printContent) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Contrat Agent Habynex — ${agentName}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a2e; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { color: #f95d1e; font-size: 22px; text-align: center; }
          h2 { font-size: 14px; color: #1a1a2e; margin-top: 20px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
          p, li { line-height: 1.6; margin: 6px 0; }
          .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 6px; }
          .signature-box { border: 2px solid #1a1a2e; border-radius: 8px; padding: 10px; margin-top: 20px; text-align: center; }
          img { max-width: 200px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>${printContent.innerHTML}</body>
      </html>
    `)
    win.document.close()
    win.print()
  }

  if (signed) {
    return (
      <div className="p-8 text-center space-y-4">
        <CheckCircle2 size={56} className="text-green-500 mx-auto" />
        <h2 className="text-xl font-bold text-hb-700 dark:text-white">Contrat signé avec succès !</h2>
        <p className="text-sm text-hb-400">Signé le {new Date(signedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        <p className="text-xs text-hb-300 font-mono">Réf : {contractId.slice(0, 16).toUpperCase()}</p>
        <button onClick={downloadPDF}
          className="flex items-center gap-2 px-5 py-2.5 bg-hb-700 text-white rounded-full font-semibold text-sm mx-auto hover:opacity-90 transition-opacity">
          <Download size={16} /> Télécharger en PDF
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Document contrat */}
      <div id="habynex-contract" className="bg-white dark:bg-hb-800 rounded-3xl border border-hb-200 dark:border-hb-600 p-8 mb-6 text-sm space-y-5 max-h-[60vh] overflow-y-auto">
        <div className="text-center border-b border-hb-100 dark:border-hb-700 pb-6">
          <h1 className="text-2xl font-bold text-brand-500">HABYNEX</h1>
          <h2 className="text-lg font-bold text-hb-700 dark:text-white mt-2">CONTRAT DE PRESTATION — AGENT HABYNEX</h2>
          <p className="text-hb-400 text-xs mt-1">Référence : HAB-AGT-{Date.now().toString().slice(-8)}</p>
        </div>

        <ContractSection title="ENTRE LES PARTIES">
          <p><strong>Habynex</strong>, plateforme immobilière numérique, dont le siège social est à Yaoundé, Cameroun (ci-après « Habynex » ou « la Plateforme »),</p>
          <p>ET</p>
          <p><strong>{agentName}</strong> (ci-après « l'Agent »), dont les coordonnées sont enregistrées dans le système Habynex.</p>
        </ContractSection>

        <ContractSection title="ARTICLE 1 — OBJET DU CONTRAT">
          <p>Le présent contrat a pour objet de définir les conditions dans lesquelles l'Agent intervient en qualité de prestataire indépendant pour le compte d'Habynex afin d'accompagner les clients lors des visites de biens immobiliers référencés sur la plateforme.</p>
        </ContractSection>

        <ContractSection title="ARTICLE 2 — MISSIONS DE L'AGENT">
          <ul className="list-disc pl-5 space-y-1">
            <li>Contacter les clients dans les 2 heures suivant l'attribution d'une mission de visite.</li>
            <li>Accompagner le client sur le terrain pour visiter les biens sélectionnés.</li>
            <li>Fournir des informations honnêtes et précises sur les biens visités.</li>
            <li>Renseigner le rapport de visite sur la plateforme dans les 24h suivant la visite.</li>
            <li>Maintenir un comportement professionnel, ponctuel et respectueux en toutes circonstances.</li>
          </ul>
        </ContractSection>

        <ContractSection title="ARTICLE 3 — RÉMUNÉRATION">
          <p>L'Agent perçoit une rémunération composée de deux éléments :</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Salaire fixe :</strong> 50 000 FCFA par mois, versé le 1er de chaque mois via la plateforme Habynex, sous réserve d'avoir effectué au minimum 4 missions dans le mois.
            </li>
            <li>
              <strong>Indemnité de déplacement :</strong> 1 000 FCFA par jour de mission active, c'est-à-dire toute journée au cours de laquelle l'agent a effectué et validé au moins une visite terrain. Cette indemnité est versée chaque vendredi pour les jours de la semaine écoulée.
            </li>
          </ul>
          <p className="mt-3 font-semibold text-red-600 dark:text-red-400">⚠️ Toutes les rémunérations sont versées exclusivement via la plateforme Habynex. L'Agent ne peut en aucun cas percevoir des fonds directement auprès des clients pour des prestations officielles Habynex.</p>
        </ContractSection>

        <ContractSection title="ARTICLE 4 — OBLIGATIONS DE L'AGENT">
          <ul className="list-disc pl-5 space-y-1">
            <li>Ne jamais recevoir de paiements en dehors de la plateforme Habynex.</li>
            <li>Ne jamais promettre un bien à un client contre une rémunération personnelle.</li>
            <li>Signaler immédiatement tout propriétaire ou bien suspect à l'équipe Habynex.</li>
            <li>Maintenir son téléphone actif et disponible pendant les heures de travail.</li>
            <li>Ne pas partager les informations confidentielles des clients avec des tiers.</li>
            <li>Respecter les politiques de traitement des données personnelles d'Habynex.</li>
          </ul>
        </ContractSection>

        <ContractSection title="ARTICLE 5 — RÉSILIATION">
          <p>Le présent contrat peut être résilié :</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Par Habynex :</strong> immédiatement et sans préavis en cas de faute grave (fraude, perception illicite de fonds, comportement irrespectueux envers un client).</li>
            <li><strong>Par l'Agent :</strong> avec un préavis de 7 jours notifié via la plateforme ou par WhatsApp au +237 654 888 084.</li>
          </ul>
        </ContractSection>

        <ContractSection title="ARTICLE 6 — DROIT APPLICABLE">
          <p>Le présent contrat est soumis au droit camerounais. En cas de litige, les parties conviennent de rechercher une solution amiable. À défaut, les tribunaux compétents de Yaoundé seront saisis.</p>
        </ContractSection>

        <div className="border-t border-hb-100 dark:border-hb-700 pt-5 space-y-3">
          <p className="text-xs text-hb-400">Fait à Yaoundé, le <strong>{today}</strong></p>
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <p className="text-xs font-semibold text-hb-600 dark:text-hb-300 mb-2">Pour Habynex</p>
              <div className="border border-hb-200 rounded-lg h-16 flex items-center justify-center">
                <p className="text-sm font-bold text-brand-500">Habynex</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-hb-600 dark:text-hb-300 mb-2">L'Agent — {agentName}</p>
              {hasSignature && canvasRef.current && (
                <img src={canvasRef.current.toDataURL()} alt="Signature" className="border border-hb-200 rounded-lg h-16 mx-auto object-contain" />
              )}
            </div>
          </div>
          {signed && (
            <p className="text-xs text-hb-400 text-center">Empreinte numérique : <span className="font-mono">{fingerprint}</span></p>
          )}
        </div>
      </div>

      {/* Zone de signature */}
      <div className="bg-white dark:bg-hb-800 rounded-3xl border border-hb-200 dark:border-hb-600 p-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <PenLine size={18} className="text-brand-500" />
          <h3 className="font-semibold text-hb-700 dark:text-white">Signature électronique</h3>
        </div>

        <div className="relative">
          <canvas
            ref={canvasRef}
            width={600}
            height={140}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
            className="w-full border-2 border-dashed border-hb-300 dark:border-hb-600 rounded-2xl bg-gray-50 dark:bg-hb-900 cursor-crosshair touch-none"
            style={{ touchAction: 'none' }}
          />
          {!hasSignature && (
            <p className="absolute inset-0 flex items-center justify-center text-hb-300 text-sm pointer-events-none select-none">
              Signez ici avec votre doigt ou votre souris
            </p>
          )}
          {hasSignature && (
            <button onClick={clearSignature}
              className="absolute top-2 right-2 w-8 h-8 bg-red-50 dark:bg-red-950/30 text-red-400 rounded-full flex items-center justify-center hover:bg-red-100 transition-colors">
              <RefreshCw size={14} />
            </button>
          )}
        </div>

        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-hb-300 text-brand-500 flex-shrink-0" />
            <span className="text-sm text-hb-600 dark:text-hb-300">
              J'ai lu et j'accepte l'intégralité des conditions du contrat d'agent Habynex, incluant l'interdiction formelle de percevoir des paiements en dehors de la plateforme.
            </span>
          </label>
        </div>

        <div className="flex gap-3">
          <button onClick={handleSign} disabled={loading || !hasSignature || !agreed}
            className="flex-1 py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-40">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Signer le contrat
          </button>
          <button onClick={downloadPDF}
            className="px-5 py-3.5 border-2 border-hb-200 dark:border-hb-600 text-hb-600 dark:text-hb-300 rounded-2xl hover:bg-hb-50 dark:hover:bg-hb-700 transition-colors flex items-center gap-2 text-sm font-medium">
            <Download size={16} /> PDF
          </button>
        </div>

        <p className="text-xs text-center text-hb-300">
          Empreinte numérique de l'appareil : <span className="font-mono">{fingerprint}</span>
        </p>
      </div>
    </div>
  )
}

function ContractSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-bold text-hb-700 dark:text-white text-sm mb-2 uppercase tracking-wide">{title}</h3>
      <div className="text-hb-500 dark:text-hb-300 space-y-2">{children}</div>
    </div>
  )
}
