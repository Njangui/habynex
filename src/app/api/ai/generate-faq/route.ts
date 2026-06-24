import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { FaqItem } from '@/types'

// ================================================================
// POST /api/ai/generate-faq
// Génère 10-12 Q&R sans IA externe — basé sur les données réelles
// de l'annonce + templates intelligents par type de bien.
// ================================================================

const ALLOWED_ORIGINS = [
  'https://admin.habynex.com',
  'https://www.habynex.com',
  'https://habynex.com',
  'http://localhost:3000',
  'http://localhost:3001',
]

function corsHeaders(origin: string | null) {
  const allowed = ALLOWED_ORIGINS.includes(origin ?? '') ? origin! : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) })
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatPrice(amount: number): string {
  return amount.toLocaleString('fr-FR') + ' FCFA'
}

const TYPE_LABELS: Record<string, string> = {
  studio: 'studio', apartment: 'appartement', room: 'chambre',
  villa: 'villa', duplex: 'duplex', commercial: 'local commercial',
}

const TRANSACTION_LABELS: Record<string, string> = {
  rent: 'en location', sale: 'en vente',
  furnished: 'en location meublée', coliving: 'en colocation',
  short_stay: 'en location courte durée',
}

// ── Générateur de FAQ ─────────────────────────────────────────────────

