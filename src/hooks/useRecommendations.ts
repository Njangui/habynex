import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://habynex-recommendations-systeme-v1.onrender.com';

export const useRecommendations = (userId?: string, limit: number = 9) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["recommendations", userId, limit],
    queryFn: async () => {
      let userProfile = null;
      let hasProfile = false;

      // Vérifier si l'utilisateur a un profil complet
      if (userId) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("city, neighborhood, budget_min, budget_max, preferred_property_type")
          .eq("user_id", userId)
          .single();
        
        if (profileError) {
          console.log("Pas de profil trouvé pour l'utilisateur:", userId);
        }
        
        // Un profil existe seulement s'il a au moins une préférence définie
        if (profile && (profile.city || profile.preferred_property_type || profile.budget_min)) {
          userProfile = profile;
          hasProfile = true;
          console.log("Profil trouvé:", profile);
        } else {
          console.log("Profil vide ou inexistant");
        }
      }

      let result = null;
      let isGenericFallback = false;
      let isSimilarFallback = false;

      // Construction du body selon le cas
      let requestBody: any = { limit };

      if (userId && hasProfile) {
        // Utilisateur avec profil
        requestBody = {
          user_id: userId,
          limit,
          city: userProfile?.city,
          neighborhood: userProfile?.neighborhood,
          budget_min: userProfile?.budget_min,
          budget_max: userProfile?.budget_max,
          property_type: userProfile?.preferred_property_type,
        };
        console.log("Requête personnalisée:", requestBody);
      } else {
        console.log("Requête générique (pas de profil)");
      }

      try {
        console.log("Appel API:", `${API_URL}/recommendations`);
        const response = await fetch(`${API_URL}/recommendations`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestBody),
        });

        console.log("Status réponse:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("API error response:", errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        result = await response.json();
        console.log("Résultat API:", result);

        // Si profil mais aucun résultat → fallback similaire
        if (userId && hasProfile && (!result.recommendations || result.recommendations.length === 0)) {
          console.log("Aucun résultat exact, tentative fallback similaire...");
          
          const fallbackBody = {
            user_id: userId,
            limit,
            city: userProfile?.city,
            budget_min: userProfile?.budget_min ? userProfile.budget_min * 0.8 : undefined,
            budget_max: userProfile?.budget_max ? userProfile.budget_max * 1.2 : undefined,
            property_type: userProfile?.preferred_property_type,
          };

          const fallbackResponse = await fetch(`${API_URL}/recommendations`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(fallbackBody),
          });

          console.log("Status fallback:", fallbackResponse.status);

          if (!fallbackResponse.ok) {
            const errorText = await fallbackResponse.text();
            console.error("Fallback API error:", errorText);
            throw new Error(`HTTP ${fallbackResponse.status}: ${errorText}`);
          }

          result = await fallbackResponse.json();
          console.log("Résultat fallback:", result);
          isSimilarFallback = true;
        } else if (!userId || !hasProfile) {
          isGenericFallback = true;
        }

      } catch (fetchError) {
        console.error("Fetch error complet:", fetchError);
        // Retourner tableau vide avec flags pour pas casser l'UI
        return [];
      }

      const recommendations = result?.recommendations || [];
      console.log("Nombre de recommandations:", recommendations.length);
      console.log("isGenericFallback:", isGenericFallback);
      console.log("isSimilarFallback:", isSimilarFallback);

      return recommendations.map((prop: any) => ({
        ...prop,
        _score: prop._score,
        _reasons: prop._reasons,
        owner_profile: null,
        isGenericFallback,
        isSimilarFallback
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
