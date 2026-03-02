import { useState, useRef } from "react";
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
  Zap
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

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
    amenities: string[];
  };
  onFiltersChange: (filters: SearchFiltersProps["filters"]) => void;
  onSearch: () => void;
}

const CITIES = [
  "Yaoundé", 
  "Douala", 
  "Bafoussam", 
  "Garoua", 
  "Kribi", 
  "Limbe",
  "Bamenda",
  "Buea",
  "Maroua",
  "Ngaoundéré",
  "Bertoua",
  "Ebolowa",
  "Kumba",
  "Nkongsamba",
  "Edéa",
  "Mbalmayo",
  "Dschang",
  "Foumban",
  "Kousseri",
  "Sangmélima"
];

const SearchFilters = ({ filters, onFiltersChange, onSearch }: SearchFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();
  
  // Use refs to track local input values without causing re-renders
  const neighborhoodRef = useRef<HTMLInputElement>(null);
  const priceMinRef = useRef<HTMLInputElement>(null);
  const priceMaxRef = useRef<HTMLInputElement>(null);

  const AMENITIES = [
    { id: "wifi", label: t("filter.wifi"), icon: Wifi },
    { id: "climatisation", label: t("filter.airConditioning"), icon: AirVent },
    { id: "parking", label: t("filter.parking"), icon: Car },
    { id: "security", label: t("filter.security"), icon: Shield },
    { id: "pool", label: t("filter.pool"), icon: Waves },
    { id: "gym", label: t("filter.gym"), icon: Dumbbell },
    { id: "garden", label: t("filter.garden"), icon: Trees },
    { id: "generator", label: t("filter.generator"), icon: Zap },
  ];

  const updateFilter = <K extends keyof SearchFiltersProps["filters"]>(
    key: K,
    value: SearchFiltersProps["filters"][K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleAmenity = (amenity: string) => {
    const current = filters.amenities;
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
      amenities: [],
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
    filters.amenities.length > 0,
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

      {/* Location */}
      <div className="space-y-3">
        <Label className="text-foreground font-medium">{t("filter.city")}</Label>
        <Select value={filters.location} onValueChange={(value) => updateFilter("location", value)}>
          <SelectTrigger className="w-full">
            <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder={t("filter.chooseCity")} />
          </SelectTrigger>
          <SelectContent>
            {CITIES.map((city) => (
              <SelectItem key={city} value={city}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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

      {/* Property Type */}
      <div className="space-y-3">
        <Label className="text-foreground font-medium">{t("search.propertyType")}</Label>
        <Select value={filters.propertyType} onValueChange={(value) => updateFilter("propertyType", value)}>
          <SelectTrigger className="w-full">
            <Home className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder={t("search.propertyType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="studio">{t("property.studio")}</SelectItem>
            <SelectItem value="apartment">{t("property.apartment")}</SelectItem>
            <SelectItem value="house">{t("property.house")}</SelectItem>
            <SelectItem value="room">{t("property.room")}</SelectItem>
            <SelectItem value="villa">{t("property.villa")}</SelectItem>
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
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const value = e.currentTarget.value.replace(/[^0-9]/g, "");
                updateFilter("priceMin", parseInt(value) || 0);
              }
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
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const value = e.currentTarget.value.replace(/[^0-9]/g, "");
                updateFilter("priceMax", parseInt(value) || 500000);
              }
            }}
          />
        </div>
      </div>

      {/* Bedrooms & Bathrooms */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <Label className="text-foreground font-medium flex items-center gap-2">
            <Bed className="w-4 h-4" /> {t("search.bedrooms")}
          </Label>
          <Select value={filters.bedrooms.toString()} onValueChange={(value) => updateFilter("bedrooms", parseInt(value))}>
            <SelectTrigger><SelectValue placeholder={t("filter.all")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">{t("filter.all")}</SelectItem>
              <SelectItem value="1">1+</SelectItem>
              <SelectItem value="2">2+</SelectItem>
              <SelectItem value="3">3+</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-3">
          <Label className="text-foreground font-medium flex items-center gap-2">
            <Bath className="w-4 h-4" /> {t("filter.bathrooms")}
          </Label>
          <Select value={filters.bathrooms.toString()} onValueChange={(value) => updateFilter("bathrooms", parseInt(value))}>
            <SelectTrigger><SelectValue placeholder={t("filter.all")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">{t("filter.all")}</SelectItem>
              <SelectItem value="1">1+</SelectItem>
              <SelectItem value="2">2+</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Amenities */}
      <div className="space-y-3">
        <Label className="text-foreground font-medium">{t("filter.amenities")}</Label>
        <div className="grid grid-cols-2 gap-3">
          {AMENITIES.map((amenity) => (
            <div key={amenity.id} className="flex items-center space-x-3">
              <Checkbox
                id={amenity.id}
                checked={filters.amenities.includes(amenity.id)}
                onCheckedChange={() => toggleAmenity(amenity.id)}
              />
              <label htmlFor={amenity.id} className="text-sm text-muted-foreground cursor-pointer flex items-center gap-2">
                <amenity.icon className="w-4 h-4" />
                {amenity.label}
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