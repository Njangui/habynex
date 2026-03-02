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
  const hasCoordinates = latitude && longitude;
  
  const mapUrl = hasCoordinates
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01}%2C${latitude - 0.01}%2C${longitude + 0.01}%2C${latitude + 0.01}&layer=mapnik&marker=${latitude}%2C${longitude}`
    : `https://www.openstreetmap.org/export/embed.html?bbox=9.6%2C3.7%2C11.6%2C5.0&layer=mapnik`;

  const fullLocation = [neighborhood, city].filter(Boolean).join(", ");

  return (
    <div className="rounded-2xl overflow-hidden border border-border">
      {/* Map Header */}
      <div className="p-4 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold text-foreground">Localisation</h3>
            <p className="text-sm text-muted-foreground">{fullLocation}</p>
          </div>
        </div>
        {address && (
          <p className="mt-2 text-sm text-muted-foreground">{address}</p>
        )}
      </div>

      {/* Map Embed */}
      <div className="aspect-[16/9] bg-secondary">
        {hasCoordinates ? (
          <iframe
            src={mapUrl}
            className="w-full h-full border-0"
            title="Carte de localisation"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">
                Localisation : {fullLocation}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Coordonnées exactes non disponibles
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyMap;
