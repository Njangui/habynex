// src/hooks/useRecommendations.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://habynex-recommendations-systeme-v1.onrender.com';

// Clé pour le localStorage
const CACHE_KEY = 'habynex_recommendations_cache';

interface CacheEntry {
  data: any[];
  timestamp: number;
  userId: string | undefined;
  prefsHash: string;
}

const getCacheKey = (userId?: string, prefs?: any) => {
  const prefsString = JSON.stringify(prefs || {});
  return `${userId || 'anon'}_${hashString(prefsString)}`;
};

const hashString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
};

const getLocalCache = (key: string): CacheEntry | null => {
  try {
    const cached = localStorage.getItem(`${CACHE_KEY}_${key}`);
    if (cached) {
      const entry: CacheEntry = JSON.parse(cached);
      // Vérifier si le cache a moins de 5 minutes
      if (Date.now() - entry.timestamp < 5 * 60 * 1000) {
        return entry;
      }
    }
  } catch (e) {
    console.error("Erreur lecture cache local:", e);
  }
  return null;
};

const setLocalCache = (key: string, data: any[], userId?: string, prefs?: any) => {
  try {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      userId,
      prefsHash: hashString(JSON.stringify(prefs || {}))
    };
    localStorage.setItem(`${CACHE_KEY}_${key}`, JSON.stringify(entry));
  } catch (e) {
    console.error("Erreur écriture cache local:", e);
  }
};

const clearLocalCache = (userId?: string) => {
  try {
    if (userId) {
      // Supprimer uniquement les entrées de cet utilisateur
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`${CACHE_KEY}_${userId}`)) {
          localStorage.removeItem(key);
        }
      });
    } else {
      // Supprimer tout le cache
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_KEY)) {
          localStorage.removeItem(key);
        }
      });
    }
  } catch (e) {
    console.error("Erreur nettoyage cache:", e);
  }
};

export const useRecommendations = (userId?: string, limit: number = 9) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["recommendations", userId, limit],
    queryFn: async () => {
      console.log("=== useRecommendations ===");
      console.log("userId:", userId);

      // Récupérer le profil utilisateur
      let userProfile = null;
      if (userId) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("city, neighborhood, budget_min, budget_max, preferred_property_type")
            .eq("id", userId)
            .maybeSingle();
          
          if (profileError) {
            console.error("Erreur Supabase:", profileError);
          } else {
            userProfile = profile;
            console.log("Profile trouvé:", profile);
          }
        } catch (e) {
          console.error("Exception Supabase:", e);
        }
      }

      // Construire les préférences pour la requête
      const requestBody: any = { 
        limit,
        user_id: userId // Envoyer user_id au backend pour récupération profil
      };
      
      if (userProfile?.city) requestBody.city = userProfile.city;
      if (userProfile?.neighborhood) requestBody.neighborhood = userProfile.neighborhood;
      if (userProfile?.budget_min) requestBody.budget_min = userProfile.budget_min;
      if (userProfile?.budget_max) requestBody.budget_max = userProfile.budget_max;
      if (userProfile?.preferred_property_type) requestBody.property_type = userProfile.preferred_property_type;

      console.log("Request body:", requestBody);

      // Vérifier le cache local
      const cacheKey = getCacheKey(userId, requestBody);
      const localCache = getLocalCache(cacheKey);
      
      if (localCache) {
        console.log("Utilisation du cache local");
        return localCache.data;
      }

      // Appel API
      const response = await fetch(`${API_URL}/recommendations`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody),
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log("API result:", result);

      const recommendations = (result.recommendations || []).map((prop: any) => ({
        ...prop,
        _score: prop._score,
        _reasons: prop._reasons,
        isGenericFallback: prop._is_generic_fallback || result.fallback_type === 'generic',
        isSimilarFallback: prop._is_fallback || result.fallback_type === 'similar',
        fallbackMessage: result.message,
        fromCache: result.from_cache
      }));

      // Sauvegarder dans le cache local
      setLocalCache(cacheKey, recommendations, userId, requestBody);

      return recommendations;
    },
    retry: 2,
    retryDelay: 1000,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    enabled: true,
  });
};

// Hook pour invalider le cache
export const useInvalidateRecommendations = () => {
  const queryClient = useQueryClient();
  
  return (userId?: string) => {
    clearLocalCache(userId);
    queryClient.invalidateQueries({ queryKey: ["recommendations"] });
  };
};

export const useTrackInteraction = () => {
  const invalidateCache = useInvalidateRecommendations();

  const track = async (userId: string, propertyId: string, eventType: 'view' | 'favorite' | 'contact') => {
    try {
      const response = await fetch(`${API_URL}/feedback`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          property_id: propertyId,
          event_type: eventType,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Invalider le cache après une interaction significative
      if (eventType === 'favorite' || eventType === 'contact') {
        invalidateCache(userId);
      }
    } catch (e) {
      console.error("Tracking error:", e);
    }
  };

  return { track };
};
