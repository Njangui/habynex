import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { z } from "https://esm.sh/zod@3.22.4";

// ==================== CONFIGURATION & CONSTANTES ====================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Schémas de validation Zod
const RecommendationRequestSchema = z.object({
  user_id: z.string().uuid().optional(),
  limit: z.number().min(1).max(50).default(15),
  offset: z.number().min(0).default(0),
  context: z.object({
    source: z.enum(['search', 'homepage', 'alert', 'favorites', 'similar']).default('homepage'),
    device: z.enum(['mobile', 'desktop', 'tablet']).default('desktop'),
    urgency: z.enum(['immediate', 'within_week', 'within_month', 'planning']).optional(),
    referrer: z.string().optional(),
    session_id: z.string().optional(),
    ab_test_group: z.enum(['control', 'embedding_v1', 'hybrid_ml']).optional(),
  }).optional(),
});

// Poids dynamiques par segment et variante A/B
const WEIGHT_CONFIGS = {
  control: {
    exactProfileMatch: 30,
    viewingHistory: 25,
    collaborativeFilter: 15,
    locationMatch: 12,
    availability: 8,
    popularity: 5,
    recency: 3,
    verification: 2,
    diversity: 10,
  },
  embedding_v1: {
    exactProfileMatch: 20,
    viewingHistory: 20,
    collaborativeFilter: 15,
    locationMatch: 10,
    availability: 8,
    popularity: 5,
    recency: 3,
    verification: 2,
    embeddingSimilarity: 25,  // Nouveau poids fort pour les embeddings
    diversity: 10,
  },
  hybrid_ml: {
    exactProfileMatch: 15,
    viewingHistory: 15,
    collaborativeFilter: 10,
    locationMatch: 8,
    availability: 5,
    popularity: 3,
    recency: 2,
    verification: 2,
    embeddingSimilarity: 30,
    mlScore: 20,  // Score d'un modèle ML léger
    diversity: 10,
  }
};

// Cache et Feature Store
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const EMBEDDING_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 heures

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
  embedding?: number[];  // Embedding utilisateur appris
}

interface PropertyEmbedding {
  property_id: string;
  vector: number[];
  version: string;
  created_at: string;
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
  embeddingCentroid?: number[];  // Centroid des embeddings vus
}

interface ScoredProperty {
  property: any;
  score: number;
  reasons: string[];
  similarityScore: number;
  embeddingSimilarity: number;
  featureVector: number[];
  mlScore?: number;  // Score du modèle ML léger
}

interface FeedbackEvent {
  user_id: string;
  property_id: string;
  event_type: 'view' | 'favorite' | 'contact' | 'visit' | 'rent';
  value: number;
  context: any;
  timestamp: string;
  ab_test_group: string;
}

interface FeatureWeights {
  exactProfileMatch: number;
  viewingHistory: number;
  collaborativeFilter: number;
  locationMatch: number;
  availability: number;
  popularity: number;
  recency: number;
  verification: number;
  diversity: number;
  embeddingSimilarity?: number;
  mlScore?: number;
}

// ==================== EMBEDDING SERVICE ====================

class EmbeddingService {
  private cache = new Map<string, PropertyEmbedding>();
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  // Créer un embedding pour une propriété (appelé lors de la création/mise à jour)
  async createPropertyEmbedding(property: any): Promise<number[]> {
    const vector = this.computePropertyEmbedding(property);
    
    // Sauvegarder dans la base
    await this.supabase
      .from('property_embeddings')
      .upsert({
        property_id: property.id,
        vector,
        version: 'v1',
        created_at: new Date().toISOString()
      });
    
    return vector;
  }

