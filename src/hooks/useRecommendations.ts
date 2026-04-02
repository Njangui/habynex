import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://habynex-recommendations-systeme-v1.onrender.com';

export const useRecommendations = (userId?: string, limit: number = 9) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["recommendations", userId, limit],
    queryFn: async () => {
      // Récupérer le profil utilisateur pour personnaliser
      let userProfile = null;
      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("city, budget_min, budget_max, preferred_property_type")
          .eq("user_id", userId)
          .single();
        
        userProfile = profile;
      }

      // APPEL VOTRE API PYTHON SUR RENDER
      const response = await fetch(`${API_URL}/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          limit: limit,
          city: userProfile?.city || undefined,
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

      const result = await response.json();
      console.log("Recommendations from API:", result.recommendations?.length || 0);

      if (!result.recommendations || result.recommendations.length === 0) {
        return [];
      }

      // Formater les données pour votre UI
      return result.recommendations.map((prop: any) => ({
        ...prop,
        _score: prop._score,
        _reasons: prop._reasons,
        owner_profile: null // À remplacer par une requête séparée si besoin
      }));
    },
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: true, // Toujours actif, même sans userId (recommandations génériques)
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
