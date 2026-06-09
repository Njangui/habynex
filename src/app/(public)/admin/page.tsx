import { redirect } from 'next/navigation'

// Cette page redirige vers le site d'administration dédié
// Le tableau de bord admin est géré sur admin.habynex.com
export default function AdminRedirectPage() {
  redirect(process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://admin.habynex.com')
}