function generateFaq(listing: any, neighborhood: string, city: string): FaqItem[] {
  const faqs: FaqItem[] = []

  const typeLabel = TYPE_LABELS[listing.type] ?? 'bien'
  const txLabel = TRANSACTION_LABELS[listing.transaction] ?? ''
  const price = formatPrice(listing.price)
  const location = [neighborhood, city].filter(Boolean).join(', ')

  // ── BLOC 1 : Questions fixes communes à tous les biens ─────────────

  // 1. Disponibilité
  faqs.push({
    q: 'Le bien est-il disponible ?',
    a: `Oui, ce ${typeLabel} est actuellement disponible ${txLabel}. Réservez une visite pour confirmer la disponibilité avant qu'il ne soit loué.`,
    keywords: ['disponible', 'disponibilité', 'libre', 'occupé', 'pris', 'encore disponible'],
  })

  // 2. Prix / loyer
  if (listing.transaction === 'rent' || listing.transaction === 'furnished' || listing.transaction === 'coliving' || listing.transaction === 'short_stay') {
    faqs.push({
      q: 'Quel est le montant du loyer mensuel ?',
      a: `Le loyer est de ${price} par mois${listing.price_negotiable ? ', mais il est négociable selon votre profil et la durée du bail' : ''}.`,
      keywords: ['loyer', 'prix', 'combien', 'tarif', 'montant', 'coût', 'payer'],
    })
  } else {
    faqs.push({
      q: 'Quel est le prix de vente ?',
      a: `Le prix de vente est de ${price}${listing.price_negotiable ? ', négociable selon les conditions de paiement' : ' et non négociable'}.`,
      keywords: ['prix', 'vente', 'combien', 'tarif', 'montant', 'coût', 'acheter'],
    })
  }

  // 3. Localisation
  faqs.push({
    q: 'Où exactement se trouve le bien ?',
    a: listing.address_hint
      ? `Le bien est situé à ${location}. Repère : ${listing.address_hint}. Un agent vous communiquera l'adresse exacte lors de la visite.`
      : `Le bien est situé à ${location}. L'adresse exacte vous sera communiquée lors de la confirmation de votre visite.`,
    keywords: ['où', 'localisation', 'adresse', 'quartier', 'situé', 'endroit', 'trouver', 'emplacement'],
  })

  // 4. Visite
  faqs.push({
    q: 'Comment organiser une visite ?',
    a: `Cliquez sur le bouton "Réserver une visite" sur cette page. La visite coûte 3 000 FCFA et un agent Habynex certifié vous accompagnera sur place. Vous serez contacté dans les 24h pour fixer le rendez-vous.`,
    keywords: ['visite', 'visiter', 'voir', 'rendez-vous', 'réserver', 'organiser', 'voir le bien', 'planifier'],
  })

  // 5. Caution / Garantie
  if (listing.transaction !== 'sale') {
    faqs.push({
      q: 'Quelle est la caution demandée ?',
      a: `La caution est généralement équivalente à 1 mois de loyer (${price}). Elle est remboursée en fin de bail si le bien est rendu en bon état. Les conditions exactes sont à confirmer avec le propriétaire lors de la visite.`,
      keywords: ['caution', 'garantie', 'dépôt', 'remboursement', 'avance'],
    })
  }

  // ── BLOC 2 : Questions dynamiques selon les données de l'annonce ────

  // 6. Meublé / équipements
  if (listing.furnished !== undefined) {
    if (listing.furnished) {
      const amenities = listing.amenities ?? {}
      const equipList = [
        amenities.wifi && 'WiFi',
        amenities.air_conditioning && 'climatisation',
        amenities.parking && 'parking',
        amenities.water_24h && 'eau 24h/24',
        amenities.electricity && 'électricité',
        amenities.generator && 'groupe électrogène',
      ].filter(Boolean).join(', ')
      faqs.push({
        q: 'Quels équipements et meubles sont inclus ?',
        a: `Ce ${typeLabel} est entièrement meublé${equipList ? ` avec : ${equipList}` : ''}. La liste détaillée des équipements sera confirmée lors de la visite.`,
        keywords: ['meublé', 'meubles', 'équipements', 'inclus', 'fourni', 'wifi', 'climatisation', 'parking'],
      })
    } else {
      faqs.push({
        q: 'Le bien est-il meublé ?',
        a: `Non, ce ${typeLabel} est loué vide (non meublé). Vous devrez apporter vos propres meubles et équipements.`,
        keywords: ['meublé', 'meubles', 'vide', 'non meublé', 'équipements'],
      })
    }
  }

  // 7. Surface / dimensions
  if (listing.surface_m2) {
    faqs.push({
      q: `Quelle est la superficie du ${typeLabel} ?`,
      a: `La superficie est de ${listing.surface_m2} m²${listing.bedrooms ? `, avec ${listing.bedrooms} chambre${listing.bedrooms > 1 ? 's' : ''}` : ''}${listing.bathrooms ? ` et ${listing.bathrooms} salle${listing.bathrooms > 1 ? 's' : ''} de bain` : ''}.`,
      keywords: ['superficie', 'surface', 'taille', 'dimensions', 'm2', 'grand', 'petit', 'espace', 'chambres'],
    })
  } else if (listing.bedrooms) {
    faqs.push({
      q: 'Combien de chambres y a-t-il ?',
      a: `Ce ${typeLabel} dispose de ${listing.bedrooms} chambre${listing.bedrooms > 1 ? 's' : ''}${listing.bathrooms ? ` et ${listing.bathrooms} salle${listing.bathrooms > 1 ? 's' : ''} de bain` : ''}.`,
      keywords: ['chambres', 'pièces', 'salles de bain', 'douche', 'nombre', 'combien'],
    })
  }

  // 8. Étage
  if (listing.floor != null) {
    faqs.push({
      q: 'À quel étage se trouve le bien ?',
      a: listing.floor === 0
        ? `Ce ${typeLabel} est situé au rez-de-chaussée.`
        : `Ce ${typeLabel} est situé au ${listing.floor}${listing.floor === 1 ? 'er' : 'ème'} étage.`,
      keywords: ['étage', 'rez-de-chaussée', 'niveau', 'ascenseur', 'escaliers', 'haut', 'bas'],
    })
  }

  // 9. Eau et électricité (très important au Cameroun)
  const amenities = listing.amenities ?? {}
  const hasWater = amenities.water_24h
  const hasElec = amenities.electricity
  const hasGen = amenities.generator

  if (hasWater !== undefined || hasElec !== undefined) {
    let reponse = ''
    if (hasWater && hasElec) {
      reponse = `Oui, l'eau courante est disponible 24h/24 et l'électricité est fournie${hasGen ? ', avec un groupe électrogène en cas de coupure' : ''}.`
    } else if (hasWater) {
      reponse = `L'eau courante est disponible 24h/24${hasGen ? ', avec un groupe électrogène en cas de coupure de courant' : ''}. À confirmer pour l'électricité.`
    } else if (hasElec) {
      reponse = `L'électricité est fournie${hasGen ? ' avec un groupe électrogène en secours' : ''}. À confirmer pour l'eau courante.`
    } else {
      reponse = `Les conditions d'accès à l'eau et à l'électricité sont à confirmer directement avec le propriétaire lors de la visite.`
    }
    faqs.push({
      q: 'Y a-t-il l\'eau courante et l\'électricité ?',
      a: reponse,
      keywords: ['eau', 'électricité', 'courant', 'coupure', 'groupe électrogène', 'eneo', 'camwater', '24h'],
    })
  } else {
    faqs.push({
      q: 'Y a-t-il l\'eau et l\'électricité ?',
      a: `Les conditions d'accès à l'eau et à l'électricité seront confirmées lors de la visite avec l'agent Habynex.`,
      keywords: ['eau', 'électricité', 'courant', 'coupure', '24h', 'eneo', 'camwater'],
    })
  }

  // 10. Sécurité / gardiennage
  faqs.push({
    q: 'Le quartier est-il sécurisé ?',
    a: amenities.security
      ? `Oui, la résidence dispose d'un gardiennage 24h/24. Le quartier de ${neighborhood} est réputé pour son calme et sa sécurité.`
      : `Le quartier de ${neighborhood} est accessible et fréquenté. Un agent Habynex pourra vous donner plus d'informations sur l'environnement lors de la visite.`,
    keywords: ['sécurité', 'sécurisé', 'gardien', 'gardiennage', 'dangereux', 'calme', 'quartier', 'voisinage'],
  })

  // 11. Parking
  if (amenities.parking !== undefined) {
    faqs.push({
      q: 'Y a-t-il un parking disponible ?',
      a: amenities.parking
        ? `Oui, un espace de parking est disponible pour ce ${typeLabel}.`
        : `Non, ce ${typeLabel} n'inclut pas de parking privatif. Des options de stationnement sont peut-être disponibles à proximité.`,
      keywords: ['parking', 'voiture', 'garer', 'stationnement', 'garage', 'place'],
    })
  }

  // 12. Délai d'emménagement / conditions bail (location uniquement)
  if (listing.transaction !== 'sale') {
    faqs.push({
      q: 'Quelles sont les conditions pour emménager ?',
      a: `Pour louer ce ${typeLabel}, il faut généralement : une pièce d'identité valide, un justificatif de revenus ou garant, et le paiement du 1er mois + caution (${price} × 2). Les conditions exactes seront précisées par le propriétaire.`,
      keywords: ['conditions', 'emménager', 'dossier', 'documents', 'pièce identité', 'contrat', 'bail', 'louer'],
    })
  } else {
    faqs.push({
      q: 'Quelles sont les modalités de paiement pour l\'achat ?',
      a: `Le prix de vente est de ${price}. Les modalités de paiement (comptant, échelonné) sont à négocier directement avec le propriétaire. Habynex peut vous mettre en relation avec des partenaires financiers si nécessaire.`,
      keywords: ['paiement', 'achat', 'financement', 'comptant', 'crédit', 'modalités', 'acheter'],
    })
  }

  // Limiter à 12 questions maximum
  return faqs.slice(0, 12)
}

