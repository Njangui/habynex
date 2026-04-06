// src/hooks/useRecommendations.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://habynex-recommendations-systeme-v1.onrender.com';
const CACHE_KEY = 'habynex_recommendations_cache';

// ... (fonctions de cache inchangées) ...

export const useRecommendations = (userId?: string, limit: number = 9) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["recommendations", userId, limit],
    queryFn: async () => {
      console.log("=== useRecommendations ===");
      console.log("userId:", userId);

      // ✅ PROTECTION : toujours retourner un tableau, jamais undefined
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

      const requestBody: any = { 
        limit,
        user_id: userId
      };
      
      if (userProfile?.city) requestBody.city = userProfile.city;
      if (userProfile?.neighborhood) requestBody.neighborhood = userProfile.neighborhood;
      if (userProfile?.budget_min != null) requestBody.budget_min = userProfile.budget_min;
      if (userProfile?.budget_max != null) requestBody.budget_max = userProfile.budget_max;
      if (userProfile?.preferred_property_type) requestBody.property_type = userProfile.preferred_property_type;

      console.log("Request body:", requestBody);

      // Vérifier le cache local
      const cacheKey = getCacheKey(userId, requestBody);
      const localCache = getLocalCache(cacheKey);
      
      if (localCache && Array.isArray(localCache.data)) {
        console.log("Utilisation du cache local");
        return localCache.data;
      }

      try {
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

        // ✅ PROTECTION : s'assurer que recommendations est un tableau
        const rawRecommendations = result?.recommendations;
        
        if (!Array.isArray(rawRecommendations)) {
          console.warn("API n'a pas retourné un tableau, retour tableau vide");
          return [];
        }

        const recommendations = rawRecommendations.map((prop: any) => ({
          ...prop,
          _score: prop._score ?? 0,
          _reasons: prop._reasons || [],
          isGenericFallback: prop._is_generic_fallback || result.fallback_type === 'generic',
          isSimilarFallback: prop._is_fallback || result.fallback_type === 'similar',
          fallbackMessage: result.message || null
        }));

        // Sauvegarder dans le cache local
        setLocalCache(cacheKey, recommendations, userId, requestBody);

        return recommendations;
        
      } catch (error) {
        console.error("Erreur fetch recommendations:", error);
        // ✅ En cas d'erreur, retourner un tableau vide plutôt que undefined
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    enabled: true,
    // ✅ Garantir que data est toujours un tableau
    placeholderData: [],
  });
};

// Hook pour invalider le cache (inchangé)
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

      if (eventType === 'favorite' || eventType === 'contact') {
        invalidateCache(userId);
      }
    } catch (e) {
      console.error("Tracking error:", e);
    }
  };

  return { track };
};
