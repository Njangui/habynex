import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { z } from "https://esm.sh/zod@3.22.4";

// ==================== CONFIGURATION & CONSTANTES ====================

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CONFIG = {
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  EMBEDDING_CACHE_TTL: 24 * 60 * 60 * 1000, // 24h
  RATE_LIMIT: 100, // requêtes par IP
  RATE_WINDOW: 60 * 1000, // 1 minute
  MAX_CANDIDATES: 150,
  EMBEDDING_DIM: 32,
  MMR_LAMBDA: 0.65,
  DEFAULT_LIMIT: 15,
  MAX_LIMIT: 50,
};

// Schémas de validation Zod
const RecommendationRequestSchema = z.object({
  user_id: z.string().uuid().optional(),
  limit: z.number().min(1).max(CONFIG.MAX_LIMIT).default(CONFIG.DEFAULT_LIMIT),
  offset: z.number().min(0).default(0),
  context: z.object({
    source: z.enum(['search', 'homepage', 'alert', 'favorites', 'similar']).default('homepage'),
    device: z.enum(['mobile', 'desktop', 'tablet']).default('desktop'),
    urgency: z.enum(['immediate', 'within_week', 'within_month', 'planning']).optional(),
    referrer: z.string().optional(),
    session_id: z.string().optional(),
    ab_test_group: z.enum(['control', 'embedding_v1', 'hybrid_ml', 'advanced']).optional(),
  }).optional(),
});

const FeedbackEventSchema = z.object({
  user_id: z.string().uuid(),
  property_id: z.string().uuid(),
  event_type: z.enum(['view', 'click', 'favorite', 'contact', 'visit', 'rent']),
  request_id: z.string().optional(),
  context: z.record(z.any()).optional(),
  ab_test_group: z.string().optional(),
});

// Poids optimisés par variante A/B
const WEIGHT_CONFIGS = {
  control: {
    onboarding: 35, viewingHistory: 25, collaborativeFilter: 15,
    embeddingSimilarity: 0, locationMatch: 10, popularity: 8,
    recency: 5, verification: 2, diversity: 10, mlScore: 0,
  },
  embedding_v1: {
    onboarding: 25, viewingHistory: 20, collaborativeFilter: 15,
    embeddingSimilarity: 20, locationMatch: 10, popularity: 6,
    recency: 3, verification: 1, diversity: 10, mlScore: 0,
  },
  hybrid_ml: {
    onboarding: 20, viewingHistory: 15, collaborativeFilter: 10,
    embeddingSimilarity: 25, locationMatch: 8, popularity: 4,
    recency: 2, verification: 1, diversity: 10, mlScore: 15,
  },
  advanced: {
    onboarding: 18, viewingHistory: 12, collaborativeFilter: 8,
    embeddingSimilarity: 28, locationMatch: 6, popularity: 3,
    recency: 2, verification: 1, diversity: 12, mlScore: 20,
  }
};

// ==================== INTERFACES ====================

interface UserProfile {
  user_id?: string;
  city?: string;
  budget_min?: number;
  budget_max?: number;
  preferred_property_types?: string[];
  preferred_neighborhoods?: string[];
  preferred_listing_types?: string[];
  preferred_amenities?: string[];
  move_in_timeline?: string;
  user_type?: string;
  segment?: string;
}

interface ViewingPattern {
  propertyTypes: Record<string, number>;
  listingTypes: Record<string, number>;
  cities: Record<string, number>;
  neighborhoods: Record<string, number>;
  priceRange: { min: number; max: number };
  amenities: Record<string, number>;
  totalViews: number;
  avgViewDuration: number;
  embeddingCentroid?: number[];
}

interface ScoredProperty {
  property: any;
  score: number;
  reasons: string[];
  similarityScore: number;
  embeddingSimilarity: number;
  mlScore?: number;
  scoreBreakdown: Record<string, number>;
  rank?: number;
}

interface FeatureWeights {
  onboarding: number; viewingHistory: number; collaborativeFilter: number;
  embeddingSimilarity: number; locationMatch: number; popularity: number;
  recency: number; verification: number; diversity: number; mlScore?: number;
}

// ==================== SERVICES ====================

