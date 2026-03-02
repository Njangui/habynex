import { useState, useEffect, useCallback } from "react";
import { MapPin, Search, Loader2, Navigation } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PropertyLocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  address: string;
  city: string;
  neighborhood: string;
  onLocationChange: (data: {
    latitude: number | null;
    longitude: number | null;
    address: string;
    city: string;
    neighborhood: string;
  }) => void;
}

const CAMEROON_CITIES = [
  "Yaoundé",
  "Douala",
  "Garoua",
  "Bamenda",
  "Maroua",
  "Bafoussam",
  "Ngaoundéré",
  "Bertoua",
  "Kribi",
  "Limbé",
];

const PropertyLocationPicker = ({
  latitude,
  longitude,
  address,
  city,
  neighborhood,
  onLocationChange,
}: PropertyLocationPickerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const searchAddress = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const query = `${searchQuery}, Cameroon`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
      );
      const data = await response.json();

      if (data.length > 0) {
        const result = data[0];
        const displayParts = result.display_name.split(", ");
        const detectedCity = CAMEROON_CITIES.find((c) =>
          result.display_name.toLowerCase().includes(c.toLowerCase())
        ) || city;

        onLocationChange({
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          address: displayParts.slice(0, 2).join(", "),
          city: detectedCity,
          neighborhood: displayParts[0] || neighborhood,
        });
        toast.success("Adresse trouvée !");
      } else {
        toast.error("Adresse non trouvée. Essayez une recherche plus précise.");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Erreur lors de la recherche d'adresse.");
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, city, neighborhood, onLocationChange]);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await response.json();

          const detectedCity = CAMEROON_CITIES.find((c) =>
            data.display_name.toLowerCase().includes(c.toLowerCase())
          ) || "";

          onLocationChange({
            latitude: lat,
            longitude: lng,
            address: data.address?.road || data.display_name.split(",")[0] || "",
            city: detectedCity,
            neighborhood: data.address?.suburb || data.address?.neighbourhood || "",
          });
          toast.success("Position actuelle récupérée !");
        } catch (error) {
          console.error("Reverse geocoding error:", error);
          onLocationChange({
            latitude: lat,
            longitude: lng,
            address,
            city,
            neighborhood,
          });
        }
        setIsLocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Impossible d'obtenir votre position.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  }, [address, city, neighborhood, onLocationChange]);

  const mapUrl = latitude && longitude
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01},${latitude - 0.01},${longitude + 0.01},${latitude + 0.01}&layer=mapnik&marker=${latitude},${longitude}`
    : null;

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchAddress()}
            placeholder="Rechercher une adresse..."
            className="pl-10"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={searchAddress}
          disabled={isSearching}
        >
          {isSearching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Rechercher"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={getCurrentLocation}
          disabled={isLocating}
          title="Utiliser ma position"
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-border h-[300px] bg-muted">
        {mapUrl ? (
          <iframe
            src={mapUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            title="Carte de localisation"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
            <MapPin className="w-10 h-10 mb-2" />
            <p>Recherchez une adresse ou utilisez votre position</p>
          </div>
        )}
      </div>

      {/* Location Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Ville *
          </label>
          <select
            value={city}
            onChange={(e) =>
              onLocationChange({ latitude, longitude, address, city: e.target.value, neighborhood })
            }
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground"
          >
            <option value="">Sélectionnez une ville</option>
            {CAMEROON_CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Quartier
          </label>
          <Input
            value={neighborhood}
            onChange={(e) =>
              onLocationChange({ latitude, longitude, address, city, neighborhood: e.target.value })
            }
            placeholder="Ex: Bastos, Bonapriso..."
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          Adresse complète
        </label>
        <Input
          value={address}
          onChange={(e) =>
            onLocationChange({ latitude, longitude, address: e.target.value, city, neighborhood })
          }
          placeholder="Numéro et nom de rue..."
        />
      </div>

      {latitude && longitude && (
        <p className="text-sm text-muted-foreground">
          📍 Coordonnées : {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </p>
      )}
    </div>
  );
};

export default PropertyLocationPicker;
