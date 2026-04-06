import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useVerification } from "@/hooks/useVerification";
import { TrustBadges, TrustScore } from "@/components/TrustBadge";
import Navbar from "@/components/Navbar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Camera, 
  Loader2,
  CheckCircle,
  Home,
  Save,
  ArrowLeft,
  Upload,
  Shield,
  ChevronRight,
  Wallet,
  Heart,
  Settings,
  MessageSquare,
  Building2,
  Trees,
  Sofa,
  Utensils,
  DoorOpen,
  WashingMachine,
  Scissors,
  Coffee,
  UtensilsCrossed,
  Wine,
  BedDouble,
  Pill,
  Stethoscope,
  Dumbbell,
  Users,
  Presentation,
  Wrench,
  Sparkles as SparklesIcon,
  Wifi,
  Car,
  Waves,
  Zap,
  Droplet,
  Wind,
  Store,
  Warehouse,
} from "lucide-react";
import { compressImage } from "@/utils/compressImage";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  phone_verified: boolean;
  email_verified: boolean;
  user_type: string;
  city: string | null;
  budget_min: number | null;
  budget_max: number | null;
  bio: string | null;
  is_verified: boolean;
  whatsapp_number: string | null;
  preferred_property_types: string[] | null;
  preferred_neighborhoods: string[] | null;
  preferred_listing_types: string[] | null;
  preferred_amenities: string[] | null;
  move_in_timeline: string | null;
  // Nouveaux champs depuis create_listing
  property_type?: string | null;
  listing_type?: string | null;
  deposit?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_min?: number | null;
  area_max?: number | null;
  is_furnished?: boolean | null;
  floor?: number | null;
  needs_elevator?: boolean | null;
  needs_parking?: boolean | null;
  needs_internet?: boolean | null;
  needs_generator?: boolean | null;
  needs_water_tank?: boolean | null;
  needs_security?: boolean | null;
  needs_cleaning?: boolean | null;
  visit_price?: number | null;
  rental_months?: number | null;
  rules?: string | null;
}

const defaultAvatars = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=James",
];

const ProfilePage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const { verification, badges, loading: verificationLoading } = useVerification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state - Personal Info
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [userType, setUserType] = useState<string>("seeker");
  
  // Form state - Preferences (for seekers)
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [preferredPropertyTypes, setPreferredPropertyTypes] = useState<string[]>([]);
  const [preferredNeighborhoods, setPreferredNeighborhoods] = useState("");
  const [preferredListingTypes, setPreferredListingTypes] = useState<string[]>([]);
  const [preferredAmenities, setPreferredAmenities] = useState<string[]>([]);
  const [moveInTimeline, setMoveInTimeline] = useState("");

  // Nouveaux états depuis create_listing
  const [propertyType, setPropertyType] = useState<string>("apartment");
  const [listingType, setListingType] = useState<string>("rent");
  const [deposit, setDeposit] = useState("");
  const [bedrooms, setBedrooms] = useState<number | null>(null);
  const [bathrooms, setBathrooms] = useState<number | null>(null);
  const [areaMin, setAreaMin] = useState("");
  const [areaMax, setAreaMax] = useState("");
  const [isFurnished, setIsFurnished] = useState(false);
  const [floor, setFloor] = useState<number | null>(null);
  const [needsElevator, setNeedsElevator] = useState(false);
  const [needsParking, setNeedsParking] = useState(false);
  const [needsInternet, setNeedsInternet] = useState(false);
  const [needsGenerator, setNeedsGenerator] = useState(false);
  const [needsWaterTank, setNeedsWaterTank] = useState(false);
  const [needsSecurity, setNeedsSecurity] = useState(false);
  const [needsCleaning, setNeedsCleaning] = useState(false);
  const [visitPrice, setVisitPrice] = useState("");
  const [rentalMonths, setRentalMonths] = useState("");
  const [rules, setRules] = useState("");

  // Translated options
  const PROPERTY_TYPES = [
    { value: "studio", label: t("property.studio"), icon: "🏢", category: "residential" },
    { value: "room", label: t("property.room"), icon: "🛏️", category: "residential" },
    { value: "apartment", label: t("property.apartment"), icon: "🏠", category: "residential" },
    { value: "duplex", label: language === "fr" ? "Duplex" : "Duplex", icon: "🏘️", category: "residential" },
    { value: "house", label: t("property.house"), icon: "🏡", category: "residential" },
    { value: "villa", label: t("property.villa"), icon: "🏰", category: "residential" },
    { value: "penthouse", label: "Penthouse", icon: "🏙️", category: "residential" },
    { value: "furnished_apartment", label: "Appartement meublé", icon: "🛋️", category: "residential" },
    { value: "shared_room", label: "Chambre partagée", icon: "👥", category: "residential" },
    { value: "land", label: language === "fr" ? "Terrain" : "Land", icon: "🌳", category: "land" },
    { value: "shop", label: language === "fr" ? "Boutique" : "Shop", icon: "🛍️", category: "commercial" },
    { value: "store", label: language === "fr" ? "Magasin" : "Store", icon: "🏪", category: "commercial" },
    { value: "commercial_space", label: language === "fr" ? "Espace commercial" : "Commercial space", icon: "🏢", category: "commercial" },
    { value: "warehouse", label: language === "fr" ? "Entrepôt" : "Warehouse", icon: "🏭", category: "commercial" },
    { value: "office", label: language === "fr" ? "Bureau" : "Office", icon: "💼", category: "commercial" },
    { value: "building", label: language === "fr" ? "Bâtiment" : "Building", icon: "🏗️", category: "commercial" },
    { value: "beauty_salon", label: language === "fr" ? "Institut de beauté" : "Beauty salon", icon: "✨", category: "commercial" },
    { value: "hair_salon", label: language === "fr" ? "Salon de coiffure" : "Hair salon", icon: "💇", category: "commercial" },
    { value: "gym", label: language === "fr" ? "Salle de sport" : "Gym", icon: "💪", category: "commercial" },
    { value: "pharmacy", label: language === "fr" ? "Pharmacie" : "Pharmacy", icon: "💊", category: "commercial" },
    { value: "clinic", label: language === "fr" ? "Clinique" : "Clinic", icon: "🏥", category: "commercial" },
    { value: "restaurant", label: language === "fr" ? "Restaurant" : "Restaurant", icon: "🍽️", category: "commercial" },
    { value: "cafe", label: language === "fr" ? "Café" : "Café", icon: "☕", category: "commercial" },
    { value: "bar", label: language === "fr" ? "Bar" : "Bar", icon: "🍸", category: "commercial" },
    { value: "hotel", label: language === "fr" ? "Hôtel" : "Hotel", icon: "🏨", category: "commercial" },
    { value: "coworking", label: language === "fr" ? "Espace coworking" : "Coworking space", icon: "👥", category: "commercial" },
    { value: "showroom", label: language === "fr" ? "Showroom" : "Showroom", icon: "🎨", category: "commercial" },
    { value: "workshop", label: language === "fr" ? "Atelier" : "Workshop", icon: "🔧", category: "commercial" },
  ];

  const LISTING_TYPES = [
    { value: "rent", label: t("listing.rent"), description: language === "fr" ? "Location mensuelle" : "Monthly rent" },
    { value: "sale", label: t("listing.sale"), description: language === "fr" ? "Vente immobilière" : "Real estate sale" },
    { value: "colocation", label: t("listing.colocation"), description: language === "fr" ? "Partage de logement" : "Shared housing" },
    { value: "short_term", label: t("listing.shortTerm"), description: language === "fr" ? "Location journalière" : "Daily rental" },
  ];

  const ALL_AMENITIES = [
    { value: "closet", label: "Placard", icon: DoorOpen },
    { value: "water_heater", label: "Chauffe-eau", icon: Utensils },
    { value: "kitchen_cabinets", label: "Placards cuisine", icon: UtensilsCrossed },
    { value: "tiled_floor", label: "Carrelage", icon: Sofa },
    { value: "ceiling_fan", label: "Ventilateur plafond", icon: Sofa },
    { value: "backup_generator", label: "Groupe électrogène", icon: Wrench },
    { value: "fence", label: "Clôture", icon: Trees },
    { value: "gate", label: "Portail", icon: DoorOpen },
    { value: "paved_road", label: "Route goudronnée", icon: Trees },
    { value: "near_main_road", label: "Proche route principale", icon: Trees },
    { value: "school_nearby", label: "École à proximité", icon: Building2 },
    { value: "market_nearby", label: "Marché à proximité", icon: Store },
    { value: "wifi", label: t("amenity.wifi"), icon: Wifi },
    { value: "parking", label: t("amenity.parking"), icon: Car },
    { value: "pool", label: t("amenity.pool"), icon: Waves },
    { value: "gym", label: t("amenity.gym"), icon: Dumbbell },
    { value: "security", label: t("amenity.security"), icon: Shield },
    { value: "generator", label: t("amenity.generator"), icon: Zap },
    { value: "water_tank", label: t("amenity.waterTank"), icon: Droplet },
    { value: "furnished", label: t("amenity.furnished"), icon: Sofa },
    { value: "air_conditioning", label: t("amenity.airConditioning"), icon: Wind },
    { value: "garden", label: t("amenity.garden"), icon: Trees },
    { value: "balcony", label: t("amenity.balcony"), icon: Building2 },
    { value: "terrace", label: t("amenity.terrace"), icon: Building2 },
    { value: "electricity_prepaid", label: language === "fr" ? "Lumière (prépayée)" : "Electricity (prepaid)", icon: Zap },
    { value: "electricity_postpaid", label: language === "fr" ? "Lumière (fin de mois)" : "Electricity (monthly)", icon: Zap },
    { value: "water_borehole", label: language === "fr" ? "Eau (forage)" : "Water (borehole)", icon: Droplet },
    { value: "water_tap", label: language === "fr" ? "Eau (robinet)" : "Water (tap)", icon: Droplet },
    { value: "cctv", label: language === "fr" ? "Caméra de surveillance" : "CCTV", icon: Camera },
    { value: "elevator", label: language === "fr" ? "Ascenseur" : "Elevator", icon: Building2 },
    { value: "reception", label: language === "fr" ? "Réception" : "Reception", icon: Users },
    { value: "storage", label: language === "fr" ? "Stockage" : "Storage", icon: Warehouse },
    { value: "loading_dock", label: language === "fr" ? "Quai de chargement" : "Loading dock", icon: Wrench },
    { value: "meeting_room", label: language === "fr" ? "Salle de réunion" : "Meeting room", icon: Presentation },
    { value: "display_window", label: language === "fr" ? "Vitrine" : "Display window", icon: Store },
    { value: "kitchen_facilities", label: language === "fr" ? "Cuisine équipée" : "Kitchen facilities", icon: UtensilsCrossed },
    { value: "bar_counter", label: language === "fr" ? "Comptoir bar" : "Bar counter", icon: Wine },
    { value: "dining_area", label: language === "fr" ? "Espace restauration" : "Dining area", icon: Utensils },
    { value: "alarm_system", label: language === "fr" ? "Système d'alarme" : "Alarm system", icon: Shield },
    { value: "fire_safety", label: language === "fr" ? "Sécurité incendie" : "Fire safety", icon: Shield },
    { value: "handicap_access", label: language === "fr" ? "Accès handicapé" : "Handicap access", icon: Users },
    { value: "high_ceiling", label: language === "fr" ? "Haut plafond" : "High ceiling", icon: Building2 },
    { value: "loading_area", label: language === "fr" ? "Zone de chargement" : "Loading area", icon: Wrench },
  ];

  const MOVE_TIMELINES = [
    { value: "immediate", label: t("profile.immediate") },
    { value: "within_month", label: t("profile.withinMonth") },
    { value: "within_3months", label: t("profile.within3Months") },
    { value: "flexible", label: t("profile.flexible") },
  ];

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
        setWhatsappNumber(data.whatsapp_number || "");
        setCity(data.city || "");
        setBio(data.bio || "");
        setUserType(data.user_type || "seeker");
        setBudgetMin(data.budget_min?.toString() || "");
        setBudgetMax(data.budget_max?.toString() || "");
        setAvatarUrl(data.avatar_url);
        setPreferredPropertyTypes(data.preferred_property_types || []);
        setPreferredNeighborhoods(data.preferred_neighborhoods?.join(", ") || "");
        setPreferredListingTypes(data.preferred_listing_types || []);
        setPreferredAmenities(data.preferred_amenities || []);
        setMoveInTimeline(data.move_in_timeline || "");
        
        // Chargement des nouveaux champs
        setPropertyType(data.property_type || "apartment");
        setListingType(data.listing_type || "rent");
        setDeposit(data.deposit?.toString() || "");
        setBedrooms(data.bedrooms);
        setBathrooms(data.bathrooms);
        setAreaMin(data.area_min?.toString() || "");
        setAreaMax(data.area_max?.toString() || "");
        setIsFurnished(data.is_furnished || false);
        setFloor(data.floor);
        setNeedsElevator(data.needs_elevator || false);
        setNeedsParking(data.needs_parking || false);
        setNeedsInternet(data.needs_internet || false);
        setNeedsGenerator(data.needs_generator || false);
        setNeedsWaterTank(data.needs_water_tank || false);
        setNeedsSecurity(data.needs_security || false);
        setNeedsCleaning(data.needs_cleaning || false);
        setVisitPrice(data.visit_price?.toString() || "");
        setRentalMonths(data.rental_months?.toString() || "");
        setRules(data.rules || "");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("profile.loadError"),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    try {
      const compressedFile = await compressImage(file);
      const fileExt = compressedFile.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, compressedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const url = `${publicUrl}?t=${Date.now()}`;
      setAvatarUrl(url);

      await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("user_id", user.id);

      toast({ title: t("profile.avatarUpdated") });
      setAvatarDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message || t("profile.uploadError"),
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSelectAvatar = async (url: string) => {
    if (!user) return;

    setUploadingAvatar(true);
    try {
      setAvatarUrl(url);
      await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("user_id", user.id);

      toast({ title: t("profile.avatarSelected") });
      setAvatarDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message || t("profile.selectError"),
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const toggleArrayValue = (array: string[], value: string, setter: (arr: string[]) => void) => {
    if (array.includes(value)) {
      setter(array.filter(v => v !== value));
    } else {
      setter([...array, value]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const neighborhoods = preferredNeighborhoods
        ? preferredNeighborhoods.split(",").map(n => n.trim()).filter(Boolean)
        : [];

      const updates: Record<string, any> = {
        user_id: user.id,
        full_name: fullName,
        phone,
        whatsapp_number: whatsappNumber || null,
        city,
        bio,
        budget_min: budgetMin ? parseInt(budgetMin) : null,
        budget_max: budgetMax ? parseInt(budgetMax) : null,
        preferred_property_types: preferredPropertyTypes,
        preferred_neighborhoods: neighborhoods,
        preferred_listing_types: preferredListingTypes,
        preferred_amenities: preferredAmenities,
        move_in_timeline: moveInTimeline || null,
        // Nouveaux champs
        property_type: propertyType,
        listing_type: listingType,
        deposit: deposit ? parseInt(deposit) : null,
        bedrooms,
        bathrooms,
        area_min: areaMin ? parseInt(areaMin) : null,
        area_max: areaMax ? parseInt(areaMax) : null,
        is_furnished: isFurnished,
        floor,
        needs_elevator: needsElevator,
        needs_parking: needsParking,
        needs_internet: needsInternet,
        needs_generator: needsGenerator,
        needs_water_tank: needsWaterTank,
        needs_security: needsSecurity,
        needs_cleaning: needsCleaning,
        visit_price: visitPrice ? parseInt(visitPrice) : null,
        rental_months: rentalMonths ? parseInt(rentalMonths) : null,
        rules: rules || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: t("profile.updated"),
        description: t("profile.updatedDesc"),
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message || t("profile.saveError"),
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const isSeeker = userType === "seeker";
  const isOwner = userType === "owner" || userType === "agent" || userType === "agency";
  const showTrustScore = isOwner;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Back Button */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t("profile.backToHome")}</span>
          </button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl shadow-elegant border border-border overflow-hidden"
          >
            {/* Header */}
            <div className="gradient-primary p-8 text-primary-foreground">
              <div className="flex items-center gap-4">
                <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
                  <DialogTrigger asChild>
                    <div className="relative cursor-pointer group">
                      <div className="w-20 h-20 rounded-full bg-primary-foreground/20 flex items-center justify-center overflow-hidden">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-10 h-10" />
                        )}
                      </div>
                      <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                      <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-card text-foreground flex items-center justify-center shadow-md hover:bg-secondary transition-colors">
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>{t("profile.choosePhoto")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      {/* Upload Section */}
                      <div>
                        <Label className="text-sm font-medium mb-3 block">{t("profile.uploadImage")}</Label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                        />
                        <Button
                          variant="outline"
                          className="w-full gap-2"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingAvatar}
                        >
                          {uploadingAvatar ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                          {t("profile.chooseImage")}
                        </Button>
                      </div>

                      {/* Default Avatars */}
                      <div>
                        <Label className="text-sm font-medium mb-3 block">{t("profile.orChooseAvatar")}</Label>
                        <div className="grid grid-cols-4 gap-3">
                          {defaultAvatars.map((avatar, i) => (
                            <button
                              key={i}
                              onClick={() => handleSelectAvatar(avatar)}
                              disabled={uploadingAvatar}
                              className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-all hover:scale-110 ${
                                avatarUrl === avatar ? "border-primary ring-2 ring-primary/50" : "border-border"
                              }`}
                            >
                              <img src={avatar} alt={`Avatar ${i + 1}`} className="w-full h-full" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold">{fullName || t("profile.yourProfile")}</h1>
                  <p className="text-primary-foreground/80">{user.email}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {badges.length > 0 ? (
                      <TrustBadges badges={badges} size="sm" />
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-primary-foreground/20">
                        {t("profile.notVerified")}
                      </span>
                    )}
                    {showTrustScore && verification && (
                      <TrustScore score={verification.trust_score} size="sm" showLabel={false} />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Verification CTA - Only for property providers */}
            {showTrustScore && (
              <button
                onClick={() => navigate("/verification")}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-primary/5 to-accent/5 hover:from-primary/10 hover:to-accent/10 transition-colors border-b border-border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">{t("profile.verificationCTA")}</p>
                    <p className="text-xs text-muted-foreground">
                      {verification?.trust_score || 0}/100 {t("profile.points")} • {t("profile.increaseCredibility")}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            )}

            {/* Tabs for different sections */}
            <Tabs defaultValue="personal" className="p-6">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="personal" className="gap-2">
                  <User className="w-4 h-4" />
                  {t("profile.personalInfo")}
                </TabsTrigger>
                {isSeeker && (
                  <TabsTrigger value="preferences" className="gap-2">
                    <Heart className="w-4 h-4" />
                    {t("profile.preferences")}
                  </TabsTrigger>
                )}
                {isOwner && (
                  <TabsTrigger value="owner" className="gap-2">
                    <Settings className="w-4 h-4" />
                    {t("profile.ownerSettings")}
                  </TabsTrigger>
                )}
              </TabsList>

              <form onSubmit={handleSave}>
                {/* Personal Info Tab */}
                <TabsContent value="personal" className="space-y-6">
                {/* User Type - Read Only (defined at signup) */}
                  <div className="space-y-3">
                    <Label>{t("profile.iAm")}</Label>
                    <div className="px-4 py-3 rounded-xl border border-border bg-muted/50">
                      <span className="text-sm font-medium text-foreground">
                        {userType === "seeker" ? t("profile.seeker") : 
                         userType === "owner" ? t("profile.ownerLabel") : 
                         userType === "agent" ? (language === "fr" ? "Agent immobilier" : "Real estate agent") :
                         userType === "agency" ? (language === "fr" ? "Agence immobilière" : "Real estate agency") :
                         t("profile.seeker")}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {language === "fr" ? "Défini lors de l'inscription" : "Set during registration"}
                      </p>
                    </div>
                  </div>

                  {/* Personal Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">{t("profile.fullName")}</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="fullName"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Jean Dupont"
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">{t("profile.phone")}</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+237 6 00 00 00 00"
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="whatsapp" className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-green-500" />
                        {language === "fr" ? "Numéro WhatsApp" : "WhatsApp Number"}
                        <span className="text-xs text-muted-foreground">
                          ({language === "fr" ? "optionnel" : "optional"})
                        </span>
                      </Label>
                      <div className="relative">
                        <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                        <Input
                          id="whatsapp"
                          value={whatsappNumber}
                          onChange={(e) => setWhatsappNumber(e.target.value)}
                          placeholder="+237 6 00 00 00 00"
                          className="pl-10"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {language === "fr" 
                          ? "Ce numéro sera utilisé par défaut pour le bouton WhatsApp de vos annonces" 
                          : "This number will be used by default for the WhatsApp button on your listings"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">{t("profile.city")}</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Yaoundé, Douala..."
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <Label htmlFor="bio">{t("profile.aboutMe")}</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder={t("profile.aboutMePlaceholder")}
                      rows={4}
                    />
                  </div>
                </TabsContent>

                {/* Preferences Tab (Seekers) */}
                {isSeeker && (
                  <TabsContent value="preferences" className="space-y-6">
                    {/* Type de bien préféré */}
                    <div className="space-y-3">
                      <Label>{language === "fr" ? "Type de bien recherché" : "Property type wanted"}</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {PROPERTY_TYPES.filter(p => p.category === "residential").map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setPropertyType(type.value)}
                            className={`p-4 rounded-xl border-2 text-center transition-all ${
                              propertyType === type.value
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <span className="text-2xl block mb-1">{type.icon}</span>
                            <span className="text-sm font-medium text-foreground">{type.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Type d'annonce */}
                    <div className="space-y-3">
                      <Label>{language === "fr" ? "Type d'annonce" : "Listing type"}</Label>
                      <div className="grid grid-cols-2 gap-4">
                        {LISTING_TYPES.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setListingType(type.value)}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${
                              listingType === type.value
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <span className="font-medium text-foreground block">{type.label}</span>
                            <span className="text-xs text-muted-foreground">{type.description}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Budget */}
                    <div className="space-y-3">
                      <Label>{t("profile.monthlyBudget")}</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                          <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            type="number"
                            value={budgetMin}
                            onChange={(e) => setBudgetMin(e.target.value)}
                            placeholder={t("profile.budgetMin")}
                            className="pl-10"
                          />
                        </div>
                        <div className="relative">
                          <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            type="number"
                            value={budgetMax}
                            onChange={(e) => setBudgetMax(e.target.value)}
                            placeholder={t("profile.budgetMax")}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Chambres et salles de bain */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{language === "fr" ? "Chambres souhaitées" : "Desired bedrooms"}</Label>
                        <div className="flex items-center gap-3">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="icon"
                            onClick={() => setBedrooms(Math.max(0, (bedrooms || 0) - 1))}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center font-medium">{bedrooms || 0}</span>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="icon"
                            onClick={() => setBedrooms((bedrooms || 0) + 1)}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>{language === "fr" ? "Salles de bain" : "Bathrooms"}</Label>
                        <div className="flex items-center gap-3">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="icon"
                            onClick={() => setBathrooms(Math.max(0, (bathrooms || 0) - 1))}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center font-medium">{bathrooms || 0}</span>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="icon"
                            onClick={() => setBathrooms((bathrooms || 0) + 1)}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Surface */}
                    <div className="space-y-3">
                      <Label>{language === "fr" ? "Surface souhaitée (m²)" : "Desired area (sqm)"}</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          type="number"
                          value={areaMin}
                          onChange={(e) => setAreaMin(e.target.value)}
                          placeholder={language === "fr" ? "Min" : "Min"}
                        />
                        <Input
                          type="number"
                          value={areaMax}
                          onChange={(e) => setAreaMax(e.target.value)}
                          placeholder={language === "fr" ? "Max" : "Max"}
                        />
                      </div>
                    </div>

                    {/* Move Timeline */}
                    <div className="space-y-3">
                      <Label>{t("profile.moveInWhen")}</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {MOVE_TIMELINES.map((timeline) => (
                          <button
                            key={timeline.value}
                            type="button"
                            onClick={() => setMoveInTimeline(timeline.value)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              moveInTimeline === timeline.value
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            }`}
                          >
                            {timeline.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Neighborhoods */}
                    <div className="space-y-2">
                      <Label htmlFor="neighborhoods">{t("profile.preferredNeighborhoods")}</Label>
                      <Input
                        id="neighborhoods"
                        value={preferredNeighborhoods}
                        onChange={(e) => setPreferredNeighborhoods(e.target.value)}
                        placeholder={t("profile.neighborhoodsPlaceholder")}
                      />
                    </div>

                    {/* Options booléennes */}
                    <div className="space-y-3">
                      <Label>{language === "fr" ? "Options souhaitées" : "Desired options"}</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                          <span className="text-sm">{language === "fr" ? "Meublé" : "Furnished"}</span>
                          <Switch checked={isFurnished} onCheckedChange={setIsFurnished} />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                          <span className="text-sm">{language === "fr" ? "Ascenseur" : "Elevator"}</span>
                          <Switch checked={needsElevator} onCheckedChange={setNeedsElevator} />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                          <span className="text-sm">{language === "fr" ? "Parking" : "Parking"}</span>
                          <Switch checked={needsParking} onCheckedChange={setNeedsParking} />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                          <span className="text-sm">WiFi</span>
                          <Switch checked={needsInternet} onCheckedChange={setNeedsInternet} />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                          <span className="text-sm">{language === "fr" ? "Générateur" : "Generator"}</span>
                          <Switch checked={needsGenerator} onCheckedChange={setNeedsGenerator} />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                          <span className="text-sm">{language === "fr" ? "Réservoir d'eau" : "Water tank"}</span>
                          <Switch checked={needsWaterTank} onCheckedChange={setNeedsWaterTank} />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                          <span className="text-sm">{language === "fr" ? "Sécurité" : "Security"}</span>
                          <Switch checked={needsSecurity} onCheckedChange={setNeedsSecurity} />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                          <span className="text-sm">{language === "fr" ? "Ménage inclus" : "Cleaning included"}</span>
                          <Switch checked={needsCleaning} onCheckedChange={setNeedsCleaning} />
                        </div>
                      </div>
                    </div>

                    {/* Équipements essentiels améliorés */}
                    <div className="space-y-3">
                      <Label>{language === "fr" ? "Équipements essentiels" : "Essential amenities"}</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {ALL_AMENITIES.slice(0, 12).map((amenity) => (
                          <div
                            key={amenity.value}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`pref-${amenity.value}`}
                              checked={preferredAmenities.includes(amenity.value)}
                              onCheckedChange={() => toggleArrayValue(preferredAmenities, amenity.value, setPreferredAmenities)}
                            />
                            <label
                              htmlFor={`pref-${amenity.value}`}
                              className="text-sm text-foreground cursor-pointer"
                            >
                              {amenity.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                )}

                {/* Owner Settings Tab */}
                {isOwner && (
                  <TabsContent value="owner" className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp">{t("profile.whatsappNumber")}</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        {t("profile.whatsappExplanation")}
                      </p>
                      <div className="relative">
                        <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="whatsapp"
                          value={whatsappNumber}
                          onChange={(e) => setWhatsappNumber(e.target.value)}
                          placeholder="+237 6 00 00 00 00"
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Paramètres de publication */}
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="visitPrice">{language === "fr" ? "Prix de visite (FCFA)" : "Visit price (FCFA)"}</Label>
                        <Input
                          id="visitPrice"
                          type="number"
                          value={visitPrice}
                          onChange={(e) => setVisitPrice(e.target.value)}
                          placeholder="Ex: 5000"
                        />
                        <p className="text-xs text-muted-foreground">
                          {language === "fr" ? "Montant demandé pour les visites (optionnel)" : "Amount charged for visits (optional)"}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="rentalMonths">{language === "fr" ? "Durée de bail (mois)" : "Lease duration (months)"}</Label>
                        <Input
                          id="rentalMonths"
                          type="number"
                          value={rentalMonths}
                          onChange={(e) => setRentalMonths(e.target.value)}
                          placeholder="Ex: 12"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="deposit">{language === "fr" ? "Caution (FCFA)" : "Deposit (FCFA)"}</Label>
                        <Input
                          id="deposit"
                          type="number"
                          value={deposit}
                          onChange={(e) => setDeposit(e.target.value)}
                          placeholder="Ex: 300000"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="rules">{language === "fr" ? "Règles de la propriété" : "Property rules"}</Label>
                        <Textarea
                          id="rules"
                          value={rules}
                          onChange={(e) => setRules(e.target.value)}
                          placeholder={language === "fr" ? "Animaux interdits, heures de silence..." : "No pets, quiet hours..."}
                          rows={3}
                        />
                      </div>

                      <div className="bg-secondary/50 rounded-xl p-4">
                        <h3 className="font-medium mb-2">💡 {t("profile.tip")}</h3>
                        <p className="text-sm text-muted-foreground">
                          {language === "fr" 
                            ? "Ces informations seront utilisées par défaut pour vos nouvelles annonces." 
                            : "These details will be used by default for your new listings."}
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                )}

                {/* Save Button */}
                <div className="mt-8 pt-6 border-t border-border">
                  <Button type="submit" className="w-full gap-2" disabled={saving}>
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {t("profile.saveChanges")}
                  </Button>
                </div>
              </form>
            </Tabs>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
