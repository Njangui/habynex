'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { CheckCircle2, Download, PenLine, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface AgentContractProps {
  agentName: string
  agentId: string
  roleType?: 'agent' | 'photographer'
  onSigned?: () => void
}

interface ContractTemplate {
  id: string
  title: string
  version: string
  content: {
    articles: { id: string; title: string; body: string }[]
    remuneration: {
      fixed_salary: number
      min_missions: number
      daily_allowance: number
      payment_day: string
      allowance_payment: string
      notes: string
    }
  }
}

export function AgentContract({ agentName, agentId, roleType = 'agent', onSigned }: AgentContractProps) {
  const supabase = createClient()
  const { user } = useAuthStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [template, setTemplate] = useState<ContractTemplate | null>(null)
  const [loadingTemplate, setLoadingTemplate] = useState(true)

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
    // Générer empreinte
    const fp = [navigator.userAgent, navigator.language, screen.width + 'x' + screen.height, new Date().getTimezoneOffset()].join('|')
    setFingerprint(btoa(fp).slice(0, 32))

    // Vérifier si déjà signé
    checkAlreadySigned()

    // Charger le template actif
    loadTemplate()
  }, [])

  async function checkAlreadySigned() {
    const { data } = await supabase.from('agent_contracts').select('id, signed_at').eq('agent_id', agentId).eq('status', 'signed').single()
    if (data) { setSigned(true); setSignedAt(data.signed_at); setContractId(data.id) }
  }

  async function loadTemplate() {
    setLoadingTemplate(true)
    const { data } = await supabase
      .from('contract_templates')
      .select('id, title, version, content')
      .eq('type', roleType)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Fallback vers le contrat par défaut si pas de template en base
    if (data) {
      setTemplate(data as ContractTemplate)
    } else {
      setTemplate(DEFAULT_TEMPLATE)
    }
    setLoadingTemplate(false)
  }

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault(); setIsDrawing(true); lastPoint.current = getPos(e)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!isDrawing || !canvasRef.current || !lastPoint.current) return
    const ctx = canvasRef.current.getContext('2d')!
    const pos = getPos(e)
    ctx.beginPath(); ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
    ctx.lineTo(pos.x, pos.y); ctx.strokeStyle = '#1a1a2e'
    ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke()
    lastPoint.current = pos; setHasSignature(true)
  }

  function stopDraw() { setIsDrawing(false); lastPoint.current = null }

  function clearSignature() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  async function handleSign() {
    if (!hasSignature || !agreed) { toast.error('Veuillez signer et cocher la case'); return }
    setLoading(true)
    try {
      const signatureData = canvasRef.current?.toDataURL('image/png') ?? ''
      const id = crypto.randomUUID ? crypto.randomUUID() : `contract-${Date.now()}`
      const at = new Date().toISOString()

      const { error } = await supabase.from('agent_contracts').upsert({
        id, agent_id: agentId, template_id: template?.id ?? null,
        signature_data: signatureData, fingerprint, signed_at: at,
        ip_info: null, status: 'signed',
      })
      if (error) throw error

      setContractId(id); setSignedAt(at); setSigned(true)
      toast.success('Contrat signé avec succès !')
      onSigned?.()
    } catch { toast.error('Erreur lors de la signature') }
    finally { setLoading(false) }
  }

  async function downloadPDF() {
    const printContent = document.getElementById('habynex-contract')
    if (!printContent) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Contrat ${agentName}</title>
      <style>body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a2e;padding:40px;max-width:800px;margin:0 auto}
      h1{color:#f95d1e;font-size:22px;text-align:center}h2{font-size:14px;margin-top:20px;border-bottom:1px solid #eee;padding-bottom:4px}
      p,li{line-height:1.6;margin:6px 0}.warning{background:#fff3cd;border:1px solid #ffc107;padding:10px;border-radius:6px}
      @media print{body{padding:20px}}</style></head>
      <body>${printContent.innerHTML}</body></html>`)
    win.document.close(); win.print()
  }

  if (loadingTemplate) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-brand-500" />
      </div>
    )
  }

  if (signed) {
    return (
      <div className="p-8 text-center space-y-4">
        <CheckCircle2 size={56} className="text-green-500 mx-auto" />
        <h2 className="text-xl font-bold text-hb-700 dark:text-white">Contrat signé !</h2>
        <p className="text-sm text-hb-400">
          Signé le {new Date(signedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className="text-xs text-hb-300 font-mono">Réf : {contractId.slice(0, 16).toUpperCase()}</p>
        <button onClick={downloadPDF}
          className="flex items-center gap-2 px-5 py-2.5 bg-hb-700 text-white rounded-full font-semibold text-sm mx-auto hover:opacity-90 transition-opacity">
          <Download size={16} /> Télécharger en PDF
        </button>
      </div>
    )
  }

  const remu = template?.content.remuneration
  const articles = template?.content.articles ?? []

  return (
    <div className="max-w-3xl mx-auto">
      {/* Document */}
      <div id="habynex-contract" className="bg-white dark:bg-hb-800 rounded-3xl border border-hb-200 dark:border-hb-600 p-8 mb-6 text-sm space-y-5 max-h-[60vh] overflow-y-auto">
        <div className="text-center border-b border-hb-100 dark:border-hb-700 pb-6">
          <h1 className="text-2xl font-bold text-brand-500">HABYNEX</h1>
          <h2 className="text-lg font-bold text-hb-700 dark:text-white mt-2">
            {template?.title ?? 'CONTRAT DE PRESTATION'}
          </h2>
          <p className="text-hb-400 text-xs mt-1">
            Version {template?.version ?? '1.0'} · Référence : HAB-{roleType.toUpperCase().slice(0, 3)}-{Date.now().toString().slice(-8)}
          </p>
        </div>

        <ContractSection title="ENTRE LES PARTIES">
          <p><strong>Habynex</strong>, plateforme immobilière numérique, dont le siège social est à Yaoundé, Cameroun</p>
          <p>ET</p>
          <p><strong>{agentName}</strong>, dont les coordonnées sont enregistrées dans le système Habynex.</p>
        </ContractSection>

        {/* Articles dynamiques */}
        {articles.map(art => (
          <ContractSection key={art.id} title={art.title}>
            <div className="whitespace-pre-line">{art.body}</div>
          </ContractSection>
        ))}

        {/* Rémunération dynamique */}
        {remu && (
          <ContractSection title="RÉMUNÉRATION">
            <p>Le {roleType === 'photographer' ? 'Photographe' : 'l\'Agent'} perçoit une rémunération composée de deux éléments :</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>
                <strong>Salaire fixe :</strong> {remu.fixed_salary.toLocaleString()} FCFA par mois,
                versé le {remu.payment_day} via la plateforme Habynex, sous réserve d'avoir effectué
                au minimum {remu.min_missions} missions dans le mois.
              </li>
              <li>
                <strong>Indemnité de déplacement :</strong> {remu.daily_allowance.toLocaleString()} FCFA
                par jour de mission active. Cette indemnité est versée {remu.allowance_payment}.
              </li>
            </ul>
            {remu.notes && (
              <p className="mt-3 font-semibold text-red-600 dark:text-red-400">⚠️ {remu.notes}</p>
            )}
          </ContractSection>
        )}

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
              <p className="text-xs font-semibold text-hb-600 dark:text-hb-300 mb-2">
                {roleType === 'photographer' ? 'Le Photographe' : 'L\'Agent'} — {agentName}
              </p>
              {hasSignature && canvasRef.current && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={canvasRef.current.toDataURL()} alt="Signature" className="border border-hb-200 rounded-lg h-16 mx-auto object-contain" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Zone signature */}
      <div className="bg-white dark:bg-hb-800 rounded-3xl border border-hb-200 dark:border-hb-600 p-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <PenLine size={18} className="text-brand-500" />
          <h3 className="font-semibold text-hb-700 dark:text-white">Signature électronique</h3>
        </div>

        <div className="relative">
          <canvas
            ref={canvasRef} width={600} height={140}
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
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

        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-hb-300 text-brand-500 flex-shrink-0" />
          <span className="text-sm text-hb-600 dark:text-hb-300">
            J'ai lu et j'accepte l'intégralité des conditions du contrat Habynex, incluant l'interdiction formelle de percevoir des paiements en dehors de la plateforme.
          </span>
        </label>

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
          Empreinte numérique : <span className="font-mono">{fingerprint}</span>
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

// Template de secours si la DB ne retourne rien
const DEFAULT_TEMPLATE: ContractTemplate = {
  id: 'default',
  title: 'CONTRAT DE PRESTATION — AGENT HABYNEX',
  version: '1.0',
  content: {
    articles: [
      { id: 'missions', title: 'ARTICLE 1 — MISSIONS DE L\'AGENT', body: '• Contacter les clients dans les 2 heures suivant l\'attribution d\'une mission de visite.\n• Accompagner le client sur le terrain pour visiter les biens sélectionnés.\n• Fournir des informations honnêtes et précises sur les biens visités.\n• Renseigner le rapport de visite sur la plateforme dans les 24h suivant la visite.\n• Maintenir un comportement professionnel, ponctuel et respectueux en toutes circonstances.' },
      { id: 'obligations', title: 'ARTICLE 2 — OBLIGATIONS', body: '• Ne jamais recevoir de paiements en dehors de la plateforme Habynex.\n• Signaler immédiatement tout propriétaire ou bien suspect à l\'équipe Habynex.\n• Ne pas partager les informations confidentielles des clients avec des tiers.' },
      { id: 'resiliation', title: 'ARTICLE 3 — RÉSILIATION', body: 'Le contrat peut être résilié par Habynex immédiatement en cas de faute grave, ou par l\'Agent avec un préavis de 7 jours.' },
    ],
    remuneration: {
      fixed_salary: 50000, min_missions: 4, daily_allowance: 1000,
      payment_day: '1er de chaque mois', allowance_payment: 'chaque vendredi pour les jours de la semaine écoulée',
      notes: 'Toutes les rémunérations sont versées exclusivement via la plateforme Habynex.',
    },
  },
}
