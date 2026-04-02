import { MapPin } from "lucide-react";

interface PropertyMapProps {
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  city: string;
  neighborhood?: string;
}

const PropertyMap = ({ latitude, longitude, address, city, neighborhood }: PropertyMapProps) => {
  const hasCoordinates = latitude && longitude;
  
  // Construire l'URL de la carte avec les coordonnées si disponibles
  const mapUrl = hasCoordinates
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01}%2C${latitude - 0.01}%2C${longitude + 0.01}%2C${latitude + 0.01}&layer=mapnik&marker=${latitude}%2C${longitude}`
    : `https://www.openstreetmap.org/export/embed.html?bbox=11.45%2C3.80%2C11.65%2C3.90&layer=mapnik`;

  const fullLocation = [neighborhood, city].filter(Boolean).join(", ");

  return (
    <div className="h-full flex flex-col rounded-2xl overflow-hidden border border-border">
      {/* Map Header */}
      <div className="p-4 bg-card border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary shrink-0" />
          <div>
            <h3 className="font-semibold text-foreground">Localisation</h3>
            <p className="text-sm text-muted-foreground">
              {fullLocation || "Localisation non spécifiée"}
            </p>
          </div>
        </div>
        {address && (
          <p className="mt-2 text-sm text-muted-foreground">{address}</p>
        )}
      </div>

      {/* Map Embed - Prend toute la hauteur restante */}
      <div className="flex-1 min-h-0 bg-secondary relative">
        {hasCoordinates ? (
          <>
            <iframe
              src={mapUrl}
              className="w-full h-full border-0"
              title="Carte de localisation"
              loading="lazy"
            />
            {/* Affichage des coordonnées en petit en bas à droite */}
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md font-mono">
              📍 {latitude?.toFixed(6)}, {longitude?.toFixed(6)}
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center p-4">
              <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground font-medium">
                Localisation : {fullLocation || "Non spécifiée"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {!fullLocation && "Aucune localisation renseignée"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyMap;
