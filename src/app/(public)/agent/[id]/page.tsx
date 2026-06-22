import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { AgentPublicProfile } from '@/components/agent/AgentPublicProfile'
import { notFound } from 'next/navigation'

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', params.id).single()
  return {
    title: data?.full_name ? `${data.full_name} — Agent Habynex` : 'Agent Habynex',
    description: `Profil public de ${data?.full_name ?? 'cet agent'} — Agent immobilier certifié Habynex au Cameroun.`,
    openGraph: {
      title: `${data?.full_name ?? 'Agent'} — Agent Habynex`,
      description: 'Agent immobilier certifié Habynex — Visites terrain au Cameroun.',
      images: data?.avatar_url ? [data.avatar_url] : ['/icons/icon-512.png'],
    },
  }
}

export default async function AgentPage({ params }: Props) {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, phone, avatar_url')
    .eq('id', params.id)
    .single()

  if (!profile) notFound()
  return <AgentPublicProfile agentId={params.id} />
}
