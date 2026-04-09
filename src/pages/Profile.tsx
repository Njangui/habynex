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
  Sparkles,
  Wifi,
  Car,
  Waves,
  Zap,
  Droplet,
  Wind,
  BedDouble,
  Search,
  Filter,
  Calendar,
  MapPinned,
  Bell
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
  is_furnished: boolean | null;
  needs_parking: boolean | null;
  needs_internet: boolean | null;
  needs_generator: boolean | null;
  needs_water_tank: boolean | null;
  needs_security: boolean | null;
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
  const [isFurnished, setIsFurnished] = useState(false);
  const [needsParking, setNeedsParking] = useState(false);
  const [needsInternet, setNeedsInternet] = useState(false);
  const [needsGenerator, setNeedsGenerator] = useState(false);
  const [needsWaterTank, setNeedsWaterTank] = useState(false);
  const [needsSecurity, setNeedsSecurity] = useState(false);

  // Options traduites (inspirées de create_listing)
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
  ];

  const LISTING_TYPES = [
    { value: "rent", label: t("listing.rent"), description: language === "fr" ? "Location mensuelle" : "Monthly rent", icon: Home },
    { value: "sale", label: t("listing.sale"), description: language === "fr" ? "Vente immobilière" : "Real estate sale", icon: Building2 },
    { value: "colocation", label: t("listing.colocation"), description: language === "fr" ? "Partage de logement" : "Shared housing", icon: User },
    { value: "short_term", label: t("listing.shortTerm"), description: language === "fr" ? "Location journalière" : "Daily rental", icon: Calendar },
  ];

  const MOVE_TIMELINES = [
    { value: "immediate", label: t("profile.immediate"), color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    { value: "within_month", label: t("profile.withinMonth"), color: "bg-green-100 text-green-700 border-green-200" },
    { value: "within_3months", label: t("profile.within3Months"), color: "bg-lime-100 text-lime-700 border-lime-200" },
    { value: "flexible", label: t("profile.flexible"), color: "bg-teal-100 text-teal-700 border-teal-200" },
  ];

  const AMENITIES = [
    { value: "wifi", label: t("amenity.wifi"), icon: Wifi },
    { value: "parking", label: t("amenity.parking"), icon: Car },
    { value: "pool", label: t("amenity.pool"), icon: Waves },
    { value: "generator", label: t("amenity.generator"), icon: Zap },
    { value: "water_tank", label: t("amenity.waterTank"), icon: Droplet },
    { value: "security", label: t("amenity.security"), icon: Shield },
    { value: "air_conditioning", label: t("amenity.airConditioning"), icon: Wind },
    { value: "furnished", label: t("amenity.furnished"), icon: Sofa },
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
        
        // Critères additionnels
        setBedrooms(data.bedrooms);
        setBathrooms(data.bathrooms);
        setIsFurnished(data.is_furnished || false);
        setNeedsParking(data.needs_parking || false);
        setNeedsInternet(data.needs_internet || false);
        setNeedsGenerator(data.needs_generator || false);
        setNeedsWaterTank(data.needs_water_tank || false);
        setNeedsSecurity(data.needs_security || false);
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
        is_furnished: isFurnished,
        needs_parking: needsParking,
        needs_internet: needsInternet,
        needs_generator: needsGenerator,
        needs_water_tank: needsWaterTank,
        needs_security: needsSecurity,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: t("profile.updated"),
        description: language === "fr" ? "Vos préférences de recherche ont été enregistrées" : "Your search preferences have been saved",
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
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/50 to-background">
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
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 p-8 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-20"></div>
              
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
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-white text-emerald-600 flex items-center justify-center shadow-lg">
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

            {/* Tabs */}
            <Tabs defaultValue="personal" className="p-8">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-emerald-50/50 p-1.5 rounded-xl">
                <TabsTrigger value="personal" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">
                  <User className="w-4 h-4" />
                  {t("profile.personalInfo")}
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
                        <MessageSquare className="w-4 h-4 text-green-500" />
                        WhatsApp
                      </Label>
                      <div className="relative">
                        <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-400" />
                        <Input
                          id="whatsapp"
                          value={whatsappNumber}
                          onChange={(e) => setWhatsappNumber(e.target.value)}
                          placeholder="+237 6 00 00 00 00"
                          className="pl-10 border-emerald-100 focus:border-emerald-400 focus:ring-emerald-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-emerald-800">{t("profile.city")}</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
                        <Input
                          id="city"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Yaoundé, Douala..."
                          className="pl-10 border-emerald-100 focus:border-emerald-400 focus:ring-emerald-200"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-emerald-800">{t("profile.aboutMe")}</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder={t("profile.aboutMePlaceholder")}
                      rows={4}
                      className="border-emerald-100 focus:border-emerald-400 focus:ring-emerald-200 resize-none"
                    />
                  </div>
                </TabsContent>

                {/* Search Preferences Tab - Optimisé pour l'algorithme */}
                <TabsContent value="preferences" className="space-y-8">
                  
                  {/* Section Budget */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-semibold text-emerald-900">{language === "fr" ? "Budget mensuel" : "Monthly budget"}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-emerald-700 text-sm">{language === "fr" ? "Minimum (FCFA)" : "Minimum (FCFA)"}</Label>
                        <Input
                          type="number"
                          value={budgetMin}
                          onChange={(e) => setBudgetMin(e.target.value)}
                          placeholder="50000"
                          className="border-emerald-200 focus:border-emerald-500 focus:ring-emerald-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-emerald-700 text-sm">{language === "fr" ? "Maximum (FCFA)" : "Maximum (FCFA)"}</Label>
                        <Input
                          type="number"
                          value={budgetMax}
                          onChange={(e) => setBudgetMax(e.target.value)}
                          placeholder="300000"
                          className="border-emerald-200 focus:border-emerald-500 focus:ring-emerald-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section Type de bien */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-500 text-white flex items-center justify-center">
                        <Home className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-semibold text-emerald-900">{language === "fr" ? "Types de bien recherchés" : "Property types wanted"}</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {PROPERTY_TYPES.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => togglePropertyType(type.value)}
                          className={`p-4 rounded-xl border-2 text-center transition-all hover:scale-[1.02] ${
                            preferredPropertyTypes.includes(type.value)
                              ? "border-emerald-500 bg-emerald-50 shadow-md"
                              : "border-gray-200 hover:border-emerald-200 bg-white"
                          }`}
                        >
                          <span className="text-2xl block mb-1">{type.icon}</span>
                          <span className={`text-sm font-medium ${preferredPropertyTypes.includes(type.value) ? "text-emerald-800" : "text-gray-700"}`}>{type.label}</span>
                          {preferredPropertyTypes.includes(type.value) && (
                            <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto mt-1" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Section Type d'annonce */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-500 text-white flex items-center justify-center">
                        <Filter className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-semibold text-emerald-900">{language === "fr" ? "Type d'annonce" : "Listing type"}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {LISTING_TYPES.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setPreferredListingType(type.value)}
                          className={`p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
                            preferredListingType === type.value
                              ? "border-emerald-500 bg-emerald-50 shadow-md"
                              : "border-gray-200 hover:border-emerald-200 bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <type.icon className={`w-5 h-5 ${preferredListingType === type.value ? "text-emerald-600" : "text-gray-500"}`} />
                            <span className={`font-semibold ${preferredListingType === type.value ? "text-emerald-800" : "text-gray-800"}`}>{type.label}</span>
                          </div>
                          <span className="text-xs text-gray-500">{type.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Section Composition */}
                  <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-6 border border-teal-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center">
                        <BedDouble className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-semibold text-emerald-900">{language === "fr" ? "Composition souhaitée" : "Desired composition"}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-emerald-700">{language === "fr" ? "Chambres" : "Bedrooms"}</Label>
                        <NumberStepper
                          value={bedrooms || 0}
                          onChange={(val) => setBedrooms(val === 0 ? null : val)}
                          min={0}
                          max={10}
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-emerald-700">{language === "fr" ? "Salles de bain" : "Bathrooms"}</Label>
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
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                        <MapPinned className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-semibold text-emerald-900">{language === "fr" ? "Quartiers préférés" : "Preferred neighborhoods"}</h3>
                    </div>
                    <Textarea
                      value={preferredNeighborhoods}
                      onChange={(e) => setPreferredNeighborhoods(e.target.value)}
                      placeholder={language === "fr" ? "Ex: Bastos, Odza, Mvan... (séparés par des virgules)" : "Ex: Bastos, Odza, Mvan... (comma separated)"}
                      rows={3}
                      className="border-emerald-200 focus:border-emerald-500 focus:ring-emerald-200 resize-none"
                    />
                  </div>

                  {/* Section Délai */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-lime-500 text-white flex items-center justify-center">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-semibold text-emerald-900">{language === "fr" ? "Quand souhaitez-vous emménager ?" : "When do you want to move in?"}</h3>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {MOVE_TIMELINES.map((timeline) => (
                        <button
                          key={timeline.value}
                          type="button"
                          onClick={() => setMoveInTimeline(timeline.value)}
                          className={`px-5 py-3 rounded-xl text-sm font-medium transition-all hover:scale-105 ${
                            moveInTimeline === timeline.value
                              ? timeline.color + " ring-2 ring-offset-2 ring-emerald-300"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {timeline.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Section Options */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-semibold text-emerald-900">{language === "fr" ? "Options souhaitées" : "Desired options"}</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { key: "isFurnished", label: language === "fr" ? "Meublé" : "Furnished", value: isFurnished, setter: setIsFurnished, icon: Sofa },
                        { key: "needsParking", label: "Parking", value: needsParking, setter: setNeedsParking, icon: Car },
                        { key: "needsInternet", label: "WiFi", value: needsInternet, setter: setNeedsInternet, icon: Wifi },
                        { key: "needsGenerator", label: language === "fr" ? "Générateur" : "Generator", value: needsGenerator, setter: setNeedsGenerator, icon: Zap },
                        { key: "needsWaterTank", label: language === "fr" ? "Réservoir" : "Water tank", value: needsWaterTank, setter: setNeedsWaterTank, icon: Droplet },
                        { key: "needsSecurity", label: language === "fr" ? "Sécurité" : "Security", value: needsSecurity, setter: setNeedsSecurity, icon: Shield },
                      ].map((option) => (
                        <div
                          key={option.key}
                          className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer hover:scale-[1.02] ${
                            option.value ? "border-emerald-400 bg-emerald-50" : "border-gray-200 bg-white"
                          }`}
                          onClick={() => option.setter(!option.value)}
                        >
                          <div className="flex items-center gap-2">
                            <option.icon className={`w-4 h-4 ${option.value ? "text-emerald-600" : "text-gray-400"}`} />
                            <span className={`text-sm font-medium ${option.value ? "text-emerald-800" : "text-gray-700"}`}>{option.label}</span>
                          </div>
                          <Switch checked={option.value} onCheckedChange={option.setter} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Info algorithme */}
                  <div className="bg-gradient-to-r from-emerald-100 to-teal-100 rounded-xl p-4 border border-emerald-200">
                    <div className="flex items-start gap-3">
                      <Bell className="w-5 h-5 text-emerald-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-emerald-800">
                          {language === "fr" ? "Comment fonctionnent nos recommandations" : "How our recommendations work"}
                        </p>
                        <p className="text-xs text-emerald-600 mt-1">
                          {language === "fr" 
                            ? "Plus vos critères sont précis, mieux notre algorithme pourra vous suggérer des biens correspondant à vos besoins. Vous pouvez modifier ces préférences à tout moment."
                            : "The more precise your criteria, the better our algorithm can suggest properties matching your needs. You can modify these preferences anytime."}
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Save Button */}
                <div className="mt-8 pt-6 border-t border-emerald-100">
                  <Button 
                    type="submit" 
                    className="w-full gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-200" 
                    disabled={saving}
                  >
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
