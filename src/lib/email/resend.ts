/**
 * lib/email/resend.ts — Envoi d'emails via Resend
 * Gratuit jusqu'à 3 000 emails/mois
 * Doc : https://resend.com/docs
 *
 * SETUP :
 * 1. npm install resend
 * 2. Créer un compte sur resend.com
 * 3. Ajouter ton domaine habynex.com dans Resend
 * 4. Ajouter RESEND_API_KEY dans .env.local
 * 5. Ajouter RESEND_FROM_EMAIL=noreply@habynex.com dans .env.local
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const FROM = process.env.RESEND_FROM_EMAIL ?? 'Habynex <noreply@habynex.com>'
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://habynex.com'

const ORANGE = '#f95d1e'
const DARK = '#111827'
const LIGHT_BG = '#f9fafb'

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Habynex</title>
</head>
<body style="margin:0;padding:0;background:${LIGHT_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${LIGHT_BG};padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
        <tr>
          <td style="background:${DARK};padding:28px 40px;text-align:center;">
            <a href="${BASE_URL}" style="text-decoration:none;display:inline-flex;align-items:center;gap:10px;">
              <div style="width:36px;height:36px;background:${ORANGE};border-radius:10px;display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:white;line-height:1;">H</div>
              <span style="font-size:22px;font-weight:800;color:#f9fafb;letter-spacing:-0.5px;">habynex</span>
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            ${content}
          </td>
        </tr>
        <tr>
          <td style="background:${LIGHT_BG};padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              © 2025 Habynex · Immobilier Cameroun<br/>
              <a href="${BASE_URL}/termes" style="color:${ORANGE};text-decoration:none;">Conditions d'utilisation</a>
              &nbsp;·&nbsp;
              <a href="mailto:contact@habynex.com" style="color:${ORANGE};text-decoration:none;">Nous contacter</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function ctaButton(text: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:${ORANGE};color:white;font-size:15px;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;margin-top:24px;">${text}</a>`
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY non configuré — email non envoyé')
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[Email] Resend error:', err)
      return false
    }
    return true
  } catch (err) {
    console.error('[Email] sendEmail error:', err)
    return false
  }
}

// ════════════════════════════════════════════════════════════════════
// TEMPLATES
// ════════════════════════════════════════════════════════════════════

export async function sendWelcomeEmail(to: string, fullName: string): Promise<boolean> {
  const firstName = fullName?.split(' ')[0] ?? 'là'
  const html = baseTemplate(`
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:${DARK};">Bienvenue sur Habynex, ${firstName} ! 🎉</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.6;">
      Votre compte a été créé avec succès. Vous pouvez maintenant explorer des milliers d'annonces immobilières au Cameroun, réserver des visites terrain et échanger avec nos agents certifiés.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#15803d;font-weight:600;">✅ Ce que vous pouvez faire maintenant :</p>
      <ul style="margin:8px 0 0;padding-left:20px;font-size:14px;color:#166534;line-height:2;">
        <li>Parcourir les annonces publiées</li>
        <li>Sauvegarder vos biens favoris</li>
        <li>Réserver une visite terrain à seulement 3 000 FCFA</li>
        <li>Définir vos critères pour les recommandations IA</li>
      </ul>
    </div>
    <div style="text-align:center;">${ctaButton('Explorer les annonces', BASE_URL)}</div>
  `)
  return sendEmail(to, 'Bienvenue sur Habynex 🏠', html)
}

export async function sendBookingConfirmationEmail(
  to: string, fullName: string,
  bookingDetails: { bookingId: string; nbListings: number; amount: number; listingTitles: string[] }
): Promise<boolean> {
  const firstName = fullName?.split(' ')[0] ?? 'là'
  const listingsHtml = bookingDetails.listingTitles
    .map(t => `<li style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;">🏠 ${t}</li>`)
    .join('')
  const html = baseTemplate(`
    <div style="text-align:center;margin-bottom:32px;">
      <div style="width:64px;height:64px;background:#f0fdf4;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:32px;line-height:64px;text-align:center;">✅</div>
      <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:${DARK};">Visite${bookingDetails.nbListings > 1 ? 's' : ''} réservée${bookingDetails.nbListings > 1 ? 's' : ''} !</h1>
      <p style="margin:0;font-size:15px;color:#6b7280;">Réf : <strong style="color:${DARK};font-family:monospace;">${bookingDetails.bookingId.slice(0, 8).toUpperCase()}</strong></p>
    </div>
    <p style="margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.6;">
      Bonjour ${firstName}, votre paiement de <strong style="color:${ORANGE};">${bookingDetails.amount.toLocaleString('fr-FR')} FCFA</strong> a été confirmé. Un agent Habynex va vous contacter dans les <strong>24h</strong> pour fixer les rendez-vous de visite.
    </p>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#9a3412;">Bien${bookingDetails.nbListings > 1 ? 's' : ''} à visiter :</p>
      <ul style="margin:0;padding:0;list-style:none;">${listingsHtml}</ul>
    </div>
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#0c4a6e;">💡 <strong>Conseil :</strong> Préparez une pièce d'identité pour la visite.</p>
    </div>
    <div style="text-align:center;">${ctaButton('Voir mes réservations', `${BASE_URL}/profil?tab=visites`)}</div>
  `)
  return sendEmail(to, `✅ Visite${bookingDetails.nbListings > 1 ? 's' : ''} confirmée${bookingDetails.nbListings > 1 ? 's' : ''} — Habynex`, html)
}

export async function sendListingPublishedEmail(
  to: string, agentName: string, listingTitle: string, listingSlug: string
): Promise<boolean> {
  const firstName = agentName?.split(' ')[0] ?? 'là'
  const listingUrl = `${BASE_URL}/bien/${listingSlug}`
  const html = baseTemplate(`
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:${DARK};">Annonce publiée ! 🎉</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.6;">
      Bonjour ${firstName}, votre annonce a été validée et est maintenant <strong style="color:#16a34a;">visible sur Habynex</strong>.
    </p>
    <div style="border:2px solid ${ORANGE};border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:${ORANGE};text-transform:uppercase;letter-spacing:0.5px;">Annonce</p>
      <p style="margin:0;font-size:18px;font-weight:700;color:${DARK};">🏠 ${listingTitle}</p>
      <a href="${listingUrl}" style="display:inline-block;margin-top:10px;font-size:13px;color:${ORANGE};text-decoration:none;">${listingUrl} ↗</a>
    </div>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">Partagez ce lien avec vos clients potentiels.</p>
    <div style="text-align:center;">${ctaButton('Voir mon annonce', listingUrl)}</div>
  `)
  return sendEmail(to, `✅ Annonce publiée — ${listingTitle}`, html)
}

export async function sendListingRejectedEmail(
  to: string, agentName: string, listingTitle: string, reason: string
): Promise<boolean> {
  const firstName = agentName?.split(' ')[0] ?? 'là'
  const html = baseTemplate(`
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:${DARK};">Annonce non publiée</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.6;">
      Bonjour ${firstName}, votre annonce "<strong>${listingTitle}</strong>" n'a pas pu être validée pour la raison suivante :
    </p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#991b1b;line-height:1.6;">⚠️ ${reason}</p>
    </div>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">Corrigez les points mentionnés et re-soumettez votre annonce.</p>
    <div style="text-align:center;">${ctaButton('Modifier mon annonce', `${BASE_URL}/agent-dashboard`)}</div>
  `)
  return sendEmail(to, `⚠️ Annonce non publiée — ${listingTitle}`, html)
}

export async function sendAgentApprovedEmail(to: string, agentName: string): Promise<boolean> {
  const firstName = agentName?.split(' ')[0] ?? 'là'
  const html = baseTemplate(`
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:48px;margin-bottom:12px;">🎉</div>
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:${DARK};">Félicitations ${firstName} !</h1>
      <p style="margin:0;font-size:16px;color:${ORANGE};font-weight:700;">Vous êtes maintenant agent certifié Habynex</p>
    </div>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#15803d;">Vos prochaines étapes :</p>
      <ol style="margin:0;padding-left:20px;font-size:14px;color:#166534;line-height:2.2;">
        <li>Signez votre contrat de prestation</li>
        <li>Soumettez votre première annonce</li>
        <li>Recevez vos premières missions de visite</li>
        <li>Gagnez vos premières commissions 💰</li>
      </ol>
    </div>
    <div style="text-align:center;">${ctaButton('Accéder à mon dashboard', `${BASE_URL}/agent-dashboard`)}</div>
  `)
  return sendEmail(to, '🎉 Candidature acceptée — Bienvenue chez Habynex !', html)
}

export async function sendAccountDeletionEmail(to: string, fullName: string): Promise<boolean> {
  const firstName = fullName?.split(' ')[0] ?? 'là'
  const html = baseTemplate(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:${DARK};">Compte supprimé</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.6;">
      Bonjour ${firstName}, votre compte Habynex a bien été supprimé. Toutes vos données personnelles ont été effacées.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
      Nous sommes désolés de vous voir partir. Vous pouvez créer un nouveau compte à tout moment sur habynex.com.
    </p>
    <p style="margin:0;font-size:14px;color:#9ca3af;">
      Si vous n'avez pas demandé cette suppression, contactez-nous à <a href="mailto:contact@habynex.com" style="color:${ORANGE};">contact@habynex.com</a>.
    </p>
  `)
  return sendEmail(to, 'Votre compte Habynex a été supprimé', html)
}
