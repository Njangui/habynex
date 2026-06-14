import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { ChevronRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Blog immobilier — Habynex',
  description: 'Conseils, guides et actualités immobilières au Cameroun. Tout ce que vous devez savoir pour louer, acheter ou investir à Yaoundé et Douala.',
  alternates: { canonical: 'https://habynex.com/blog' },
}

export default async function BlogPage() {
  const supabase = await createClient()
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('id, slug, title, excerpt, cover_url, published_at, tags')
    .eq('published', true)
    .order('published_at', { ascending: false })
    .limit(20)

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Blog Habynex</h1>
        <p className="text-gray-500">Conseils, guides et actualités immobilières au Cameroun</p>
      </div>

      {(!posts || posts.length === 0) ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">📝</p>
          <p className="font-medium text-gray-700 dark:text-gray-300">Les articles arrivent bientôt…</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post: any) => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="group block bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-card hover:shadow-card-hover transition-all hover:-translate-y-1">
              <div className="relative aspect-[16/9] bg-gray-100 dark:bg-gray-800">
                {post.cover_url ? (
                  <Image src={post.cover_url} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 100vw, 33vw" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900 dark:to-brand-800 flex items-center justify-center text-4xl">📰</div>
                )}
              </div>
              <div className="p-5">
                {post.tags?.length > 0 && (
                  <span className="text-xs font-semibold text-brand-500 uppercase tracking-wide mb-2 block">{post.tags[0]}</span>
                )}
                <h2 className="font-bold text-gray-900 dark:text-white line-clamp-2 mb-2 group-hover:text-brand-500 transition-colors">{post.title}</h2>
                {post.excerpt && <p className="text-sm text-gray-500 line-clamp-2">{post.excerpt}</p>}
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-gray-400">
                    {post.published_at ? new Date(post.published_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                  </span>
                  <span className="text-xs text-brand-500 font-medium flex items-center gap-0.5">Lire <ChevronRight size={12} /></span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export const revalidate = 3600
