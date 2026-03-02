import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RecommendationRequest {
  user_id?: string;
  limit?: number;
  offset?: number;
}

const WEIGHTS = {
  exactProfileMatch: 30,
  viewingHistory: 25,
  collaborativeFilter: 15,
  locationMatch: 12,
  availability: 8,
  popularity: 5,
  recency: 3,
  verification: 2,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: RecommendationRequest = await req.json();
    const { user_id, limit = 15, offset = 0 } = body;

    // 1. Fetch all available properties
    const { data: properties, error: propError } = await supabase
      .from("properties")
      .select("*")
      .eq("is_published", true)
      .eq("is_available", true)
      .order("created_at", { ascending: false })
      .limit(300);

    if (propError) throw propError;
    if (!properties || properties.length === 0) {
      return new Response(JSON.stringify({ recommendations: [], total: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let userProfile: any = null;
    let userFavorites: string[] = [];
    let viewedPropertyIds: string[] = [];
    let viewingPattern: any = null;
    let collaborativePropertyIds = new Set<string>();

    if (user_id) {
      // 2. Fetch user profile preferences
      const { data: profile } = await supabase
        .from("profiles")
        .select("city, budget_min, budget_max, preferred_property_types, preferred_neighborhoods, preferred_listing_types, preferred_amenities, move_in_timeline")
        .eq("user_id", user_id)
        .single();
      userProfile = profile;

      // 3. Fetch favorites
      const { data: favs } = await supabase
        .from("property_favorites")
        .select("property_id")
        .eq("user_id", user_id);
      userFavorites = favs?.map((f: any) => f.property_id) || [];

      // 4. Fetch viewing history with engagement
      const { data: viewHistory } = await supabase
        .from("property_views")
        .select("property_id, view_duration_seconds")
        .eq("user_id", user_id)
        .order("viewed_at", { ascending: false })
        .limit(100);

      if (viewHistory && viewHistory.length > 0) {
        const engagedViews = viewHistory.filter((v: any) => (v.view_duration_seconds || 0) > 15);
        viewedPropertyIds = engagedViews.map((v: any) => v.property_id);

        if (viewedPropertyIds.length > 0) {
          const { data: viewedProps } = await supabase
            .from("properties")
            .select("property_type, listing_type, city, neighborhood, price, amenities")
            .in("id", viewedPropertyIds.slice(0, 50));

          if (viewedProps && viewedProps.length > 0) {
            const propertyTypes: Record<string, number> = {};
            const listingTypes: Record<string, number> = {};
            const cities: Record<string, number> = {};
            const neighborhoods: Record<string, number> = {};
            const amenitiesCount: Record<string, number> = {};
            const prices: number[] = [];

            viewedProps.forEach((p: any) => {
              propertyTypes[p.property_type] = (propertyTypes[p.property_type] || 0) + 1;
              listingTypes[p.listing_type] = (listingTypes[p.listing_type] || 0) + 1;
              cities[p.city] = (cities[p.city] || 0) + 1;
              if (p.neighborhood) neighborhoods[p.neighborhood] = (neighborhoods[p.neighborhood] || 0) + 1;
              prices.push(p.price);
              if (p.amenities && Array.isArray(p.amenities)) {
                p.amenities.forEach((a: string) => { amenitiesCount[a] = (amenitiesCount[a] || 0) + 1; });
              }
            });

            viewingPattern = {
              propertyTypes,
              listingTypes,
              cities,
              neighborhoods,
              priceRange: { min: Math.min(...prices) * 0.7, max: Math.max(...prices) * 1.3 },
              amenities: amenitiesCount,
            };
          }
        }
      }

      // 5. Collaborative filtering
      if (userFavorites.length > 0) {
        const { data: similarUsersFavs } = await supabase
          .from("property_favorites")
          .select("property_id, user_id")
          .in("property_id", userFavorites.slice(0, 10))
          .neq("user_id", user_id);

        if (similarUsersFavs && similarUsersFavs.length > 0) {
          const similarUserIds = [...new Set(similarUsersFavs.map((f: any) => f.user_id))];
          const { data: otherFavs } = await supabase
            .from("property_favorites")
            .select("property_id")
            .in("user_id", similarUserIds.slice(0, 20))
            .not("property_id", "in", `(${userFavorites.join(",")})`);

          if (otherFavs) {
            const counts: Record<string, number> = {};
            otherFavs.forEach((f: any) => { counts[f.property_id] = (counts[f.property_id] || 0) + 1; });
            Object.entries(counts).forEach(([id, count]) => { if (count >= 2) collaborativePropertyIds.add(id); });
          }
        }

        // Also find users with similar profiles and check what they like
        if (userProfile?.city) {
          const { data: similarProfiles } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("city", userProfile.city)
            .eq("user_type", "seeker")
            .neq("user_id", user_id)
            .limit(30);

          if (similarProfiles && similarProfiles.length > 0) {
            const profileUserIds = similarProfiles.map((p: any) => p.user_id);
            const { data: theirLikes } = await supabase
              .from("property_likes")
              .select("property_id")
              .in("user_id", profileUserIds);

            if (theirLikes) {
              const likeCounts: Record<string, number> = {};
              theirLikes.forEach((l: any) => { likeCounts[l.property_id] = (likeCounts[l.property_id] || 0) + 1; });
              Object.entries(likeCounts).forEach(([id, count]) => { if (count >= 2) collaborativePropertyIds.add(id); });
            }
          }
        }
      }
    }

    // 6. Score each property
    const scored = properties.map((property: any) => {
      let score = 0;
      const reasons: string[] = [];

      if (userProfile) {
        // Property type match
        if (userProfile.preferred_property_types?.includes(property.property_type)) {
          score += WEIGHTS.exactProfileMatch * 0.25;
          reasons.push("preferred_type");
        }
        // Listing type
        if (userProfile.preferred_listing_types?.includes(property.listing_type)) {
          score += WEIGHTS.exactProfileMatch * 0.2;
        }
        // City
        if (userProfile.city && property.city?.toLowerCase() === userProfile.city?.toLowerCase()) {
          score += WEIGHTS.locationMatch * 0.7;
          reasons.push("same_city");
        }
        // Neighborhood
        if (userProfile.preferred_neighborhoods?.length > 0 && property.neighborhood) {
          const match = userProfile.preferred_neighborhoods.some((n: string) =>
            property.neighborhood.toLowerCase().includes(n.toLowerCase())
          );
          if (match) { score += WEIGHTS.locationMatch * 0.5; reasons.push("preferred_neighborhood"); }
        }
        // Budget
        if (userProfile.budget_min != null && userProfile.budget_max != null) {
          if (property.price >= userProfile.budget_min && property.price <= userProfile.budget_max) {
            score += WEIGHTS.exactProfileMatch * 0.3;
            reasons.push("in_budget");
          } else if (property.price <= userProfile.budget_max * 1.15 && property.price >= userProfile.budget_min * 0.85) {
            score += WEIGHTS.exactProfileMatch * 0.15;
          }
        }
        // Amenities
        if (userProfile.preferred_amenities?.length > 0 && property.amenities?.length > 0) {
          const matching = property.amenities.filter((a: string) => userProfile.preferred_amenities.includes(a));
          if (matching.length > 0) {
            score += (matching.length / userProfile.preferred_amenities.length) * WEIGHTS.exactProfileMatch * 0.25;
            if (matching.length >= 3) reasons.push("amenities_match");
          }
        }
        // Move-in timeline
        if (userProfile.move_in_timeline && property.available_from) {
          const days = Math.ceil((new Date(property.available_from).getTime() - Date.now()) / 86400000);
          const match = userProfile.move_in_timeline === "immediate" ? days <= 7 :
                        userProfile.move_in_timeline === "within_month" ? days <= 30 :
                        userProfile.move_in_timeline === "within_3months" ? days <= 90 : true;
          if (match) score += WEIGHTS.availability;
        }
      }

      // Viewing history pattern
      if (viewingPattern) {
        const typeScore = viewingPattern.propertyTypes[property.property_type] || 0;
        if (typeScore > 0) score += Math.min(typeScore * 4, WEIGHTS.viewingHistory * 0.3);
        const listScore = viewingPattern.listingTypes[property.listing_type] || 0;
        if (listScore > 0) score += Math.min(listScore * 3, WEIGHTS.viewingHistory * 0.2);
        const cityScore = viewingPattern.cities[property.city] || 0;
        if (cityScore > 0) score += Math.min(cityScore * 3, WEIGHTS.viewingHistory * 0.2);
        if (property.neighborhood && viewingPattern.neighborhoods[property.neighborhood]) {
          score += Math.min(viewingPattern.neighborhoods[property.neighborhood] * 4, WEIGHTS.viewingHistory * 0.15);
        }
        if (property.price >= viewingPattern.priceRange.min && property.price <= viewingPattern.priceRange.max) {
          score += WEIGHTS.viewingHistory * 0.15;
        }
      }

      // Collaborative filtering
      if (collaborativePropertyIds.has(property.id)) {
        score += WEIGHTS.collaborativeFilter;
        reasons.push("collaborative");
      }

      // Penalize already favorited
      if (userFavorites.includes(property.id)) score -= 50;

      // Popularity
      const views = property.view_count || 0;
      score += Math.min(Math.log10(views + 1) * 2, WEIGHTS.popularity);

      // Recency
      if (property.created_at) {
        const daysOld = (Date.now() - new Date(property.created_at).getTime()) / 86400000;
        score += Math.max(0, (14 - daysOld) / 14) * WEIGHTS.recency;
      }

      // Verification
      if (property.is_verified) score += WEIGHTS.verification;

      // For non-auth users: basic scoring
      if (!user_id) {
        if (property.is_verified) score += 8;
        if (views > 30) score += 4;
        if (property.created_at) {
          const d = (Date.now() - new Date(property.created_at).getTime()) / 86400000;
          if (d < 7) score += 6;
        }
      }

      return { property, score, reasons: reasons.slice(0, 3) };
    });

    // 7. Sort and diversify
    scored.sort((a: any, b: any) => b.score - a.score);

    const maxPerCity = Math.ceil(limit * 0.6);
    const cityCount: Record<string, number> = {};
    const diverse: any[] = [];

    for (const item of scored) {
      const city = item.property.city;
      cityCount[city] = (cityCount[city] || 0) + 1;
      if (cityCount[city] <= maxPerCity || diverse.length < Math.ceil(limit / 2)) {
        diverse.push(item);
      }
      if (diverse.length >= limit + offset) break;
    }

    // Fill remaining
    if (diverse.length < limit + offset) {
      for (const item of scored) {
        if (!diverse.includes(item)) {
          diverse.push(item);
          if (diverse.length >= limit + offset) break;
        }
      }
    }

    const results = diverse.slice(offset, offset + limit);

    return new Response(
      JSON.stringify({
        recommendations: results.map((r: any) => ({
          ...r.property,
          _score: r.score,
          _reasons: r.reasons,
        })),
        total: diverse.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Recommendation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
