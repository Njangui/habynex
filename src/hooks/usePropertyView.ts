import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Generate or retrieve session ID for anonymous tracking
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem("immo_session_id");
  if (!sessionId) {
    sessionId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem("immo_session_id", sessionId);
  }
  return sessionId;
};

interface UsePropertyViewOptions {
  propertyId: string;
  source?: "search" | "recommendation" | "direct" | "assistant";
}

export function usePropertyView({ propertyId, source = "direct" }: UsePropertyViewOptions) {
  const { user } = useAuth();
  const startTimeRef = useRef<number>(Date.now());
  const hasTrackedRef = useRef<boolean>(false);

  useEffect(() => {
    // Track view on mount
    const trackView = async () => {
      if (hasTrackedRef.current) return;
      hasTrackedRef.current = true;

      try {
        await supabase.from("property_views").insert({
          property_id: propertyId,
          user_id: user?.id || null,
          session_id: getSessionId(),
          source,
          view_duration_seconds: 0,
        });
      } catch (error) {
        console.error("Error tracking view:", error);
      }
    };

    trackView();
    startTimeRef.current = Date.now();

    // Update duration on unmount
    return () => {
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      if (duration > 3) {
        // Only update if viewed for more than 3 seconds
        updateViewDuration(propertyId, user?.id, duration);
      }
    };
  }, [propertyId, user?.id, source]);
}

async function updateViewDuration(propertyId: string, userId: string | undefined, duration: number) {
  try {
    // Update the most recent view for this property/user
    const { data } = await supabase
      .from("property_views")
      .select("id")
      .eq("property_id", propertyId)
      .eq("user_id", userId || null)
      .order("viewed_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      await supabase
        .from("property_views")
        .update({ view_duration_seconds: duration })
        .eq("id", data.id);
    }
  } catch (error) {
    // Silently fail - view duration is non-critical
  }
}

// Hook to get user's viewing history for recommendations
export function useViewingHistory() {
  const { user } = useAuth();

  const getViewedPropertyIds = async (): Promise<string[]> => {
    if (!user) return [];

    try {
      const { data } = await supabase
        .from("property_views")
        .select("property_id")
        .eq("user_id", user.id)
        .order("viewed_at", { ascending: false })
        .limit(50);

      return [...new Set(data?.map((v) => v.property_id) || [])];
    } catch {
      return [];
    }
  };

  const getFrequentlyViewedTypes = async (): Promise<Record<string, number>> => {
    if (!user) return {};

    try {
      const { data: views } = await supabase
        .from("property_views")
        .select("property_id")
        .eq("user_id", user.id)
        .order("viewed_at", { ascending: false })
        .limit(30);

      if (!views || views.length === 0) return {};

      const propertyIds = views.map((v) => v.property_id);
      const { data: properties } = await supabase
        .from("properties")
        .select("property_type, listing_type, city")
        .in("id", propertyIds);

      const typeCount: Record<string, number> = {};
      properties?.forEach((p) => {
        typeCount[p.property_type] = (typeCount[p.property_type] || 0) + 1;
        typeCount[p.listing_type] = (typeCount[p.listing_type] || 0) + 1;
        typeCount[`city:${p.city}`] = (typeCount[`city:${p.city}`] || 0) + 1;
      });

      return typeCount;
    } catch {
      return {};
    }
  };

  return { getViewedPropertyIds, getFrequentlyViewedTypes };
}