  // Récupérer un embedding (avec cache)
  async getPropertyEmbedding(propertyId: string): Promise<number[] | null> {
    const cacheKey = `emb:${propertyId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - new Date(cached.created_at).getTime() < EMBEDDING_CACHE_TTL) {
      return cached.vector;
    }

    const { data, error } = await this.supabase
      .from('property_embeddings')
      .select('vector')
      .eq('property_id', propertyId)
      .single();

    if (error || !data) return null;

    this.cache.set(cacheKey, {
      property_id: propertyId,
      vector: data.vector,
      version: 'v1',
      created_at: new Date().toISOString()
    });

    return data.vector;
  }

  // Calculer l'embedding à la volée (fallback si pas en base)
  computePropertyEmbedding(property: any): number[] {
    // Vectorisation des caractéristiques clés (32 dimensions)
    return [
      // Prix normalisé (log scale pour réduire l'impact des outliers)
      Math.log1p(property.price || 0) / 10,
      
      // Type de propriété (one-hot encoding simplifié)
      property.property_type === 'apartment' ? 1 : 0,
      property.property_type === 'house' ? 1 : 0,
      property.property_type === 'studio' ? 1 : 0,
      property.property_type === 'loft' ? 1 : 0,
      
      // Type d'annonce
      property.listing_type === 'rent' ? 1 : 0,
      property.listing_type === 'sale' ? 1 : 0,
      property.listing_type === 'colocation' ? 1 : 0,
      
      // Localisation (hash simple pour la ville)
      this.hashString(property.city || '') / 1000,
      this.hashString(property.neighborhood || '') / 1000,
      
      // Caractéristiques physiques
      Math.min((property.surface || 0) / 200, 1),  // Surface normalisée
      Math.min((property.rooms || 0) / 5, 1),      // Nombre de pièces
      Math.min((property.bedrooms || 0) / 3, 1),   // Chambres
      
      // Commodités (top 10 les plus importantes)
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
      
      // Qualité de l'annonce
      property.is_verified ? 1 : 0,
      Math.min((property.photos_count || 0) / 10, 1),
      property.description ? Math.min(property.description.length / 1000, 1) : 0,
      
      // Popularité et temporalité
      Math.log1p(property.view_count || 0) / 5,
      Math.log1p(property.favorite_count || 0) / 5,
      this.daysSince(property.created_at) / 30,  // Âge de l'annonce en mois
      
      // Disponibilité
      property.is_available ? 1 : 0,
      this.daysUntil(property.available_from) / 30,  // Disponible dans X mois
      
      // Padding pour atteindre 32 dimensions
      0, 0
    ].slice(0, 32);  // S'assurer qu'on a exactement 32 dimensions
  }

  // Créer l'embedding utilisateur à partir de son historique
  async createUserEmbedding(userId: string, viewedProperties: any[]): Promise<number[]> {
    if (viewedProperties.length === 0) {
      return new Array(32).fill(0);
    }

    // Calculer le centroid des embeddings des propriétés vues
    const embeddings = await Promise.all(
      viewedProperties.map(p => this.getPropertyEmbedding(p.id))
    );
    
    const validEmbeddings = embeddings.filter(e => e !== null) as number[][];
    
    if (validEmbeddings.length === 0) {
      return new Array(32).fill(0);
    }

    // Moyenne des embeddings (centroid)
    const centroid = new Array(32).fill(0);
    validEmbeddings.forEach(emb => {
      emb.forEach((val, idx) => {
        centroid[idx] += val / validEmbeddings.length;
      });
    });

    // Sauvegarder
    await this.supabase
      .from('user_embeddings')
      .upsert({
        user_id: userId,
        vector: centroid,
        version: 'v1',
        property_count: validEmbeddings.length,
        updated_at: new Date().toISOString()
      });

    return centroid;
  }

  // Récupérer l'embedding utilisateur
  async getUserEmbedding(userId: string): Promise<number[] | null> {
    const { data, error } = await this.supabase
      .from('user_embeddings')
      .select('vector')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return data.vector;
  }

  // Similarité cosinus entre deux embeddings
  cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private daysSince(dateStr: string): number {
    if (!dateStr) return 30;
    const date = new Date(dateStr);
    return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  }

  private daysUntil(dateStr: string): number {
    if (!dateStr) return 0;
    const date = new Date(dateStr);
    const diff = (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return Math.max(0, diff);
  }
}

// ==================== A/B TESTING FRAMEWORK ====================

class ABTestingFramework {
  private supabase: any;
  private activeExperiments: Map<string, Experiment> = new Map();

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
    this.loadExperiments();
  }

  async loadExperiments() {
    const { data } = await this.supabase
      .from('ab_experiments')
      .select('*')
      .eq('status', 'active');
    
    if (data) {
      data.forEach((exp: Experiment) => {
        this.activeExperiments.set(exp.id, exp);
      });
    }
  }

  // Assigner un utilisateur à un groupe d'expérience
  assignGroup(userId: string, experimentId: string = 'default'): string {
    const experiment = this.activeExperiments.get(experimentId);
    if (!experiment) return 'control';

    // Hash consistent pour répartition 50/50
    const hash = userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const variants = experiment.variants;
    return variants[hash % variants.length];
  }

  // Tracker un événement pour métriques A/B
  async trackEvent(event: {
    user_id: string;
    experiment_id: string;
    variant: string;
    event_type: string;
    property_id?: string;
    value?: number;
  }) {
    await this.supabase.from('ab_events').insert({
      ...event,
      timestamp: new Date().toISOString()
    });
  }

  // Calculer les métriques d'un test
  async calculateMetrics(experimentId: string): Promise<ExperimentMetrics> {
    const { data } = await this.supabase
      .from('ab_events')
      .select('*')
      .eq('experiment_id', experimentId);

    if (!data) return { control: {}, variants: {} };

    const metrics: ExperimentMetrics = { control: {}, variants: {} };
    
    // Grouper par variante
    const byVariant = data.reduce((acc: any, event: any) => {
      if (!acc[event.variant]) acc[event.variant] = [];
      acc[event.variant].push(event);
      return acc;
    }, {});

    // Calculer CTR, conversion rate, etc. pour chaque variante
    Object.entries(byVariant).forEach(([variant, events]: [string, any]) => {
      const impressions = events.filter((e: any) => e.event_type === 'impression').length;
      const clicks = events.filter((e: any) => e.event_type === 'click').length;
      const favorites = events.filter((e: any) => e.event_type === 'favorite').length;
      const contacts = events.filter((e: any) => e.event_type === 'contact').length;

      metrics.variants[variant] = {
        impressions,
        ctr: impressions > 0 ? clicks / impressions : 0,
        favorite_rate: impressions > 0 ? favorites / impressions : 0,
        conversion_rate: impressions > 0 ? contacts / impressions : 0,
      };
    });

    return metrics;
  }
}

interface Experiment {
  id: string;
  name: string;
  variants: string[];
  status: 'active' | 'paused' | 'completed';
  start_date: string;
  end_date?: string;
}

interface ExperimentMetrics {
  control: any;
  variants: Record<string, any>;
}

// ==================== ML LÉGER (OPTIONNEL) ====================

class LightMLModel {
  private weights: number[] = [];
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
    this.loadWeights();
  }

  async loadWeights() {
    // Charger les poids entraînés offline (simple régression logistique)
    const { data } = await this.supabase
      .from('ml_model_weights')
      .select('weights')
      .eq('model_name', 'light_ranker')
      .single();
    
    if (data) {
      this.weights = data.weights;
    }
  }

  // Prédiction simple : combinaison linéaire des features
  predict(features: number[]): number {
    if (this.weights.length === 0 || this.weights.length !== features.length) {
      return 0.5;  // Score neutre si pas de modèle
    }

    let score = 0;
    for (let i = 0; i < features.length; i++) {
      score += features[i] * this.weights[i];
    }

    // Sigmoid pour normaliser entre 0 et 1
    return 1 / (1 + Math.exp(-score));
  }

  // Features pour le modèle ML
  extractFeatures(property: any, userProfile: any, context: any): number[] {
    return [
      property.price / 5000,  // Prix normalisé
      property.surface / 100,
      property.rooms / 5,
      userProfile?.budget_min ? (property.price - userProfile.budget_min) / 1000 : 0,
      userProfile?.city === property.city ? 1 : 0,
      context?.device === 'mobile' ? 1 : 0,
      context?.urgency === 'immediate' ? 1 : 0,
      property.is_verified ? 1 : 0,
      Math.log1p(property.view_count) / 10,
      property.photos_count / 10,
    ];
  }
}

// ==================== CACHE DISTRIBUÉ ====================

class DistributedCache {
  private localCache = new Map<string, any>();
  
  async get(key: string): Promise<any> {
    const item = this.localCache.get(key);
    if (item && Date.now() - item.timestamp < CACHE_TTL) {
      return item.data;
    }
    return null;
  }

  async set(key: string, data: any, ttl: number = CACHE_TTL) {
    this.localCache.set(key, { data, timestamp: Date.now() });
  }

  async increment(key: string, value: number = 1): Promise<number> {
    const current = (await this.get(key)) || 0;
    const newValue = current + value;
    await this.set(key, newValue, 60 * 1000);
    return newValue;
  }
}

// ==================== FONCTIONS UTILITAIRES ====================

function analyzeViewingPattern(
  viewedProps: any[], 
  embeddingService: EmbeddingService
): ViewingPattern {
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
    
    if (p.embedding) embeddings.push(p.embedding);
    
    if (p.amenities && Array.isArray(p.amenities)) {
      p.amenities.forEach((a: string) => { 
        amenitiesCount[a] = (amenitiesCount[a] || 0) + 1; 
      });
    }
  });

  // Calculer le centroid des embeddings
  let embeddingCentroid: number[] | undefined;
  if (embeddings.length > 0) {
    embeddingCentroid = new Array(32).fill(0);
    embeddings.forEach(emb => {
      emb.forEach((val, idx) => {
        embeddingCentroid![idx] += val / embeddings.length;
      });
    });
  }

  return {
    propertyTypes,
    listingTypes,
    cities,
    neighborhoods,
    priceRange: { 
      min: Math.min(...prices) * 0.8, 
      max: Math.max(...prices) * 1.2 
    },
    amenities: amenitiesCount,
    totalViews: viewedProps.length,
    avgViewDuration: totalDuration / viewedProps.length,
    embeddingCentroid,
  };
}

async function getCollaborativeScores(
  supabase: any,
  user_id: string | undefined,
  userFavorites: string[],
  userProfile: UserProfile | null,
  viewedPropertyIds: string[]
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  
  if (!user_id || userFavorites.length === 0) return scores;

  // Item-based CF avec similarité cosinus
  const { data: similarUsers } = await supabase
    .from("property_favorites")
    .select("user_id, property_id")
    .in("property_id", userFavorites)
    .neq("user_id", user_id);

  if (similarUsers && similarUsers.length > 0) {
    const userItemMatrix = new Map<string, Set<string>>();
    similarUsers.forEach((row: any) => {
      if (!userItemMatrix.has(row.user_id)) {
        userItemMatrix.set(row.user_id, new Set());
      }
      userItemMatrix.get(row.user_id)!.add(row.property_id);
    });

    const targetUserItems = new Set(userFavorites);
    const similarities: Array<[string, number]> = [];

    userItemMatrix.forEach((items, otherUserId) => {
      const intersection = new Set([...targetUserItems].filter(x => items.has(x)));
      const similarity = intersection.size / Math.sqrt(targetUserItems.size * items.size);
      if (similarity > 0.2) similarities.push([otherUserId, similarity]);
    });

    if (similarities.length > 0) {
      const topSimilarUsers = similarities
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([id]) => id);

      const { data: recommendations } = await supabase
        .from("property_favorites")
        .select("property_id, user_id")
        .in("user_id", topSimilarUsers)
        .not("property_id", "in", `(${[...targetUserItems].join(",")})`);

      if (recommendations) {
        const itemScores: Record<string, number> = {};
        recommendations.forEach((rec: any) => {
          const userSim = similarities.find(([id]) => id === rec.user_id)?.[1] || 0;
          itemScores[rec.property_id] = (itemScores[rec.property_id] || 0) + userSim;
        });

        Object.entries(itemScores).forEach(([id, score]) => {
          scores.set(id, score);
        });
      }
    }
  }

  return scores;
}

async function generateCandidates(
  supabase: any,
  userProfile: UserProfile | null,
  viewingPattern: ViewingPattern | null,
  limit: number,
  excludedIds: string[] = []
): Promise<any[]> {
  let query = supabase
    .from("properties")
    .select("*, property_embeddings!inner(vector)")
    .eq("is_published", true)
    .eq("is_available", true);

  if (excludedIds.length > 0) {
    query = query.not("id", "in", `(${excludedIds.join(",")})`);
  }

  if (userProfile?.city) {
    query = query.ilike("city", `%${userProfile.city}%`);
  }

  if (userProfile?.budget_min != null && userProfile?.budget_max != null) {
    query = query.gte("price", userProfile.budget_min * 0.9)
                 .lte("price", userProfile.budget_max * 1.1);
  }

  if (userProfile?.preferred_property_types?.length > 0) {
    query = query.in("property_type", userProfile.preferred_property_types);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

function calculatePropertyScore(
  property: any,
  userProfile: UserProfile | null,
  viewingPattern: ViewingPattern | null,
  collaborativeScores: Map<string, number>,
  userFavorites: string[],
  WEIGHTS: FeatureWeights,
  context: any,
  embeddingService: EmbeddingService,
  userEmbedding: number[] | null,
  lightMLModel?: LightMLModel
): ScoredProperty {
  let score = 0;
  const reasons: string[] = [];
  let similarityScore = 0;
  let embeddingSimilarity = 0;
  const usedFeatures: Record<string, boolean> = {};

  // 1. Similarité d'embeddings (NOUVEAU)
  if (userEmbedding && property.embedding) {
    embeddingSimilarity = embeddingService.cosineSimilarity(userEmbedding, property.embedding);
    if (WEIGHTS.embeddingSimilarity) {
      score += embeddingSimilarity * WEIGHTS.embeddingSimilarity;
      usedFeatures['embeddingSimilarity'] = embeddingSimilarity > 0.7;
      if (embeddingSimilarity > 0.8) reasons.push("high_match_embedding");
      else if (embeddingSimilarity > 0.6) reasons.push("good_match_embedding");
    }
  }

  // 2. Correspondance profil exact
  if (userProfile) {
    usedFeatures['exactProfileMatch'] = false;

    if (userProfile.preferred_property_types?.includes(property.property_type)) {
      score += (WEIGHTS.exactProfileMatch || 0) * 0.25;
      usedFeatures['exactProfileMatch'] = true;
      reasons.push("preferred_type");
    }

    if (userProfile.city && property.city?.toLowerCase() === userProfile.city?.toLowerCase()) {
      score += (WEIGHTS.locationMatch || 0) * 0.6;
      usedFeatures['locationMatch'] = true;
      reasons.push("same_city");
    }

    if (userProfile.budget_min != null && userProfile.budget_max != null) {
      if (property.price >= userProfile.budget_min && property.price <= userProfile.budget_max) {
        score += (WEIGHTS.exactProfileMatch || 0) * 0.3;
        usedFeatures['exactProfileMatch'] = true;
        reasons.push("in_budget");
      }
    }
  }

  // 3. Historique de visionnage
  if (viewingPattern) {
    usedFeatures['viewingHistory'] = false;
    
    // Similarité avec le centroid des embeddings vus
    if (viewingPattern.embeddingCentroid && property.embedding) {
      const centroidSim = embeddingService.cosineSimilarity(
        viewingPattern.embeddingCentroid, 
        property.embedding
      );
      similarityScore = centroidSim;
      score += centroidSim * (WEIGHTS.viewingHistory || 0);
      usedFeatures['viewingHistory'] = centroidSim > 0.5;
      if (centroidSim > 0.7) reasons.push("matches_history");
    }
  }

  // 4. Collaborative filtering
  const collabScore = collaborativeScores.get(property.id);
  if (collabScore) {
    const normalizedCollab = Math.min(collabScore / 5, 1);
    score += normalizedCollab * (WEIGHTS.collaborativeFilter || 0);
    usedFeatures['collaborativeFilter'] = normalizedCollab > 0.3;
    if (normalizedCollab > 0.5) reasons.push("trending_similar_users");
  }

  // 5. Score ML léger (OPTIONNEL)
  let mlScore = 0.5;
  if (lightMLModel && WEIGHTS.mlScore) {
    const features = lightMLModel.extractFeatures(property, userProfile, context);
    mlScore = lightMLModel.predict(features);
    score += mlScore * WEIGHTS.mlScore;
    usedFeatures['mlScore'] = mlScore > 0.6;
    if (mlScore > 0.8) reasons.push("ml_high_confidence");
  }

  // 6. Pénaliser les favoris existants
  if (userFavorites.includes(property.id)) {
    score -= 30;
    reasons.push("already_favorite");
  }

  // 7. Popularité avec décroissance temporelle
  const views = property.view_count || 0;
  const daysSinceCreated = property.created_at ? 
    (Date.now() - new Date(property.created_at).getTime()) / 86400000 : 30;
  
  const recencyWeight = Math.max(0.3, 1 - (daysSinceCreated / 30));
  const popularityScore = Math.log10(views + 1) * recencyWeight;
  score += Math.min(popularityScore, WEIGHTS.popularity || 0);

  // 8. Récence
  if (property.created_at) {
    const daysOld = daysSinceCreated;
    const recencyScore = Math.max(0, (7 - daysOld) / 7) * (WEIGHTS.recency || 0);
    score += recencyScore;
    if (daysOld < 2) reasons.push("new_listing");
  }

  // 9. Vérification
  if (property.is_verified) {
    score += WEIGHTS.verification || 0;
    reasons.push("verified");
  }

  return { 
    property, 
    score, 
    reasons: reasons.slice(0, 3), 
    similarityScore,
    embeddingSimilarity,
    mlScore,
    featureVector: Object.values(usedFeatures).map(v => v ? 1 : 0)
  };
}

function applyMMR(candidates: ScoredProperty[], limit: number, lambda: number): ScoredProperty[] {
  const selected: ScoredProperty[] = [];
  const remaining = [...candidates];
  
  remaining.sort((a, b) => b.score - a.score);

  while (selected.length < limit && remaining.length > 0) {
    let maxMmrScore = -Infinity;
    let maxMmrIndex = 0;

    for (let i = 0; i < remaining.length; i++) {
      const item = remaining[i];
      
      if (selected.length === 0) {
        maxMmrScore = item.score;
        maxMmrIndex = i;
      } else {
        let maxSim = 0;
        for (const sel of selected) {
          const sim = calculateItemSimilarity(item.property, sel.property);
          if (sim > maxSim) maxSim = sim;
        }
        
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

  return selected;
}

function calculateItemSimilarity(a: any, b: any): number {
  let similarity = 0;
  let features = 0;

  if (a.property_type === b.property_type) similarity += 1;
  features++;

  if (a.city === b.city) similarity += 1;
  features++;

  if (a.neighborhood && b.neighborhood && a.neighborhood === b.neighborhood) {
    similarity += 1;
  }
  features++;

  if (a.price && b.price) {
    const priceDiff = Math.abs(a.price - b.price) / Math.max(a.price, b.price);
    similarity += 1 - Math.min(priceDiff, 1);
    features++;
  }

  if (a.embedding && b.embedding) {
    // Similarité cosinus des embeddings
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.embedding.length; i++) {
      dot += a.embedding[i] * b.embedding[i];
      normA += a.embedding[i] ** 2;
      normB += b.embedding[i] ** 2;
    }
    similarity += dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
    features++;
  }

  return features > 0 ? similarity / features : 0;
}

// ==================== ENDPOINT PRINCIPAL ====================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestStartTime = Date.now();
  
  try {
    // 1. Validation des entrées
    const body = await req.json();
    const validated = RecommendationRequestSchema.parse(body);
    const { user_id, limit = 15, offset = 0, context } = validated;

    // 2. Initialisation
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const embeddingService = new EmbeddingService(supabase);
    const abTesting = new ABTestingFramework(supabase);
    const cache = new DistributedCache();
    const lightMLModel = new LightMLModel(supabase);

    // 3. A/B Testing - Assignation du groupe
    const abGroup = context?.ab_test_group || 
                   (user_id ? abTesting.assignGroup(user_id, 'recommendation_v2') : 'control');
    
    const WEIGHTS = WEIGHT_CONFIGS[abGroup as keyof typeof WEIGHT_CONFIGS] || WEIGHT_CONFIGS.control;

    // 4. Rate limiting
    const clientIp = req.headers.get("x-forwarded-for") || "unknown";
    const rateKey = `rate:${clientIp}`;
    const requestCount = await cache.increment(rateKey);
    if (requestCount > 100) {
      throw new Error("Rate limit exceeded");
    }

    // 5. Vérification du cache
    const cacheKey = `rec:${user_id || 'anon'}:${abGroup}:${JSON.stringify(context)}:${limit}:${offset}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return new Response(JSON.stringify({ ...cached, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Récupération des données utilisateur
    const [userProfileResult, favoritesResult, viewHistoryResult, userEmbedding] = await Promise.all([
      user_id ? supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user_id)
        .single() : Promise.resolve({ data: null }),
      
      user_id ? supabase
        .from("property_favorites")
        .select("property_id")
        .eq("user_id", user_id) : Promise.resolve({ data: [] }),
      
      user_id ? supabase
        .from("property_views")
        .select("property_id, view_duration_seconds, viewed_at")
        .eq("user_id", user_id)
        .order("viewed_at", { ascending: false })
        .limit(50) : Promise.resolve({ data: [] }),
      
      user_id ? embeddingService.getUserEmbedding(user_id) : Promise.resolve(null)
    ]);

    const userProfile: UserProfile | null = userProfileResult.data;
    const userFavorites = favoritesResult.data?.map((f: any) => f.property_id) || [];
    
    // 7. Analyse des patterns et création de l'embedding utilisateur si nécessaire
    let viewingPattern: ViewingPattern | null = null;
    let viewedPropertyIds: string[] = [];
    let finalUserEmbedding = userEmbedding;

    if (viewHistoryResult.data && viewHistoryResult.data.length > 0) {
      const engagedViews = viewHistoryResult.data.filter(
        (v: any) => (v.view_duration_seconds || 0) > 10
      );
      viewedPropertyIds = engagedViews.map((v: any) => v.property_id);

      if (viewedPropertyIds.length > 0) {
        // Récupérer les propriétés avec leurs embeddings
        const { data: viewedProps } = await supabase
          .from("properties")
          .select("*, property_embeddings(vector)")
          .in("id", viewedPropertyIds.slice(0, 30));

        if (viewedProps && viewedProps.length > 0) {
          viewingPattern = analyzeViewingPattern(viewedProps, embeddingService);
          
          // Créer l'embedding utilisateur s'il n'existe pas ou est obsolète
          if (!finalUserEmbedding && user_id) {
            finalUserEmbedding = await embeddingService.createUserEmbedding(user_id, viewedProps);
          }
        }
      }
    }

    // 8. Collaborative filtering
    const collaborativeScores = await getCollaborativeScores(
      supabase, 
      user_id, 
      userFavorites, 
      userProfile,
      viewedPropertyIds
    );

    // 9. Génération de candidats avec embeddings
    const excludedIds = [...userFavorites, ...viewedPropertyIds];
    const candidates = await generateCandidates(
      supabase, 
      userProfile, 
      viewingPattern, 
      limit * 4,
      excludedIds
    );
    
    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ recommendations: [], total: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 10. Scoring avancé avec embeddings
    const scored = candidates.map((property: any) => 
      calculatePropertyScore(
        property, 
        userProfile, 
        viewingPattern, 
        collaborativeScores, 
        userFavorites, 
        WEIGHTS,
        context,
        embeddingService,
        finalUserEmbedding,
        abGroup === 'hybrid_ml' ? lightMLModel : undefined
      )
    );

    // 11. Diversification MMR
    const diverseResults = applyMMR(scored, limit, 0.6);

    // 12. Pagination
    const results = diverseResults.slice(offset, offset + limit);

    // 13. Préparer la réponse
    const response = {
      recommendations: results.map((r: ScoredProperty) => ({
        ...r.property,
        _score: Math.round(r.score * 100) / 100,
        _reasons: r.reasons,
        _match_details: {
          collaborative_score: collaborativeScores.get(r.property.id) || 0,
          viewing_similarity: r.similarityScore,
          embedding_similarity: r.embeddingSimilarity,
          ml_score: r.mlScore,
          ab_test_group: abGroup,
        }
      })),
      total: diverseResults.length,
      metadata: {
        ab_test_group: abGroup,
        processing_time_ms: Date.now() - requestStartTime,
        candidates_count: candidates.length,
        user_embedding_used: !!finalUserEmbedding,
      }
    };

    // 14. Mise en cache
    await cache.set(cacheKey, response, CACHE_TTL);

    // 15. Tracker l'impression pour A/B testing
    if (user_id) {
      abTesting.trackEvent({
        user_id,
        experiment_id: 'recommendation_v2',
        variant: abGroup,
        event_type: 'impression',
        property_id: results[0]?.property.id,  // Premier résultat
      }).catch(console.error);
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Recommendation error:", error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: error.errors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ==================== ENDPOINT DE FEEDBACK A/B ====================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.url.includes('/feedback')) {
    try {
      const body = await req.json();
      const { user_id, property_id, event_type, request_id, context, ab_test_group } = body;

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const abTesting = new ABTestingFramework(supabase);

      // Calculer la valeur de l'événement
      const rewards: Record<string, number> = {
        'view': 0.1,
        'click': 0.3,
        'favorite': 0.5,
        'contact': 0.8,
        'visit': 0.9,
        'rent': 1.0,
      };
      const value = rewards[event_type] || 0;

      // Logger le feedback
      await supabase.from('feedback_events').insert({
        user_id,
        property_id,
        event_type,
        value,
        context: {
          ...context,
          request_id,
          ab_test_group,
        },
        timestamp: new Date().toISOString(),
      });

      // Tracker pour A/B testing
      await abTesting.trackEvent({
        user_id,
        experiment_id: 'recommendation_v2',
        variant: ab_test_group || 'control',
        event_type,
        property_id,
        value,
      });

      return new Response(JSON.stringify({ success: true, value }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (error: any) {
      console.error("Feedback error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  return new Response("Not found", { status: 404 });
});