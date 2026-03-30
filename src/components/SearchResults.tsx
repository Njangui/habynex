import { Loader2, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import PropertyCard from "@/components/PropertyCard";

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

// Fonction de formatage des prix
const formatPrice = (price: number) => {
  const safePrice = typeof price === "number" && !isNaN(price) ? price : 0;
  const formatted = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(safePrice);
  return `${formatted} FCFA`;
};

const SearchResults = ({
  properties,
  loading,
  totalCount,
  currentPage = 0,
  totalPages = 1,
  onPageChange,
}: SearchResultsProps) => {
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Empty state
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

  // Rendu principal
  return (
    <div>
      {/* En-tête avec nombre de résultats et page actuelle */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">{totalCount}</span>{" "}
          bien{totalCount > 1 ? "s" : ""} trouvé{totalCount > 1 ? "s" : ""}
        </p>
        {totalPages > 1 && (
          <p className="text-sm text-muted-foreground">
            Page {currentPage + 1} sur {totalPages}
          </p>
        )}
      </div>

      {/* Grid de PropertyCard */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {properties.map((property) => (
          <PropertyCard
            key={property.id}
            property={{
              ...property,
              priceFormatted: formatPrice(property.price),
            }}
          />
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

export default SearchResults;