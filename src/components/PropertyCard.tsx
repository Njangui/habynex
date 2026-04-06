import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  MapPin, 
  Bed, 
  Bath, 
  Maximize, 
  Heart, 
  Share2, 
  Phone,
  MessageCircle,
  BadgeCheck,
  Calendar,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface PropertyCardProps {
  property?: {
    id: string;
    title: string;
    price: number;
    location: string;
    city?: string;
    neighborhood?: string;
    images?: string[] | null;
    bedrooms?: number;
    bathrooms?: number;
    area?: number;
    is_furnished?: boolean;
    is_available?: boolean;
    created_at: string;
    owner_id: string;
    owner_profile?: {
      full_name: string | null;
      avatar_url: string | null;
      is_verified?: boolean;
      role?: string;
    };
    category?: string;
    rating?: number;
    review_count?: number;
    type?: "rent" | "sale" | "short_stay" | "shared";
    property_type?: string;
    listing_type?: string;
    kitchens?: number;
    living_rooms?: number;
    dining_rooms?: number;
    floor?: number;
  };
  variant?: "default" | "compact" | "featured";
  onFavorite?: (id: string) => void;
  isFavorite?: boolean;
}

export const PropertyCard = ({ 
  property, 
  variant = "default",
  onFavorite,
  isFavorite = false
}: PropertyCardProps) => {
  const { language } = useLanguage();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Vérification de sécurité si property est undefined
  if (!property) {
    console.warn("PropertyCard: property is undefined");
    return null;
  }

  // Vérification des propriétés requises
  if (!property.id) {
    console.warn("PropertyCard: property.id is missing", property);
    return null;
  }

  // Classes dynamiques utilisant le système de design existant
  const themeClasses = {
    card: "bg-card border-border hover:border-primary/50",
    text: "text-foreground",
    textMuted: "text-muted-foreground",
    badge: "bg-secondary text-secondary-foreground",
    price: "text-primary",
  };

  // Sécurisation des images avec valeur par défaut
  const images = Array.isArray(property.images) ? property.images : [];
  const hasMultipleImages = images.length > 1;

  const fullLocation = [
    property.neighborhood,
    property.city || property.location
  ].filter(Boolean).join(", ");

  const formatPrice = (price: number) => {
    const safePrice = typeof price === "number" && !isNaN(price) ? price : 0;
    const formatted = new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en-US", {
      maximumFractionDigits: 0
    }).format(safePrice);
    return `${formatted} FCFA`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) return language === "fr" ? "Aujourd'hui" : "Today";
      if (diffDays <= 7) return language === "fr" ? "Cette semaine" : "This week";
      if (diffDays <= 30) return language === "fr" ? "Ce mois" : "This month";
      return date.toLocaleDateString(language === "fr" ? "fr-FR" : "en-US");
    } catch (e) {
      return "";
    }
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (images.length > 0) {
      setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    }
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (images.length > 0) {
      setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    }
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (property.id && onFavorite) {
      onFavorite(property.id);
    }
  };

  // Récupération sécurisée du titre
  const title = property.title || (language === "fr" ? "Sans titre" : "Untitled");
  
  // Récupération sécurisée du prix
  const price = typeof property.price === "number" ? property.price : 0;

  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4 }}
        className={cn(
          "group relative rounded-xl overflow-hidden border transition-all duration-300",
          "hover:shadow-lg",
          themeClasses.card
        )}
      >
        <Link to={`/property/${property.id}`} className="flex gap-4 p-3">
          {/* Image */}
          <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
            {images.length > 0 && images[0] ? (
              <img
                src={images[0]}
                alt={title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <MapPin className="w-8 h-8 text-primary" />
              </div>
            )}
            <div className="absolute top-1 left-1">
              <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5">
                {formatPrice(price)}
              </Badge>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className={cn("font-semibold text-sm truncate mb-1", themeClasses.text)}>
              {title}
            </h3>
            <p className={cn("text-xs truncate mb-2", themeClasses.textMuted)}>
              <MapPin className="w-3 h-3 inline mr-1" />
              {fullLocation || (language === "fr" ? "Localisation inconnue" : "Unknown location")}
            </p>
            <div className="flex items-center gap-3 text-xs">
              {typeof property.bedrooms === "number" && property.bedrooms > 0 && (
                <span className={cn("flex items-center gap-1", themeClasses.textMuted)}>
                  <Bed className="w-3 h-3" />
                  {property.bedrooms}
                </span>
              )}
              {typeof property.bathrooms === "number" && property.bathrooms > 0 && (
                <span className={cn("flex items-center gap-1", themeClasses.textMuted)}>
                  <Bath className="w-3 h-3" />
                  {property.bathrooms}
                </span>
              )}
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  if (variant === "featured") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ y: -8 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className={cn(
          "group relative rounded-2xl overflow-hidden border-2 transition-all duration-500",
          "hover:shadow-2xl",
          themeClasses.card,
          "border-transparent hover:border-primary/50"
        )}
      >
        <Link to={`/property/${property.id}`} className="block">
          {/* Image Gallery */}
          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
            {images.length > 0 ? (
              <>
                <motion.img
                  key={currentImageIndex}
                  src={images[currentImageIndex]}
                  alt={title}
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '';
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Navigation Arrows */}
                {hasMultipleImages && isHovered && (
                  <>
                    <button
                      onClick={handlePrevImage}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-all"
                    >
                      ‹
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-all"
                    >
                      ›
                    </button>
                  </>
                )}

                {/* Image Indicators */}
                {hasMultipleImages && (
                  <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "w-2 h-2 rounded-full transition-all",
                          idx === currentImageIndex ? "bg-white w-6" : "bg-white/50"
                        )}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <MapPin className="w-16 h-16 text-primary" />
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {property.is_available !== false && (
                <Badge className="bg-green-500 text-white border-0 shadow-lg">
                  {language === "fr" ? "Disponible" : "Available"}
                </Badge>
              )}
              {property.is_furnished && (
                <Badge className={cn("border-0 shadow-lg", themeClasses.badge)}>
                  {language === "fr" ? "Meublé" : "Furnished"}
                </Badge>
              )}
              {property.category && (
                <Badge className="bg-primary text-primary-foreground border-0 shadow-lg">
                  {property.category}
                </Badge>
              )}
              {property.owner_profile?.role === "agent" && (
                <Badge className="bg-blue-500 text-white border-0 shadow-lg">
                  Habynex Agent
                </Badge>
              )}
              {property.owner_profile?.role === "agency" && (
                <Badge className="bg-indigo-500 text-white border-0 shadow-lg">
                  Habynex Agency
                </Badge>
              )}
              {property.owner_profile?.role === "owner" && (
                <Badge className="bg-gray-500 text-white border-0 shadow-lg">
                  Propriétaire
                </Badge>
              )}
              {property.type && (
                <>
                  {property.type === "rent" && (
                    <Badge className="bg-green-500 text-white border-0 shadow-lg">
                      {language === "fr" ? "À louer" : "For Rent"}
                    </Badge>
                  )}
                  {property.type === "sale" && (
                    <Badge className="bg-blue-500 text-white border-0 shadow-lg">
                      {language === "fr" ? "À vendre" : "For Sale"}
                    </Badge>
                  )}
                  {property.type === "short_stay" && (
                    <Badge className="bg-orange-500 text-white border-0 shadow-lg">
                      {language === "fr" ? "Court séjour" : "Short Stay"}
                    </Badge>
                  )}
                  {property.type === "shared" && (
                    <Badge className="bg-purple-500 text-white border-0 shadow-lg">
                      {language === "fr" ? "Colocation" : "Shared"}
                    </Badge>
                  )}
                </>
              )}
              {property.property_type && (
                <Badge className="bg-purple-500 text-white border-0 shadow-lg">
                  {property.property_type === "apartment" && (language === "fr" ? "Appartement" : "Apartment")}
                  {property.property_type === "house" && (language === "fr" ? "Maison" : "House")}
                  {property.property_type === "villa" && (language === "fr" ? "Villa" : "Villa")}
                  {property.property_type === "studio" && (language === "fr" ? "Studio" : "Studio")}
                  {property.property_type === "duplex" && (language === "fr" ? "Duplex" : "Duplex")}
                  {property.property_type === "commercial" && (language === "fr" ? "Commercial" : "Commercial")}
                  {property.property_type === "land" && (language === "fr" ? "Terrain" : "Land")}
                  {!["apartment", "house", "villa", "studio", "duplex", "commercial", "land"].includes(property.property_type) && property.property_type}
                </Badge>
              )}
              {property.listing_type && (
                <>
                  {property.listing_type === "rent" && (
                    <Badge className="bg-blue-500 text-white border-0 shadow-lg">
                      {language === "fr" ? "Location" : "Rent"}
                    </Badge>
                  )}
                  {property.listing_type === "sale" && (
                    <Badge className="bg-green-500 text-white border-0 shadow-lg">
                      {language === "fr" ? "Vente" : "Sale"}
                    </Badge>
                  )}
                  {property.listing_type === "colocation" && (
                    <Badge className="bg-pink-500 text-white border-0 shadow-lg">
                      {language === "fr" ? "Colocation" : "Shared"}
                    </Badge>
                  )}
                  {property.listing_type === "short_term" && (
                    <Badge className="bg-orange-500 text-white border-0 shadow-lg">
                      {language === "fr" ? "Court séjour" : "Short Stay"}
                    </Badge>
                  )}
                </>
              )}
            </div>

            {/* Favorite & Share */}
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={handleFavorite}
                className={cn(
                  "w-10 h-10 rounded-full backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110",
                  isFavorite 
                    ? "bg-red-500 text-white" 
                    : "bg-white/20 text-white hover:bg-white/30"
                )}
              >
                <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
              </button>
              <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-all hover:scale-110">
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            {/* Price Tag */}
            <div className="absolute bottom-4 left-4">
              <div className="bg-card rounded-xl px-4 py-2 shadow-xl">
                <p className={cn("text-2xl font-bold", themeClasses.price)}>
                  {formatPrice(price)}
                </p>
                <p className={cn("text-xs", themeClasses.textMuted)}>
                  {language === "fr" ? "/mois" : "/month"}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <h3 className={cn("text-xl font-bold mb-2 line-clamp-1", themeClasses.text)}>
                  {title}
                </h3>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                  <p className={cn("text-sm truncate", themeClasses.textMuted)}>
                    {fullLocation || (language === "fr" ? "Localisation inconnue" : "Unknown location")}
                  </p>
                </div>
              </div>
              {typeof property.rating === "number" && property.rating > 0 && (
                <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded-lg flex-shrink-0">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                    {property.rating.toFixed(1)}
                  </span>
                  {typeof property.review_count === "number" && property.review_count > 0 && (
                    <span className={cn("text-xs", themeClasses.textMuted)}>
                      ({property.review_count})
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Features */}
            <div className="flex items-center gap-4 py-4 border-y border-dashed border-border mb-4">
              {typeof property.bedrooms === "number" && property.bedrooms > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Bed className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className={cn("text-sm font-semibold", themeClasses.text)}>
                      {property.bedrooms}
                    </p>
                    <p className={cn("text-xs", themeClasses.textMuted)}>
                      {language === "fr" ? "Chambres" : "Bedrooms"}
                    </p>
                  </div>
                </div>
              )}
              {typeof property.bathrooms === "number" && property.bathrooms > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Bath className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className={cn("text-sm font-semibold", themeClasses.text)}>
                      {property.bathrooms}
                    </p>
                    <p className={cn("text-xs", themeClasses.textMuted)}>
                      {language === "fr" ? "Salles de bain" : "Bathrooms"}
                    </p>
                  </div>
                </div>
              )}
              {typeof property.area === "number" && property.area > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                    <Maximize className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <p className={cn("text-sm font-semibold", themeClasses.text)}>
                      {property.area}m²
                    </p>
                    <p className={cn("text-xs", themeClasses.textMuted)}>
                      {language === "fr" ? "Surface" : "Area"}
                    </p>
                  </div>
                </div>
              )}
              {typeof property.living_rooms === "number" && property.living_rooms > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <span className="text-lg">🛋️</span>
                  </div>
                  <div>
                    <p className={cn("text-sm font-semibold", themeClasses.text)}>
                      {property.living_rooms}
                    </p>
                    <p className={cn("text-xs", themeClasses.textMuted)}>
                      {language === "fr" ? "Salon" : "Living Room"}
                    </p>
                  </div>
                </div>
              )}
              {typeof property.kitchens === "number" && property.kitchens > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <span className="text-lg">🍳</span>
                  </div>
                  <div>
                    <p className={cn("text-sm font-semibold", themeClasses.text)}>
                      {property.kitchens}
                    </p>
                    <p className={cn("text-xs", themeClasses.textMuted)}>
                      {language === "fr" ? "Cuisine" : "Kitchen"}
                    </p>
                  </div>
                </div>
              )}
              {typeof property.floor === "number" && property.floor > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <span className="text-lg">🏢</span>
                  </div>
                  <div>
                    <p className={cn("text-sm font-semibold", themeClasses.text)}>
                      {property.floor}
                    </p>
                    <p className={cn("text-xs", themeClasses.textMuted)}>
                      {language === "fr" ? "Étage" : "Floor"}
                    </p>
                  </div>
                </div>
              )}
              {typeof property.dining_rooms === "number" && property.dining_rooms > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <span className="text-lg">🍽️</span>
                  </div>
                  <div>
                    <p className={cn("text-sm font-semibold", themeClasses.text)}>
                      {property.dining_rooms}
                    </p>
                    <p className={cn("text-xs", themeClasses.textMuted)}>
                      {language === "fr" ? "Salle à manger" : "Dining Room"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Owner & Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-gold p-[2px]">
                    <div className="w-full h-full rounded-full overflow-hidden bg-muted flex items-center justify-center">
                      {property.owner_profile?.avatar_url ? (
                        <img
                          src={property.owner_profile.avatar_url}
                          alt={property.owner_profile.full_name || ""}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-lg font-bold text-muted-foreground">
                          {property.owner_profile?.full_name?.charAt(0) || "U"}
                        </span>
                      )}
                    </div>
                  </div>
                  {property.owner_profile?.is_verified && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-success flex items-center justify-center border-2 border-card">
                      <BadgeCheck className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className={cn("text-sm font-semibold truncate", themeClasses.text)}>
                    {property.owner_profile?.full_name || (language === "fr" ? "Propriétaire" : "Owner")}
                  </p>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-primary flex-shrink-0" />
                    <p className={cn("text-xs", themeClasses.textMuted)}>
                      {formatDate(property.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(
                    "rounded-full border-primary/20 hover:bg-primary/10",
                    themeClasses.text
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                  }}
                >
                  <Phone className="w-4 h-4 mr-1 text-primary" />
                  <span className="hidden sm:inline">{language === "fr" ? "Appeler" : "Call"}</span>
                </Button>
                <Button
                  size="sm"
                  className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all"
                  onClick={(e) => {
                    e.preventDefault();
                  }}
                >
                  <MessageCircle className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">{language === "fr" ? "Message" : "Message"}</span>
                </Button>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className={cn(
        "group relative rounded-xl overflow-hidden border transition-all duration-300",
        "hover:shadow-lg",
        themeClasses.card
      )}
    >
      <Link to={`/property/${property.id}`} className="block">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {images.length > 0 && images[0] ? (
            <img
              src={images[0]}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <MapPin className="w-12 h-12 text-primary" />
            </div>
          )}
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            {property.is_available !== false && (
              <Badge className="bg-green-500 text-white border-0">
                {language === "fr" ? "Dispo" : "Available"}
              </Badge>
            )}
            {property.is_furnished && (
              <Badge className={cn("border-0", themeClasses.badge)}>
                {language === "fr" ? "Meublé" : "Furnished"}
              </Badge>
            )}
          </div>

          {/* Favorite */}
          <button
            onClick={handleFavorite}
            className={cn(
              "absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110",
              isFavorite 
                ? "bg-red-500 text-white" 
                : "bg-background/90 text-foreground hover:bg-background"
            )}
          >
            <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
          </button>

          {/* Price */}
          <div className="absolute bottom-3 left-3">
            <Badge className="bg-card text-primary font-bold text-lg border-0 shadow-lg">
              {formatPrice(price)}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className={cn("font-semibold mb-2 line-clamp-1", themeClasses.text)}>
            {title}
          </h3>
          
          <div className="flex items-center gap-1 mb-3">
            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
            <p className={cn("text-sm truncate", themeClasses.textMuted)}>
              {fullLocation || (language === "fr" ? "Localisation inconnue" : "Unknown location")}
            </p>
          </div>

          {/* Features */}
          <div className="flex items-center gap-3 text-sm">
            {typeof property.bedrooms === "number" && property.bedrooms > 0 && (
              <span className={cn("flex items-center gap-1", themeClasses.textMuted)}>
                <Bed className="w-4 h-4" />
                {property.bedrooms}
              </span>
            )}
            {typeof property.bathrooms === "number" && property.bathrooms > 0 && (
              <span className={cn("flex items-center gap-1", themeClasses.textMuted)}>
                <Bath className="w-4 h-4" />
                {property.bathrooms}
              </span>
            )}
            {typeof property.area === "number" && property.area > 0 && (
              <span className={cn("flex items-center gap-1", themeClasses.textMuted)}>
                <Maximize className="w-4 h-4" />
                {property.area}m²
              </span>
            )}
            {typeof property.kitchens === "number" && property.kitchens > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  🍳
                </div>
                <div>
                  <p className={cn("text-sm font-semibold", themeClasses.text)}>
                    {property.kitchens}
                  </p>
                  <p className={cn("text-xs", themeClasses.textMuted)}>
                    {language === "fr" ? "Cuisine" : "Kitchen"}
                  </p>
                </div>
              </div>
            )}
            {typeof property.living_rooms === "number" && property.living_rooms > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  🛋️
                </div>
                <div>
                  <p className={cn("text-sm font-semibold", themeClasses.text)}>
                    {property.living_rooms}
                  </p>
                  <p className={cn("text-xs", themeClasses.textMuted)}>
                    {language === "fr" ? "Salon" : "Living Room"}
                  </p>
                </div>
              </div>
            )}
            {typeof property.dining_rooms === "number" && property.dining_rooms > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                  🍽️
                </div>
                <div>
                  <p className={cn("text-sm font-semibold", themeClasses.text)}>
                    {property.dining_rooms}
                  </p>
                  <p className={cn("text-xs", themeClasses.textMuted)}>
                    {language === "fr" ? "Salle à manger" : "Dining Room"}
                  </p>
                </div>
              </div>
            )}
            {typeof property.floor === "number" && property.floor > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  🏢
                </div>
                <div>
                  <p className={cn("text-sm font-semibold", themeClasses.text)}>
                    {property.floor}
                  </p>
                  <p className={cn("text-xs", themeClasses.textMuted)}>
                    {language === "fr" ? "Étage" : "Floor"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-gold flex items-center justify-center text-primary-foreground text-sm font-semibold">
                {property.owner_profile?.full_name?.charAt(0) || "U"}
              </div>
              <span className={cn("text-xs", themeClasses.textMuted)}>
                {formatDate(property.created_at)}
              </span>
            </div>
            {typeof property.rating === "number" && property.rating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className={cn("text-sm font-medium", themeClasses.text)}>
                  {property.rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default PropertyCard;
