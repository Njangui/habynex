import { useState, useCallback, useEffect } from "react";
import { MapPin, Crosshair, Search, AlertCircle, Loader2 } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Correction des icônes Leaflet
try {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
} catch (e) {
  console.error("[PropertyMap] Erreur initialisation Leaflet:", e);
}

interface PropertyMapSelectorProps {
  latitude?: number;
  longitude?: number;
  address?: string;
  city: string;
  neighborhood?: string;
  onLocationSelect?: (lat: number, lng: number, address?: string, city?: string, neighborhood?: string) => void;
  readOnly?: boolean;
}

// Composant pour gérer les clics sur la carte
const LocationMarker = ({
  position,
  onPositionChange,
  onError,
}: {
  position: [number, number] | null;
  onPositionChange: (lat: number, lng: number) => void;
  onError: (msg: string) => void;
}) => {
  try {
    const map = useMapEvents({
      click(e) {
        console.log("[PropertyMap] Clic carte:", e.latlng);
        onPositionChange(e.latlng.lat, e.latlng.lng);
      },
    });

    return position ? <Marker position={position} /> : null;
  } catch (e: any) {
    console.error("[PropertyMap] Erreur LocationMarker:", e);
    onError(`LocationMarker: ${e.message}`);
    return null;
  }
};

