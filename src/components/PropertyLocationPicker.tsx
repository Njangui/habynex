import { useState, useCallback } from "react";
import { MapPin, Crosshair, Search, AlertCircle, Loader2 } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix icônes Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

interface PropertyLocationPickerProps {
  latitude?: number;
  longitude?: number;
  address?: string;
  city: string;
  neighborhood?: string;
  onLocationSelect: (lat: number, lng: number, address: string, neighborhood?: string, city?: string) => void;
  readOnly?: boolean;
}

const LocationMarker = ({
  position,
  onPositionChange,
}: {
  position: [number, number] | null;
  onPositionChange: (lat: number, lng: number) => void;
}) => {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return position ? <Marker position={position} /> : null;
};

export default function PropertyLocationPicker({
  latitude,
  longitude,
  address,
  city,
  neighborhood,
  onLocationSelect = () => {},
  readOnly = false,
}: PropertyLocationPickerProps) {
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(
    latitude && longitude ? [latitude, longitude] : null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  
  // États pour les champs manuels
  const [manualCity, setManualCity] = useState(city || "");
  const [manualNeighborhood, setManualNeighborhood] = useState(neighborhood || "");
  const [manualLat, setManualLat] = useState(latitude?.toString() || "");
  const [manualLng, setManualLng] = useState(longitude?.toString() || "");

  const defaultPosition: [number, number] = [3.848, 11.502];

  const addError = (msg: string) => {
    setErrors(prev => [...prev.slice(-2), msg]);
  };

  const fetchGeocode = async (query: string, type: string) => {
    const url = `${SUPABASE_URL}/functions/v1/geocode?q=${encodeURIComponent(query)}&type=${type}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    return response;
  };

  const searchLocation = useCallback(async (query: string) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setErrors([]);
    
    try {
      const response = await fetchGeocode(query, 'search');
      
      if (response.status === 401) {
        throw new Error('Clé Supabase invalide');
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur ${response.status}`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data) || data.length === 0) {
        addError("Aucun résultat trouvé");
        setSearchResults([]);
      } else {
        setSearchResults(data);
        setShowResults(true);
      }
    } catch (error: any) {
      addError(`Erreur: ${error.message}`);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await fetchGeocode(`${lat},${lng}`, 'reverse');
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      return null;
    }
  }, []);

  const handlePositionChange = useCallback(async (lat: number, lng: number) => {
    setSelectedPosition([lat, lng]);
    setManualLat(lat.toFixed(6));
    setManualLng(lng.toFixed(6));
    setShowResults(false);
    
    const data = await reverseGeocode(lat, lng);
    
    const displayName = data?.display_name || `Position: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    const addr = data?.address || {};
    
    const foundCity = addr.city || addr.town || addr.village || manualCity;
    const foundNeighborhood = addr.suburb || addr.neighbourhood || manualNeighborhood;
    
    if (foundCity) setManualCity(foundCity);
    if (foundNeighborhood) setManualNeighborhood(foundNeighborhood);
    
    if (typeof onLocationSelect === "function") {
      onLocationSelect(lat, lng, displayName, foundNeighborhood, foundCity);
    }
  }, [onLocationSelect, reverseGeocode, manualCity, manualNeighborhood]);

  const handleGeolocation = useCallback(() => {
    setIsSearching(true);
    
    if (!navigator.geolocation) {
      addError("Géolocalisation non supportée");
      setIsSearching(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        handlePositionChange(position.coords.latitude, position.coords.longitude);
        setIsSearching(false);
      },
      (error) => {
        const messages: Record<number, string> = {
          1: "Permission refusée - activez la localisation",
          2: "Position indisponible",
          3: "Timeout",
        };
        addError(messages[error.code] || `Erreur ${error.code}`);
        setIsSearching(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [handlePositionChange]);

  const selectResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    handlePositionChange(lat, lon);
    setSearchQuery(result.display_name.split(',')[0]);
    setShowResults(false);
  };
  
  const applyManualCoordinates = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      handlePositionChange(lat, lng);
    } else {
      addError("Coordonnées invalides");
    }
  };

  const fullLocation = [manualNeighborhood, manualCity].filter(Boolean).join(", ");

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-gray-200 bg-white">
      {/* Header - Gris */}
      <div className="p-4 bg-gray-100 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-green-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900">Localisation</h3>
            <p className="text-sm text-gray-600 truncate">
              {fullLocation || "Recherchez ou cliquez sur la carte"}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION CHAMPS DE SAISIE - TOUJOURS VISIBLE (supprimé !readOnly) */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <Search className="w-4 h-4 text-green-600" />
          Recherchez ou cliquez sur la carte
        </p>
        
        {/* Champ de recherche existant */}
        <div className="relative mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchLocation(searchQuery)}
              placeholder="Rechercher (ex: Ngousso, Yaoundé...)"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={() => searchLocation(searchQuery)}
              disabled={isSearching || !searchQuery.trim()}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
            <button
              onClick={handleGeolocation}
              disabled={isSearching}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
            >
              <Crosshair className="w-4 h-4" />
            </button>
          </div>

          {showResults && searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
              {searchResults.map((result, idx) => (
                <button
                  key={idx}
                  onClick={() => selectResult(result)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0 text-sm"
                >
                  <p className="font-medium text-gray-900 truncate">{result.display_name}</p>
                  <p className="text-xs text-gray-500">{result.type} • {result.class}</p>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* NOUVEAUX CHAMPS MANUELS - Fond gris + texte vert */}
        <div className="space-y-3 pt-2 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Ville *</label>
              <input
                type="text"
                value={manualCity}
                onChange={(e) => setManualCity(e.target.value)}
                placeholder="Ex: Yaoundé"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-100 text-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Quartier</label>
              <input
                type="text"
                value={manualNeighborhood}
                onChange={(e) => setManualNeighborhood(e.target.value)}
                placeholder="Ex: Ngousso"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-100 text-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Latitude</label>
              <input
                type="text"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                placeholder="3.848000"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-100 text-green-700 font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Longitude</label>
              <input
                type="text"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                placeholder="11.502000"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-100 text-green-700 font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          
          <button
            onClick={applyManualCoordinates}
            disabled={!manualLat || !manualLng}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <MapPin className="w-4 h-4" />
            Positionner sur la carte
          </button>
        </div>

        {errors.length > 0 && (
          <div className="space-y-1 mt-3">
            {errors.map((err, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-red-50 text-red-700 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}

        {selectedPosition && (
          <p className="text-xs text-gray-500 font-mono mt-2 text-center">
            Position: {selectedPosition[0].toFixed(6)}, {selectedPosition[1].toFixed(6)}
          </p>
        )}
      </div>

      {/* CARTE */}
      <div className="w-full h-[400px] relative bg-gray-100">
        <MapContainer
          center={selectedPosition || defaultPosition}
          zoom={selectedPosition ? 16 : 12}
          className="w-full h-full"
          scrollWheelZoom={!readOnly}
          dragging={!readOnly}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            subdomains="abc"
          />
          <LocationMarker
            position={selectedPosition}
            onPositionChange={handlePositionChange}
          />
        </MapContainer>

        {!selectedPosition && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white/90 px-4 py-2 rounded-lg shadow-lg">
              <p className="text-sm font-medium text-gray-700">Cliquez pour positionner</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
