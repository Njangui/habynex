import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://habynex-recommendations-systeme-v1.onrender.com';

export const useRecommendations = (userId?: string, limit: number = 9) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["recommendations", userId, limit],
    queryFn: async () => {
      let userProfile = null;
      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("city, neighborhood, budget_min, budget_max, preferred_property_type")
          .eq("user_id", userId)
          .single();
        userProfile = profile;
      }

      let result = null;
      let isGenericFallback = false;
      let isSimilarFallback = false;

      // Si utilisateur avec profil, on tente la recherche exacte
      if (userProfile) {
        const response = await fetch(`${API_URL}/recommendations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            limit: limit,
            city: userProfile?.city || undefined,
            neighborhood: userProfile?.neighborhood || undefined,
            budget_min: userProfile?.budget_min || undefined,
            budget_max: userProfile?.budget_max || undefined,
            property_type: userProfile?.preferred_property_type || undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("API error:", errorData);
          throw new Error(errorData.error || 'Failed to fetch recommendations');
        }

        result = await response.json();

        // Si aucune propriété exacte trouvée, fetch des propriétés proches
        if (!result.recommendations || result.recommendations.length === 0) {
          const fallbackResponse = await fetch(`${API_URL}/recommendations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userId,
              limit: limit,
              city: userProfile?.city || undefined,
              neighborhood: undefined, // Quartier différent ou proche
              budget_min: userProfile?.budget_min ? userProfile.budget_min * 0.8 : undefined,
              budget_max: userProfile?.budget_max ? userProfile.budget_max * 1.2 : undefined,
              property_type: userProfile?.preferred_property_type || undefined,
              is_similar_fallback: true
            }),
          });

          if (!fallbackResponse.ok) {
            const errorData = await fallbackResponse.json();
            console.error("Fallback API error:", errorData);
            throw new Error(errorData.error || 'Failed to fetch fallback recommendations');
          }

          result = await fallbackResponse.json();
          isSimilarFallback = true;
        }
      } else {
        // Nouvel utilisateur ou sans profil → récupérer les plus récentes et les plus vues
        const genericResponse = await fetch(`${API_URL}/recommendations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            limit: limit,
            is_generic_fallback: true
          }),
        });

        if (!genericResponse.ok) {
          const errorData = await genericResponse.json();
          console.error("Generic API error:", errorData);
          throw new Error(errorData.error || 'Failed to fetch generic recommendations');
        }

        result = await genericResponse.json();
        isGenericFallback = true;
      }

      // Formater les données pour ton UI
      return (result.recommendations || []).map((prop: any) => ({
        ...prop,
        _score: prop._score,
        _reasons: prop._reasons,
        owner_profile: null,
        isGenericFallback,
        isSimilarFallback
      }));
    },
    retry: 1,
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

// Hook pour tracker les interactions (à utiliser dans vos composants)
export const useTrackInteraction = () => {
  const track = async (userId: string, propertyId: string, eventType: 'view' | 'favorite' | 'contact') => {
    try {
      await fetch(`${API_URL}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