const PropertyMap = ({
  latitude,
  longitude,
  address,
  city,
  neighborhood,
  onLocationSelect,
  readOnly = false,
}: PropertyMapSelectorProps) => {
  // États avec logging
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(() => {
    const initial = latitude && longitude ? [latitude, longitude] as [number, number] : null;
    console.log("[PropertyMap] Initialisation position:", initial);
    return initial;
  });
  
  const [isSearching, setIsSearching] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [debugInfo, setDebugInfo] = useState<any>({});
  
  // États pour les champs de saisie - initialisés avec les props
  const [inputCity, setInputCity] = useState(city || "");
  const [inputNeighborhood, setInputNeighborhood] = useState(neighborhood || "");
  const [inputLat, setInputLat] = useState(latitude?.toString() || "");
  const [inputLng, setInputLng] = useState(longitude?.toString() || "");

  const defaultPosition: [number, number] = [3.848, 11.502]; // Yaoundé

  const addError = useCallback((msg: string, details?: any) => {
    console.error(`[PropertyMap] ${msg}`, details);
    setErrors(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
    if (details) {
      setDebugInfo(prev => ({ ...prev, [msg]: details }));
    }
  }, []);

  const clearErrors = () => {
    setErrors([]);
    setDebugInfo({});
  };

  // Géocodage inverse avec gestion d'erreur détaillée
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    console.log("[PropertyMap] Début géocodage inverse:", { lat, lng });
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      console.log("[PropertyMap] URL Nominatim:", url);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept-Language': 'fr',
        },
      });
      
      clearTimeout(timeoutId);

      console.log("[PropertyMap] Réponse Nominatim status:", response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("[PropertyMap] Données Nominatim:", data);

      return data;
    } catch (e: any) {
      if (e.name === 'AbortError') {
        addError("Géocodage: Timeout (10s)", e);
      } else {
        addError(`Géocodage: ${e.message}`, e);
      }
      return null;
    }
  }, [addError]);

  // Fonction pour extraire ville et quartier des données Nominatim
  const extractLocationData = (data: any) => {
    if (!data || !data.address) return { city: "", neighborhood: "", fullAddress: "" };
    
    const address = data.address;
    const city = address.city || address.town || address.village || address.municipality || address.county || "";
    const neighborhood = address.suburb || address.neighbourhood || address.district || address.borough || address.quarter || "";
    const fullAddress = data.display_name || "";
    
    return { city, neighborhood, fullAddress };
  };

  const handlePositionChange = useCallback(
    async (lat: number, lng: number) => {
      console.log("[PropertyMap] Changement position:", { lat, lng });
      clearErrors();
      
      try {
        // Validation des coordonnées
        if (lat < -90 || lat > 90) {
          throw new Error(`Latitude invalide: ${lat}`);
        }
        if (lng < -180 || lng > 180) {
          throw new Error(`Longitude invalide: ${lng}`);
        }

        setSelectedPosition([lat, lng]);
        setInputLat(lat.toFixed(6));
        setInputLng(lng.toFixed(6));
        
        // Géocodage inverse
        const data = await reverseGeocode(lat, lng);
        const { city, neighborhood, fullAddress } = extractLocationData(data);
        
        // Mise à jour des champs de saisie
        if (city) setInputCity(city);
        if (neighborhood) setInputNeighborhood(neighborhood);
        
        console.log("[PropertyMap] Appel onLocationSelect:", { lat, lng, fullAddress, city, neighborhood });
        onLocationSelect?.(lat, lng, fullAddress, city, neighborhood);
        
      } catch (e: any) {
        addError(`handlePositionChange: ${e.message}`, e);
        // On envoie quand même les coordonnées même sans adresse
        onLocationSelect?.(lat, lng, undefined, inputCity, inputNeighborhood);
      }
    },
    [onLocationSelect, reverseGeocode, addError, inputCity, inputNeighborhood]
  );

  const handleGeolocation = useCallback(() => {
    console.log("[PropertyMap] Demande géolocalisation...");
    setIsSearching(true);
    clearErrors();

    if (!navigator.geolocation) {
      addError("Géolocalisation: API non supportée par ce navigateur");
      setIsSearching(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("[PropertyMap] Position obtenue:", {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        
        handlePositionChange(position.coords.latitude, position.coords.longitude);
        setIsSearching(false);
      },
      (error) => {
        const errorMessages: Record<number, string> = {
          1: "Permission refusée par l'utilisateur",
          2: "Position indisponible",
          3: "Timeout",
        };
        const msg = errorMessages[error.code] || `Erreur code ${error.code}`;
        addError(`Géolocalisation: ${msg}`, { code: error.code, message: error.message });
        setIsSearching(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, [handlePositionChange, addError]);

  // Gestion des changements manuels des champs
  const handleManualLatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputLat(e.target.value);
  };
  console.log("[PropertyMap] Valeur de readOnly:", readOnly);

  const handleManualLngChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputLng(e.target.value);
  };

  const handleManualCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputCity(e.target.value);
  };

  const handleManualNeighborhoodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputNeighborhood(e.target.value);
  };

  // Appliquer les coordonnées manuelles
  const applyManualCoordinates = () => {
    const lat = parseFloat(inputLat);
    const lng = parseFloat(inputLng);
    
    if (!isNaN(lat) && !isNaN(lng)) {
      handlePositionChange(lat, lng);
    } else {
      addError("Coordonnées invalides");
    }
  };

  const fullLocation = [inputNeighborhood, inputCity].filter(Boolean).join(", ");

  // Log du rendu
  console.log("[PropertyMap] Rendu:", {
    selectedPosition,
    hasCoords: !!selectedPosition,
    errorsCount: errors.length,
    inputCity,
    inputNeighborhood,
    inputLat,
    inputLng,
  });

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-border bg-card">
      {/* Header */}
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
      </div>

      {/* Section des champs de saisie - TOUJOURS VISIBLE si pas en readOnly */}
      {!readOnly && (
        <div className="p-4 bg-muted/30 border-b border-border">
          <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Search className="w-4 h-4" />
            Recherchez ou cliquez sur la carte
          </p>
          
          <div className="space-y-3">
            {/* Ligne 1: Ville et Quartier */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Ville *
                </label>
                <input
                  type="text"
                  value={inputCity}
                  onChange={handleManualCityChange}
                  placeholder="Ex: Yaoundé"
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Quartier
                </label>
                <input
                  type="text"
                  value={inputNeighborhood}
                  onChange={handleManualNeighborhoodChange}
                  placeholder="Ex: Ngousso"
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Ligne 2: Coordonnées */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Latitude
                </label>
                <input
                  type="text"
                  value={inputLat}
                  onChange={handleManualLatChange}
                  placeholder="3.848000"
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Longitude
                </label>
                <input
                  type="text"
                  value={inputLng}
                  onChange={handleManualLngChange}
                  placeholder="11.502000"
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Bouton appliquer */}
            <button
              onClick={applyManualCoordinates}
              disabled={!inputLat || !inputLng}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <MapPin className="w-4 h-4" />
              Positionner sur la carte
            </button>
          </div>
          
          {/* Boutons d'action rapide */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-border">
            <button
              onClick={handleGeolocation}
              disabled={isSearching}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 disabled:opacity-50 transition-colors"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
              {isSearching ? "Recherche..." : "Ma position"}
            </button>
            
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-background rounded-lg border border-border">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Cliquez sur la carte
            </div>
          </div>
        </div>
      )}

      {/* Affichage des erreurs */}
      {errors.length > 0 && (
        <div className="px-4 py-3 bg-destructive/10 border-b border-border">
          <div className="space-y-2">
            {errors.map((err, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="break-all">{err}</span>
              </div>
            ))}
          </div>
          <button 
            onClick={clearErrors}
            className="mt-2 text-xs text-muted-foreground underline hover:text-foreground"
          >
            Effacer les erreurs
          </button>
        </div>
      )}

      {/* Carte interactive */}
      <div className="w-full h-[400px] relative">
        {(() => {
          try {
            return (
              <MapContainer
                key={selectedPosition ? `${selectedPosition[0]}-${selectedPosition[1]}` : 'default'}
                center={selectedPosition || defaultPosition}
                zoom={selectedPosition ? 16 : 12}
                className="w-full h-full z-0"
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  eventHandlers={{
                    tileerror: (e) => {
                      console.error("[PropertyMap] Erreur chargement tuile:", e);
                      addError("Tuile: échec chargement", e);
                    },
                  }}
                />
                <LocationMarker
                  position={selectedPosition}
                  onPositionChange={handlePositionChange}
                  onError={addError}
                />
              </MapContainer>
            );
          } catch (e: any) {
            addError(`Rendu carte: ${e.message}`, e);
            return (
              <div className="w-full h-full flex items-center justify-center bg-destructive/10">
                <div className="text-center p-4">
                  <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-2" />
                  <p className="text-destructive font-medium">Erreur carte</p>
                  <p className="text-sm text-destructive/80">{e.message}</p>
                </div>
              </div>
            );
          }
        })()}

        {/* Overlay d'instruction */}
        {!selectedPosition && !readOnly && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[400]">
            <div className="bg-background/95 px-4 py-3 rounded-xl shadow-xl border border-border">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Cliquez pour positionner
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer avec coordonnées */}
      {selectedPosition && (
        <div className="px-4 py-3 bg-muted/50 border-t border-border">
          <p className="text-xs text-muted-foreground font-mono text-center">
            Position sélectionnée : {selectedPosition[0].toFixed(6)}, {selectedPosition[1].toFixed(6)}
          </p>
        </div>
      )}

      {/* Debug panel */}
      {process.env.NODE_ENV === 'development' && Object.keys(debugInfo).length > 0 && (
        <div className="p-4 border-t border-border bg-muted/30">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Debug:</p>
          <pre className="text-xs text-muted-foreground overflow-auto max-h-32">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default PropertyMap;
