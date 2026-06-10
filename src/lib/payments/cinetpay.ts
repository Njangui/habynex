// ================================================================
// CinetPay — MTN Mobile Money + Orange Money (Cameroun)
// Doc officielle : https://docs.cinetpay.com
// ================================================================

const CINETPAY_BASE_URL = process.env.CINETPAY_BASE_URL || 'https://api-checkout.cinetpay.com/v2'

export interface CinetPayInitParams {
  amount: number              // en FCFA (entier, multiple de 5)
  currency: 'XAF'
  phoneNumber: string         // format : 237XXXXXXXXX
  description: string
  transactionId: string       // notre ID unique (booking.id)
  customerName?: string
  customerEmail?: string
}

export interface CinetPayInitResponse {
  code: string                // '201' = succès
  message: string
  data: {
    payment_token: string
    payment_url: string       // URL de redirection si besoin
  }
}

export interface CinetPayStatusResponse {
  code: string                // '00' = payé, '623' = en attente, autre = échec
  message: string
  data: {
    status: 'ACCEPTED' | 'REFUSED' | 'PENDING'
    amount: number
    currency: string
    payment_method: string
    operator_id: string
    transaction_id: string    // notre transactionId
    payment_date: string
  }
}

export interface CinetPayWebhookPayload {
  cpm_site_id: string
  cpm_trans_id: string        // notre transactionId
  cpm_trans_date: string
  cpm_amount: string
  cpm_currency: string
  signature: string
  payment_method: string
  cel_phone_num: string
  cpm_phone_prefixe: string
  cpm_language: string
  cpm_version: string
  cpm_payment_config: string
  cpm_page_action: string
  cpm_custom: string
  cpm_designation: string
  cpm_error_message: string   // '' si succès
  cpm_result: string          // '00' = SUCCÈS
}

// ─── Initier un paiement Mobile Money ─────────────────────────────
export async function initiatePayment(params: CinetPayInitParams): Promise<CinetPayInitResponse> {
  const body = {
    apikey: process.env.CINETPAY_API_KEY!,
    site_id: process.env.CINETPAY_SITE_ID!,
    transaction_id: params.transactionId,
    amount: params.amount,
    currency: params.currency,
    alternative_currency: '',
    description: params.description,
    customer_name: params.customerName ?? 'Client Habynex',
    customer_email: params.customerEmail ?? 'client@habynex.com',
    customer_phone_number: params.phoneNumber,
    customer_address: 'Yaoundé',
    customer_city: 'Yaoundé',
    customer_country: 'CM',
    customer_state: 'CM',
    customer_zip_code: '00000',
    notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/cinetpay/webhook`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/profil?tab=visites`,
    channels: 'ALL',          // MTN + Orange + autres opérateurs
    metadata: params.transactionId,
    lang: 'FR',
    invoice_data: {},
  }

  const res = await fetch(`${CINETPAY_BASE_URL}/payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`CinetPay initiate failed: ${err}`)
  }

  const data: CinetPayInitResponse = await res.json()

  if (data.code !== '201') {
    throw new Error(`CinetPay error ${data.code}: ${data.message}`)
  }

  return data
}

// ─── Vérifier le statut d'un paiement ─────────────────────────────
export async function checkPaymentStatus(transactionId: string): Promise<CinetPayStatusResponse> {
  const res = await fetch(`${CINETPAY_BASE_URL}/payment/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apikey: process.env.CINETPAY_API_KEY!,
      site_id: process.env.CINETPAY_SITE_ID!,
      transaction_id: transactionId,
    }),
  })

  if (!res.ok) throw new Error(`CinetPay status check failed: ${res.status}`)
  return res.json()
}

// ─── Prix d'un booking ─────────────────────────────────────────────
export function getBookingPrice(nbListings: number, isFree: boolean): number {
  if (isFree) return 0
  const prices: Record<number, number> = { 1: 3000, 2: 5000, 3: 7000 }
  return prices[nbListings] ?? 7000
}
