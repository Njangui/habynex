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
  MessageSquare
} from "lucide-react";

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

  // Translated options
  const PROPERTY_TYPES = [
    { value: "studio", label: t("property.studio") },
    { value: "apartment", label: t("property.apartment") },
    { value: "house", label: t("property.house") },
    { value: "villa", label: t("property.villa") },
    { value: "room", label: t("property.room") },
  ];

  const LISTING_TYPES = [
    { value: "rent", label: t("listing.rent") },
    { value: "sale", label: t("listing.sale") },
    { value: "colocation", label: t("listing.colocation") },
    { value: "short_term", label: t("listing.shortTerm") },
  ];

  const AMENITIES = [
    { value: "wifi", label: t("amenity.wifi") },
    { value: "parking", label: t("amenity.parking") },
    { value: "security", label: t("amenity.security") },
    { value: "furnished", label: t("amenity.furnished") },
    { value: "generator", label: t("amenity.generator") },
    { value: "garden", label: t("amenity.garden") },
    { value: "pool", label: t("amenity.pool") },
    { value: "gym", label: t("amenity.gym") },
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
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

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
      // Parse neighborhoods from comma-separated string
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

                    {/* Property Types */}
                    <div className="space-y-3">
                      <Label>{t("profile.propertyTypesWanted")}</Label>
                      <div className="flex flex-wrap gap-2">
                        {PROPERTY_TYPES.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => toggleArrayValue(preferredPropertyTypes, type.value, setPreferredPropertyTypes)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              preferredPropertyTypes.includes(type.value)
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            }`}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Listing Types */}
                    <div className="space-y-3">
                      <Label>{t("profile.listingTypesWanted")}</Label>
                      <div className="flex flex-wrap gap-2">
                        {LISTING_TYPES.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => toggleArrayValue(preferredListingTypes, type.value, setPreferredListingTypes)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              preferredListingTypes.includes(type.value)
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            }`}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Amenities */}
                    <div className="space-y-3">
                      <Label>{t("profile.essentialAmenities")}</Label>
                      <div className="flex flex-wrap gap-2">
                        {AMENITIES.map((amenity) => (
                          <button
                            key={amenity.value}
                            type="button"
                            onClick={() => toggleArrayValue(preferredAmenities, amenity.value, setPreferredAmenities)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              preferredAmenities.includes(amenity.value)
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            }`}
                          >
                            {amenity.label}
                          </button>
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

                    <div className="bg-secondary/50 rounded-xl p-4">
                      <h3 className="font-medium mb-2">💡 {t("profile.tip")}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t("profile.tipText")}
                      </p>
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