class EmbeddingService {
  private cache = new Map<string, { vector: number[]; timestamp: number }>();
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  // Batch fetch avec cache intelligent
  async getPropertyEmbeddingsBatch(propertyIds: string[]): Promise<Map<string, number[]>> {
    const result = new Map<string, number[]>();
    const toFetch: string[] = [];

    propertyIds.forEach(id => {
      const cached = this.cache.get(id);
      if (cached && Date.now() - cached.timestamp < CONFIG.EMBEDDING_CACHE_TTL) {
        result.set(id, cached.vector);
      } else {
        toFetch.push(id);
      }
    });

    if (toFetch.length === 0) return result;

    try {
      const { data, error } = await this.supabase
        .from('property_embeddings')
        .select('property_id, vector')
        .in('property_id', toFetch);

      if (error) throw error;

      data?.forEach((row: any) => {
        result.set(row.property_id, row.vector);
        this.cache.set(row.property_id, { vector: row.vector, timestamp: Date.now() });
      });
    } catch (e) {
      console.error('Batch embedding fetch error:', e);
    }

    return result;
  }

  async getUserEmbedding(userId: string): Promise<number[] | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_embeddings')
        .select('vector')
        .eq('user_id', userId)
        .single();

      if (error || !data) return null;
      return data.vector;
    } catch (e) {
      return null;
    }
  }

  async createUserEmbedding(userId: string, viewedProperties: any[]): Promise<number[]> {
    if (viewedProperties.length === 0) return new Array(CONFIG.EMBEDDING_DIM).fill(0);

    const propertyIds = viewedProperties.map(p => p.id);
    const embeddingsMap = await this.getPropertyEmbeddingsBatch(propertyIds);
    const validEmbeddings = Array.from(embeddingsMap.values());

    if (validEmbeddings.length === 0) return new Array(CONFIG.EMBEDDING_DIM).fill(0);

    const centroid = this.calculateCentroid(validEmbeddings);

    // Sauvegarde asynchrone sans attendre
    this.supabase.from('user_embeddings').upsert({
      user_id: userId,
      vector: centroid,
      version: 'v2',
      property_count: validEmbeddings.length,
      updated_at: new Date().toISOString()
    }).catch(console.error);

    return centroid;
  }

  private calculateCentroid(embeddings: number[][]): number[] {
    const dim = embeddings[0].length;
    const centroid = new Array(dim).fill(0);
    embeddings.forEach(emb => {
      emb.forEach((val, idx) => { centroid[idx] += val / embeddings.length; });
    });
    return centroid;
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return (normA === 0 || normB === 0) ? 0 : dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Génération d'embedding à la volée (fallback)
  computePropertyEmbedding(property: any): number[] {
    const vector = [
      Math.log1p(property.price || 0) / 10,
      property.property_type === 'apartment' ? 1 : 0,
      property.property_type === 'house' ? 1 : 0,
      property.property_type === 'studio' ? 1 : 0,
      property.property_type === 'loft' ? 1 : 0,
      property.listing_type === 'rent' ? 1 : 0,
      property.listing_type === 'sale' ? 1 : 0,
      property.listing_type === 'colocation' ? 1 : 0,
      this.hashString(property.city || '') / 1000,
      this.hashString(property.neighborhood || '') / 1000,
      Math.min((property.surface || 0) / 200, 1),
      Math.min((property.rooms || 0) / 5, 1),
      Math.min((property.bedrooms || 0) / 3, 1),
      ...(property.amenities || []).includes('wifi') ? [1] : [0],
      ...(property.amenities || []).includes('parking') ? [1] : [0],
      ...(property.amenities || []).includes('furnished') ? [1] : [0],
      ...(property.amenities || []).includes('balcony') ? [1] : [0],
      ...(property.amenities || []).includes('garden') ? [1] : [0],
      ...(property.amenities || []).includes('elevator') ? [1] : [0],
      ...(property.amenities || []).includes('pool') ? [1] : [0],
      ...(property.amenities || []).includes('security') ? [1] : [0],
      ...(property.amenities || []).includes('ac') ? [1] : [0],
      ...(property.amenities || []).includes('dishwasher') ? [1] : [0],
      property.is_verified ? 1 : 0,
      Math.min((property.photos_count || 0) / 10, 1),
      property.description ? Math.min(property.description.length / 1000, 1) : 0,
      Math.log1p(property.view_count || 0) / 5,
      Math.log1p(property.favorite_count || 0) / 5,
      this.daysSince(property.created_at) / 30,
      property.is_available ? 1 : 0,
      this.daysUntil(property.available_from) / 30,
      0, 0
    ];
    return vector.slice(0, CONFIG.EMBEDDING_DIM);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private daysSince(dateStr: string): number {
    if (!dateStr) return 30;
    return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
  }

  private daysUntil(dateStr: string): number {
    if (!dateStr) return 0;
    return Math.max(0, (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }
}

class ABTestingFramework {
  private supabase: any;
  private activeExperiments = new Map<string, any>();
  private cache: DistributedCache;

  constructor(supabaseClient: any, cache: DistributedCache) {
    this.supabase = supabaseClient;
    this.cache = cache;
    this.loadExperiments();
  }

  async loadExperiments() {
    try {
      const { data } = await this.supabase.from('ab_experiments').select('*').eq('status', 'active');
      data?.forEach((exp: any) => this.activeExperiments.set(exp.id, exp));
    } catch (e) {
      console.error('Failed to load experiments:', e);
    }
  }

  assignGroup(userId: string, experimentId: string = 'default'): string {
    const experiment = this.activeExperiments.get(experimentId);
    if (!experiment) return 'control';

    const hash = userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const variants = experiment.variants || ['control', 'treatment'];
    return variants[hash % variants.length];
  }

  async trackEvent(event: any) {
    try {
      await this.supabase.from('ab_events').insert({ ...event, timestamp: new Date().toISOString() });
    } catch (e) {
      console.error('AB tracking error:', e);
    }
  }
}

class LightMLModel {
  private weights: number[] = [];
  private bias: number = 0;
  private supabase: any;
  private isLoaded = false;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
    this.loadWeights();
  }

  async loadWeights() {
    try {
      const { data } = await this.supabase
        .from('ml_model_weights')
        .select('weights, bias')
        .eq('model_name', 'light_ranker_v2')
        .single();

      if (data) {
        this.weights = data.weights;
        this.bias = data.bias || 0;
        this.isLoaded = true;
      }
    } catch (e) {
      console.error('Failed to load ML weights:', e);
    }
  }

  predict(features: number[]): number {
    if (!this.isLoaded || this.weights.length !== features.length) return 0.5;

    let score = this.bias;
    for (let i = 0; i < features.length; i++) score += features[i] * this.weights[i];
    
    return 1 / (1 + Math.exp(-score)); // Sigmoid
  }

  extractFeatures(property: any, userProfile: any, context: any): number[] {
    return [
      Math.min(property.price / 5000, 5),
      Math.min((property.surface || 0) / 100, 3),
      Math.min((property.rooms || 0) / 5, 1),
      userProfile?.budget_min ? Math.min((property.price - userProfile.budget_min) / 1000, 2) : 0,
      userProfile?.city === property.city ? 1 : 0,
      context?.device === 'mobile' ? 1 : 0,
      context?.urgency === 'immediate' ? 1 : 0,
      property.is_verified ? 1 : 0,
      Math.log1p(property.view_count || 0) / 10,
      Math.min((property.photos_count || 0) / 10, 1),
    ];
  }
}

class DistributedCache {
  private localCache = new Map<string, { data: any; timestamp: number; hits: number }>();
  private requestCounts = new Map<string, { count: number; resetTime: number }>();

  async get(key: string): Promise<any> {
    const item = this.localCache.get(key);
    if (item && Date.now() - item.timestamp < CONFIG.CACHE_TTL) {
      item.hits++;
      return item.data;
    }
    return null;
  }

  async set(key: string, data: any, ttl: number = CONFIG.CACHE_TTL) {
    this.localCache.set(key, { data, timestamp: Date.now(), hits: 0 });
  }

  // Rate limiting par IP
  checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const record = this.requestCounts.get(ip);

    if (!record || now > record.resetTime) {
      this.requestCounts.set(ip, { count: 1, resetTime: now + CONFIG.RATE_WINDOW });
      return true;
    }

    if (record.count >= CONFIG.RATE_LIMIT) return false;

    record.count++;
    return true;
  }

  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    this.localCache.forEach((item, key) => {
      stats[key] = { age: Date.now() - item.timestamp, hits: item.hits };
    });
    return stats;
  }
}

