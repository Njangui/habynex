import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://habynex-recommendations-systeme-v1.onrender.com';
const CACHE_KEY = 'habynex_recommendations_cache';

interface CacheEntry {
  data: any[];
  timestamp: number;
  userId: string | undefined;
  prefsHash: string;
}

const hashString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
};

const getCacheKey = (userId?: string, prefs?: any): string => {
  const prefsString = JSON.stringify(prefs || {});
  return `${userId || 'anon'}_${hashString(prefsString)}`;
};

const getLocalCache = (key: string): CacheEntry | null => {
  try {
    const cached = localStorage.getItem(`${CACHE_KEY}_${key}`);
    if (cached) {
      const entry: CacheEntry = JSON.parse(cached);
      if (Date.now() - entry.timestamp < 5 * 60 * 1000) {
        console.log("✅ [CACHE] Cache local HIT pour:", key);
        return entry;
      }
    }
  } catch (e) {
    console.error("❌ [CACHE] Erreur lecture cache:", e);
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
    console.log("✅ [CACHE] Cache local SET pour:", key);
  } catch (e) {
    console.error("❌ [CACHE] Erreur écriture cache:", e);
  }
};

const clearLocalCache = (userId?: string) => {
  try {
    if (userId) {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`${CACHE_KEY}_${userId}`)) {
          localStorage.removeItem(key);
        }
      });
    } else {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_KEY)) {
          localStorage.removeItem(key);
        }
      });
    }
  } catch (e) {
    console.error("❌ [CACHE] Erreur nettoyage cache:", e);
  }
};

export const useRecommendations = (userId?: string, limit: number = 9) => {
  const queryClient = useQueryClient();
  
  console.log("🟢 [useRecommendations] HOOK APPELÉ - userId:", userId, "limit:", limit);

  return useQuery({
    queryKey: ["recommendations", userId, limit],
    queryFn: async () => {
      console.log("🔵 [useRecommendations] ========== QUERYFN DÉMARRÉE ==========");
      console.log("🔵 [useRecommendations] userId reçu:", userId);

      let userProfile = null;
      
      if (userId) {
        console.log("🟡 [useRecommendations] Récupération profil pour userId:", userId);
        try {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("city, neighborhood, budget_min, budget_max, preferred_property_type")
            .eq("user_id", userId)
            .maybeSingle();
          
          console.log("🟡 [useRecommendations] Résultat profil:", { profile, error: profileError });
          
          if (profileError) {
            console.error("❌ [useRecommendations] Erreur Supabase profil:", profileError);
          } else {
            userProfile = profile;
            console.log("✅ [useRecommendations] Profil trouvé:", profile);
          }
        } catch (e) {
          console.error("❌ [useRecommendations] Exception Supabase:", e);
        }
      } else {
        console.log("🟡 [useRecommendations] Pas de userId, pas de profil récupéré");
      }

      const requestBody: any = { 
        limit,
        user_id: userId
      };
      
      if (userProfile?.city) requestBody.city = userProfile.city;
      if (userProfile?.neighborhood) requestBody.neighborhood = userProfile.neighborhood;
      if (userProfile?.budget_min != null) requestBody.budget_min = userProfile.budget_min;
      if (userProfile?.budget_max != null) requestBody.budget_max = userProfile.budget_max;
      if (userProfile?.preferred_property_type) requestBody.property_type = userProfile.preferred_property_type;

      console.log("🟡 [useRecommendations] Request body final:", requestBody);

      const cacheKey = getCacheKey(userId, requestBody);
      const localCache = getLocalCache(cacheKey);
      
      if (localCache && Array.isArray(localCache.data)) {
        console.log("✅ [useRecommendations] Retour cache local");
        return localCache.data;
      }

      console.log("🟡 [useRecommendations] Aucun cache, appel API...");
      console.log("🟡 [useRecommendations] URL:", `${API_URL}/recommendations`);

      try {
        const response = await fetch(`${API_URL}/recommendations`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestBody),
        });

        console.log("🟢 [useRecommendations] Réponse reçue - Status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ [useRecommendations] Erreur HTTP:", response.status, errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log("🟢 [useRecommendations] Données JSON reçues:", result);
        console.log("🟢 [useRecommendations] Nombre recommandations:", result.recommendations?.length);
        console.log("🟢 [useRecommendations] is_fallback:", result.is_fallback);
        console.log("🟢 [useRecommendations] fallback_type:", result.fallback_type);

        const recommendations = (result.recommendations || []).map((prop: any) => ({
          ...prop,
          _score: prop._score,
          _reasons: prop._reasons,
          isGenericFallback: prop._is_generic_fallback || result.fallback_type === 'generic',
          isSimilarFallback: prop._is_fallback || result.fallback_type === 'similar',
          fallbackMessage: result.message
        }));

        console.log("✅ [useRecommendations] Recommandations mappées:", recommendations.length);

        setLocalCache(cacheKey, recommendations, userId, requestBody);

        console.log("🔵 [useRecommendations] ========== QUERYFN TERMINÉE ==========");
        return recommendations;
        
      } catch (error) {
        console.error("❌ [useRecommendations] ERREUR dans fetch:", error);
        console.log("🔵 [useRecommendations] ========== QUERYFN TERMINÉE AVEC ERREUR ==========");
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    enabled: true,
  });
};

export const useInvalidateRecommendations = () => {
  const queryClient = useQueryClient();
  
  return (userId?: string) => {
    console.log("🟡 [useInvalidateRecommendations] Invalidation cache pour:", userId);
    clearLocalCache(userId);
    queryClient.invalidateQueries({ queryKey: ["recommendations"] });
  };
};

export const useTrackInteraction = () => {
  const invalidateCache = useInvalidateRecommendations();

  const track = async (userId: string, propertyId: string, eventType: 'view' | 'favorite' | 'contact') => {
    console.log("🟡 [useTrackInteraction] Tracking:", eventType, "user:", userId, "property:", propertyId);
    
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

      console.log("🟢 [useTrackInteraction] Réponse:", response.status);

      if (eventType === 'favorite' || eventType === 'contact') {
        invalidateCache(userId);
      }
    } catch (e) {
      console.error("❌ [useTrackInteraction] Erreur:", e);
    }
  };

  return { track };
};
