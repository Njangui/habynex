import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePropertyView } from "@/hooks/usePropertyView";
import Navbar from "@/components/Navbar";
import PropertyGallery from "@/components/PropertyGallery";
import PropertyMap from "@/components/PropertyMap";
import PropertyAmenities from "@/components/PropertyAmenities";
import PropertyCalendar from "@/components/PropertyCalendar";
import PropertyContactForm from "@/components/PropertyContactForm";
import { ReportDialog } from "@/components/ReportDialog";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { BookingDialog } from "@/components/BookingDialog";
import { PropertyRatingDialog } from "@/components/PropertyRatingDialog";
import { SimilarProperties } from "@/components/SimilarProperties";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Heart, 
  Share2, 
  MapPin, 
  Bed, 
  Bath, 
  Square,
  Star,
  Check,
  Home,
  User,
  Calendar,
  Shield,
  Loader2,
  AlertCircle,
  Flag,
  MessageCircle,
  Sofa,
  Utensils,
  DoorOpen,
  WashingMachine,
  BadgeCheck
} from "lucide-react";

// Types
interface Property {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  property_type: string;
  listing_type: string;
  address: string | null;
  city: string;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  price: number;
  price_unit: string;
  deposit: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  living_rooms: number | null;
  kitchens: number | null;
  dining_rooms: number | null;
  laundry_rooms: number | null;
  area: number | null;
  floor_number: number | null;
  total_floors: number | null;
  amenities: string[] | null;
  rules: string[] | null;
  min_stay_days: number | null;
  images: string[] | null;
  available_from: string | null;
  available_to: string | null;
  is_available: boolean;
  is_verified: boolean;
  is_agent_verified: boolean;
  created_at: string;
  visit_price?: number | null;
  rental_months?: number | null;
}

interface OwnerProfile {
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  phone: string | null;
  whatsapp_number: string | null;
}

const PropertyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  
  const [property, setProperty] = useState<Property | null>(null);
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  // Determine source from URL params or referrer
  const source = new URLSearchParams(location.search).get("source") as "search" | "recommendation" | "direct" | "assistant" || "direct";

  // Track property view
  usePropertyView({ 
    propertyId: id || "", 
    source 
  });

  useEffect(() => {
    if (id) {
      fetchProperty();
    }
  }, [id]);

  const fetchProperty = async () => {
    setLoading(true);

    try {
      // Fetch property
      const { data: propertyData, error: propertyError } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (propertyError) throw propertyError;

      if (propertyData) {
        setProperty(propertyData as Property);

        // Fetch owner profile
        const { data: ownerData } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, is_verified, phone, whatsapp_number")
          .eq("user_id", propertyData.owner_id)
          .maybeSingle();

        if (ownerData) {
          setOwner(ownerData);
        }

        // Check if favorited
        if (user) {
          const { data: favData } = await supabase
            .from("property_favorites")
            .select("id")
            .eq("property_id", id)
            .eq("user_id", user.id)
            .maybeSingle();
          
          setIsFavorite(!!favData);
        }
      } else {
        // No property found
        setProperty(null);
      }
    } catch (error) {
      console.error("Error fetching property:", error);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("error.generic"),
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      toast({
        title: t("toast.loginRequired"),
        description: t("toast.loginToFavorite"),
      });
      return;
    }

    if (!property) return;

    try {
      if (isFavorite) {
        await supabase
          .from("property_favorites")
          .delete()
          .eq("property_id", property.id)
          .eq("user_id", user.id);
        setIsFavorite(false);
        toast({ title: t("toast.removedFromFavorites") });
      } else {
        await supabase
          .from("property_favorites")
          .insert({ property_id: property.id, user_id: user.id });
        setIsFavorite(true);
        toast({ title: t("toast.addedToFavorites") });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("error.generic"),
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: property?.title,
          url: window.location.href,
        });
      } catch (e) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: t("toast.linkCopied") });
    }
  };

  const getPropertyTypeLabel = (type: string) => {
    const labels: Record<string, Record<string, string>> = {
      studio: { fr: "Studio", en: "Studio" },
      apartment: { fr: "Appartement", en: "Apartment" },
      house: { fr: "Maison", en: "House" },
      room: { fr: "Chambre", en: "Room" },
      villa: { fr: "Villa", en: "Villa" },
    };
    return labels[type]?.[language] || type;
  };

  const getListingTypeLabel = (type: string) => {
    const labels: Record<string, Record<string, string>> = {
      rent: { fr: "Location", en: "Rent" },
      sale: { fr: "Vente", en: "Sale" },
      colocation: { fr: "Colocation", en: "Roommate" },
      short_term: { fr: "Courte durée", en: "Short stay" },
    };
    return labels[type]?.[language] || type;
  };

  const getPriceUnitLabel = (unit: string) => {
    const labels: Record<string, Record<string, string>> = {
      month: { fr: "mois", en: "month" },
      day: { fr: "jour", en: "day" },
    };
    return labels[unit]?.[language] || (language === "fr" ? "vente" : "sale");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 text-center">
            <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">
              {language === "fr" ? "Annonce introuvable" : "Property not found"}
            </h1>
            <p className="text-muted-foreground mb-6">
              {language === "fr" 
                ? "Cette annonce n'existe pas ou a été supprimée." 
                : "This property does not exist or has been removed."}
            </p>
            <Button onClick={() => navigate("/")}>
              {language === "fr" ? "Retour à l'accueil" : "Back to home"}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{property.title} | Habynex</title>
        <meta name="description" content={property.description?.slice(0, 160) || `${property.title} - ${property.city}`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="pt-20 pb-16">
          <div className="container mx-auto px-4">
            {/* Back & Actions */}
            <div className="flex items-center justify-between py-4">
              <button
                onClick={() => {
                  // If user came from a shared link (no history), go to homepage
                  if (window.history.length <= 2) {
                    navigate("/");
                  } else {
                    navigate(-1);
                  }
                }}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{language === "fr" ? "Retour" : "Back"}</span>
              </button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleFavorite}
                  className="rounded-full"
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? "fill-primary text-primary" : ""}`} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleShare}
                  className="rounded-full"
                >
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Gallery */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <PropertyGallery 
                images={property.images || []} 
                title={property.title} 
              />
            </motion.div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {getListingTypeLabel(property.listing_type)}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                      {getPropertyTypeLabel(property.property_type)}
                    </span>
                    {property.is_verified && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        {language === "fr" ? "Vérifié" : "Verified"}
                      </span>
                    )}
                    {property.is_agent_verified && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1">
                        <BadgeCheck className="w-3 h-3" />
                        {language === "fr" ? "Agent Vérifié" : "Agent Verified"}
                      </span>
                    )}
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                    {property.title}
                  </h1>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{property.neighborhood ? `${property.neighborhood}, ` : ""}{property.city}</span>
                  </div>

                  {/* Quick Stats */}
                  <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-border">
                    {property.bedrooms !== null && (
                      <div className="flex items-center gap-2">
                        <Bed className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium">{property.bedrooms}</span>
                        <span className="text-muted-foreground">
                          {language === "fr" 
                            ? `chambre${property.bedrooms > 1 ? "s" : ""}` 
                            : `bedroom${property.bedrooms > 1 ? "s" : ""}`}
                        </span>
                      </div>
                    )}
                    {property.bathrooms !== null && (
                      <div className="flex items-center gap-2">
                        <Bath className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium">{property.bathrooms}</span>
                        <span className="text-muted-foreground">
                          {language === "fr" 
                            ? `sdb${property.bathrooms > 1 ? "s" : ""}` 
                            : `bath${property.bathrooms > 1 ? "s" : ""}`}
                        </span>
                      </div>
                    )}
                    {property.living_rooms !== null && (
                      <div className="flex items-center gap-2">
                        <Sofa className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium">{property.living_rooms}</span>
                        <span className="text-muted-foreground">
                          {language === "fr" 
                            ? `salon${property.living_rooms > 1 ? "s" : ""}` 
                            : `living room${property.living_rooms > 1 ? "s" : ""}`}
                        </span>
                      </div>
                    )}
                    {property.kitchens !== null && (
                      <div className="flex items-center gap-2">
                        <Utensils className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium">{property.kitchens}</span>
                        <span className="text-muted-foreground">
                          {language === "fr" 
                            ? `cuisine${property.kitchens > 1 ? "s" : ""}` 
                            : `kitchen${property.kitchens > 1 ? "s" : ""}`}
                        </span>
                      </div>
                    )}
                    {property.dining_rooms !== null && (
                      <div className="flex items-center gap-2">
                        <DoorOpen className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium">{property.dining_rooms}</span>
                        <span className="text-muted-foreground">
                          {language === "fr" 
                            ? `salle à manger${property.dining_rooms > 1 ? "s" : ""}` 
                            : `dining room${property.dining_rooms > 1 ? "s" : ""}`}
                        </span>
                      </div>
                    )}
                    {property.laundry_rooms !== null && (
                      <div className="flex items-center gap-2">
                        <WashingMachine className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium">{property.laundry_rooms}</span>
                        <span className="text-muted-foreground">
                          {language === "fr" 
                            ? `buanderie${property.laundry_rooms > 1 ? "s" : ""}` 
                            : `laundry${property.laundry_rooms > 1 ? " rooms" : " room"}`}
                        </span>
                      </div>
                    )}
                    {property.area && (
                      <div className="flex items-center gap-2">
                        <Square className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium">{property.area}</span>
                        <span className="text-muted-foreground">m²</span>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Description */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-4"
                >
                  <h2 className="text-lg font-semibold text-foreground">
                    {language === "fr" ? "Description" : "Description"}
                  </h2>
                  <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-line">
                    {property.description || (language === "fr" ? "Aucune description disponible." : "No description available.")}
                  </div>
                </motion.div>

                {/* Amenities */}
                {property.amenities && property.amenities.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <PropertyAmenities amenities={property.amenities} />
                  </motion.div>
                )}

                {/* Rules */}
                {property.rules && property.rules.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="space-y-4"
                  >
                    <h3 className="text-lg font-semibold text-foreground">
                      {language === "fr" ? "Règles du logement" : "House Rules"}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {property.rules.map((rule, i) => (
                        <span
                          key={i}
                          className="px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm"
                        >
                          {rule}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Map - Enhanced with larger dimensions */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-semibold text-foreground">
                    {language === "fr" ? "Localisation" : "Location"}
                  </h3>
                  <div className="h-[450px] rounded-xl overflow-hidden border border-border shadow-sm">
                    <PropertyMap
                      latitude={property.latitude || undefined}
                      longitude={property.longitude || undefined}
                      address={property.address || undefined}
                      city={property.city}
                      neighborhood={property.neighborhood || undefined}
                    />
                  </div>
                  {property.address && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {property.address}
                    </p>
                  )}
                </motion.div>

                {/* Similar Properties - AI Recommendations */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="pt-8 border-t border-border"
                >
                  <SimilarProperties 
                    currentPropertyId={property.id}
                    propertyType={property.property_type}
                    city={property.city}
                    price={property.price}
                  />
                </motion.div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Price Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="sticky top-24 space-y-6"
                >
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-foreground">
                        {property.price.toLocaleString('fr-FR')} FCFA
                      </span>
                      <span className="text-muted-foreground">
                        /{getPriceUnitLabel(property.price_unit)}
                      </span>
                    </div>

                    {property.deposit && (
                      <div className="flex items-center justify-between py-2 border-t border-border">
                        <span className="text-muted-foreground">{t("property.deposit")}</span>
                        <span className="font-medium">{property.deposit.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                    )}

                    {property.min_stay_days && (
                      <div className="flex items-center justify-between py-2 border-t border-border">
                        <span className="text-muted-foreground">{t("property.minStay")}</span>
                        <span className="font-medium">{property.min_stay_days} {t("property.days")}</span>
                      </div>
                    )}

                    {property.visit_price && (
                      <div className="flex items-center justify-between py-2 border-t border-border">
                        <span className="text-muted-foreground">
                          {language === "fr" ? "Prix de visite" : "Visit price"}
                        </span>
                        <span className="font-medium">{property.visit_price.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                    )}

                    {property.rental_months && (
                      <div className="flex items-center justify-between py-2 border-t border-border">
                        <span className="text-muted-foreground">
                          {language === "fr" ? "Durée du bail" : "Lease duration"}
                        </span>
                        <span className="font-medium">{property.rental_months} {language === "fr" ? "mois" : "months"}</span>
                      </div>
                    )}

                    <BookingDialog
                      propertyId={property.id}
                      propertyTitle={property.title}
                      ownerId={property.owner_id}
                      ownerName={owner?.full_name || undefined}
                    >
                      <Button variant="hero" size="lg" className="w-full mt-4">
                        {t("property.reserveVisit")}
                      </Button>
                    </BookingDialog>

                    {/* Message Button */}
                    {user && property.owner_id !== user.id && (
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full mt-2 gap-2"
                        onClick={async () => {
                          try {
                            // Find or create conversation
                            const { data: existingConv } = await supabase
                              .from("conversations")
                              .select("id")
                              .eq("property_id", property.id)
                              .eq("tenant_id", user.id)
                              .eq("owner_id", property.owner_id)
                              .maybeSingle();

                            if (existingConv) {
                              navigate(`/messages?conversation=${existingConv.id}`);
                            } else {
                              const { data: newConv, error } = await supabase
                                .from("conversations")
                                .insert({
                                  property_id: property.id,
                                  tenant_id: user.id,
                                  owner_id: property.owner_id,
                                })
                                .select("id")
                                .single();
                              if (error) throw error;
                              navigate(`/messages?conversation=${newConv.id}`);
                            }
                          } catch (error) {
                            console.error("Error opening conversation:", error);
                            toast({ variant: "destructive", title: t("common.error") });
                          }
                        }}
                      >
                        <MessageCircle className="w-5 h-5" />
                        {language === "fr" ? "Envoyer un message" : "Send a message"}
                      </Button>
                    )}
                    
                    {/* WhatsApp Button - Use whatsapp_number first, then phone */}
                    <WhatsAppButton
                      phoneNumber={owner?.whatsapp_number || owner?.phone || null}
                      propertyTitle={property.title}
                      className="w-full mt-2"
                    />
                  </div>

                  {/* Owner Card */}
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                        <User className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {owner?.full_name || (language === "fr" ? "Propriétaire" : "Owner")}
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                          {owner?.is_verified && (
                            <span className="flex items-center gap-1 text-accent">
                              <Shield className="w-3 h-3" />
                              {language === "fr" ? "Vérifié" : "Verified"}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Star className="w-3 h-3 fill-gold text-gold" />
                            4.8
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Rating Button */}
                    {user && property.owner_id !== user.id && (
                      <PropertyRatingDialog propertyId={property.id} propertyTitle={property.title}>
                        <Button variant="outline" size="sm" className="w-full mt-3 gap-2">
                          <Star className="w-4 h-4" />
                          {language === "fr" ? "Noter cette annonce" : "Rate this listing"}
                        </Button>
                      </PropertyRatingDialog>
                    )}

                    {/* Report Button */}
                    <ReportDialog 
                      propertyId={property.id} 
                      userId={property.owner_id}
                    />
                  </div>

                  {/* Calendar */}
                  <PropertyCalendar
                    availableFrom={property.available_from}
                    availableTo={property.available_to}
                    isAvailable={property.is_available}
                  />

                  {/* Contact Form */}
                  <PropertyContactForm
                    propertyId={property.id}
                    ownerName={owner?.full_name || undefined}
                  />
                </motion.div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default PropertyDetail;