// ── Route principale ──────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)

  try {
    const { listingId } = await req.json()
    if (!listingId) {
      return NextResponse.json({ error: 'listingId requis' }, { status: 400, headers: cors })
    }

    const supabase = createAdminClient()

    // Vérifier si FAQ existe déjà
    const { data: existing } = await supabase
      .from('listing_faqs')
      .select('id')
      .eq('listing_id', listingId)
      .single()

    if (existing) {
      return NextResponse.json({ alreadyExists: true, faqId: existing.id }, { headers: cors })
    }

    // Récupérer les données complètes de l'annonce
    const { data: listing, error: listingErr } = await supabase
      .from('listings')
      .select(`
        id, title, type, transaction, price, price_negotiable,
        bedrooms, bathrooms, surface_m2, floor, furnished,
        amenities, address_hint, description,
        neighborhood:neighborhoods(name),
        city:neighborhoods(city:cities(name))
      `)
      .eq('id', listingId)
      .single()

    if (listingErr || !listing) {
      return NextResponse.json(
        { error: `Annonce introuvable (${listingErr?.message ?? 'id invalide'})` },
        { status: 404, headers: cors }
      )
    }

    // Extraire quartier et ville
    const nbh = Array.isArray(listing.neighborhood) ? listing.neighborhood[0] : listing.neighborhood as any
    const cityObj = Array.isArray((listing as any).city) ? (listing as any).city[0] : (listing as any).city
    const neighborhoodName = nbh?.name ?? ''
    const cityName = cityObj?.city?.name ?? 'Yaoundé'

    // Générer les questions/réponses
    const questions = generateFaq(listing, neighborhoodName, cityName)

    // Insérer dans listing_faqs
    const { data: faq, error: insertErr } = await supabase
      .from('listing_faqs')
      .insert({ listing_id: listingId, questions })
      .select('id')
      .single()

    if (insertErr) {
      console.error('FAQ insert error:', JSON.stringify(insertErr))
      return NextResponse.json(
        { error: `Erreur insertion : ${insertErr.message} (code: ${insertErr.code})` },
        { status: 500, headers: cors }
      )
    }

    return NextResponse.json(
      { success: true, faqId: faq.id, count: questions.length },
      { headers: cors }
    )

  } catch (err: any) {
    console.error('generate-faq error:', err)
    return NextResponse.json(
      { error: err?.message ?? 'Erreur serveur inattendue' },
      { status: 500, headers: cors }
    )
  }
}