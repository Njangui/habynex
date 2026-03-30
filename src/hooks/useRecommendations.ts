import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useRecommendations = (limit: number = 9) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["properties", limit],
    queryFn: async () => {
      // REQUÊTE SIMPLE SANS JOINTURE
      const { data: properties, error: queryError } = await supabase
        .from("properties")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (queryError) {
        console.error("Supabase error:", queryError);
        throw queryError;
      }

      console.log("Raw properties from DB:", properties?.length || 0);

      if (!properties || properties.length === 0) {
        return [];
      }

      return properties.map(prop => ({
        ...prop,
        owner_profile: null
      }));
    },
    retry: 1,
    staleTime: 1000 * 60 * 5,
  });

  return {
    recommendations: data || [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
};