// ==================== SCORING ENGINE ====================

class ScoringEngine {
  constructor(
    private embeddingService: EmbeddingService,
    private lightMLModel?: LightMLModel
  ) {}

  calculateOnboardingScore(property: any, userProfile: UserProfile): { score: number; reasons: string[]; breakdown: Record<string, number> } {
    let score = 0;
    const reasons: string[] = [];
    const breakdown: Record<string, number> = {};

    if (!userProfile) return { score, reasons, breakdown };

    // Budget (critique) - pondération dynamique
    if (userProfile.budget_min != null && userProfile.budget_max != null) {
      if (property.price >= userProfile.budget_min && property.price <= userProfile.budget_max) {
        const pts = 15;
        score += pts;
        breakdown.budget = pts;
        reasons.push("onboarding_budget_match");
      } else if (property.price < userProfile.budget_min * 0.9) {
        const pts = 5;
        score += pts;
        breakdown.budget_below = pts;
      } else {
        score -= 10;
        breakdown.budget_penalty = -10;
      }
    }

    // Type de propriété
    if (userProfile.preferred_property_types?.includes(property.property_type)) {
      const pts = 8;
      score += pts;
      breakdown.property_type = pts;
      reasons.push("onboarding_property_type");
    }

    // Ville
    if (userProfile.city && property.city?.toLowerCase() === userProfile.city.toLowerCase()) {
      const pts = 10;
      score += pts;
      breakdown.city = pts;
      reasons.push("onboarding_city");
    }

    // Quartiers (très important)
    if (userProfile.preferred_neighborhoods?.includes(property.neighborhood)) {
      const pts = 12;
      score += pts;
      breakdown.neighborhood = pts;
      reasons.push("onboarding_neighborhood");
    }

    // Type d'annonce
    if (userProfile.preferred_listing_types?.includes(property.listing_type)) {
      const pts = 6;
      score += pts;
      breakdown.listing_type = pts;
      reasons.push("onboarding_listing_type");
    }

    // Amenities
    if (userProfile.preferred_amenities?.length > 0 && property.amenities) {
      const matches = userProfile.preferred_amenities.filter(a => property.amenities.includes(a)).length;
      const ratio = matches / userProfile.preferred_amenities.length;
      const pts = ratio * 15;
      score += pts;
      breakdown.amenities = pts;
      if (ratio > 0.6) reasons.push("onboarding_amenities_strong");
      else if (ratio > 0.3) reasons.push("onboarding_amenities_partial");
    }

    // Timeline
    if (userProfile.move_in_timeline === "immediate" && property.is_available) {
      const pts = 8;
      score += pts;
      breakdown.timeline = pts;
      reasons.push("onboarding_immediate");
    }

    // Segment utilisateur
    if (userProfile.segment === "student" && property.price < 400) {
      score += 5;
      breakdown.segment = 5;
      reasons.push("segment_student");
    } else if (userProfile.segment === "family" && property.rooms >= 3) {
      score += 6;
      breakdown.segment = 6;
      reasons.push("segment_family");
    } else if (userProfile.segment === "expat" && property.is_furnished) {
      score += 5;
      breakdown.segment = 5;
      reasons.push("segment_expat");
    }

    return { score, reasons, breakdown };
  }

