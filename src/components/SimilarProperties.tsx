// src/components/SimilarProperties.tsx
import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Loader2, Home } from "lucide-react";
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
  listing_type?: string;
  is_verified: boolean;
  is_agent_verified: boolean;
  living_rooms?: number;
  kitchens?: number;
  dining_rooms?: number;
  laundry_rooms?: number;
  total_floors?: number;
  is_furnished?: boolean;
  created_at?: string;
  view_count?: number;
}

// ================= MAPPING avec protection =================
const mapPropertyToCard = (property: RawProperty | null | undefined) => {
  // ✅ PROTECTION : retourner null si property invalide
  if (!property) return null;
  
  return {
    id: property.id || '',
    title: property.title || 'Sans titre',
    price: property.price || 0,
    priceUnit: property.price_unit || 'FCFA',
    location: `${property.neighborhood ? property.neighborhood + ", " : ""}${property.city || ''}`,
    image: property.images?.[0] || "/placeholder.jpg",
    bedrooms: property.bedrooms ?? 0,
    bathrooms: property.bathrooms ?? 0,
    area: property.area ?? 0,
    type: property.property_type || 'unknown',
    listingType: property.listing_type || 'sale',
    isVerified: property.is_verified || property.is_agent_verified || false,
    livingRooms: property.living_rooms ?? 0,
    kitchens: property.kitchens ?? 0,
    diningRooms: property.dining_rooms ?? 0,
    laundryRooms: property.laundry_rooms ?? 0,
    totalFloors: property.total_floors,
    isFurnished: property.is_furnished,
  };
};

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

  // ✅ PROTECTION : s'assurer que currentPropertyId est valide
  useEffect(() => {
    if (!currentPropertyId || typeof currentPropertyId !== 'string') {
      setError(language === "fr" ? "ID propriété invalide" : "Invalid property ID");
      setLoading(false);
      return;
    }
    fetchSimilarProperties();
  }, [currentPropertyId, limit, language]);

  const fetchSimilarProperties = useCallback(async () => {
    if (!currentPropertyId) return;

    setLoading(true);
    setError(null);
    setProperties([]);

    try {
      // Récupérer la propriété actuelle
      const { data: current, error: currentError } = await supabase
        .from("properties")
        .select(`
          id, title, price, price_unit, city, neighborhood, property_type,
          bedrooms, bathrooms, area, images, listing_type,
          is_verified, is_agent_verified,
          living_rooms, kitchens, dining_rooms, laundry_rooms,
          total_floors, is_furnished, created_at, view_count
        `)
        .eq("id", currentPropertyId)
        .single();

      if (currentError || !current) {
        throw new Error(language === "fr" ? "Propriété non trouvée" : "Property not found");
      }

      console.log("Propriété actuelle:", current);

      // Essayer l'API de recommandations
      let similarProperties: RawProperty[] = [];
      
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://habynex-recommendations-systeme-v1.onrender.com';
        const response = await fetch(`${API_URL}/recommendations`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            city: current.city,
            neighborhood: current.neighborhood,
            property_type: current.property_type,
            budget_min: current.price * 0.8,
            budget_max: current.price * 1.2,
            limit: limit * 3
          }),
        });

        if (response.ok) {
          const result = await response.json();
          // ✅ PROTECTION : vérifier que result.recommendations est un tableau
          if (result?.recommendations && Array.isArray(result.recommendations)) {
            similarProperties = result.recommendations
              .filter((p: any) => p && p.id && p.id !== currentPropertyId)
              .slice(0, limit * 2);
          }
        }
      } catch (apiError) {
        console.warn("API recommandations indisponible:", apiError);
      }

      // Fallback DB si API vide
      if (similarProperties.length === 0) {
        const { data: dbProperties, error: dbError } = await supabase
          .from("properties")
          .select(`
            id, title, price, price_unit, city, neighborhood,
            bedrooms, bathrooms, area, images, property_type, listing_type,
            is_verified, is_agent_verified,
            living_rooms, kitchens, dining_rooms, laundry_rooms,
            total_floors, is_furnished, created_at, view_count
          `)
          .neq("id", currentPropertyId)
          .eq("is_available", true)
          .eq("is_published", true)
          .or(`city.ilike.%${current.city}%,property_type.eq.${current.property_type}`)
          .limit(50);

        if (dbError) throw dbError;

        if (dbProperties && Array.isArray(dbProperties)) {
          // Scoring de similarité
          const scored = dbProperties
            .filter(p => p && p.id) // ✅ PROTECTION
            .map(prop => ({
              ...prop,
              similarityScore: calculateSimilarityScore(prop, current)
            }))
            .sort((a, b) => b.similarityScore - a.similarityScore)
            .filter(p => p.similarityScore > 30)
            .slice(0, limit * 2);

          similarProperties = scored;
        }
      }

      // ✅ PROTECTION : filtrer les nulls/undefined
      const validProperties = similarProperties.filter(p => p && typeof p === 'object' && p.id);
      setProperties(validProperties);

      if (validProperties.length === 0) {
        setError(language === "fr" ? "Aucune propriété similaire trouvée" : "No similar properties found");
      }

    } catch (err: any) {
      console.error("SIMILAR ERROR:", err);
      setError(err.message || (language === "fr" ? "Erreur de chargement" : "Loading error"));
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [currentPropertyId, limit, language]);

  // Algorithme de scoring
  const calculateSimilarityScore = (prop: RawProperty, current: RawProperty): number => {
    if (!prop || !current) return 0;
    
    let score = 0;
    
    if (prop.city && current.city && 
        prop.city.toLowerCase() === current.city.toLowerCase()) {
      score += 40;
    }
    
    if (prop.neighborhood && current.neighborhood &&
        prop.neighborhood.toLowerCase() === current.neighborhood.toLowerCase()) {
      score += 30;
    }
    
    if (prop.property_type === current.property_type) {
      score += 20;
    }
    
    const priceDiff = Math.abs(prop.price - current.price) / (current.price || 1);
    if (priceDiff < 0.2) score += 10;
    else if (priceDiff < 0.5) score += 5;
    
    if (prop.bedrooms && current.bedrooms && 
        Math.abs(prop.bedrooms - current.bedrooms) <= 1) {
      score += 5;
    }
    
    return score;
  };

  // ✅ PROTECTION : useMemo pour les données affichées
  const displayed = useMemo(() => {
    return properties
      .slice(0, visibleCount)
      .map(mapPropertyToCard)
      .filter(Boolean); // Enlever les null
  }, [properties, visibleCount]);

  const hasMore = properties.length > visibleCount;

  // ================= RENDER =================
  if (loading) {
    return (
      <div className="py-10 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        <p className="mt-2 text-muted-foreground text-sm">
          {language === "fr" ? "Recherche de biens similaires..." : "Finding similar properties..."}
        </p>
      </div>
    );
  }

  if (error && properties.length === 0) {
    return (
      <div className="py-6 text-center">
        <Home className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
        <p className="text-muted-foreground">{error}</p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-4"
          onClick={() => fetchSimilarProperties()}
        >
          {language === "fr" ? "Réessayer" : "Retry"}
        </Button>
      </div>
    );
  }

  if (displayed.length === 0) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        <Home className="w-12 h-12 mx-auto mb-2" />
        {language === "fr" ? "Aucune annonce similaire disponible" : "No similar properties available"}
      </div>
    );
  }

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
          property && <PropertyCard key={property.id} {...property} />
        ))}
      </div>

      {hasMore && (
        <div className="text-center mt-8">
          <Button 
            variant="outline" 
            onClick={() => setVisibleCount((prev) => prev + limit)}
          >
            {language === "fr" ? "Voir plus de recommandations" : "See more"}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
};
