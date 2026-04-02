import { useState, useCallback } from "react";
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
  city?: string;
  neighborhood?: string;
  onLocationSelect?: (lat: number, lng: number, address?: string, city?: string, neighborhood?: string) => void;
}

const LocationMarker = ({ position, onPositionChange }: { position: [number, number] | null; onPositionChange: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return position ? <Marker position={position} /> : null;
};

const PropertyMap = ({ latitude, longitude, city = "", neighborhood = "", onLocationSelect }: PropertyMapSelectorProps) => {
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(
    latitude && longitude ? [latitude, longitude] : null
  );
  const [isSearching, setIsSearching] = useState(false);
  const [inputCity, setInputCity] = useState(city);
  const [inputNeighborhood, setInputNeighborhood] = useState(neighborhood);
  const [inputLat, setInputLat] = useState(latitude?.toString() || "");
  const [inputLng, setInputLng] = useState(longitude?.toString() || "");
  const [error, setError] = useState("");

  const defaultPosition: [number, number] = [3.848, 11.502];

  const handlePositionChange = useCallback(async (lat: number, lng: number) => {
    setSelectedPosition([lat, lng]);
    setInputLat(lat.toFixed(6));
    setInputLng(lng.toFixed(6));
    
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=fr`);
      const data = await response.json();
      const address = data.address;
      const foundCity = address?.city || address?.town || address?.village || "";
      const foundNeighborhood = address?.suburb || address?.neighbourhood || address?.district || "";
      
      if (foundCity) setInputCity(foundCity);
      if (foundNeighborhood) setInputNeighborhood(foundNeighborhood);
      
      onLocationSelect?.(lat, lng, data.display_name, foundCity, foundNeighborhood);
    } catch (err) {
      console.error("Erreur géocodage:", err);
      onLocationSelect?.(lat, lng, undefined, inputCity, inputNeighborhood);
    }
  }, [onLocationSelect, inputCity, inputNeighborhood]);

  const handleGeolocation = () => {
    setIsSearching(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        handlePositionChange(position.coords.latitude, position.coords.longitude);
        setIsSearching(false);
      },
      (err) => {
        setError("Impossible d'obtenir votre position");
        setIsSearching(false);
      }
    );
  };

  const applyManualCoordinates = () => {
    const lat = parseFloat(inputLat);
    const lng = parseFloat(inputLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      handlePositionChange(lat, lng);
      setError("");
    } else {
      setError("Coordonnées invalides");
    }
  };

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-gray-200 bg-white">
      
      {/* HEADER - Gris */}
      <div className="p-4 bg-gray-100 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-green-600" />
          <div>
            <h3 className="font-semibold text-gray-900">Localisation</h3>
            <p className="text-sm text-gray-500">
              {inputNeighborhood && inputCity ? `${inputNeighborhood}, ${inputCity}` : "Localisation non spécifiée"}
            </p>
          </div>
        </div>
      </div>

      {/* CHAMPS DE SAISIE - TOUJOURS VISIBLES */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <Search className="w-4 h-4 text-green-600" />
          Recherchez ou cliquez sur la carte
        </p>
        
        <div className="space-y-3">
          {/* Ville et Quartier */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Ville *</label>
              <input
                type="text"
                value={inputCity}
                onChange={(e) => setInputCity(e.target.value)}
                placeholder="Ex: Yaoundé"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-100 text-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Quartier</label>
              <input
                type="text"
                value={inputNeighborhood}
                onChange={(e) => setInputNeighborhood(e.target.value)}
                placeholder="Ex: Ngousso"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-100 text-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          
          {/* Coordonnées */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Latitude</label>
              <input
                type="text"
                value={inputLat}
                onChange={(e) => setInputLat(e.target.value)}
                placeholder="3.848000"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-100 text-green-700 font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Longitude</label>
              <input
                type="text"
                value={inputLng}
                onChange={(e) => setInputLng(e.target.value)}
                placeholder="11.502000"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-100 text-green-700 font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          
          {/* Boutons */}
          <div className="flex gap-2">
            <button
              onClick={applyManualCoordinates}
              disabled={!inputLat || !inputLng}
              className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              <MapPin className="w-4 h-4 inline mr-2" />
              Positionner
            </button>
            <button
              onClick={handleGeolocation}
              disabled={isSearching}
              className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-300"
            >
              {isSearching ? <Loader2 className="w-4 h-4 inline animate-spin mr-2" /> : <Crosshair className="w-4 h-4 inline mr-2" />}
              Ma position
            </button>
          </div>
          
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* CARTE */}
      <div className="w-full h-[400px] relative">
        <MapContainer center={selectedPosition || defaultPosition} zoom={selectedPosition ? 16 : 12} className="w-full h-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <LocationMarker position={selectedPosition} onPositionChange={handlePositionChange} />
        </MapContainer>
      </div>

      {/* FOOTER */}
      {selectedPosition && (
        <div className="p-3 bg-gray-50 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500 font-mono">
            {selectedPosition[0].toFixed(6)}, {selectedPosition[1].toFixed(6)}
          </p>
        </div>
      )}
    </div>
  );
};

export default PropertyMap;