  calculatePropertyScore(
    property: any,
    userProfile: UserProfile | null,
    viewingPattern: ViewingPattern | null,
    collaborativeScores: Map<string, number>,
    userFavorites: string[],
    WEIGHTS: FeatureWeights,
    context: any,
    userEmbedding: number[] | null
  ): ScoredProperty {
    let score = 0;
    const reasons: string[] = [];
    const breakdown: Record<string, number> = {};
    let similarityScore = 0;
    let embeddingSimilarity = 0;
    let mlScore = 0.5;

    // 1. Onboarding Score
    if (userProfile) {
      const onboarding = this.calculateOnboardingScore(property, userProfile);
      const contribution = Math.min(onboarding.score, 50) * (WEIGHTS.onboarding / 35);
      score += contribution;
      breakdown.onboarding = contribution;
      reasons.push(...onboarding.reasons.slice(0, 2));
    }

    // 2. Embedding Similarity (user preference)
    if (userEmbedding && property.property_embeddings?.vector) {
      embeddingSimilarity = this.embeddingService.cosineSimilarity(userEmbedding, property.property_embeddings.vector);
      if (WEIGHTS.embeddingSimilarity) {
        const contribution = embeddingSimilarity * WEIGHTS.embeddingSimilarity;
        score += contribution;
        breakdown.embedding_similarity = contribution;
        if (embeddingSimilarity > 0.8) reasons.push("high_embedding_match");
        else if (embeddingSimilarity > 0.6) reasons.push("good_embedding_match");
      }
    }

    // 3. Viewing History Pattern
    if (viewingPattern?.embeddingCentroid && property.property_embeddings?.vector) {
      similarityScore = this.embeddingService.cosineSimilarity(viewingPattern.embeddingCentroid, property.property_embeddings.vector);
      const contribution = similarityScore * WEIGHTS.viewingHistory;
      score += contribution;
      breakdown.viewing_history = contribution;
      if (similarityScore > 0.7) reasons.push("matches_viewing_history");
    }

    // 4. Collaborative Filtering
    const collabScore = collaborativeScores.get(property.id);
    if (collabScore) {
      const normalizedCollab = Math.min(collabScore / 5, 1);
      const contribution = normalizedCollab * WEIGHTS.collaborativeFilter;
      score += contribution;
      breakdown.collaborative = contribution;
      if (normalizedCollab > 0.5) reasons.push("trending_with_similar_users");
    }

    // 5. ML Score
    if (this.lightMLModel && WEIGHTS.mlScore) {
      const features = this.lightMLModel.extractFeatures(property, userProfile, context);
      mlScore = this.lightMLModel.predict(features);
      const contribution = mlScore * WEIGHTS.mlScore;
      score += contribution;
      breakdown.ml_score = contribution;
      if (mlScore > 0.8) reasons.push("ml_high_confidence");
    }

    // 6. Penalize already favorited
    if (userFavorites.includes(property.id)) {
      score -= 25;
      breakdown.already_favorite = -25;
    }

    // 7. Popularity with time decay
    const daysSinceCreated = property.created_at ? (Date.now() - new Date(property.created_at).getTime()) / 86400000 : 30;
    const recencyWeight = Math.max(0.3, 1 - (daysSinceCreated / 30));
    const popularityScore = Math.log10((property.view_count || 0) + 1) * recencyWeight;
    const cappedPopularity = Math.min(popularityScore, WEIGHTS.popularity);
    score += cappedPopularity;
    breakdown.popularity = cappedPopularity;

    // 8. Recency boost
    if (daysSinceCreated < 7) {
      const recencyScore = ((7 - daysSinceCreated) / 7) * WEIGHTS.recency;
      score += recencyScore;
      breakdown.recency = recencyScore;
      if (daysSinceCreated < 2) reasons.push("new_listing");
    }

    // 9. Verification
    if (property.is_verified) {
      score += WEIGHTS.verification;
      breakdown.verification = WEIGHTS.verification;
      reasons.push("verified");
    }

    // 10. Urgence contextuelle
    if (context?.urgency === 'immediate' && property.is_available && this.daysUntil(property.available_from) <= 7) {
      score += 5;
      breakdown.urgency = 5;
      reasons.push("immediate_availability");
    }

    return {
      property,
      score: Math.round(score * 100) / 100,
      reasons: reasons.slice(0, 4),
      similarityScore,
      embeddingSimilarity,
      mlScore,
      scoreBreakdown: breakdown
    };
  }

