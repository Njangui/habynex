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
  floor?: number;
  total_floors?: number;
  is_furnished?: boolean;
}

// ================= HELPER MAPPING =================

const mapPropertyToCard = (property: RawProperty) => {
  return {
    id: property.id,
    title: property.title,
    price: property.price,
    priceUnit: property.price_unit,

    location: `${property.neighborhood || ""}${
      property.neighborhood ? ", " : ""
    }${property.city}`,

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
    floor: property.floor,
    totalFloors: property.total_floors,
    isFurnished: property.is_furnished,
  };
};

// ================= COMPONENT =================

interface SimilarPropertiesProps {
  currentPropertyId: string;
  limit?: number;
}

export const SimilarProperties = ({
  currentPropertyId,
  limit = 6,
}: SimilarPropertiesProps) => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [properties, setProperties] = useState<RawProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(limit);

  useEffect(() => {
    if (currentPropertyId) fetchSimilarProperties();
  }, [currentPropertyId]);

  // ================= FETCH AVEC ALGORITHME =================

  const fetchSimilarProperties = async () => {
    setLoading(true);
    setError(null);

    try {
      // ÉTAPE 1: Appeler l'algorithme de recommandations via la fonction Edge
      const { data: recData, error: recError } = await supabase.functions.invoke(
        "recommend-properties",
        {
          body: {
            // Pas de user_id = mode anonyme, l'algorithme utilisera la popularité/tendance
            limit: limit * 3, // On demande plus pour avoir de la marge
            context: {
              source: "similar", // Indique qu'on veut des biens similaires
              device: "desktop",
            },
          },
        }
      );

      // Si la fonction Edge répond avec des recommandations
      if (!recError && recData?.recommendations?.length > 0) {
        // Extraire les IDs des propriétés recommandées
        const recommendedIds = recData.recommendations
          .map((r: any) => r.id)
          .filter((id: string) => id !== currentPropertyId) // Exclure la propriété actuelle
          .slice(0, 50);

        if (recommendedIds.length > 0) {
          // Récupérer les détails complets
          const { data: fullData, error: detailsError } = await supabase
            .from("properties")
            .select(`
              id, title, price, price_unit, city, neighborhood,
              bedrooms, bathrooms, area, images, property_type,
              is_verified, is_agent_verified,
              living_rooms, kitchens, dining_rooms, laundry_rooms,
              floor, total_floors, is_furnished
            `)
            .in("id", recommendedIds)
            .eq("is_available", true);

          if (!detailsError && fullData) {
            // Garder l'ordre des recommandations de l'algorithme
            const ordered = recommendedIds
              .map((id: string) => fullData.find((p) => p.id === id))
              .filter(Boolean) as RawProperty[];

            setProperties(ordered);
            return;
          }
        }
      }

      // ÉTAPE 2: Fallback si l'algorithme échoue (CORS ou pas de résultats)
      console.warn("Algorithm failed, using fallback:", recError);

      // Fallback: propriétés similaires basiques (même ville/type)
      const { data: currentProperty } = await supabase
        .from("properties")
        .select("city, neighborhood, property_type, price")
        .eq("id", currentPropertyId)
        .single();

      const { data: fallbackData, error: fallbackError } = await supabase
        .from("properties")
        .select(`
          id, title, price, price_unit, city, neighborhood,
          bedrooms, bathrooms, area, images, property_type,
          is_verified, is_agent_verified,
          living_rooms, kitchens, dining_rooms, laundry_rooms,
          floor, total_floors, is_furnished
        `)
        .neq("id", currentPropertyId)
        .eq("is_available", true)
        .eq("city", currentProperty?.city || "")
        .eq("property_type", currentProperty?.property_type || "")
        .limit(50);

      if (fallbackError) throw fallbackError;

      // Trier par pertinence
      const sorted = (fallbackData || []).sort((a, b) => {
        const scoreA =
          (a.neighborhood === currentProperty?.neighborhood ? 2 : 0) +
          (Math.abs(a.price - (currentProperty?.price || 0)) < 50000 ? 1 : 0);
        const scoreB =
          (b.neighborhood === currentProperty?.neighborhood ? 2 : 0) +
          (Math.abs(b.price - (currentProperty?.price || 0)) < 50000 ? 1 : 0);
        return scoreB - scoreA;
      });

      setProperties(sorted);
    } catch (err: any) {
      console.error("ERROR SIMILAR:", err);
      setError(
        language === "fr"
          ? "Erreur lors du chargement"
          : "Error loading data"
      );
    } finally {
      setLoading(false);
    }
  };

  // ================= UI STATES =================

  if (loading)
    return (
      <div className="py-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
      </div>
    );

  if (error)
    return (
      <div className="py-6 text-center text-red-500">
        {error}
      </div>
    );

  if (!properties.length)
    return (
      <div className="py-6 text-center text-muted-foreground">
        {language === "fr"
          ? "Aucune annonce similaire"
          : "No similar properties"}
      </div>
    );

  // ================= DATA =================

  const displayed = properties.slice(0, visibleCount).map(mapPropertyToCard);

  const hasMore = properties.length > visibleCount;

  // ================= RENDER =================

  return (
    <div className="py-8">
      {/* HEADER */}
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

      {/* GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayed.map((property) => (
          <PropertyCard key={property.id} {...property} />
        ))}
      </div>

      {/* LOAD MORE */}
      {hasMore && (
        <div className="text-center mt-6">
          <Button
            variant="outline"
            onClick={() => setVisibleCount((prev) => prev + limit)}
          >
            {language === "fr"
              ? "Voir plus de recommandations"
              : "See more"}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
};