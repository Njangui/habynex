import OpenAI from 'openai'
import type { UserCriteria } from '@/types'

// On crée le client à chaque appel pour toujours lire la clé courante
// (pas de singleton — évite le bug où une ancienne clé reste en cache)
export function getDeepSeek(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY manquante dans les variables d\'environnement Vercel')
  return new OpenAI({
    apiKey,
    baseURL: 'https://api.deepseek.com/v1',
  })
}

/** @deprecated utilise getDeepSeek() */
export const deepseek = { get chat() { return getDeepSeek().chat } }

export const AI_MODEL = 'deepseek-chat'
export const AI_MAX_TOKENS = 1024

export const SYSTEM_PROMPT_BASE = `Tu es l'assistant IA de Habynex, la première agence immobilière augmentée par l'IA au Cameroun.

Ton rôle :
- Aider les clients à trouver le logement idéal à Yaoundé et alentours
- Répondre aux questions sur les annonces, les quartiers, les prix du marché local
- Organiser les visites terrain avec les agents certifiés Habynex
- Être professionnel, chaleureux et rassurant en toutes circonstances

Règles absolues :
- Tu ne parles JAMAIS de montants de commissions, frais ou argent → passe la main à un admin
- Tu ne confirmes JAMAIS un rendez-vous toi-même → passe la main à un admin
- Si tu perds le contexte ou es incertain → escalade immédiate à un admin
- Tu réponds en français par défaut, en anglais si le client écrit en anglais
- Tu ne révèles pas que tu es une IA sauf si demandé explicitement

Contexte marché :
- Devise : FCFA (Franc CFA)
- Villes actives : Yaoundé (lancement), bientôt Douala
- Quartiers de lancement Yaoundé : Simbock, Jouvence, Biyem-Assi, TKC
- Frais de visite : 3 000 FCFA/1 bien · 5 000 FCFA/2 biens · 7 000 FCFA/3 biens
- Visite gratuite : offerte après 5 parrainages confirmés`

/**
 * Construit un contexte IA enrichi à partir des critères utilisateur.
 */
export function buildUserCriteriaContext(criteria: UserCriteria | null): string {
  if (!criteria) return ''
  const parts: string[] = ['\n\nProfil utilisateur (pour recommandations personnalisées) :']

  if (criteria.city_name) {
    parts.push(`- Ville : ${criteria.city_name}${criteria.city_id ? ` (ID: ${criteria.city_id})` : ''}`)
  }
  if (criteria.neighborhood_names?.length) {
    parts.push(`- Quartiers préférés : ${criteria.neighborhood_names.join(', ')}`)
    if (criteria.neighborhood_ids?.length) {
      parts.push(`  (IDs pour précision : ${criteria.neighborhood_ids.join(', ')})`)
    }
  }
  if (criteria.budget_min || criteria.budget_max) {
    const min = criteria.budget_min ? `${criteria.budget_min.toLocaleString()} FCFA` : 'non défini'
    const max = criteria.budget_max ? `${criteria.budget_max.toLocaleString()} FCFA` : 'non défini'
    parts.push(`- Budget : ${min} → ${max}`)
  }
  if (criteria.types?.length) {
    parts.push(`- Types souhaités : ${criteria.types.join(', ')}`)
  }
  if (criteria.transaction) {
    parts.push(`- Modalité : ${criteria.transaction}`)
  }
  if (criteria.bedrooms_min) {
    parts.push(`- Chambres minimum : ${criteria.bedrooms_min}`)
  }
  if (criteria.furnished !== undefined) {
    parts.push(`- Meublé : ${criteria.furnished ? 'oui' : 'non'}`)
  }
  if (criteria.lifestyle) {
    parts.push(`- Profil de vie : ${criteria.lifestyle}`)
  }
  if (criteria.priorities?.length) {
    parts.push(`- Priorités : ${criteria.priorities.join(', ')}`)
  }
  return parts.join('\n')
}

/**
 * Détecter si l'IA doit escalader vers un humain.
 */
export function shouldEscalate(message: string): boolean {
  const triggers = [
    'commission', 'payer', 'combien au total', 'prix final',
    'rendez-vous confirmé', 'confirmer le rdv', 'confirmer la visite',
    'arnaque', 'fraude', 'remboursement', 'plainte',
    'contrat', 'signature', 'je veux signer',
  ]
  return triggers.some(t => message.toLowerCase().includes(t))
}