  private daysUntil(dateStr: string): number {
    if (!dateStr) return 0;
    return Math.max(0, (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }
}

// ==================== DIVERSIFICATION ENGINE ====================

class DiversificationEngine {
  applyMMR(candidates: ScoredProperty[], limit: number, lambda: number = CONFIG.MMR_LAMBDA): ScoredProperty[] {
    if (candidates.length <= limit) return candidates;
    
    const selected: ScoredProperty[] = [];
    const remaining = [...candidates].sort((a, b) => b.score - a.score);

    while (selected.length < limit && remaining.length > 0) {
      let maxMmrScore = -Infinity;
      let maxMmrIndex = 0;

      for (let i = 0; i < remaining.length; i++) {
        const item = remaining[i];
        
        if (selected.length === 0) {
          maxMmrScore = item.score;
          maxMmrIndex = i;
        } else {
          const maxSim = Math.max(...selected.map(sel => this.calculateSimilarity(item.property, sel.property)));
          const mmrScore = lambda * item.score - (1 - lambda) * maxSim * 100;
          
          if (mmrScore > maxMmrScore) {
            maxMmrScore = mmrScore;
            maxMmrIndex = i;
          }
        }
      }

      selected.push(remaining[maxMmrIndex]);
      remaining.splice(maxMmrIndex, 1);
    }

    // Ajouter le rank
    selected.forEach((item, index) => item.rank = index + 1);
    return selected;
  }

  private calculateSimilarity(a: any, b: any): number {
    let similarity = 0;
    let features = 0;

    if (a.property_type === b.property_type) { similarity += 1; features++; }
    if (a.city === b.city) { similarity += 1; features++; }
    if (a.neighborhood === b.neighborhood) { similarity += 1; features++; }
    if (a.price && b.price) {
      similarity += 1 - Math.min(Math.abs(a.price - b.price) / Math.max(a.price, b.price), 1);
      features++;
    }
    if (a.property_embeddings?.vector && b.property_embeddings?.vector) {
      similarity += this.cosineSimilarity(a.property_embeddings.vector, b.property_embeddings.vector);
      features++;
    }

    return features > 0 ? similarity / features : 0;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] ** 2;
      normB += b[i] ** 2;
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
  }
}

// ==================== UTILITAIRES ====================

function analyzeViewingPattern(viewedProps: any[]): ViewingPattern {
  const propertyTypes: Record<string, number> = {};
  const listingTypes: Record<string, number> = {};
  const cities: Record<string, number> = {};
  const neighborhoods: Record<string, number> = {};
  const amenitiesCount: Record<string, number> = {};
  const prices: number[] = [];
  let totalDuration = 0;
  const embeddings: number[][] = [];

  viewedProps.forEach((p: any) => {
    propertyTypes[p.property_type] = (propertyTypes[p.property_type] || 0) + 1;
    listingTypes[p.listing_type] = (listingTypes[p.listing_type] || 0) + 1;
    cities[p.city] = (cities[p.city] || 0) + 1;
    if (p.neighborhood) neighborhoods[p.neighborhood] = (neighborhoods[p.neighborhood] || 0) + 1;
    prices.push(p.price);
    totalDuration += p.view_duration_seconds || 0;
    
    if (p.property_embeddings?.vector) embeddings.push(p.property_embeddings.vector);
    
    if (p.amenities?.forEach) {
      p.amenities.forEach((a: string) => { amenitiesCount[a] = (amenitiesCount[a] || 0) + 1; });
    }
  });

  let embeddingCentroid: number[] | undefined;
  if (embeddings.length > 0) {
    embeddingCentroid = new Array(CONFIG.EMBEDDING_DIM).fill(0);
    embeddings.forEach(emb => {
      emb.forEach((val, idx) => { embeddingCentroid![idx] += val / embeddings.length; });
    });
  }

  return {
    propertyTypes,
    listingTypes,
    cities,
    neighborhoods,
    priceRange: { min: Math.min(...prices) * 0.8, max: Math.max(...prices) * 1.2 },
    amenities: amenitiesCount,
    totalViews: viewedProps.length,
    avgViewDuration: totalDuration / viewedProps.length,
    embeddingCentroid,
  };
}

async function getCollaborativeScores(supabase: any, user_id: string | undefined, userFavorites: string[]): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  if (!user_id || userFavorites.length === 0) return scores;

