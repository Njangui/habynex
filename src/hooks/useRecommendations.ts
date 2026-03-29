import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Property {
  id: string;
  title: string;
  city: string;
  neighborhood: string | null;
  price: number;
  price_unit: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  property_type: string;
  listing_type: string;
  images: string[] | null;
  is_verified: boolean | null;
  view_count: number | null;
  created_at: string | null;
  amenities: string[] | null;
  available_from: string | null;
  owner_id?: string;
}

export function useRecommendations(limit: number = 10) {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("recommend-properties", {
        body: { 
          user_id: user?.id, // ✅ Correction : undefined au lieu de null
          limit,
          context: {
            source: 'homepage',
            device: 'desktop'
          }
        },
      });

      if (fnError) {
        console.warn("Edge function error:", fnError);
        throw fnError;
      }

      if (data?.recommendations?.length > 0) {
        setRecommendations(data.recommendations);
        return;
      }

      throw new Error("No recommendations from edge function");

    } catch (err) {
      console.warn("Falling back to direct query due to:", err);
      
      try {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("properties")
          .select("*")
          .eq("is_published", true)
          .eq("is_available", true)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (fallbackError) throw fallbackError;
        setRecommendations(fallbackData || []);
      } catch (fallbackErr) {
        console.error("Fallback error:", fallbackErr);
        setError("Erreur lors du chargement des recommandations");
        setRecommendations([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user, limit]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("profile-prefs-change")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        () => {
          fetchRecommendations();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchRecommendations]);

  return { recommendations, loading, error, refetch: fetchRecommendations };
}