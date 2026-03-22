import { motion } from "framer-motion";
import { 
  Heart, MapPin, Bed, Bath, Square, Star, Check, Shield, 
  Sofa, Utensils, DoorOpen, WashingMachine, Building2, Trees,
  Home, Store, LandPlot, BadgeCheck, ArrowRight, User, Building
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PropertyCardProps {
  id: number | string;
  title: string;
  location: string;
  price: number;
  priceUnit: string;
  image: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  rating?: number;
  isVerified?: boolean;
  type: string;
  source?: "search" | "recommendation" | "direct";
  ownerTrustScore?: number;
  ownerType?: "owner" | "agent" | "agency";
  livingRooms?: number;
  kitchens?: number;
  diningRooms?: number;
  laundryRooms?: number;
  propertyCategory?: "residential" | "land" | "commercial";
  floor?: number;
  totalFloors?: number;
  isFurnished?: boolean;
  ownerAgencyName?: string;
  // NOUVEAU: Ajout de listing_type pour le type d'annonce
  listingType?: "rent" | "sale" | "colocation" | "short_term";
}

const PropertyCard = ({
  id,
  title,
  location,
  price,
  priceUnit,
  image,
  bedrooms,
  bathrooms,
  area,
  rating: ratingProp,
  isVerified = false,
  type,
  source = "recommendation",
  ownerTrustScore,
  ownerType,
  livingRooms,
  kitchens,
  diningRooms,
  laundryRooms,
  propertyCategory,
  floor,
  totalFloors,
  isFurnished,
  ownerAgencyName,
  listingType,
}: PropertyCardProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [realRating, setRealRating] = useState<{ avg: number; count: number } | null>(null);
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();

  // Fetch real reviews rating
  useEffect(() => {
    const fetchRating = async () => {
      if (!id || String(id).startsWith("fallback")) return;
      try {
        const { data } = await supabase
          .from("property_reviews")
          .select("rating")
          .eq("property_id", id.toString());
        if (data && data.length > 0) {
          const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
          setRealRating({ avg, count: data.length });
        }
      } catch (e) {
        // silently fail
      }
    };
    fetchRating();
  }, [id]);

  // Check if property is already in favorites on mount
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!user || id === "demo") return;
      
      try {
        const { data } = await supabase
          .from("property_favorites")
          .select("id")
          .eq("property_id", id.toString())
          .eq("user_id", user.id)
          .maybeSingle();
        
        setIsLiked(!!data);
      } catch (error) {
        console.error("Error checking favorite status:", error);
      }
    };

    checkFavoriteStatus();
  }, [user, id]);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast({
        title: t("toast.loginRequired"),
        description: t("toast.loginToFavorite"),
      });
      return;
    }

    if (id === "demo" || isLoading) return;

    setIsLoading(true);
    try {
      if (isLiked) {
        await supabase
          .from("property_favorites")
          .delete()
          .eq("property_id", id.toString())
          .eq("user_id", user.id);
        setIsLiked(false);
        toast({ title: t("toast.removedFromFavorites") });
      } else {
        await supabase
          .from("property_favorites")
          .insert({ property_id: id.toString(), user_id: user.id });
        setIsLiked(true);
        toast({ title: t("toast.addedToFavorites") });
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast({
        title: t("common.error"),
        description: t("error.tryAgain"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour traduire le type de propriété - COMPLÈTE avec tous les types de CreateListing
  const getPropertyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      // Résidentiel
      studio: "Studio",
      room: "Chambre",
      apartment: "Appartement",
      duplex: "Duplex",
      house: "Maison",
      villa: "Villa",
      penthouse: "Penthouse",
      furnished_apartment: "Appart. meublé",
      shared_room: "Chambre partagée",
      // Terrain
      land: "Terrain",
      // Commercial
      shop: "Boutique",
      store: "Magasin",
      commercial_space: "Espace commercial",
      warehouse: "Entrepôt",
      office: "Bureau",
      building: "Bâtiment",
    };
    return labels[type] || type;
  };

  // Fonction pour déterminer la catégorie à partir du type
  const getCategoryFromType = (type: string): "residential" | "land" | "commercial" => {
    const residentialTypes = ["studio", "room", "apartment", "duplex", "house", "villa", "penthouse", "furnished_apartment", "shared_room"];
    const landTypes = ["land"];
    const commercialTypes = ["shop", "store", "commercial_space", "warehouse", "office", "building"];
    
    if (residentialTypes.includes(type)) return "residential";
    if (landTypes.includes(type)) return "land";
    if (commercialTypes.includes(type)) return "commercial";
    return "residential";
  };

  const category = propertyCategory || getCategoryFromType(type);

  // 1. Type d'annonce (Location, Vente, Colocation, Court séjour)
  const getListingTypeLabel = () => {
    // Utiliser listingType si disponible, sinon déduire de priceUnit
    if (listingType) {
      switch (listingType) {
        case "rent": return "Location";
        case "sale": return "Vente";
        case "colocation": return "Colocation";
        case "short_term": return "Court séjour";
        default: return listingType;
      }
    }
    // Fallback sur priceUnit
    switch (priceUnit) {
      case "month": return "Location";
      case "day": return "Court séjour";
      case "sale": return "Vente";
      default: return priceUnit;
    }
  };

  const getListingTypeColor = () => {
    const label = getListingTypeLabel();
    switch (label) {
      case "Location": return "bg-blue-100 text-blue-700";
      case "Vente": return "bg-rose-100 text-rose-700";
      case "Colocation": return "bg-purple-100 text-purple-700";
      case "Court séjour": return "bg-orange-100 text-orange-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  // 2. Catégorie du bien (Résidentiel, Commercial, Terrain)
  const getCategoryLabel = () => {
    switch (category) {
      case "residential": return "Résidentiel";
      case "land": return "Terrain";
      case "commercial": return "Commercial";
      default: return "Résidentiel";
    }
  };

  const getCategoryColor = () => {
    switch (category) {
      case "residential": return "bg-emerald-100 text-emerald-700";
      case "land": return "bg-green-100 text-green-700";
      case "commercial": return "bg-indigo-100 text-indigo-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getCategoryIcon = () => {
    switch (category) {
      case "residential": return <Home className="w-3 h-3" />;
      case "land": return <LandPlot className="w-3 h-3" />;
      case "commercial": return <Store className="w-3 h-3" />;
      default: return <Home className="w-3 h-3" />;
    }
  };

  // 3. Type d'agent (Habynex Agent, Habynex Agence, ou rien pour propriétaires)
  const getAgentBadge = () => {
    if (!ownerType || ownerType === "owner") return null;
    
    if (ownerType === "agency") {
      return {
        label: "Habynex Agence",
        icon: <Building className="w-3 h-3" />,
        color: "bg-amber-100 text-amber-800",
      };
    }
    
    if (ownerType === "agent") {
      return {
        label: "Habynex Agent",
        icon: <User className="w-3 h-3" />,
        color: "bg-amber-100 text-amber-800",
      };
    }
    
    return null;
  };

  // Formater le prix avec unité
  const formatPrice = () => {
    const formatted = price.toLocaleString('fr-FR');
    let unitLabel = "";
    switch (priceUnit) {
      case "month": unitLabel = "/mois"; break;
      case "day": unitLabel = "/jour"; break;
      case "sale": unitLabel = " vente"; break;
      default: unitLabel = `/${priceUnit}`;
    }
    return { formatted, unitLabel };
  };

  const { formatted: priceFormatted, unitLabel } = formatPrice();

  const agentBadge = getAgentBadge();

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="group bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-elegant transition-all duration-300 border border-border/50 flex flex-col h-full"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Overlay Badges - ORDRE CORRECT:
          1. Type d'annonce (Location, Vente, Colocation, Court séjour)
          2. Catégorie du bien (Résidentiel, Commercial, Terrain)
          3. Type d'agent (Habynex Agent, Habynex Agence) - uniquement si agent/agence
          4. Type de bien (Villa, Appartement, Studio, etc.)
          5. Meublé (si activé)
          6. Vérifié (si applicable)
          7. Trust Score (si applicable)
        */}
        <div className="absolute top-3 left-3 right-12 flex flex-wrap gap-2">
          
          {/* 1. Type d'annonce */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm shadow-sm ${getListingTypeColor()}`}>
            <span>{getListingTypeLabel()}</span>
          </div>

          {/* 2. Catégorie du bien */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm shadow-sm ${getCategoryColor()}`}>
            {getCategoryIcon()}
            <span>{getCategoryLabel()}</span>
          </div>

          {/* 3. Type d'agent (Habynex Agent ou Habynex Agence) - uniquement si défini et différent de "owner" */}
          {agentBadge && (
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm shadow-sm ${agentBadge.color}`}>
              {agentBadge.icon}
              <span>{agentBadge.label}</span>
            </span>
          )}

          {/* 4. Type de bien (Villa, Appartement, Studio, etc.) */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm shadow-sm bg-white/90 text-gray-800">
            <span>{getPropertyTypeLabel(type)}</span>
          </div>

          {/* 5. Meublé (si activé) */}
          {isFurnished && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100/90 backdrop-blur-sm text-amber-800 shadow-sm">
              <Sofa className="w-3 h-3 shrink-0" />
              <span>Meublé</span>
            </span>
          )}

          {/* 6. Vérifié */}
          {isVerified && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100/90 backdrop-blur-sm text-emerald-700 shadow-sm">
              <BadgeCheck className="w-3 h-3" />
              <span>{t("card.verified") || "Vérifié"}</span>
            </span>
          )}

          {/* 7. Trust Score */}
          {ownerTrustScore !== undefined && ownerTrustScore >= 60 && (
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-teal-100/90 backdrop-blur-sm text-teal-700 shadow-sm">
              <Star className="w-3 h-3 fill-teal-700" />
              <span>{ownerTrustScore}%</span>
            </span>
          )}
        </div>

        {/* Like Button */}
        <button
          onClick={toggleFavorite}
          disabled={isLoading}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors disabled:opacity-50 shadow-sm"
        >
          <Heart
            className={`w-5 h-5 transition-colors ${
              isLiked ? "fill-rose-500 text-rose-500" : "text-gray-600"
            }`}
          />
        </button>

        {/* Price Badge */}
        <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-white/95 backdrop-blur-sm shadow-lg">
          <span className="text-base font-bold text-foreground">
            {priceFormatted} FCFA
          </span>
          <span className="text-xs text-muted-foreground font-medium">{unitLabel}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-grow">
        {/* Title & Location */}
        <div className="mb-3">
          <h3 className="font-semibold text-foreground mb-1 line-clamp-1 group-hover:text-primary transition-colors text-base">
            {title}
          </h3>
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-primary/70" />
            <span className="line-clamp-1">{location}</span>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs text-muted-foreground mb-4 bg-muted/30 p-2.5 rounded-lg">
          
          {/* Résidentiel */}
          {category === "residential" && (
            <>
              <div className="flex items-center gap-1.5">
                <Bed className="w-3.5 h-3.5 text-primary/60" />
                <span className="font-medium text-foreground">{bedrooms ?? 0}</span>
                <span className="text-muted-foreground/80">ch.</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Bath className="w-3.5 h-3.5 text-primary/60" />
                <span className="font-medium text-foreground">{bathrooms ?? 0}</span>
                <span className="text-muted-foreground/80">sdb</span>
              </div>
              
              {/* Salon - Affiché uniquement si défini et > 0 */}
              {livingRooms !== undefined && livingRooms > 0 && (
                <div className="flex items-center gap-1.5">
                  <Sofa className="w-3.5 h-3.5 text-primary/60" />
                  <span className="font-medium text-foreground">{livingRooms}</span>
                  <span className="text-muted-foreground/80">salon{livingRooms > 1 ? 's' : ''}</span>
                </div>
              )}

              {/* Cuisine - Affichée uniquement si définie et > 0 */}
              {kitchens !== undefined && kitchens > 0 && (
                <div className="flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-primary/60" />
                  <span className="font-medium text-foreground">{kitchens}</span>
                  <span className="text-muted-foreground/80">cuisine{kitchens > 1 ? 's' : ''}</span>
                </div>
              )}

              {/* Salle à manger - Affichée uniquement si définie et > 0 */}
              {diningRooms !== undefined && diningRooms > 0 && (
                <div className="flex items-center gap-1.5">
                  <DoorOpen className="w-3.5 h-3.5 text-primary/60" />
                  <span className="font-medium text-foreground">{diningRooms}</span>
                  <span className="text-muted-foreground/80">salle{diningRooms > 1 ? 's' : ''} à manger</span>
                </div>
              )}

              {/* Buanderie - Affichée uniquement si définie et > 0 */}
              {laundryRooms !== undefined && laundryRooms > 0 && (
                <div className="flex items-center gap-1.5">
                  <WashingMachine className="w-3.5 h-3.5 text-primary/60" />
                  <span className="font-medium text-foreground">{laundryRooms}</span>
                  <span className="text-muted-foreground/80">buanderie{laundryRooms > 1 ? 's' : ''}</span>
                </div>
              )}

              {/* Étage - Affiché uniquement si défini */}
              {floor !== undefined && floor !== null && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary/60" />
                  <span className="font-medium text-foreground">
                    {floor}{totalFloors ? `/${totalFloors}` : ''}
                  </span>
                  <span className="text-muted-foreground/80">étage</span>
                </div>
              )}

              {/* Surface */}
              {area !== undefined && area !== null && area > 0 && (
                <div className="flex items-center gap-1.5">
                  <Square className="w-3.5 h-3.5 text-primary/60" />
                  <span className="font-medium text-foreground">{area}</span>
                  <span className="text-muted-foreground/80">m²</span>
                </div>
              )}
            </>
          )}

          {/* Terrain */}
          {category === "land" && (
            <>
              <div className="flex items-center gap-1.5 col-span-2">
                <Trees className="w-3.5 h-3.5 text-green-600" />
                <span className="font-medium text-foreground text-sm">{area ?? 0} m²</span>
                <span className="text-muted-foreground/80">de terrain</span>
              </div>
            </>
          )}

          {/* Commercial */}
          {category === "commercial" && (
            <>
              <div className="flex items-center gap-1.5 col-span-2">
                <Store className="w-3.5 h-3.5 text-purple-600" />
                <span className="font-medium text-foreground text-sm">{area ?? 0} m²</span>
                <span className="text-muted-foreground/80">surface</span>
              </div>
              {/* Étages pour commercial */}
              {bedrooms !== undefined && bedrooms > 0 && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary/60" />
                  <span className="font-medium text-foreground">{bedrooms}</span>
                  <span className="text-muted-foreground/80">étage(s)</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer avec Rating et Lien */}
        <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            {realRating && realRating.count > 0 ? (
              <>
                <span className="font-semibold text-foreground text-sm">{realRating.avg.toFixed(1)}</span>
                <span className="text-muted-foreground text-xs">({realRating.count})</span>
              </>
            ) : (
              <span className="text-muted-foreground text-xs italic">Avis</span>
            )}
          </div>
          <Link 
            to={`/property/${id}?source=${source}`} 
            className="text-primary text-sm font-medium hover:underline flex items-center gap-1"
          >
            {t("card.viewDetails") || "Détails"}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
};

export default PropertyCard;