  try {
    const { data: similarUsers } = await supabase
      .from("property_favorites")
      .select("user_id, property_id")
      .in("property_id", userFavorites.slice(0, 20))
      .neq("user_id", user_id)
      .limit(500);

    if (!similarUsers || similarUsers.length === 0) return scores;

    const userItemMatrix = new Map<string, Set<string>>();
    similarUsers.forEach((row: any) => {
      if (!userItemMatrix.has(row.user_id)) userItemMatrix.set(row.user_id, new Set());
      userItemMatrix.get(row.user_id)!.add(row.property_id);
    });

    const targetUserItems = new Set(userFavorites);
    const similarities: Array<[string, number]> = [];

    userItemMatrix.forEach((items, otherUserId) => {
      const intersection = new Set([...targetUserItems].filter(x => items.has(x)));
      const similarity = intersection.size / Math.sqrt(targetUserItems.size * items.size);
      if (similarity > 0.2) similarities.push([otherUserId, similarity]);
    });

    if (similarities.length === 0) return scores;

    const topSimilarUsers = similarities.sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id]) => id);

    const { data: recommendations } = await supabase
      .from("property_favorites")
      .select("property_id, user_id")
      .in("user_id", topSimilarUsers)
      .not("property_id", "in", `(${[...targetUserItems].slice(0, 100).join(",")})`)
      .limit(300);

    if (recommendations) {
      const itemScores: Record<string, number> = {};
      recommendations.forEach((rec: any) => {
        const userSim = similarities.find(([id]) => id === rec.user_id)?.[1] || 0;
        itemScores[rec.property_id] = (itemScores[rec.property_id] || 0) + userSim;
      });

      Object.entries(itemScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 100)
        .forEach(([id, score]) => scores.set(id, score));
    }
  } catch (e) {
    console.error('Collaborative filtering error:', e);
  }

  return scores;
}

