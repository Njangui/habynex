import { motion } from "framer-motion";
import { MapPin, Bed, Bath, Maximize, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";

interface PropertyData {
  title: string;
  description: string;
  property_type: string;
  listing_type: string;
  price: number;
  price_unit: string;
  deposit: number | null;
  bedrooms: number;
  bathrooms: number;
  area: number | null;
  city: string;
  neighborhood: string;
  address: string;
  amenities: string[];
  images: string[];
}

interface PropertyPreviewProps {
  data: PropertyData;
  onClose: () => void;
  onPublish: () => void;
  isPublishing: boolean;
}

const PropertyPreview = ({ data, onClose, onPublish, isPublishing }: PropertyPreviewProps) => {
  const { t } = useLanguage();

  const PROPERTY_TYPE_LABELS: Record<string, string> = {
    studio: t("preview.studio"),
    apartment: t("preview.apartment"),
    house: t("preview.house"),
    room: t("preview.room"),
    villa: t("preview.villa"),
  };

  const LISTING_TYPE_LABELS: Record<string, string> = {
    rent: t("preview.rent"),
    sale: t("preview.saleListing"),
    colocation: t("preview.colocation"),
    short_term: t("preview.shortTerm"),
  };

  const AMENITY_LABELS: Record<string, string> = {
    wifi: t("preview.amenityWifi"),
    parking: t("preview.amenityParking"),
    pool: t("preview.amenityPool"),
    gym: t("preview.amenityGym"),
    security: t("preview.amenitySecurity"),
    generator: t("preview.amenityGenerator"),
    water_tank: t("preview.amenityWaterTank"),
    furnished: t("preview.amenityFurnished"),
    air_conditioning: t("preview.amenityAC"),
    garden: t("preview.amenityGarden"),
    balcony: t("preview.amenityBalcony"),
    terrace: t("preview.amenityTerrace"),
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-CM").format(price);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm overflow-y-auto"
    >
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">{t("preview.title")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("preview.checkInfo")}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Image Gallery */}
          {data.images.length > 0 && (
            <div className="grid grid-cols-4 gap-1 max-h-[400px] overflow-hidden">
              <div className="col-span-2 row-span-2">
                <img
                  src={data.images[0]}
                  alt={t("preview.mainPhoto")}
                  className="w-full h-full object-cover"
                />
              </div>
              {data.images.slice(1, 5).map((img, i) => (
                <div key={i} className="relative">
                  <img src={img} alt={`Photo ${i + 2}`} className="w-full h-full object-cover" />
                  {i === 3 && data.images.length > 5 && (
                    <div className="absolute inset-0 bg-foreground/60 flex items-center justify-center text-card text-lg font-bold">
                      +{data.images.length - 5}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Title & Price */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">
                    {PROPERTY_TYPE_LABELS[data.property_type] || data.property_type}
                  </Badge>
                  <Badge variant="outline">
                    {LISTING_TYPE_LABELS[data.listing_type] || data.listing_type}
                  </Badge>
                </div>
                <h1 className="text-2xl font-bold text-foreground">{data.title || t("preview.noTitle")}</h1>
                <div className="flex items-center gap-1 text-muted-foreground mt-1">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {[data.neighborhood, data.city].filter(Boolean).join(", ") || t("preview.locationNotSpecified")}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-primary">
                  {formatPrice(data.price)} FCFA
                </p>
                <p className="text-sm text-muted-foreground">
                  / {data.price_unit === "month" ? t("preview.perMonth") : data.price_unit === "day" ? t("preview.perDay") : t("preview.sale")}
                </p>
                {data.deposit && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("preview.deposit")} : {formatPrice(data.deposit)} FCFA
                  </p>
                )}
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-secondary">
              <div className="flex items-center gap-2">
                <Bed className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">{data.bedrooms} {t("preview.bedrooms")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Bath className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">{data.bathrooms} {t("preview.bathrooms")}</span>
              </div>
              {data.area && (
                <div className="flex items-center gap-2">
                  <Maximize className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">{data.area} m²</span>
                </div>
              )}
            </div>

            {/* Description */}
            {data.description && (
              <div>
                <h3 className="font-semibold text-foreground mb-2">{t("preview.description")}</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{data.description}</p>
              </div>
            )}

            {/* Amenities */}
            {data.amenities.length > 0 && (
              <div>
                <h3 className="font-semibold text-foreground mb-3">{t("preview.amenities")}</h3>
                <div className="flex flex-wrap gap-2">
                  {data.amenities.map((amenity) => (
                    <div
                      key={amenity}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-sm"
                    >
                      <Check className="w-4 h-4 text-accent" />
                      {AMENITY_LABELS[amenity] || amenity}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Address */}
            {data.address && (
              <div>
                <h3 className="font-semibold text-foreground mb-2">{t("preview.address")}</h3>
                <p className="text-muted-foreground">{data.address}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-6 border-t border-border flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose} disabled={isPublishing}>
              {t("preview.modify")}
            </Button>
            <Button variant="hero" onClick={onPublish} disabled={isPublishing}>
              {isPublishing ? t("preview.publishing") : t("preview.publish")}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PropertyPreview;
