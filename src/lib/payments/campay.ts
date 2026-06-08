// ================================================================
// Campay — MTN Mobile Money + Orange Money (Cameroun)
// Doc : https://campay.net/api/docs
// ================================================================

const CAMPAY_BASE_URL = process.env.CAMPAY_BASE_URL || 'https://campay.net/api'

interface CampayToken {
  token: string
  expires_in: number
}

interface CampayCollectParams {
  amount: number          // en FCFA
  currency: 'XAF'
  from: string            // numéro de téléphone : 237XXXXXXXXX
  description: string
  external_reference: string  // notre ID de booking
}

interface CampayCollectResponse {
  reference: string
  ussd_code: string
  operator: string
  status: string
}

// Obtenir un token d'accès
async function getToken(): Promise<string> {
  const res = await fetch(`${CAMPAY_BASE_URL}/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: process.env.CAMPAY_USERNAME,
      password: process.env.CAMPAY_PASSWORD,
    }),
  })
  if (!res.ok) throw new Error(`Campay auth failed: ${res.status}`)
  const data: CampayToken = await res.json()
  return data.token
}

// Initier un paiement mobile money
export async function initiatePayment(params: CampayCollectParams): Promise<CampayCollectResponse> {
  const token = await getToken()
  const res = await fetch(`${CAMPAY_BASE_URL}/collect/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${token}`,
    },
    body: JSON.stringify({
      amount: params.amount.toString(),
      currency: params.currency,
      from: params.from,
      description: params.description,
      external_reference: params.external_reference,
      app_name: process.env.CAMPAY_APP_NAME || 'Habynex',
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Campay collect failed: ${err}`)
  }
  return res.json()
}

// Vérifier le statut d'un paiement
export async function checkPaymentStatus(reference: string) {
  const token = await getToken()
  const res = await fetch(`${CAMPAY_BASE_URL}/transaction/${reference}/`, {
    headers: { 'Authorization': `Token ${token}` },
  })
  if (!res.ok) throw new Error(`Campay status check failed: ${res.status}`)
  return res.json()
}

// Calculer le prix d'un booking
export function getBookingPrice(nbListings: number, isFree: boolean): number {
  if (isFree) return 0
  const prices: Record<number, number> = { 1: 3000, 2: 5000, 3: 7000 }
  return prices[nbListings] ?? 7000
}