async function generateCandidates(supabase: any, userProfile: UserProfile | null, limit: number, excludedIds: string[] = []): Promise<any[]> {
  try {
    let query = supabase
      .from("properties")
      .select(`*, property_embeddings!inner(vector)`)
      .eq("is_published", true)
      .eq("is_available", true);

    if (excludedIds.length > 0) {
      query = query.not("id", "in", `(${excludedIds.slice(0, 100).join(",")})`);
    }

    // Filtres dynamiques basés sur le profil
    if (userProfile?.city) {
      query = query.ilike("city", `%${userProfile.city}%`);
    }

    if (userProfile?.budget_min != null && userProfile?.budget_max != null) {
      query = query.gte("price", userProfile.budget_min * 0.8).lte("price", userProfile.budget_max * 1.2);
    }

    if (userProfile?.preferred_property_types?.length > 0) {
      query = query.in("property_type", userProfile.preferred_property_types);
    }

    if (userProfile?.preferred_neighborhoods?.length > 0) {
      query = query.in("neighborhood", userProfile.preferred_neighborhoods);
    }

    const { data, error } = await query.order("created_at", { ascending: false }).limit(Math.min(limit * 3, CONFIG.MAX_CANDIDATES));
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Candidate generation error:', e);
    return [];
  }
}

// ==================== HANDLERS ====================

