import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Heart, MapPin, Bed, Bath, Square, Star, Check, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Property {
  id: string;
  title: string;
  city: string;
  neighborhood: string | null;
  price: number;
  price_unit: string;
  images: string[] | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  is_verified: boolean | null;
  property_type: string;
}

interface SearchResultsProps {
  properties: Property[];
  loading: boolean;
  totalCount: number;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

const SearchResults = ({ 
  properties, 
  loading, 
  totalCount,
  currentPage = 0,
  totalPages = 1,
  onPageChange
}: SearchResultsProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-secondary flex items-center justify-center">
          <MapPin className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Aucun résultat trouvé
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Essayez de modifier vos critères de recherche pour trouver plus de biens.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">{totalCount}</span> bien{totalCount > 1 ? "s" : ""} trouvé{totalCount > 1 ? "s" : ""}
        </p>
        {totalPages > 1 && (
          <p className="text-sm text-muted-foreground">
            Page {currentPage + 1} sur {totalPages}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {properties.map((property, index) => (
          <PropertySearchCard key={property.id} property={property} index={index} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 0}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Précédent
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i;
              } else if (currentPage < 3) {
                pageNum = i;
              } else if (currentPage > totalPages - 4) {
                pageNum = totalPages - 5 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(pageNum)}
                  className="w-10"
                >
                  {pageNum + 1}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
            className="gap-1"
          >
            Suivant
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

const PropertySearchCard = ({ property, index }: { property: Property; index: number }) => {
  const [isLiked, setIsLiked] = useState(false);
  
  const image = property.images?.[0] || "/placeholder.svg";
  const location = property.neighborhood 
    ? `${property.neighborhood}, ${property.city}`
    : property.city;

  const propertyTypeLabels: Record<string, string> = {
    studio: "Studio",
    apartment: "Appartement",
    house: "Maison",
    room: "Chambre",
    villa: "Villa",
    duplex: "Duplex",
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="group bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-elegant transition-all duration-300 border border-border/50"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={image}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Overlay Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-card/90 backdrop-blur-sm text-foreground">
            {propertyTypeLabels[property.property_type] || property.property_type}
          </span>
          {property.is_verified && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-accent/90 backdrop-blur-sm text-accent-foreground flex items-center gap-1">
              <Check className="w-3 h-3" />
              Vérifié
            </span>
          )}
        </div>

        {/* Like Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            setIsLiked(!isLiked);
          }}
          className="absolute top-3 right-3 w-10 h-10 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"
        >
          <Heart
            className={`w-5 h-5 transition-colors ${
              isLiked ? "fill-primary text-primary" : "text-muted-foreground"
            }`}
          />
        </button>

        {/* Price Badge */}
        <div className="absolute bottom-3 left-3 px-4 py-2 rounded-xl bg-card/95 backdrop-blur-sm">
          <span className="text-lg font-bold text-foreground">
            {property.price.toLocaleString('fr-FR')} FCFA
          </span>
          <span className="text-sm text-muted-foreground">/{property.price_unit}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title & Location */}
        <h3 className="font-semibold text-foreground mb-1 line-clamp-1 group-hover:text-primary transition-colors">
          {property.title}
        </h3>
        <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
          <MapPin className="w-4 h-4 shrink-0" />
          <span className="line-clamp-1">{location}</span>
        </div>

        {/* Features */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          {property.bedrooms != null && (
            <div className="flex items-center gap-1">
              <Bed className="w-4 h-4" />
              <span>{property.bedrooms}</span>
            </div>
          )}
          {property.bathrooms != null && (
            <div className="flex items-center gap-1">
              <Bath className="w-4 h-4" />
              <span>{property.bathrooms}</span>
            </div>
          )}
          {property.area != null && (
            <div className="flex items-center gap-1">
              <Square className="w-4 h-4" />
              <span>{property.area} m²</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-gold text-gold" />
            <span className="font-medium text-foreground">4.5</span>
            <span className="text-muted-foreground text-sm">(nouveau)</span>
          </div>
          <Link 
            to={`/property/${property.id}`} 
            className="text-primary text-sm font-medium hover:underline"
          >
            Voir détails
          </Link>
        </div>
      </div>
    </motion.article>
  );
};

export default SearchResults;
