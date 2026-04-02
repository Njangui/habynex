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
        const { data: profile } = await supabase
          .from("profiles")
          .select("city, neighborhood, budget_min, budget_max, preferred_property_type")
          .eq("user_id", userId)
          .single();
        
        // Un profil existe seulement s'il a au moins une préférence définie
        if (profile && (profile.city || profile.preferred_property_type || profile.budget_min)) {
          userProfile = profile;
          hasProfile = true;
        }
      }

      let result = null;
      let isGenericFallback = false;
      let isSimilarFallback = false;

      // CAS 1 : Pas d'utilisateur connecté OU profil vide → fallback générique
      if (!userId || !hasProfile) {
        const genericResponse = await fetch(`${API_URL}/recommendations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            limit: limit,
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
      // CAS 2 : Utilisateur avec profil → recherche personnalisée
      else {
        // Première tentative : critères exacts
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

        // CAS 3 : Profil existe mais aucune annonce exacte → fallback similaire
        if (!result.recommendations || result.recommendations.length === 0) {
          const fallbackResponse = await fetch(`${API_URL}/recommendations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userId,
              limit: limit,
              city: userProfile?.city || undefined,
              budget_min: userProfile?.budget_min ? userProfile.budget_min * 0.8 : undefined,
              budget_max: userProfile?.budget_max ? userProfile.budget_max * 1.2 : undefined,
              property_type: userProfile?.preferred_property_type || undefined,
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
};import { useQuery } from "@tanstack/react-query";
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
        const { data: profile } = await supabase
          .from("profiles")
          .select("city, neighborhood, budget_min, budget_max, preferred_property_type")
          .eq("user_id", userId)
          .single();
        
        // Un profil existe seulement s'il a au moins une préférence définie
        if (profile && (profile.city || profile.preferred_property_type || profile.budget_min)) {
          userProfile = profile;
          hasProfile = true;
        }
      }

      let result = null;
      let isGenericFallback = false;
      let isSimilarFallback = false;

      // CAS 1 : Pas d'utilisateur connecté OU profil vide → fallback générique
      if (!userId || !hasProfile) {
        const genericResponse = await fetch(`${API_URL}/recommendations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            limit: limit,
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
      // CAS 2 : Utilisateur avec profil → recherche personnalisée
      else {
        // Première tentative : critères exacts
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

        // CAS 3 : Profil existe mais aucune annonce exacte → fallback similaire
        if (!result.recommendations || result.recommendations.length === 0) {
          const fallbackResponse = await fetch(`${API_URL}/recommendations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userId,
              limit: limit,
              city: userProfile?.city || undefined,
              budget_min: userProfile?.budget_min ? userProfile.budget_min * 0.8 : undefined,
              budget_max: userProfile?.budget_max ? userProfile.budget_max * 1.2 : undefined,
              property_type: userProfile?.preferred_property_type || undefined,
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
