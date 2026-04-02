import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://habynex-recommendations-systeme-v1.onrender.com';

export const useRecommendations = (userId?: string, limit: number = 9) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["recommendations", userId, limit],
    queryFn: async () => {
      // Récupérer le profil si userId existe
      let userProfile = null;
      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("city, neighborhood, budget_min, budget_max, preferred_property_type")
          .eq("user_id", userId)
          .single();
        userProfile = profile;
      }

      // Appeler l'API avec les paramètres
      const requestBody: any = { limit };
      
      if (userId) requestBody.user_id = userId;
      if (userProfile?.city) requestBody.city = userProfile.city;
      if (userProfile?.neighborhood) requestBody.neighborhood = userProfile.neighborhood;
      if (userProfile?.budget_min) requestBody.budget_min = userProfile.budget_min;
      if (userProfile?.budget_max) requestBody.budget_max = userProfile.budget_max;
      if (userProfile?.preferred_property_type) requestBody.property_type = userProfile.preferred_property_type;

      const response = await fetch(`${API_URL}/recommendations`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      
      // Mapper les résultats avec les flags du backend
      return (result.recommendations || []).map((prop: any) => ({
        ...prop,
        _score: prop._score,
        _reasons: prop._reasons,
        isGenericFallback: prop._is_generic_fallback || result.fallback_type === 'generic',
        isSimilarFallback: prop._is_similar_fallback || result.fallback_type === 'similar',
        fallbackMessage: result.message
      }));
    },
    retry: 2,
    staleTime: 1000 * 60 * 5,
    enabled: true,
  });

  return {
    recommendations: data || [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
};

export const useTrackInteraction = () => {
  const track = async (userId: string, propertyId: string, eventType: 'view' | 'favorite' | 'contact') => {
    try {
      await fetch(`${API_URL}/feedback`, {
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
    } catch (e) {
      console.error("Tracking error:", e);
    }
  };

  return { track };
};
