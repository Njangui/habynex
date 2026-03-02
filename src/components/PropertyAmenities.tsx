import { 
  Wifi, 
  Car, 
  Shield, 
  Droplets, 
  Zap,
  Wind,
  Tv,
  UtensilsCrossed,
  WashingMachine,
  Dumbbell,
  Trees,
  Waves,
  PawPrint,
  Cigarette,
  Users,
  Baby,
  Accessibility,
  Sparkles,
  LucideIcon,
  Lightbulb,
  GlassWater
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface PropertyAmenitiesProps {
  amenities: string[];
}

const amenityIcons: Record<string, { icon: LucideIcon; key: string }> = {
  wifi: { icon: Wifi, key: "amenities.wifi" },
  parking: { icon: Car, key: "amenities.parking" },
  security: { icon: Shield, key: "amenities.security" },
  water: { icon: Droplets, key: "amenities.water" },
  electricity: { icon: Zap, key: "amenities.electricity" },
  ac: { icon: Wind, key: "amenities.ac" },
  tv: { icon: Tv, key: "amenities.tv" },
  kitchen: { icon: UtensilsCrossed, key: "amenities.kitchen" },
  laundry: { icon: WashingMachine, key: "amenities.laundry" },
  gym: { icon: Dumbbell, key: "amenities.gym" },
  garden: { icon: Trees, key: "amenities.garden" },
  pool: { icon: Waves, key: "amenities.pool" },
  pets: { icon: PawPrint, key: "amenities.pets" },
  smoking: { icon: Cigarette, key: "amenities.smoking" },
  family: { icon: Users, key: "amenities.family" },
  baby: { icon: Baby, key: "amenities.baby" },
  accessible: { icon: Accessibility, key: "amenities.accessible" },
  cleaning: { icon: Sparkles, key: "amenities.cleaning" },
  electricity_prepaid: { icon: Lightbulb, key: "amenities.electricityPrepaid" },
  electricity_postpaid: { icon: Lightbulb, key: "amenities.electricityPostpaid" },
  water_borehole: { icon: GlassWater, key: "amenities.waterBorehole" },
  water_tap: { icon: Droplets, key: "amenities.waterTap" },
  water_tank: { icon: GlassWater, key: "amenities.waterTank" },
};

const PropertyAmenities = ({ amenities }: PropertyAmenitiesProps) => {
  const { t } = useLanguage();

  if (!amenities || amenities.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">{t("amenities.title")}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {amenities.map((amenity) => {
          const amenityData = amenityIcons[amenity.toLowerCase()];
          const Icon = amenityData?.icon || Sparkles;
          const label = amenityData ? t(amenityData.key) : amenity;

          return (
            <div
              key={amenity}
              className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PropertyAmenities;
