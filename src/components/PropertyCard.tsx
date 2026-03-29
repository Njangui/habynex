import { motion } from "framer-motion";
import { 
  Heart, MapPin, Bed, Bath, Square, Star, Shield, 
  Sofa, Utensils, DoorOpen, WashingMachine, Building2, Trees,
  Home, Store, LandPlot, BadgeCheck, ArrowRight, User, Building,
  Camera
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
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
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
  listingType?: "rent" | "sale" | "colocation" | "short_term";
}

const PropertyCard = ({
  id,
  title,
  location,
  price,
  priceUnit,
  image,
  bedrooms = 0,
  bathrooms = 0,
  area = 0,
  rating: ratingProp,
  isVerified = false,
  type,
  source = "recommendation",
  ownerTrustScore,
  ownerType,
  livingRooms = 0,
  kitchens = 0,
  diningRooms = 0,
  laundryRooms = 0,
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
  const [imageError, setImageError] = useState(false);
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const { toast } = useToast();

  const isDark = theme === 'dark';

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

  // Fonction pour traduire le type de propriété
  const getPropertyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      studio: "Studio",
      room: "Chambre",
      apartment: "Appartement",
      duplex: "Duplex",
      house: "Maison",
      villa: "Villa",
      penthouse: "Penthouse",
      furnished_apartment: "Appart. meublé",
      shared_room: "Chambre partagée",
      land: "Terrain",
      shop: "Boutique",
      store: "Magasin",
      commercial_space: "Espace commercial",
      warehouse: "Entrepôt",
      office: "Bureau",
      building: "Bâtiment",
    };
    return labels[type] || type;
  };

  // Déterminer la catégorie à partir du type
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

  // Type d'annonce - CORRIGÉ : un seul badge
  const getListingTypeLabel = () => {
    if (listingType) {
      switch (listingType) {
        case "rent": return "Location";
        case "sale": return "Vente";
        case "colocation": return "Colocation";
        case "short_term": return "Court séjour";
        default: return listingType;
      }
    }
    switch (priceUnit) {
      case "month": return "Location";
      case "day": return "Court séjour";
      case "sale": return "Vente";
      default: return priceUnit;
    }
  };

  const getListingTypeColor = (isDark: boolean) => {
    const label = getListingTypeLabel();
    if (isDark) {
      switch (label) {
        case "Location": return "bg-blue-900/80 text-blue-200";
        case "Vente": return "bg-rose-900/80 text-rose-200";
        case "Colocation": return "bg-purple-900/80 text-purple-200";
        case "Court séjour": return "bg-orange-900/80 text-orange-200";
        default: return "bg-gray-800/80 text-gray-200";
      }
    }
    switch (label) {
      case "Location": return "bg-blue-100 text-blue-700";
      case "Vente": return "bg-rose-100 text-rose-700";
      case "Colocation": return "bg-purple-100 text-purple-700";
      case "Court séjour": return "bg-orange-100 text-orange-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  // Catégorie du bien
  const getCategoryLabel = () => {
    switch (category) {
      case "residential": return "Résidentiel";
      case "land": return "Terrain";
      case "commercial": return "Commercial";
      default: return "Résidentiel";
    }
  };

  const getCategoryColor = (isDark: boolean) => {
    if (isDark) {
      switch (category) {
        case "residential": return "bg-emerald-900/80 text-emerald-200";
        case "land": return "bg-green-900/80 text-green-200";
        case "commercial": return "bg-indigo-900/80 text-indigo-200";
        default: return "bg-gray-800/80 text-gray-200";
      }
    }
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

  // Type d'agent
  const getAgentBadge = () => {
    if (!ownerType || ownerType === "owner") return null;
    
    if (ownerType === "agency") {
      return {
        label: ownerAgencyName || "Agence",
        icon: <Building className="w-3 h-3" />,
        color: isDark ? "bg-amber-900/80 text-amber-200" : "bg-amber-100 text-amber-800",
      };
    }
    
    if (ownerType === "agent") {
      return {
        label: ownerAgencyName || "Agent",
        icon: <User className="w-3 h-3" />,
        color: isDark ? "bg-amber-900/80 text-amber-200" : "bg-amber-100 text-amber-800",
      };
    }
    
    return null;
  };

  // Formater le prix avec gestion du mode sombre
  const formatPrice = () => {
    const formatted = price.toLocaleString('fr-FR');
    let unitLabel = "";
    switch (priceUnit) {
      case "month": unitLabel = "/mois"; break;
      case "day": unitLabel = "/jour"; break;
      case "sale": unitLabel = ""; break;
      default: unitLabel = `/${priceUnit}`;
    }
    return { formatted, unitLabel };
  };

  const { formatted: priceFormatted, unitLabel } = formatPrice();
  const agentBadge = getAgentBadge();

  // Helper pour vérifier si une valeur est valide (> 0)
  const hasValue = (val: number | undefined | null): boolean => {
    return val !== undefined && val !== null && val > 0;
  };

  // Fonction pour obtenir les features à afficher
  const getFeaturesToShow = () => {
    const features = [];
    
    if (category === "residential") {
      if (hasValue(bedrooms)) {
        features.push({
          icon: <Bed className="w-3.5 h-3.5" />,
          label: `${bedrooms} ch.`
        });
      }
      if (hasValue(bathrooms)) {
        features.push({
          icon: <Bath className="w-3.5 h-3.5" />,
          label: `${bathrooms} sdb`
        });
      }
      if (hasValue(livingRooms)) {
        features.push({
          icon: <Sofa className="w-3.5 h-3.5" />,
          label: `${livingRooms} salon${livingRooms > 1 ? 's' : ''}`
        });
      }
      if (hasValue(kitchens)) {
        features.push({
          icon: <Utensils className="w-3.5 h-3.5" />,
          label: `${kitchens} cuisine${kitchens > 1 ? 's' : ''}`
        });
      }
      if (hasValue(area)) {
        features.push({
          icon: <Square className="w-3.5 h-3.5" />,
          label: `${area} m²`
        });
      }
    } else if (category === "land") {
      features.push({
        icon: <Trees className="w-3.5 h-3.5" />,
        label: `${area || 0} m²`
      });
    } else if (category === "commercial") {
      features.push({
        icon: <Store className="w-3.5 h-3.5" />,
        label: `${area || 0} m²`
      });
      if (hasValue(bedrooms)) {
        features.push({
          icon: <Building2 className="w-3.5 h-3.5" />,
          label: `${bedrooms} étage${bedrooms > 1 ? 's' : ''}`
        });
      }
    }
    
    return features;
  };

  const features = getFeaturesToShow();

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className={`group rounded-2xl overflow-hidden shadow-sm hover:shadow-elegant transition-all duration-300 border flex flex-col h-full ${
        isDark 
          ? 'bg-gray-900 border-gray-800 hover:shadow-gray-800/30' 
          : 'bg-card border-border/50 hover:shadow-gray-200'
      }`}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-200 dark:bg-gray-800">
        {!imageError && image ? (
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Camera className="w-12 h-12 text-gray-400 dark:text-gray-600" />
          </div>
        )}
        
        {/* Overlay Badges - CORRIGÉ : plus de duplication */}
        <div className="absolute top-3 left-3 right-12 flex flex-wrap gap-2 max-w-[calc(100%-60px)]">
          
          {/* 1. Type d'annonce (UN SEUL BADGE) */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm shadow-sm ${getListingTypeColor(isDark)}`}>
            <span>{getListingTypeLabel()}</span>
          </div>

          {/* 2. Type de bien spécifique */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm shadow-sm ${
            isDark ? 'bg-gray-800/90 text-gray-200' : 'bg-white/90 text-gray-800'
          }`}>
            <span>{getPropertyTypeLabel(type)}</span>
          </div>

          {/* 3. Meublé */}
          {isFurnished && (
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm shadow-sm ${
              isDark ? 'bg-amber-900/80 text-amber-200' : 'bg-amber-100/90 text-amber-800'
            }`}>
              <Sofa className="w-3 h-3 shrink-0" />
              <span>Meublé</span>
            </span>
          )}

          {/* 4. Vérifié */}
          {isVerified && (
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm shadow-sm ${
              isDark ? 'bg-emerald-900/80 text-emerald-200' : 'bg-emerald-100/90 text-emerald-700'
            }`}>
              <BadgeCheck className="w-3 h-3" />
              <span>{t("card.verified") || "Vérifié"}</span>
            </span>
          )}

          {/* 5. Agent/Agence */}
          {agentBadge && (
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm shadow-sm ${agentBadge.color}`}>
              {agentBadge.icon}
              <span>{agentBadge.label}</span>
            </span>
          )}

          {/* 6. Trust Score */}
          {ownerTrustScore !== undefined && ownerTrustScore >= 60 && (
            <span className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm shadow-sm ${
              isDark ? 'bg-teal-900/80 text-teal-200' : 'bg-teal-100/90 text-teal-700'
            }`}>
              <Star className="w-3 h-3 fill-current" />
              <span>{ownerTrustScore}%</span>
            </span>
          )}
        </div>

        {/* Like Button */}
        <button
          onClick={toggleFavorite}
          disabled={isLoading}
          className={`absolute top-3 right-3 w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors disabled:opacity-50 shadow-sm ${
            isDark ? 'bg-gray-800/90 hover:bg-gray-700' : 'bg-white/90 hover:bg-white'
          }`}
        >
          <Heart
            className={`w-5 h-5 transition-colors ${
              isLiked 
                ? "fill-rose-500 text-rose-500" 
                : isDark ? "text-gray-400" : "text-gray-600"
            }`}
          />
        </button>

        {/* Price Badge - CORRIGÉ : style adapté au mode sombre */}
        <div className={`absolute bottom-3 left-3 px-3 py-1.5 rounded-lg backdrop-blur-sm shadow-lg ${
          isDark ? 'bg-gray-900/95' : 'bg-white/95'
        }`}>
          <span className={`text-base font-bold ${isDark ? 'text-white' : 'text-foreground'}`}>
            {priceFormatted} FCFA
          </span>
          {unitLabel && (
            <span className={`text-xs font-medium ml-0.5 ${isDark ? 'text-gray-300' : 'text-muted-foreground'}`}>
              {unitLabel}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-grow">
        {/* Title & Location */}
        <div className="mb-3">
          <h3 className={`font-semibold mb-1 line-clamp-1 group-hover:text-primary transition-colors text-base ${
            isDark ? 'text-white' : 'text-foreground'
          }`}>
            {title}
          </h3>
          <div className={`flex items-center gap-1.5 text-sm ${isDark ? 'text-gray-400' : 'text-muted-foreground'}`}>
            <MapPin className="w-3.5 h-3.5 shrink-0 text-primary/70" />
            <span className="line-clamp-1">{location}</span>
          </div>
        </div>

        {/* Features Grid - CORRIGÉ */}
        {features.length > 0 && (
          <div className={`grid grid-cols-2 gap-y-2 gap-x-3 text-xs mb-4 p-2.5 rounded-lg ${
            isDark ? 'bg-gray-800/50' : 'bg-muted/30'
          }`}>
            {features.map((feature, index) => (
              <div key={index} className={`flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-muted-foreground'}`}>
                <span className="text-primary/60">{feature.icon}</span>
                <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-foreground'}`}>
                  {feature.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
      <div className={`mt-auto pt-3 border-t flex items-center justify-between ${
      isDark ? 'border-gray-800' : 'border-border'
      }`}>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            {realRating && realRating.count > 0 ? (
              <>
                <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-foreground'}`}>
                  {realRating.avg.toFixed(1)}
                </span>
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-muted-foreground'}`}>
                  ({realRating.count})
                </span>
              </>
            ) : (
              <span className={`text-xs italic ${isDark ? 'text-gray-400' : 'text-muted-foreground'}`}>
                Avis
              </span>
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