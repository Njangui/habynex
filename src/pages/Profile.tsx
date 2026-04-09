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
import NumberStepper from "@/components/NumberStepper";
import { 
  User, 
  Phone, 
  MapPin, 
  Camera, 
  Loader2,
  CheckCircle,
  Home,
  Save,
  ArrowLeft,
  Upload,
  Wallet,
  Search,
  Calendar,
  MapPinned,
  Bell,
  Info,
  Lightbulb,
  Star,
  Check,
  Building,
  Bed,
  Bath,
  Car,
  Wifi,
  Zap,
  Droplet,
  Shield,
  Wind,
  Sofa,
  Trees,
  Waves,
  Dumbbell,
  Store,
  Warehouse,
  Factory,
  Scissors,
  Coffee,
  UtensilsCrossed,
  Wine,
  BedDouble,
  Stethoscope,
  Users,
  Presentation,
  Wrench,
  Sparkles,
  ArrowRight
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
  // Champs pour l'algorithme de recommandations
  preferred_property_types: string[] | null;
  preferred_neighborhoods: string[] | null;
  preferred_listing_type: string | null;
  move_in_timeline: string | null;
  // Champs additionnels pour affiner les recommandations
  bedrooms: number | null;
  bathrooms: number | null;
  needs_parking: boolean | null;
  needs_internet: boolean | null;
  needs_generator: boolean | null;
  needs_water_tank: boolean | null;
  needs_security: boolean | null;
  needs_furnished: boolean | null;
  needs_air_conditioning: boolean | null;
  needs_pool: boolean | null;
  needs_gym: boolean | null;
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

  // Données personnelles
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");

  // Préférences pour l'algorithme de recommandations
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [preferredPropertyTypes, setPreferredPropertyTypes] = useState<string[]>([]);
  const [preferredNeighborhoods, setPreferredNeighborhoods] = useState("");
  const [preferredListingType, setPreferredListingType] = useState<string>("rent");
  const [moveInTimeline, setMoveInTimeline] = useState("");
  
  // Critères additionnels
  const [bedrooms, setBedrooms] = useState<number | null>(null);
  const [bathrooms, setBathrooms] = useState<number | null>(null);
  const [needsParking, setNeedsParking] = useState(false);
  const [needsInternet, setNeedsInternet] = useState(false);
  const [needsGenerator, setNeedsGenerator] = useState(false);
  const [needsWaterTank, setNeedsWaterTank] = useState(false);
  const [needsSecurity, setNeedsSecurity] = useState(false);
  const [needsFurnished, setNeedsFurnished] = useState(false);
  const [needsAirConditioning, setNeedsAirConditioning] = useState(false);
  const [needsPool, setNeedsPool] = useState(false);
  const [needsGym, setNeedsGym] = useState(false);

  // Options traduites (élargies)
  const PROPERTY_TYPES = [
    // Résidentiel
    { value: "studio", label: language === "fr" ? "Studio" : "Studio", icon: "🏢", category: "residential", desc: language === "fr" ? "Idéal pour étudiant ou célibataire" : "Ideal for student or single" },
    { value: "room", label: language === "fr" ? "Chambre" : "Room", icon: "🛏️", category: "residential", desc: language === "fr" ? "Chambre individuelle" : "Individual room" },
    { value: "apartment", label: language === "fr" ? "Appartement" : "Apartment", icon: "🏠", category: "residential", desc: language === "fr" ? "Logement familial classique" : "Classic family home" },
    { value: "duplex", label: language === "fr" ? "Duplex" : "Duplex", icon: "🏘️", category: "residential", desc: language === "fr" ? "Deux niveaux d'espace" : "Two levels of space" },
    { value: "house", label: language === "fr" ? "Maison" : "House", icon: "🏡", category: "residential", desc: language === "fr" ? "Maison individuelle" : "Detached house" },
    { value: "villa", label: language === "fr" ? "Villa" : "Villa", icon: "🏰", category: "residential", desc: language === "fr" ? "Habitation de standing" : "Premium residence" },
    { value: "penthouse", label: "Penthouse", icon: "🏙️", category: "residential", desc: language === "fr" ? "Appartement luxe dernier étage" : "Luxury top floor apartment" },
    { value: "furnished_apartment", label: language === "fr" ? "Appartement meublé" : "Furnished apartment", icon: "🛋️", category: "residential", desc: language === "fr" ? "Prêt à emménager" : "Ready to move in" },
    { value: "shared_room", label: language === "fr" ? "Chambre partagée" : "Shared room", icon: "👥", category: "residential", desc: language === "fr" ? "Colocation économique" : "Budget shared housing" },
    { value: "loft", label: "Loft", icon: "🏭", category: "residential", desc: language === "fr" ? "Espace ouvert moderne" : "Modern open space" },
    { value: "guesthouse", label: language === "fr" ? "Maison d'hôtes" : "Guesthouse", icon: "🏨", category: "residential", desc: language === "fr" ? "Pour séjour temporaire" : "For temporary stay" },
    // Terrain
    { value: "land", label: language === "fr" ? "Terrain" : "Land", icon: "🌳", category: "land", desc: language === "fr" ? "Espace à bâtir" : "Space to build" },
    { value: "agricultural_land", label: language === "fr" ? "Terrain agricole" : "Agricultural land", icon: "🌾", category: "land", desc: language === "fr" ? "Pour culture ou élevage" : "For farming or breeding" },
    // Commercial
    { value: "shop", label: language === "fr" ? "Boutique" : "Shop", icon: "🛍️", category: "commercial", desc: language === "fr" ? "Commerce de détail" : "Retail store" },
    { value: "store", label: language === "fr" ? "Magasin" : "Store", icon: "🏪", category: "commercial", desc: language === "fr" ? "Grande surface commerciale" : "Large commercial space" },
    { value: "commercial_space", label: language === "fr" ? "Espace commercial" : "Commercial space", icon: "🏢", category: "commercial", desc: language === "fr" ? "Local professionnel" : "Professional premises" },
    { value: "warehouse", label: language === "fr" ? "Entrepôt" : "Warehouse", icon: "🏭", category: "commercial", desc: language === "fr" ? "Stockage et logistique" : "Storage and logistics" },
    { value: "office", label: language === "fr" ? "Bureau" : "Office", icon: "💼", category: "commercial", desc: language === "fr" ? "Espace de travail" : "Workspace" },
    { value: "building", label: language === "fr" ? "Immeuble" : "Building", icon: "🏗️", category: "commercial", desc: language === "fr" ? "Bâtiment complet" : "Complete building" },
    { value: "beauty_salon", label: language === "fr" ? "Institut de beauté" : "Beauty salon", icon: "✨", category: "commercial", desc: language === "fr" ? "Salon esthétique" : "Beauty institute" },
    { value: "hair_salon", label: language === "fr" ? "Salon de coiffure" : "Hair salon", icon: "💇", category: "commercial", desc: language === "fr" ? "Coiffure et soins" : "Hairdressing" },
    { value: "restaurant", label: language === "fr" ? "Restaurant" : "Restaurant", icon: "🍽️", category: "commercial", desc: language === "fr" ? "Restauration" : "Food service" },
    { value: "cafe", label: language === "fr" ? "Café" : "Café", icon: "☕", category: "commercial", desc: language === "fr" ? "Cafétéria ou salon de thé" : "Coffee shop or tearoom" },
    { value: "bar", label: language === "fr" ? "Bar" : "Bar", icon: "🍸", category: "commercial", desc: language === "fr" ? "Bar ou pub" : "Bar or pub" },
    { value: "hotel", label: language === "fr" ? "Hôtel" : "Hotel", icon: "🏨", category: "commercial", desc: language === "fr" ? "Hébergement hôtelier" : "Hotel accommodation" },
    { value: "pharmacy", label: language === "fr" ? "Pharmacie" : "Pharmacy", icon: "💊", category: "commercial", desc: language === "fr" ? "Officine pharmaceutique" : "Pharmacy" },
    { value: "clinic", label: language === "fr" ? "Clinique" : "Clinic", icon: "🏥", category: "commercial", desc: language === "fr" ? "Centre de santé" : "Health center" },
    { value: "gym", label: language === "fr" ? "Salle de sport" : "Gym", icon: "💪", category: "commercial", desc: language === "fr" ? "Fitness et musculation" : "Fitness and bodybuilding" },
    { value: "coworking", label: language === "fr" ? "Espace coworking" : "Coworking space", icon: "👥", category: "commercial", desc: language === "fr" ? "Travail partagé" : "Shared workspace" },
    { value: "showroom", label: language === "fr" ? "Showroom" : "Showroom", icon: "🎨", category: "commercial", desc: language === "fr" ? "Espace d'exposition" : "Exhibition space" },
    { value: "workshop", label: language === "fr" ? "Atelier" : "Workshop", icon: "🔧", category: "commercial", desc: language === "fr" ? "Atelier artisanal" : "Craft workshop" },
    { value: "factory", label: language === "fr" ? "Usine" : "Factory", icon: "🏭", category: "commercial", desc: language === "fr" ? "Site industriel" : "Industrial site" },
    { value: "gas_station", label: language === "fr" ? "Station-service" : "Gas station", icon: "⛽", category: "commercial", desc: language === "fr" ? "Station essence" : "Petrol station" },
  ];

  const LISTING_TYPES = [
    { value: "rent", label: language === "fr" ? "Location" : "Rent", description: language === "fr" ? "Paiement mensuel régulier" : "Regular monthly payment", icon: Home, color: "from-emerald-500 to-teal-500" },
    { value: "sale", label: language === "fr" ? "Achat" : "Buy", description: language === "fr" ? "Propriété à acquérir" : "Property to acquire", icon: CheckCircle, color: "from-lime-500 to-green-500" },
    { value: "colocation", label: language === "fr" ? "Colocation" : "Roommate", description: language === "fr" ? "Partager avec d'autres" : "Share with others", icon: Users, color: "from-yellow-400 to-amber-500" },
    { value: "short_term", label: language === "fr" ? "Courte durée" : "Short term", description: language === "fr" ? "Séjour temporaire" : "Temporary stay", icon: Calendar, color: "from-orange-400 to-amber-500" },
  ];

  const MOVE_TIMELINES = [
    { value: "immediate", label: language === "fr" ? "Immédiatement" : "Immediately", color: "bg-lime-100 text-lime-800 border-lime-300", icon: "⚡" },
    { value: "within_week", label: language === "fr" ? "Cette semaine" : "This week", color: "bg-emerald-100 text-emerald-800 border-emerald-300", icon: "📅" },
    { value: "within_month", label: language === "fr" ? "Ce mois-ci" : "This month", color: "bg-teal-100 text-teal-800 border-teal-300", icon: "📆" },
    { value: "within_3months", label: language === "fr" ? "Dans 3 mois" : "Within 3 months", color: "bg-cyan-100 text-cyan-800 border-cyan-300", icon: "🗓️" },
    { value: "flexible", label: language === "fr" ? "Flexible" : "Flexible", color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: "🤝" },
  ];

  const COMPOSITION_OPTIONS = [
    { value: "studio", label: language === "fr" ? "Studio (1 pièce)" : "Studio (1 room)", icon: "🏢", desc: language === "fr" ? "Epace unique" : "Single space" },
    { value: "t2", label: "T2 (2 pièces)", icon: "🏠", desc: language === "fr" ? "1 chambre + salon" : "1 bedroom + living room" },
    { value: "t3", label: "T3 (3 pièces)", icon: "🏡", desc: language === "fr" ? "2 chambres + salon" : "2 bedrooms + living room" },
    { value: "t4", label: "T4 (4 pièces)", icon: "🏘️", desc: language === "fr" ? "3 chambres + salon" : "3 bedrooms + living room" },
    { value: "t5", label: "T5+ (5+ pièces)", icon: "🏰", desc: language === "fr" ? "Grande famille" : "Large family" },
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
        // Données personnelles
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
        setWhatsappNumber(data.whatsapp_number || "");
        setCity(data.city || "");
        setBio(data.bio || "");
        
        // Préférences pour l'algorithme
        setBudgetMin(data.budget_min?.toString() || "");
        setBudgetMax(data.budget_max?.toString() || "");
        setAvatarUrl(data.avatar_url);
        setPreferredPropertyTypes(data.preferred_property_types || []);
        setPreferredNeighborhoods(data.preferred_neighborhoods?.join(", ") || "");
        setPreferredListingType(data.preferred_listing_type || "rent");
        setMoveInTimeline(data.move_in_timeline || "");
        
        // Critères additionnels (avec gestion des noms alternatifs)
        setBedrooms(data.bedrooms);
        setBathrooms(data.bathrooms);
        setNeedsParking(data.needs_parking || false);
        setNeedsInternet(data.needs_internet || false);
        setNeedsGenerator(data.needs_generator || false);
        setNeedsWaterTank(data.needs_water_tank || false);
        setNeedsSecurity(data.needs_security || false);
        // Gestion des champs qui peuvent avoir des noms différents
        setNeedsFurnished(data.needs_furnished || data.is_furnished || false);
        setNeedsAirConditioning(data.needs_air_conditioning || false);
        setNeedsPool(data.needs_pool || false);
        setNeedsGym(data.needs_gym || false);
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

  const togglePropertyType = (value: string) => {
    if (preferredPropertyTypes.includes(value)) {
      setPreferredPropertyTypes(preferredPropertyTypes.filter(v => v !== value));
    } else {
      setPreferredPropertyTypes([...preferredPropertyTypes, value]);
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

      const updates = {
        user_id: user.id,
        full_name: fullName,
        phone,
        whatsapp_number: whatsappNumber || null,
        city,
        bio,
        // Champs pour l'algorithme de recommandations
        budget_min: budgetMin ? parseInt(budgetMin) : null,
        budget_max: budgetMax ? parseInt(budgetMax) : null,
        preferred_property_types: preferredPropertyTypes,
        preferred_neighborhoods: neighborhoods,
        preferred_listing_type: preferredListingType,
        move_in_timeline: moveInTimeline || null,
        // Critères additionnels
        bedrooms,
        bathrooms,
        needs_parking: needsParking,
        needs_internet: needsInternet,
        needs_generator: needsGenerator,
        needs_water_tank: needsWaterTank,
        needs_security: needsSecurity,
        needs_furnished: needsFurnished,
        needs_air_conditioning: needsAirConditioning,
        needs_pool: needsPool,
        needs_gym: needsGym,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: t("profile.updated"),
        description: language === "fr" ? "Vos préférences de recherche ont été enregistrées avec succès !" : "Your search preferences have been saved successfully!",
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
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/30 to-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/30 via-lime-50/20 to-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-emerald-600 transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>{t("profile.backToHome")}</span>
          </motion.button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-xl border border-emerald-100/50 overflow-hidden"
          >
            {/* Header avec gradient vert */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-500 to-lime-500 p-8 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.08%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30"></div>
              
              <div className="flex items-center gap-6 relative z-10">
                <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
                  <DialogTrigger asChild>
                    <div className="relative cursor-pointer group">
                      <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden border-4 border-white/30 shadow-lg group-hover:scale-105 transition-transform">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-12 h-12 text-white/80" />
                        )}
                      </div>
                      <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                        <Camera className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-lime-400 text-emerald-800 flex items-center justify-center shadow-lg">
                        <Camera className="w-5 h-5" />
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-emerald-800">{t("profile.choosePhoto")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      <div>
                        <Label className="text-sm font-medium mb-3 block text-emerald-700">{t("profile.uploadImage")}</Label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                        />
                        <Button
                          variant="outline"
                          className="w-full gap-2 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingAvatar}
                        >
                          {uploadingAvatar ? (
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                          ) : (
                            <Upload className="w-4 h-4 text-emerald-600" />
                          )}
                          {t("profile.chooseImage")}
                        </Button>
                      </div>

                      <div>
                        <Label className="text-sm font-medium mb-3 block text-emerald-700">{t("profile.orChooseAvatar")}</Label>
                        <div className="grid grid-cols-4 gap-3">
                          {defaultAvatars.map((avatar, i) => (
                            <button
                              key={i}
                              onClick={() => handleSelectAvatar(avatar)}
                              disabled={uploadingAvatar}
                              className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all hover:scale-110 ${
                                avatarUrl === avatar ? "border-emerald-500 ring-2 ring-emerald-200" : "border-gray-200"
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
                  <h1 className="text-3xl font-bold mb-1">{fullName || t("profile.yourProfile")}</h1>
                  <p className="text-emerald-100/90">{user.email}</p>
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    {badges.length > 0 ? (
                      <TrustBadges badges={badges} size="sm" />
                    ) : (
                      <span className="text-xs px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
                        {t("profile.notVerified")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Message d'introduction */}
            <div className="bg-gradient-to-r from-lime-50 via-emerald-50 to-teal-50 p-4 border-b border-emerald-100">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-lime-600 mt-0.5" />
                <p className="text-sm text-emerald-800">
                  {language === "fr" 
                    ? "💡 Plus vous renseignez de critères, plus nos recommandations seront précises et pertinentes pour trouver votre logement idéal !"
                    : "💡 The more criteria you provide, the more accurate and relevant our recommendations will be to find your ideal home!"}
                </p>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="personal" className="p-8">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-emerald-50/50 p-1.5 rounded-xl">
                <TabsTrigger value="personal" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">
                  <User className="w-4 h-4" />
                  {language === "fr" ? "Informations personnelles" : "Personal information"}
                </TabsTrigger>
                <TabsTrigger value="preferences" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">
                  <Search className="w-4 h-4" />
                  {language === "fr" ? "Mes critères de recherche" : "My search criteria"}
                </TabsTrigger>
              </TabsList>

              <form onSubmit={handleSave}>
                {/* Personal Info Tab */}
                <TabsContent value="personal" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-emerald-800">{t("profile.fullName")}</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
                        <Input
                          id="fullName"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Jean Dupont"
                          className="pl-10 border-emerald-100 focus:border-emerald-400 focus:ring-emerald-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-emerald-800">{t("profile.phone")}</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
                        <Input
                          id="phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+237 6 00 00 00 00"
                          className="pl-10 border-emerald-100 focus:border-emerald-400 focus:ring-emerald-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="whatsapp" className="text-emerald-800 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-lime-500" />
                        WhatsApp
                        <span className="text-xs text-emerald-500 font-normal">({language === "fr" ? "recommandé" : "recommended"})</span>
                      </Label>
                      <div className="relative">
                        <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-lime-400" />
                        <Input
                          id="whatsapp"
                          value={whatsappNumber}
                          onChange={(e) => setWhatsappNumber(e.target.value)}
                          placeholder="+237 6 00 00 00 00"
                          className="pl-10 border-emerald-100 focus:border-lime-400 focus:ring-lime-200"
                        />
                      </div>
                      <p className="text-xs text-emerald-600">
                        {language === "fr" ? "Pour être contacté rapidement par les propriétaires" : "To be contacted quickly by owners"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-emerald-800">{language === "fr" ? "Ville de recherche" : "Search city"}</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
                        <Input
                          id="city"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Yaoundé, Douala, Bafoussam..."
                          className="pl-10 border-emerald-100 focus:border-emerald-400 focus:ring-emerald-200"
                        />
                      </div>
                      <p className="text-xs text-emerald-600">
                        {language === "fr" ? "Indiquez la ville où vous souhaitez emménager" : "Indicate the city where you want to move"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-emerald-800">{t("profile.aboutMe")}</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder={language === "fr" ? "Présentez-vous brièvement aux propriétaires..." : "Introduce yourself briefly to owners..."}
                      rows={4}
                      className="border-emerald-100 focus:border-emerald-400 focus:ring-emerald-200 resize-none"
                    />
                  </div>
                </TabsContent>

                {/* Search Preferences Tab */}
                <TabsContent value="preferences" className="space-y-8">
                  
                  {/* Section Budget */}
                  <div className="bg-gradient-to-br from-lime-50 via-emerald-50 to-teal-50 rounded-2xl p-6 border border-lime-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-lime-400 to-emerald-500 text-white flex items-center justify-center shadow-lg">
                        <Wallet className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-emerald-900">{language === "fr" ? "Quel est votre budget ?" : "What is your budget?"}</h3>
                        <p className="text-sm text-emerald-600">{language === "fr" ? "Définissez une fourchette de prix réaliste" : "Set a realistic price range"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-emerald-700 text-sm font-medium">{language === "fr" ? "Budget minimum (FCFA)" : "Minimum budget (FCFA)"}</Label>
                        <Input
                          type="number"
                          value={budgetMin}
                          onChange={(e) => setBudgetMin(e.target.value)}
                          placeholder="50000"
                          className="border-lime-200 focus:border-lime-500 focus:ring-lime-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-emerald-700 text-sm font-medium">{language === "fr" ? "Budget maximum (FCFA)" : "Maximum budget (FCFA)"}</Label>
                        <Input
                          type="number"
                          value={budgetMax}
                          onChange={(e) => setBudgetMax(e.target.value)}
                          placeholder="300000"
                          className="border-lime-200 focus:border-lime-500 focus:ring-lime-200"
                        />
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-xs text-yellow-800 flex items-start gap-2">
                        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        {language === "fr" 
                          ? "💡 Conseil : Un budget trop restrictif limite vos options. Pensez aux frais supplémentaires (caution, commissions) !"
                          : "💡 Tip: A too restrictive budget limits your options. Consider additional fees (deposit, commissions)!"}
                      </p>
                    </div>
                  </div>

                  {/* Section Type de bien */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg">
                        <Home className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-emerald-900">{language === "fr" ? "Quel type de bien recherchez-vous ?" : "What type of property are you looking for?"}</h3>
                        <p className="text-sm text-emerald-600">{language === "fr" ? "Vous pouvez sélectionner plusieurs options" : "You can select multiple options"}</p>
                      </div>
                    </div>
                    
                    {/* Résidentiel */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">{language === "fr" ? "🏠 Résidentiel" : "🏠 Residential"}</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {PROPERTY_TYPES.filter(p => p.category === "residential").map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => togglePropertyType(type.value)}
                            className={`p-3 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
                              preferredPropertyTypes.includes(type.value)
                                ? "border-emerald-500 bg-emerald-50 shadow-md"
                                : "border-gray-200 hover:border-emerald-200 bg-white"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-xl">{type.icon}</span>
                              <div>
                                <span className={`text-sm font-semibold block ${preferredPropertyTypes.includes(type.value) ? "text-emerald-800" : "text-gray-800"}`}>{type.label}</span>
                                <span className="text-xs text-gray-500 leading-tight block">{type.desc}</span>
                              </div>
                            </div>
                            {preferredPropertyTypes.includes(type.value) && (
                              <Check className="w-4 h-4 text-emerald-500 ml-auto mt-1" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Terrain */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">{language === "fr" ? "🌳 Terrains" : "🌳 Land"}</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {PROPERTY_TYPES.filter(p => p.category === "land").map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => togglePropertyType(type.value)}
                            className={`p-3 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
                              preferredPropertyTypes.includes(type.value)
                                ? "border-emerald-500 bg-emerald-50 shadow-md"
                                : "border-gray-200 hover:border-emerald-200 bg-white"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-xl">{type.icon}</span>
                              <div>
                                <span className={`text-sm font-semibold block ${preferredPropertyTypes.includes(type.value) ? "text-emerald-800" : "text-gray-800"}`}>{type.label}</span>
                                <span className="text-xs text-gray-500 leading-tight block">{type.desc}</span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Commercial */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">{language === "fr" ? "🏢 Commercial & Professionnel" : "🏢 Commercial & Professional"}</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {PROPERTY_TYPES.filter(p => p.category === "commercial").map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => togglePropertyType(type.value)}
                            className={`p-3 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
                              preferredPropertyTypes.includes(type.value)
                                ? "border-emerald-500 bg-emerald-50 shadow-md"
                                : "border-gray-200 hover:border-emerald-200 bg-white"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-xl">{type.icon}</span>
                              <div>
                                <span className={`text-sm font-semibold block ${preferredPropertyTypes.includes(type.value) ? "text-emerald-800" : "text-gray-800"}`}>{type.label}</span>
                                <span className="text-xs text-gray-500 leading-tight block">{type.desc}</span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Section Type d'annonce */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-lime-500 to-yellow-400 text-white flex items-center justify-center shadow-lg">
                        <Star className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-emerald-900">{language === "fr" ? "Quel est votre projet ?" : "What is your project?"}</h3>
                        <p className="text-sm text-emerald-600">{language === "fr" ? "Sélectionnez le type d'annonce qui vous intéresse" : "Select the type of listing that interests you"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {LISTING_TYPES.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setPreferredListingType(type.value)}
                          className={`p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] relative overflow-hidden ${
                            preferredListingType === type.value
                              ? "border-lime-500 shadow-lg"
                              : "border-gray-200 hover:border-lime-200 bg-white"
                          }`}
                        >
                          <div className={`absolute inset-0 bg-gradient-to-br ${type.color} opacity-0 transition-opacity ${preferredListingType === type.value ? 'opacity-10' : ''}`}></div>
                          <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${type.color} text-white flex items-center justify-center`}>
                                <type.icon className="w-5 h-5" />
                              </div>
                              <span className={`font-bold ${preferredListingType === type.value ? "text-emerald-800" : "text-gray-800"}`}>{type.label}</span>
                            </div>
                            <span className="text-xs text-gray-600">{type.description}</span>
                          </div>
                          {preferredListingType === type.value && (
                            <CheckCircle className="w-6 h-6 text-lime-500 absolute top-3 right-3" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Section Composition - NOUVEAU */}
                  <div className="bg-gradient-to-br from-yellow-50 via-lime-50 to-emerald-50 rounded-2xl p-6 border border-yellow-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-lime-500 text-white flex items-center justify-center shadow-lg">
                        <Building className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-emerald-900">{language === "fr" ? "Quelle composition souhaitez-vous ?" : "What composition do you want?"}</h3>
                        <p className="text-sm text-emerald-600">{language === "fr" ? "Sélectionnez le nombre de pièces idéal" : "Select your ideal number of rooms"}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
                      {COMPOSITION_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            const rooms = option.value === "studio" ? 0 : option.value === "t2" ? 1 : option.value === "t3" ? 2 : option.value === "t4" ? 3 : 4;
                            setBedrooms(rooms);
                          }}
                          className={`p-3 rounded-xl border-2 text-center transition-all hover:scale-[1.02] ${
                            (bedrooms === 0 && option.value === "studio") ||
                            (bedrooms === 1 && option.value === "t2") ||
                            (bedrooms === 2 && option.value === "t3") ||
                            (bedrooms === 3 && option.value === "t4") ||
                            (bedrooms && bedrooms >= 4 && option.value === "t5")
                              ? "border-yellow-400 bg-yellow-50 shadow-md"
                              : "border-gray-200 hover:border-yellow-200 bg-white"
                          }`}
                        >
                          <span className="text-2xl block mb-1">{option.icon}</span>
                          <span className="text-sm font-semibold block text-gray-800">{option.label}</span>
                          <span className="text-xs text-gray-500">{option.desc}</span>
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-emerald-700 font-medium flex items-center gap-2">
                          <Bed className="w-4 h-4" />
                          {language === "fr" ? "Nombre de chambres" : "Number of bedrooms"}
                        </Label>
                        <NumberStepper
                          value={bedrooms || 0}
                          onChange={(val) => setBedrooms(val === 0 ? null : val)}
                          min={0}
                          max={10}
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-emerald-700 font-medium flex items-center gap-2">
                          <Bath className="w-4 h-4" />
                          {language === "fr" ? "Salles de bain" : "Bathrooms"}
                        </Label>
                        <NumberStepper
                          value={bathrooms || 0}
                          onChange={(val) => setBathrooms(val === 0 ? null : val)}
                          min={0}
                          max={5}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section Quartiers */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white flex items-center justify-center shadow-lg">
                        <MapPinned className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-emerald-900">{language === "fr" ? "Quartiers préférés" : "Preferred neighborhoods"}</h3>
                        <p className="text-sm text-emerald-600">{language === "fr" ? "Indiquez les zones où vous souhaitez habiter" : "Indicate the areas where you want to live"}</p>
                      </div>
                    </div>
                    <Textarea
                      value={preferredNeighborhoods}
                      onChange={(e) => setPreferredNeighborhoods(e.target.value)}
                      placeholder={language === "fr" ? "Ex: Bastos, Odza, Mvan, Tsinga... (séparés par des virgules)" : "Ex: Bastos, Odza, Mvan, Tsinga... (comma separated)"}
                      rows={3}
                      className="border-emerald-200 focus:border-emerald-500 focus:ring-emerald-200 resize-none"
                    />
                    <div className="flex items-start gap-2 p-3 bg-teal-50 rounded-lg border border-teal-200">
                      <Lightbulb className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-teal-700">
                        {language === "fr" 
                          ? "💡 Astuce : Plus vous indiquez de quartiers, plus vous avez de chances de trouver votre bonheur !"
                          : "💡 Tip: The more neighborhoods you indicate, the more chances you have to find what you're looking for!"}
                      </p>
                    </div>
                  </div>

                  {/* Section Délai */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-white flex items-center justify-center shadow-lg">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-emerald-900">{language === "fr" ? "Quand souhaitez-vous emménager ?" : "When do you want to move in?"}</h3>
                        <p className="text-sm text-emerald-600">{language === "fr" ? "Cela aide les propriétaires à prioriser" : "This helps owners prioritize"}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {MOVE_TIMELINES.map((timeline) => (
                        <button
                          key={timeline.value}
                          type="button"
                          onClick={() => setMoveInTimeline(timeline.value)}
                          className={`px-5 py-3 rounded-xl text-sm font-medium transition-all hover:scale-105 flex items-center gap-2 ${
                            moveInTimeline === timeline.value
                              ? timeline.color + " ring-2 ring-offset-2 ring-yellow-300 shadow-lg"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          <span>{timeline.icon}</span>
                          {timeline.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Section Options */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-lime-500 text-white flex items-center justify-center shadow-lg">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-emerald-900">{language === "fr" ? "Options et équipements souhaités" : "Desired options and amenities"}</h3>
                        <p className="text-sm text-emerald-600">{language === "fr" ? "Sélectionnez ce qui est important pour vous" : "Select what is important to you"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {[
                        { key: "needsFurnished", label: language === "fr" ? "Meublé" : "Furnished", value: needsFurnished, setter: setNeedsFurnished, icon: Sofa, color: "from-amber-400 to-orange-400" },
                        { key: "needsParking", label: "Parking", value: needsParking, setter: setNeedsParking, icon: Car, color: "from-blue-400 to-cyan-400" },
                        { key: "needsInternet", label: "WiFi", value: needsInternet, setter: setNeedsInternet, icon: Wifi, color: "from-purple-400 to-pink-400" },
                        { key: "needsGenerator", label: language === "fr" ? "Générateur" : "Generator", value: needsGenerator, setter: setNeedsGenerator, icon: Zap, color: "from-yellow-400 to-amber-400" },
                        { key: "needsWaterTank", label: language === "fr" ? "Réservoir" : "Water tank", value: needsWaterTank, setter: setNeedsWaterTank, icon: Droplet, color: "from-cyan-400 to-blue-400" },
                        { key: "needsSecurity", label: language === "fr" ? "Sécurité" : "Security", value: needsSecurity, setter: setNeedsSecurity, icon: Shield, color: "from-red-400 to-pink-400" },
                        { key: "needsAirConditioning", label: language === "fr" ? "Climatisation" : "AC", value: needsAirConditioning, setter: setNeedsAirConditioning, icon: Wind, color: "from-teal-400 to-emerald-400" },
                        { key: "needsPool", label: language === "fr" ? "Piscine" : "Pool", value: needsPool, setter: setNeedsPool, icon: Waves, color: "from-blue-400 to-cyan-400" },
                        { key: "needsGym", label: language === "fr" ? "Salle de sport" : "Gym", value: needsGym, setter: setNeedsGym, icon: Dumbbell, color: "from-lime-400 to-green-400" },
                      ].map((option) => (
                        <div
                          key={option.key}
                          onClick={() => option.setter(!option.value)}
                          className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all cursor-pointer hover:scale-105 ${
                            option.value 
                              ? "border-lime-400 bg-gradient-to-br from-lime-50 to-emerald-50 shadow-md" 
                              : "border-gray-200 bg-white hover:border-lime-200"
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${option.color} text-white flex items-center justify-center mb-2 shadow-sm`}>
                            <option.icon className="w-6 h-6" />
                          </div>
                          <span className={`text-sm font-medium text-center ${option.value ? "text-emerald-800" : "text-gray-700"}`}>{option.label}</span>
                          {option.value && (
                            <Check className="w-4 h-4 text-lime-500 mt-1" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Info algorithme */}
                  <div className="bg-gradient-to-r from-lime-100 via-emerald-100 to-teal-100 rounded-xl p-5 border-2 border-lime-300">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-lime-400 to-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                        <Bell className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-emerald-900 mb-2">
                          {language === "fr" ? "Comment fonctionnent nos recommandations intelligentes ?" : "How do our smart recommendations work?"}
                        </h4>
                        <p className="text-sm text-emerald-700 leading-relaxed">
                          {language === "fr" 
                            ? "Notre algorithme analyse vos critères (budget, localisation, type de bien, équipements...) et compare avec des milliers d'annonces pour vous proposer les meilleures correspondances. Plus vos critères sont précis, plus les suggestions seront pertinentes ! Vous pouvez modifier ces préférences à tout moment."
                            : "Our algorithm analyzes your criteria (budget, location, property type, amenities...) and compares with thousands of listings to suggest the best matches. The more precise your criteria, the more relevant the suggestions! You can modify these preferences anytime."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Résumé des critères */}
                  <div className="bg-gradient-to-br from-emerald-50 to-lime-50 rounded-xl p-5 border border-emerald-200">
                    <h4 className="font-bold text-emerald-900 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      {language === "fr" ? "Résumé de vos critères" : "Summary of your criteria"}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {budgetMin && budgetMax && (
                        <span className="px-3 py-1.5 rounded-full bg-lime-100 text-lime-800 text-sm font-medium">
                          {parseInt(budgetMin).toLocaleString()} - {parseInt(budgetMax).toLocaleString()} FCFA
                        </span>
                      )}
                      {city && (
                        <span className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-sm font-medium">
                          📍 {city}
                        </span>
                      )}
                      {preferredPropertyTypes.length > 0 && (
                        <span className="px-3 py-1.5 rounded-full bg-teal-100 text-teal-800 text-sm font-medium">
                          🏠 {preferredPropertyTypes.length} {language === "fr" ? "types" : "types"}
                        </span>
                      )}
                      {bedrooms !== null && bedrooms > 0 && (
                        <span className="px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-800 text-sm font-medium">
                          🛏️ {bedrooms} {language === "fr" ? "chambres" : "bedrooms"}
                        </span>
                      )}
                      {moveInTimeline && (
                        <span className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-sm font-medium">
                          📅 {MOVE_TIMELINES.find(t => t.value === moveInTimeline)?.label}
                        </span>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Save Button */}
                <div className="mt-8 pt-6 border-t border-emerald-100">
                  <Button 
                    type="submit" 
                    className="w-full gap-2 bg-gradient-to-r from-lime-500 via-emerald-500 to-teal-500 hover:from-lime-600 hover:via-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-lime-200 text-lg py-6" 
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        {language === "fr" ? "Enregistrer mes préférences" : "Save my preferences"}
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </Button>
                  <p className="text-center text-sm text-emerald-600 mt-3">
                    {language === "fr" 
                      ? "✨ Vos critères seront utilisés pour personnaliser vos recommandations"
                      : "✨ Your criteria will be used to personalize your recommendations"}
                  </p>
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
