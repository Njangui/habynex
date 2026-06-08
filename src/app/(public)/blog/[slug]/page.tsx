import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: post } = await supabase.from('blog_posts').select('title, meta_title, meta_description, cover_url').eq('slug', slug).single()
  if (!post) return { title: 'Article introuvable — Habynex' }
  return {
    title: post.meta_title ?? `${post.title} — Habynex`,
    description: post.meta_description ?? undefined,
    openGraph: {
      title: post.meta_title ?? post.title,
      images: post.cover_url ? [{ url: post.cover_url }] : [],
    },
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: post } = await supabase.from('blog_posts').select('*').eq('slug', slug).eq('published', true).single()
  if (!post) notFound()

  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-500 transition-colors mb-8">
        <ChevronLeft size={16} /> Retour au blog
      </Link>

      {post.cover_url && (
        <div className="relative aspect-[2/1] rounded-3xl overflow-hidden mb-8">
          <Image src={post.cover_url} alt={post.title} fill className="object-cover" priority sizes="(max-width: 768px) 100vw, 768px" />
        </div>
      )}

      {post.tags?.length > 0 && (
        <div className="flex gap-2 mb-4">
          {post.tags.map((tag: string) => (
            <span key={tag} className="px-3 py-1 bg-brand-50 dark:bg-brand-950 text-brand-500 text-xs font-semibold rounded-full">{tag}</span>
          ))}
        </div>
      )}

      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">{post.title}</h1>

      {post.published_at && (
        <p className="text-sm text-gray-400 mb-8">
          Publié le {new Date(post.published_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      )}

      <div className="prose prose-gray dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-brand-500 prose-img:rounded-2xl">
        {/* Rendu Markdown simple — à améliorer avec react-markdown si besoin */}
        <div dangerouslySetInnerHTML={{ __html: post.content_md.replace(/\n/g, '<br/>') }} />
      </div>

      {/* CTA bas d'article */}
      <div className="mt-12 p-6 bg-brand-50 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900 rounded-3xl text-center">
        <p className="font-bold text-gray-900 dark:text-white mb-2">Vous cherchez un logement ?</p>
        <p className="text-sm text-gray-500 mb-4">Habynex vous aide à trouver le bien idéal à Yaoundé</p>
        <Link href="/rechercher" className="inline-block px-6 py-2.5 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-colors text-sm">
          Découvrir les annonces →
        </Link>
      </div>
    </article>
  )
}

export const revalidate = 3600
