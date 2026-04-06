// src/components/SimilarProperties.tsx
import { useEffect, useState, useCallback } from "react";
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
  listingType: property.listing_type || 'sale',
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
  const [currentProperty, setCurrentProperty] = useState<RawProperty | null>(null);

  // Récupérer la propriété actuelle d'abord
  const fetchCurrentProperty = useCallback(async () => {
    if (!currentPropertyId) return null;
    
    try {
      const { data, error } = await supabase
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

      if (error) throw error;
      return data;
    } catch (err) {
      console.error("Erreur récupération propriété actuelle:", err);
      return null;
    }
  }, [currentPropertyId]);

  // Algorithme de scoring pour similarité
  const calculateSimilarityScore = (prop: RawProperty, current: RawProperty): number => {
    let score = 0;
    
    // Même ville: +40 points
    if (prop.city && current.city && 
        prop.city.toLowerCase() === current.city.toLowerCase()) {
      score += 40;
    }
    
    // Même quartier: +30 points
    if (prop.neighborhood && current.neighborhood &&
        prop.neighborhood.toLowerCase() === current.neighborhood.toLowerCase()) {
      score += 30;
    }
    
    // Même type de propriété: +20 points
    if (prop.property_type === current.property_type) {
      score += 20;
    }
    
    // Prix similaire (±20%): +10 points
    const priceDiff = Math.abs(prop.price - current.price) / current.price;
    if (priceDiff < 0.2) {
      score += 10;
    } else if (priceDiff < 0.5) {
      score += 5;
    }
    
    // Même nombre de chambres: +5 points
    if (prop.bedrooms && current.bedrooms && 
        Math.abs(prop.bedrooms - current.bedrooms) <= 1) {
      score += 5;
    }
    
    return score;
  };

  const fetchSimilarProperties = useCallback(async () => {
    if (!currentPropertyId) {
      setError("ID propriété manquant");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Étape 1: Récupérer la propriété actuelle
      const current = await fetchCurrentProperty();
      if (!current) {
        throw new Error("Propriété actuelle non trouvée");
      }
      
      setCurrentProperty(current);
      console.log("Propriété actuelle:", current);

      // Étape 2: Essayer d'abord l'API de recommandations
      let similarProperties: RawProperty[] = [];
      let usedApi = false;
      
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
            limit: limit * 2
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.recommendations && result.recommendations.length > 0) {
            // Filtrer la propriété actuelle
            similarProperties = result.recommendations
              .filter((p: any) => p.id !== currentPropertyId)
              .slice(0, limit * 2);
            usedApi = true;
            console.log("Utilisation des recommandations API:", similarProperties.length);
          }
        }
      } catch (apiError) {
        console.warn("API recommandations indisponible, fallback DB:", apiError);
      }

      // Étape 3: Si API échoue ou vide, fallback DB
      if (!usedApi || similarProperties.length === 0) {
        console.log("Fallback base de données pour propriétés similaires");
        
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

        if (dbProperties && dbProperties.length > 0) {
          // Calculer le score de similarité pour chaque propriété
          const scored = dbProperties.map(prop => ({
            ...prop,
            similarityScore: calculateSimilarityScore(prop, current)
          }));

          // Trier par score décroissant
          scored.sort((a, b) => b.similarityScore - a.similarityScore);

          // Prendre les meilleures
          similarProperties = scored
            .filter(p => p.similarityScore > 30) // Minimum 30 points de similarité
            .slice(0, limit * 2);
          
          console.log("Propriétés similaires trouvées (DB):", similarProperties.length);
        }
      }

      if (similarProperties.length === 0) {
        // Dernier recours: propriétés récentes de la même ville
        const { data: recentProperties } = await supabase
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
          .eq("city", current.city)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (recentProperties) {
          similarProperties = recentProperties;
          console.log("Fallback propriétés récentes:", similarProperties.length);
        }
      }

      setProperties(similarProperties);
      
      if (similarProperties.length === 0) {
        setError(language === "fr" ? "Aucune propriété similaire trouvée" : "No similar properties found");
      }

    } catch (err: any) {
      console.error("SIMILAR ERROR:", err);
      setError(language === "fr" ? "Impossible de charger les recommandations" : "Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  }, [currentPropertyId, limit, language, fetchCurrentProperty]);

  useEffect(() => {
    fetchSimilarProperties();
  }, [fetchSimilarProperties]);

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
          onClick={fetchSimilarProperties}
        >
          {language === "fr" ? "Réessayer" : "Retry"}
        </Button>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        <Home className="w-12 h-12 mx-auto mb-2" />
        {language === "fr" ? "Aucune annonce similaire disponible" : "No similar properties available"}
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
