import { useState, useRef, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  MapPin, 
  Home, 
  SlidersHorizontal, 
  X,
  Bed,
  Bath,
  Car,
  Wifi,
  AirVent,
  Shield,
  Waves,
  Dumbbell,
  Trees,
  Zap,
  Sofa,
  Utensils,
  DoorOpen,
  Building2,
  Search,
  Loader2,
  MapPinned,
  AlertCircle
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

interface Region {
  id: string;
  name_fr: string;
  name_en: string;
  code: string;
}

interface City {
  id: string;
  region_id: string;
  name: string;
  latitude?: number;
  longitude?: number;
}

interface SearchFiltersProps {
  filters: {
    location: string;
    neighborhood: string;
    propertyType: string;
    listingType: string;
    priceMin: number;
    priceMax: number;
    bedrooms: number;
    bathrooms: number;
    livingRooms?: number;
    kitchens?: number;
    diningRooms?: number;
    areaMin?: number;
    areaMax?: number;
    amenities: string[];
    regionId?: string;
    cityId?: string;
  };
  onFiltersChange: (filters: SearchFiltersProps["filters"]) => void;
  onSearch: () => void;
}

// Types de biens organisés par catégorie
const PROPERTY_TYPES = [
  // Résidentiel
  { value: "studio", label: "property.studio", icon: "🏢", category: "residential" },
  { value: "room", label: "property.room", icon: "🛏️", category: "residential" },
  { value: "apartment", label: "property.apartment", icon: "🏠", category: "residential" },
  { value: "duplex", label: "Duplex", icon: "🏘️", category: "residential" },
  { value: "house", label: "property.house", icon: "🏡", category: "residential" },
  { value: "villa", label: "property.villa", icon: "🏰", category: "residential" },
  { value: "penthouse", label: "Penthouse", icon: "🏙️", category: "residential" },
  { value: "furnished_apartment", label: "Appartement meublé", icon: "🛋️", category: "residential" },
  { value: "shared_room", label: "Chambre partagée", icon: "👥", category: "residential" },
  // Terrain
  { value: "land", label: "Terrain", icon: "🌳", category: "land" },
  // Commercial
  { value: "shop", label: "Boutique", icon: "🛍️", category: "commercial" },
  { value: "store", label: "Magasin", icon: "🏪", category: "commercial" },
  { value: "commercial_space", label: "Espace commercial", icon: "🏢", category: "commercial" },
  { value: "warehouse", label: "Entrepôt", icon: "🏭", category: "commercial" },
  { value: "office", label: "Bureau", icon: "💼", category: "commercial" },
  { value: "building", label: "Bâtiment", icon: "🏗️", category: "commercial" },
  // Santé et Bien-être
  { value: "beauty_salon", label: "Institut de beauté", icon: "✨", category: "commercial" },
  { value: "hair_salon", label: "Salon de coiffure", icon: "💇", category: "commercial" },
  { value: "gym", label: "Salle de sport", icon: "💪", category: "commercial" },
  { value: "pharmacy", label: "Pharmacie", icon: "💊", category: "commercial" },
  { value: "clinic", label: "Clinique", icon: "🏥", category: "commercial" },
  // Restauration et Hôtellerie
  { value: "restaurant", label: "Restaurant", icon: "🍽️", category: "commercial" },
  { value: "cafe", label: "Café", icon: "☕", category: "commercial" },
  { value: "bar", label: "Bar", icon: "🍸", category: "commercial" },
  { value: "hotel", label: "Hôtel", icon: "🏨", category: "commercial" },
  // Autres commerces
  { value: "coworking", label: "Espace coworking", icon: "👥", category: "commercial" },
  { value: "showroom", label: "Showroom", icon: "🎨", category: "commercial" },
  { value: "workshop", label: "Atelier", icon: "🔧", category: "commercial" },
];

// Commodités de base (toujours disponibles)
const BASE_AMENITIES = [
  { id: "wifi", label: "filter.wifi", icon: Wifi },
  { id: "parking", label: "filter.parking", icon: Car },
  { id: "security", label: "filter.security", icon: Shield },
  { id: "generator", label: "filter.generator", icon: Zap },
  { id: "water_tank", label: "filter.waterTank", icon: Waves },
  { id: "air_conditioning", label: "filter.airConditioning", icon: AirVent },
];

// Commodités spécifiques par type de bien
const AMENITIES_BY_TYPE: Record<string, Array<{id: string, label: string, icon: any}>> = {
  residential: [
    { id: "furnished", label: "filter.furnished", icon: Sofa },
    { id: "pool", label: "filter.pool", icon: Waves },
    { id: "gym", label: "filter.gym", icon: Dumbbell },
    { id: "garden", label: "filter.garden", icon: Trees },
    { id: "balcony", label: "filter.balcony", icon: Building2 },
    { id: "terrace", label: "filter.terrace", icon: Trees },
    { id: "elevator", label: "filter.elevator", icon: Building2 },
    { id: "cctv", label: "filter.cctv", icon: Shield },
  ],
  land: [
    { id: "fence", label: "filter.fence", icon: Shield },
    { id: "paved_road", label: "filter.pavedRoad", icon: Car },
    { id: "water_access", label: "filter.waterAccess", icon: Waves },
    { id: "electricity", label: "filter.electricity", icon: Zap },
  ],
  commercial: [
    { id: "reception", label: "filter.reception", icon: DoorOpen },
    { id: "storage", label: "filter.storage", icon: Building2 },
    { id: "loading_dock", label: "filter.loadingDock", icon: Building2 },
    { id: "meeting_room", label: "filter.meetingRoom", icon: Building2 },
    { id: "display_window", label: "filter.displayWindow", icon: Building2 },
    { id: "kitchen_facilities", label: "filter.kitchenFacilities", icon: Utensils },
    { id: "alarm_system", label: "filter.alarmSystem", icon: Shield },
    { id: "fire_safety", label: "filter.fireSafety", icon: Shield },
    { id: "handicap_access", label: "filter.handicapAccess", icon: Building2 },
    { id: "high_ceiling", label: "filter.highCeiling", icon: Building2 },
  ],
};

const SearchFilters = ({ filters, onFiltersChange, onSearch }: SearchFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const { t, language } = useLanguage();
  
  const neighborhoodRef = useRef<HTMLInputElement>(null);
  const priceMinRef = useRef<HTMLInputElement>(null);
  const priceMaxRef = useRef<HTMLInputElement>(null);

  // Charger les régions au montage
  useEffect(() => {
    console.log("=== SearchFilters mounted ===");
    loadRegions();
  }, []);

  // Charger les villes quand la région change
  useEffect(() => {
    console.log("Region changed:", filters.regionId);
    if (filters.regionId) {
      loadCities(filters.regionId);
    } else {
      setCities([]);
    }
  }, [filters.regionId]);

  const loadRegions = async () => {
    console.log("Loading regions...");
    setLoadingRegions(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('regions')
        .select('*')
        .order('name_fr');
      
      console.log("Regions response:", { data, error });
      
      if (error) {
        console.error("Error loading regions:", error);
        setError(`Erreur régions: ${error.message}`);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.warn("No regions found in database");
        setDebugInfo("Aucune région trouvée dans la base de données");
      } else {
        console.log(`Loaded ${data.length} regions`);
        setDebugInfo(`${data.length} régions chargées`);
      }
      
      setRegions(data || []);
    } catch (err: any) {
      console.error('Exception loading regions:', err);
      setError(`Exception: ${err.message}`);
    } finally {
      setLoadingRegions(false);
    }
  };

  const loadCities = async (regionId: string) => {
    console.log("Loading cities for region:", regionId);
    setLoadingCities(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .eq('region_id', regionId)
        .eq('is_active', true)
        .order('name');
      
      console.log("Cities response:", { data, error, count: data?.length });
      
      if (error) {
        console.error("Error loading cities:", error);
        setError(`Erreur villes: ${error.message}`);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.warn("No cities found for region:", regionId);
        setDebugInfo(`Aucune ville trouvée pour la région ${regionId}`);
      } else {
        console.log(`Loaded ${data.length} cities`);
        setDebugInfo(`${data.length} villes chargées`);
      }
      
      setCities(data || []);
    } catch (err: any) {
      console.error('Exception loading cities:', err);
      setError(`Exception villes: ${err.message}`);
    } finally {
      setLoadingCities(false);
    }
  };

  // Déterminer la catégorie du type de bien sélectionné
  const selectedCategory = useMemo(() => {
    const type = PROPERTY_TYPES.find(p => p.value === filters.propertyType);
    return type?.category || "residential";
  }, [filters.propertyType]);

  // Commodités dynamiques basées sur le type de bien
  const dynamicAmenities = useMemo(() => {
    const specific = AMENITIES_BY_TYPE[selectedCategory] || [];
    return [...BASE_AMENITIES, ...specific];
  }, [selectedCategory]);

  // Vérifier si le type sélectionné est résidentiel
  const isResidential = selectedCategory === "residential";

  const updateFilter = <K extends keyof SearchFiltersProps["filters"]>(
    key: K,
    value: SearchFiltersProps["filters"][K]
  ) => {
    // Si on change de région, réinitialiser la ville
    if (key === 'regionId') {
      onFiltersChange({ 
        ...filters, 
        [key]: value,
        cityId: '',
        location: ''
      });
    } else if (key === 'cityId') {
      const city = cities.find(c => c.id === value);
      onFiltersChange({ 
        ...filters, 
        [key]: value,
        location: city?.name || ''
      });
    } else {
      onFiltersChange({ ...filters, [key]: value });
    }
  };

  const toggleAmenity = (amenity: string) => {
    const current = formData.amenities;
    const updated = current.includes(amenity)
      ? current.filter((a) => a !== amenity)
      : [...current, amenity];
    updateFilter("amenities", updated);
  };

  const clearFilters = () => {
    onFiltersChange({
      location: "",
      neighborhood: "",
      propertyType: "",
      listingType: "rent",
      priceMin: 0,
      priceMax: 500000,
      bedrooms: 0,
      bathrooms: 0,
      livingRooms: 0,
      kitchens: 0,
      diningRooms: 0,
      areaMin: 0,
      areaMax: 1000,
      amenities: [],
      regionId: "",
      cityId: "",
    });
  };

  const activeFiltersCount = [
    filters.location,
    filters.neighborhood,
    filters.propertyType,
    filters.priceMin > 0,
    filters.priceMax < 500000,
    filters.bedrooms > 0,
    filters.bathrooms > 0,
    filters.livingRooms && filters.livingRooms > 0,
    filters.kitchens && filters.kitchens > 0,
    filters.diningRooms && filters.diningRooms > 0,
    filters.areaMin && filters.areaMin > 0,
    filters.areaMax && filters.areaMax < 1000,
    filters.amenities.length > 0,
    filters.regionId,
  ].filter(Boolean).length;

  const FiltersContent = () => (
    <div className="space-y-6">


      {/* Listing Type */}
      <div className="space-y-3">
        <Label className="text-foreground font-medium">{t("filter.listingType")}</Label>
        <div className="flex gap-2">
          {[
            { value: "rent", label: t("listing.rent") },
            { value: "sale", label: t("listing.sale") },
            { value: "colocation", label: t("listing.colocation") },
            { value: "short_term", label: t("listing.shortTerm") },
          ].map((type) => (
            <Button
              key={type.value}
              variant={filters.listingType === type.value ? "default" : "outline"}
              size="sm"
              onClick={() => updateFilter("listingType", type.value)}
              className="flex-1"
            >
              {type.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Region Selection */}
      <div className="space-y-3">
        <Label className="text-foreground font-medium flex items-center gap-2">
          <MapPinned className="w-4 h-4" />
          {language === "fr" ? "Région" : "Region"}
        </Label>
        <Select 
          value={filters.regionId || ""} 
          onValueChange={(value) => updateFilter("regionId", value)}
          disabled={loadingRegions}
        >
          <SelectTrigger className="w-full">
            {loadingRegions ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
            )}
            <SelectValue placeholder={language === "fr" ? "Choisir une région" : "Select a region"} />
          </SelectTrigger>
          <SelectContent>
            {regions.length === 0 && !loadingRegions && (
              <SelectItem value="no-regions" disabled>
                {language === "fr" ? "Aucune région disponible" : "No regions available"}
              </SelectItem>
            )}
            {regions.map((region) => (
              <SelectItem key={region.id} value={region.id}>
                {language === "fr" ? region.name_fr : region.name_en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* City Selection - Only show if region is selected */}
      {filters.regionId && (
        <div className="space-y-3">
          <Label className="text-foreground font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {language === "fr" ? "Ville" : "City"}
          </Label>
          <Select 
            value={filters.cityId || ""} 
            onValueChange={(value) => updateFilter("cityId", value)}
            disabled={loadingCities}
          >
            <SelectTrigger className="w-full">
              {loadingCities ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
              )}
              <SelectValue placeholder={language === "fr" ? "Choisir une ville" : "Select a city"} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {cities.length === 0 && !loadingCities && (
                <SelectItem value="no-cities" disabled>
                  {language === "fr" ? "Aucune ville dans cette région" : "No cities in this region"}
                </SelectItem>
              )}
              {cities.map((city) => (
                <SelectItem key={city.id} value={city.id}>
                  {city.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Neighborhood */}
      <div className="space-y-3">
        <Label className="text-foreground font-medium">{t("filter.neighborhood")}</Label>
        <Input
          ref={neighborhoodRef}
          type="text"
          placeholder={t("filter.neighborhoodPlaceholder")}
          defaultValue={filters.neighborhood}
          onBlur={(e) => updateFilter("neighborhood", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateFilter("neighborhood", e.currentTarget.value);
            }
          }}
        />
      </div>

      {/* Property Type with Categories */}
      <div className="space-y-3">
        <Label className="text-foreground font-medium">{t("search.propertyType")}</Label>
        <Select 
          value={filters.propertyType} 
          onValueChange={(value) => {
            updateFilter("propertyType", value);
            updateFilter("amenities", []);
          }}
        >
          <SelectTrigger className="w-full">
            <Home className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder={t("search.propertyType")} />
          </SelectTrigger>
          <SelectContent className="max-h-[400px]">
            {/* Résidentiel */}
            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground bg-muted">
              {language === "fr" ? "Résidentiel" : "Residential"}
            </div>
            {PROPERTY_TYPES.filter(p => p.category === "residential").map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <span className="mr-2">{type.icon}</span>
                {type.label.startsWith("property.") ? t(type.label) : type.label}
              </SelectItem>
            ))}
            
            {/* Terrain */}
            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground bg-muted mt-2">
              {language === "fr" ? "Terrain" : "Land"}
            </div>
            {PROPERTY_TYPES.filter(p => p.category === "land").map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <span className="mr-2">{type.icon}</span>
                {type.label}
              </SelectItem>
            ))}
            
            {/* Commercial */}
            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground bg-muted mt-2">
              {language === "fr" ? "Commercial" : "Commercial"}
            </div>
            {PROPERTY_TYPES.filter(p => p.category === "commercial").map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <span className="mr-2">{type.icon}</span>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Budget */}
      <div className="space-y-3">
        <Label className="text-foreground font-medium">{t("filter.budget")}</Label>
        <div className="flex gap-3">
          <Input
            ref={priceMinRef}
            type="text"
            inputMode="numeric"
            placeholder={t("filter.min")}
            defaultValue={filters.priceMin || ""}
            onBlur={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, "");
              updateFilter("priceMin", parseInt(value) || 0);
            }}
          />
          <Input
            ref={priceMaxRef}
            type="text"
            inputMode="numeric"
            placeholder={t("filter.max")}
            defaultValue={filters.priceMax || ""}
            onBlur={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, "");
              updateFilter("priceMax", parseInt(value) || 500000);
            }}
          />
        </div>
      </div>

      {/* Surface Area */}
      <div className="space-y-3">
        <Label className="text-foreground font-medium flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          {language === "fr" ? "Surface (m²)" : "Area (m²)"}
        </Label>
        <div className="flex gap-3">
          <Input
            type="number"
            inputMode="numeric"
            placeholder={language === "fr" ? "Min" : "Min"}
            value={filters.areaMin || ""}
            onChange={(e) => updateFilter("areaMin", parseInt(e.target.value) || 0)}
          />
          <Input
            type="number"
            inputMode="numeric"
            placeholder={language === "fr" ? "Max" : "Max"}
            value={filters.areaMax || ""}
            onChange={(e) => updateFilter("areaMax", parseInt(e.target.value) || 1000)}
          />
        </div>
      </div>

      {/* Rooms Section - Only for Residential */}
      {isResidential && (
        <div className="space-y-4 p-4 rounded-xl border-2 border-border bg-card/50">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Home className="w-5 h-5" />
            {language === "fr" ? "Pièces" : "Rooms"}
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <Bed className="w-4 h-4" /> {t("search.bedrooms")}
              </Label>
              <Select 
                value={(filters.bedrooms || 0).toString()} 
                onValueChange={(value) => updateFilter("bedrooms", parseInt(value))}
              >
                <SelectTrigger><SelectValue placeholder={t("filter.all")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{t("filter.all")}</SelectItem>
                  <SelectItem value="1">1+</SelectItem>
                  <SelectItem value="2">2+</SelectItem>
                  <SelectItem value="3">3+</SelectItem>
                  <SelectItem value="4">4+</SelectItem>
                  <SelectItem value="5">5+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <Bath className="w-4 h-4" /> {t("filter.bathrooms")}
              </Label>
              <Select 
                value={(filters.bathrooms || 0).toString()} 
                onValueChange={(value) => updateFilter("bathrooms", parseInt(value))}
              >
                <SelectTrigger><SelectValue placeholder={t("filter.all")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{t("filter.all")}</SelectItem>
                  <SelectItem value="1">1+</SelectItem>
                  <SelectItem value="2">2+</SelectItem>
                  <SelectItem value="3">3+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <Sofa className="w-4 h-4" /> {language === "fr" ? "Salon(s)" : "Living room(s)"}
              </Label>
              <Select 
                value={(filters.livingRooms || 0).toString()} 
                onValueChange={(value) => updateFilter("livingRooms", parseInt(value))}
              >
                <SelectTrigger><SelectValue placeholder={t("filter.all")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{t("filter.all")}</SelectItem>
                  <SelectItem value="1">1+</SelectItem>
                  <SelectItem value="2">2+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <Utensils className="w-4 h-4" /> {language === "fr" ? "Cuisine(s)" : "Kitchen(s)"}
              </Label>
              <Select 
                value={(filters.kitchens || 0).toString()} 
                onValueChange={(value) => updateFilter("kitchens", parseInt(value))}
              >
                <SelectTrigger><SelectValue placeholder={t("filter.all")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{t("filter.all")}</SelectItem>
                  <SelectItem value="1">1+</SelectItem>
                  <SelectItem value="2">2+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label className="text-sm flex items-center gap-2">
                <DoorOpen className="w-4 h-4" /> {language === "fr" ? "Salle(s) à manger" : "Dining room(s)"}
              </Label>
              <Select 
                value={(filters.diningRooms || 0).toString()} 
                onValueChange={(value) => updateFilter("diningRooms", parseInt(value))}
              >
                <SelectTrigger><SelectValue placeholder={t("filter.all")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{t("filter.all")}</SelectItem>
                  <SelectItem value="1">1+</SelectItem>
                  <SelectItem value="2">2+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Amenities */}
      <div className="space-y-3">
        <Label className="text-foreground font-medium">{t("filter.amenities")}</Label>
        <div className="grid grid-cols-2 gap-3">
          {dynamicAmenities.map((amenity) => (
            <div key={amenity.id} className="flex items-center space-x-3">
              <Checkbox
                id={amenity.id}
                checked={filters.amenities.includes(amenity.id)}
                onCheckedChange={() => toggleAmenity(amenity.id)}
              />
              <label htmlFor={amenity.id} className="text-sm text-muted-foreground cursor-pointer flex items-center gap-2">
                <amenity.icon className="w-4 h-4" />
                {amenity.label.startsWith("filter.") ? t(amenity.label) : amenity.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-border">
        <Button variant="outline" onClick={clearFilters} className="flex-1">
          <X className="w-4 h-4 mr-2" /> {t("filter.clear")}
        </Button>
        <Button onClick={() => { onSearch(); setIsOpen(false); }} className="flex-1">
          <Search className="w-4 h-4 mr-2" />
          {t("filter.apply")}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="hidden lg:block bg-card rounded-2xl p-6 shadow-sm border border-border/50 sticky top-24"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5" /> {t("search.filters")}
          </h2>
          {activeFiltersCount > 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-primary text-primary-foreground">
              {activeFiltersCount}
            </span>
          )}
        </div>
        <FiltersContent />
      </motion.div>

      {/* Mobile Filters */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="lg:hidden gap-2">
            <SlidersHorizontal className="w-4 h-4" /> {t("search.filters")}
            {activeFiltersCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5" /> {t("search.filters")}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6"><FiltersContent /></div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default SearchFilters;