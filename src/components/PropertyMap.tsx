import { MapPin } from "lucide-react";

interface PropertyMapProps {
  latitude?: number;
  longitude?: number;
  address?: string;
  city: string;
  neighborhood?: string;
}

const PropertyMap = ({ latitude, longitude, address, city, neighborhood }: PropertyMapProps) => {
  // Use OpenStreetMap embed as a fallback (no API key required)
  const hasCoordinates = latitude != null && longitude != null;
  
  // Amélioration de l'URL de la carte pour un meilleur rendu
  const mapUrl = hasCoordinates
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.008}%2C${latitude - 0.008}%2C${longitude + 0.008}%2C${latitude + 0.008}&layer=mapnik&marker=${latitude}%2C${longitude}&zoom=16`
    : `https://www.openstreetmap.org/export/embed.html?bbox=8.5%2C3.5%2C12.5%2C5.5&layer=mapnik&zoom=8`;

  const fullLocation = [neighborhood, city].filter(Boolean).join(", ");

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-border bg-card">
      {/* Map Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">Localisation</h3>
            <p className="text-sm text-muted-foreground truncate">
              {fullLocation || "Localisation non spécifiée"}
            </p>
          </div>
        </div>
        {address && (
          <p className="mt-2 text-sm text-muted-foreground break-words">{address}</p>
        )}
      </div>

      {/* Map Container - Correction de la hauteur */}
      <div className="w-full relative bg-gray-100 dark:bg-gray-800">
        {hasCoordinates ? (
          <div className="w-full aspect-video">
            <iframe
              src={mapUrl}
              className="w-full h-full border-0"
              title={`Carte de localisation - ${fullLocation}`}
              loading="lazy"
              style={{ display: 'block' }}
            />
          </div>
        ) : (
          <div className="w-full aspect-video flex items-center justify-center">
            <div className="text-center p-8">
              <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">
                Localisation : {fullLocation || "Non spécifiée"}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Coordonnées exactes non disponibles
              </p>
              {city && (
                <p className="text-xs text-muted-foreground mt-3">
                  Ville : {city}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyMap;