import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

  // Ne pas tracker les API, assets, next internals
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) return res

  // ID visiteur anonyme (cookie 30 jours)
  let visitorId = req.cookies.get('hbx_vid')?.value
  if (!visitorId) {
    visitorId = crypto.randomUUID()
    res.cookies.set('hbx_vid', visitorId, {
      maxAge: 30 * 24 * 3600,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    })
  }

  // Envoyer en background (non-bloquant — ne ralentit pas la navigation)
  try {
    const baseUrl = req.nextUrl.origin
    fetch(`${baseUrl}/api/tracking/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId,
        pathname,
        userAgent: req.headers.get('user-agent') ?? '',
        referrer: req.headers.get('referer') ?? '',
        ip: req.ip ?? req.headers.get('x-forwarded-for') ?? '',
      }),
    }).catch(() => {}) // Totalement non-bloquant
  } catch {}

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
}
