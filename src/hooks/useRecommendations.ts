import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://habynex-recommendations-systeme-v1.onrender.com';

export const useRecommendations = (userId?: string, limit: number = 9) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["recommendations", userId, limit],
    queryFn: async () => {
      console.log("=== useRecommendations ===");
      console.log("userId:", userId);

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

      const requestBody: any = { limit };
      
      if (userProfile?.city) requestBody.city = userProfile.city;
      if (userProfile?.neighborhood) requestBody.neighborhood = userProfile.neighborhood;
      if (userProfile?.budget_min) requestBody.budget_min = userProfile.budget_min;
      if (userProfile?.budget_max) requestBody.budget_max = userProfile.budget_max;
      if (userProfile?.preferred_property_type) requestBody.property_type = userProfile.preferred_property_type;

      console.log("Request body:", requestBody);

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
    retryDelay: 1000,
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