async function handleRecommendation(req: Request, requestStartTime: number, cache: DistributedCache): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }

  // Rate limiting
  const clientIp = req.headers.get("x-forwarded-for") || "unknown";
  if (!cache.checkRateLimit(clientIp)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }

  try {
    const body = await req.json();
    const validated = RecommendationRequestSchema.parse(body);
    const { user_id, limit = CONFIG.DEFAULT_LIMIT, offset = 0, context } = validated;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const embeddingService = new EmbeddingService(supabase);
    const abTesting = new ABTestingFramework(supabase, cache);
    const lightMLModel = new LightMLModel(supabase);
    const scoringEngine = new ScoringEngine(embeddingService, lightMLModel);
    const diversificationEngine = new DiversificationEngine();

    // Chargement parallèle des dépendances
    await Promise.all([abTesting.loadExperiments(), lightMLModel.loadWeights()]);

    // Détermination du groupe A/B
    const abGroup = context?.ab_test_group || (user_id ? abTesting.assignGroup(user_id, 'recommendation_v3') : 'control');
    const WEIGHTS = WEIGHT_CONFIGS[abGroup as keyof typeof WEIGHT_CONFIGS] || WEIGHT_CONFIGS.control;

    // Cache check
    const cacheKey = `rec:${user_id || 'anon'}:${abGroup}:${JSON.stringify(context)}:${limit}:${offset}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return new Response(JSON.stringify({ ...cached, cached: true }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Récupération parallèle des données utilisateur
    const [userProfileResult, favoritesResult, viewHistoryResult] = await Promise.all([
      user_id ? supabase.from("profiles").select("*").eq("user_id", user_id).single() : Promise.resolve({ data: null }),
      user_id ? supabase.from("property_favorites").select("property_id").eq("user_id", user_id) : Promise.resolve({ data: [] }),
      user_id ? supabase.from("property_views").select("property_id, view_duration_seconds, viewed_at").eq("user_id", user_id).order("viewed_at", { ascending: false }).limit(50) : Promise.resolve({ data: [] })
    ]);

    const userProfile: UserProfile | null = userProfileResult.data;
    const userFavorites = favoritesResult.data?.map((f: any) => f.property_id) || [];

    // Analyse des patterns et création d'embedding
    let viewingPattern: ViewingPattern | null = null;
    let viewedPropertyIds: string[] = [];
    let finalUserEmbedding: number[] | null = null;

    if (viewHistoryResult.data?.length > 0) {
      const engagedViews = viewHistoryResult.data.filter((v: any) => (v.view_duration_seconds || 0) > 10);
      viewedPropertyIds = engagedViews.map((v: any) => v.property_id);

      if (viewedPropertyIds.length > 0) {
        const { data: viewedProps } = await supabase
          .from("properties")
          .select("*, property_embeddings(vector)")
          .in("id", viewedPropertyIds.slice(0, 30));

        if (viewedProps?.length > 0) {
          viewingPattern = analyzeViewingPattern(viewedProps);
          if (user_id) {
            finalUserEmbedding = await embeddingService.createUserEmbedding(user_id, viewedProps);
          }
        }
      }
    }

    // Fallback vers embedding stocké
    if (!finalUserEmbedding && user_id) {
      finalUserEmbedding = await embeddingService.getUserEmbedding(user_id);
    }

    // Collaborative filtering
    const collaborativeScores = await getCollaborativeScores(supabase, user_id, userFavorites);

    // Génération des candidats
    const excludedIds = [...new Set([...userFavorites, ...viewedPropertyIds])];
    const candidates = await generateCandidates(supabase, userProfile, limit * 3, excludedIds);

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ 
        recommendations: [], 
        total: 0,
        metadata: { ab_test_group: abGroup, processing_time_ms: Date.now() - requestStartTime }
      }), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    }

    // Scoring parallèle des candidats
    const scored = candidates.map((property: any) => 
      scoringEngine.calculatePropertyScore(property, userProfile, viewingPattern, collaborativeScores, userFavorites, WEIGHTS, context, finalUserEmbedding)
    );

    // Diversification MMR
    const diverseResults = diversificationEngine.applyMMR(scored, limit, CONFIG.MMR_LAMBDA);
    const results = diverseResults.slice(offset, offset + limit);

    // Construction de la réponse
    const response = {
      recommendations: results.map((r: ScoredProperty) => ({
        ...r.property,
        _score: r.score,
        _rank: r.rank,
        _reasons: r.reasons,
        _match_details: {
          collaborative_score: collaborativeScores.get(r.property.id) || 0,
          viewing_similarity: r.similarityScore,
          embedding_similarity: r.embeddingSimilarity,
          ml_score: r.mlScore,
          ab_test_group: abGroup,
          score_breakdown: r.scoreBreakdown
        }
      })),
      total: diverseResults.length,
      metadata: {
        ab_test_group: abGroup,
        processing_time_ms: Date.now() - requestStartTime,
        candidates_count: candidates.length,
        user_embedding_used: !!finalUserEmbedding,
        cache_stats: cache.getStats(),
      }
    };

    await cache.set(cacheKey, response, CONFIG.CACHE_TTL);

    // Tracking A/B test (non bloquant)
    if (user_id && results.length > 0) {
      abTesting.trackEvent({
        user_id,
        experiment_id: 'recommendation_v3',
        variant: abGroup,
        event_type: 'impression',
        property_id: results[0].property.id,
      }).catch(console.error);
    }

    return new Response(JSON.stringify(response), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Recommendation error:", error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: error.errors }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
}

async function handleFeedback(req: Request, cache: DistributedCache): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    const { user_id, property_id, event_type, request_id, context, ab_test_group } = FeedbackEventSchema.parse(body);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const abTesting = new ABTestingFramework(supabase, cache);

    const rewards: Record<string, number> = {
      'view': 0.1, 'click': 0.3, 'favorite': 0.5, 'contact': 0.8, 'visit': 0.9, 'rent': 1.0,
    };
    const value = rewards[event_type] || 0;

    await Promise.all([
      supabase.from('feedback_events').insert({
        user_id, property_id, event_type, value,
        context: { ...context, request_id, ab_test_group },
        timestamp: new Date().toISOString(),
      }),
      abTesting.trackEvent({
        user_id, experiment_id: 'recommendation_v3', variant: ab_test_group || 'control', event_type, property_id, value,
      })
    ]);

    return new Response(JSON.stringify({ success: true, value }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Feedback error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
}

// ... (votre code existant jusqu'à la fin)

// ==================== MAIN ENTRY POINT ====================

const globalCache = new DistributedCache();

Deno.serve(async (req) => {
  // AJOUT: Gestion explicite du preflight CORS - DOIT ÊTRE EN PREMIER
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204,
      headers: CORS_HEADERS 
    });
  }

  const requestStartTime = Date.now();
  const url = new URL(req.url);
  
  try {
    if (url.pathname.endsWith('/feedback')) {
      return await handleFeedback(req, globalCache);
    }
    return await handleRecommendation(req, requestStartTime, globalCache);
  } catch (error: any) {
    console.error("Global error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: error.message }),
      { 
        status: 500, 
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" } 
      }
    );
  }
});