// src/components/SimilarProperties.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import PropertyCard from "./PropertyCard";

// ================= TYPES =================

interface RawProperty {
  id: string;
  title: string;
  price: number;
  price_unit: string;
  city: string;
  neighborhood: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  images: string[] | null;
  property_type: string;
  is_verified: boolean;
  is_agent_verified: boolean;
  living_rooms?: number;
  kitchens?: number;
  dining_rooms?: number;
  laundry_rooms?: number;
  total_floors?: number;
  is_furnished?: boolean;
}

// ================= MAPPING =================

const mapPropertyToCard = (property: RawProperty) => ({
  id: property.id,
  title: property.title,
  price: property.price,
  priceUnit: property.price_unit,
  location: `${property.neighborhood ? property.neighborhood + ", " : ""}${property.city}`,
  image: property.images?.[0] || "/placeholder.jpg",
  bedrooms: property.bedrooms ?? 0,
  bathrooms: property.bathrooms ?? 0,
  area: property.area ?? 0,
  type: property.property_type,
  isVerified: property.is_verified || property.is_agent_verified,
  livingRooms: property.living_rooms ?? 0,
  kitchens: property.kitchens ?? 0,
  diningRooms: property.dining_rooms ?? 0,
  laundryRooms: property.laundry_rooms ?? 0,
  totalFloors: property.total_floors,
  isFurnished: property.is_furnished,
});

// ================= COMPONENT =================

interface SimilarPropertiesProps {
  currentPropertyId: string;
  limit?: number;
}

export const SimilarProperties = ({ currentPropertyId, limit = 6 }: SimilarPropertiesProps) => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [properties, setProperties] = useState<RawProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(limit);

  useEffect(() => {
    if (currentPropertyId) fetchSimilarProperties();
  }, [currentPropertyId]);

  const fetchSimilarProperties = async () => {
    setLoading(true);
    setError(null);

    try {
      // ================= STEP 1: RECOMMENDATION FUNCTION =================
      const { data: recData, error: recError } = await supabase.functions.invoke(
        "recommend-properties",
        {
          body: {
            limit: limit * 3,
            context: { source: "similar" },
          },
        }
      );

      let recommendedIds: string[] = [];

      if (!recError && recData?.recommendations?.length) {
        recommendedIds = recData.recommendations
          .map((r: any) => r.id)
          .filter((id: string) => id !== currentPropertyId);
      }

      // ================= FETCH PROPERTIES =================
      if (recommendedIds.length) {
        const { data, error } = await supabase
          .from("properties")
          .select(`
            id, title, price, price_unit, city, neighborhood,
            bedrooms, bathrooms, area, images, property_type,
            is_verified, is_agent_verified,
            living_rooms, kitchens, dining_rooms, laundry_rooms,
            total_floors, is_furnished
          `)
          .in("id", recommendedIds)
          .eq("is_available", true);

        if (error) throw error;

        if (data?.length) {
          // Garde l'ordre des recommandations
          const ordered = recommendedIds
            .map((id) => data.find((p) => p.id === id))
            .filter(Boolean) as RawProperty[];

          setProperties(ordered);
          return;
        }
      }

      // ================= STEP 2: FALLBACK =================
      console.warn("Algo failed → fallback");

      const { data: currentProperty, error: currentError } = await supabase
        .from("properties")
        .select("city, neighborhood, property_type, price")
        .eq("id", currentPropertyId)
        .single();

      if (currentError || !currentProperty) throw new Error("Current property not found");

      const { data: fallbackData, error: fallbackError } = await supabase
        .from("properties")
        .select(`
          id, title, price, price_unit, city, neighborhood,
          bedrooms, bathrooms, area, images, property_type,
          is_verified, is_agent_verified,
          living_rooms, kitchens, dining_rooms, laundry_rooms,
          total_floors, is_furnished
        `)
        .neq("id", currentPropertyId)
        .eq("city", currentProperty.city)
        .eq("property_type", currentProperty.property_type)
        .eq("is_available", true)
        .limit(20);

      if (fallbackError) throw fallbackError;

      // Simple tri par proximité de quartier et prix
      const sorted = (fallbackData || []).sort((a, b) => {
        const scoreA =
          (a.neighborhood === currentProperty.neighborhood ? 2 : 0) +
          (Math.abs(a.price - currentProperty.price) < 50000 ? 1 : 0);

        const scoreB =
          (b.neighborhood === currentProperty.neighborhood ? 2 : 0) +
          (Math.abs(b.price - currentProperty.price) < 50000 ? 1 : 0);

        return scoreB - scoreA;
      });

      setProperties(sorted);
    } catch (err) {
      console.error("SIMILAR ERROR:", err);
      setError(language === "fr" ? "Impossible de charger les recommandations" : "Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  };

  // ================= RENDER =================

  if (loading) {
    return (
      <div className="py-10 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
      </div>
    );
  }

  if (error && !properties.length) {
    return <div className="py-6 text-center text-red-500">{error}</div>;
  }

  if (!properties.length) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        {language === "fr" ? "Aucune annonce similaire" : "No similar properties"}
      </div>
    );
  }

  const displayed = properties.slice(0, visibleCount).map(mapPropertyToCard);
  const hasMore = properties.length > visibleCount;

  return (
    <div className="py-10">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          {language === "fr" ? "Annonces similaires" : "Similar properties"}
        </h3>
        <Button variant="ghost" size="sm" onClick={() => navigate("/search")}>
          {language === "fr" ? "Voir plus" : "See more"}
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayed.map((property) => (
          <PropertyCard key={property.id} {...property} />
        ))}
      </div>

      {hasMore && (
        <div className="text-center mt-8">
          <Button variant="outline" onClick={() => setVisibleCount((prev) => prev + limit)}>
            {language === "fr" ? "Voir plus de recommandations" : "See more"}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
};