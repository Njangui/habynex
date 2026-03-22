import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { z } from "zod";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  ArrowRight, 
  Home, 
  MapPin, 
  Camera, 
  FileText, 
  Eye, 
  Sparkles, 
  Loader2, 
  MessageCircle,
  Sofa,
  Utensils,
  DoorOpen,
  WashingMachine,
  Building2,
  Trees,
  Store,
  Warehouse,
  Factory
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PropertyImageUpload from "@/components/PropertyImageUpload";
import PropertyLocationPicker from "@/components/PropertyLocationPicker";
import PropertyPreview from "@/components/PropertyPreview";
import NumberStepper from "@/components/NumberStepper";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

const listingSchema = z.object({
  title: z.string().min(10).max(100),
  description: z.string().min(50).max(2000),

  property_type: z.enum([
    "studio","apartment","house","room","villa","duplex",
    "penthouse",
    "furnished_apartment",
    "shared_room",
    "land","shop","store","commercial_space","building","warehouse","office"
  ]),

  listing_type: z.enum(["rent", "sale", "colocation", "short_term"]),

  price: z.number().min(1000),
  price_unit: z.enum(["month", "day", "sale"]),

  deposit: z.number().nullable(),

  bedrooms: z.number().nullable(),
  bathrooms: z.number().nullable(),
  living_rooms: z.number().nullable(),
  kitchens: z.number().nullable(),
  dining_rooms: z.number().nullable(),
  laundry_rooms: z.number().nullable(),

  area: z.number().nullable(),

  // NEW
  is_furnished: z.boolean().default(false),
  floor: z.number().nullable(),
  total_floors: z.number().nullable(),
  kitchen_type: z.enum(["open", "closed"]).nullable(),
  rules: z.string().nullable(),
  payment_options: z.array(z.string()),

  city: z.string(),
  neighborhood: z.string(),
  address: z.string(),

  latitude: z.number().nullable(),
  longitude: z.number().nullable(),

  amenities: z.array(z.string()),
  images: z.array(z.string()),

  whatsapp_enabled: z.boolean(),
  whatsapp_number: z.string().nullable(),

  is_agent_verified: z.boolean().default(false),
});

type ListingData = z.infer<typeof listingSchema>;

const CreateListing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [step, setStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const STEPS = [
    { id: 1, label: t("createListing.step1"), icon: Home },
    { id: 2, label: t("createListing.step2"), icon: MapPin },
    { id: 3, label: t("createListing.step3"), icon: Camera },
    { id: 4, label: t("createListing.step4"), icon: FileText },
    { id: 5, label: t("createListing.step5"), icon: Eye },
  ];

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
  ];

  const LISTING_TYPES = [
    { value: "rent", label: t("listing.rent"), description: language === "fr" ? "Location mensuelle" : "Monthly rent" },
    { value: "sale", label: t("listing.sale"), description: language === "fr" ? "Vente immobilière" : "Real estate sale" },
    { value: "colocation", label: t("listing.colocation"), description: language === "fr" ? "Partage de logement" : "Shared housing" },
    { value: "short_term", label: t("listing.shortTerm"), description: language === "fr" ? "Location journalière" : "Daily rental" },
  ];

  const AMENITIES = [
    { value: "closet", label: "Placard" },
    { value: "water_heater", label: "Chauffe-eau" },
    { value: "kitchen_cabinets", label: "Placards cuisine" },
    { value: "tiled_floor", label: "Carrelage" },
    { value: "ceiling_fan", label: "Ventilateur plafond" },
    { value: "backup_generator", label: "Groupe électrogène" },
    { value: "fence", label: "Clôture" },
    { value: "gate", label: "Portail" },
    { value: "paved_road", label: "Route goudronnée" },
    { value: "near_main_road", label: "Proche route principale" },
    { value: "school_nearby", label: "École à proximité" },
    { value: "market_nearby", label: "Marché à proximité" },
    { value: "wifi", label: t("amenity.wifi") },
    { value: "parking", label: t("amenity.parking") },
    { value: "pool", label: t("amenity.pool") },
    { value: "gym", label: t("amenity.gym") },
    { value: "security", label: t("amenity.security") },
    { value: "generator", label: t("amenity.generator") },
    { value: "water_tank", label: t("amenity.waterTank") },
    { value: "furnished", label: t("amenity.furnished") },
    { value: "air_conditioning", label: t("amenity.airConditioning") },
    { value: "garden", label: t("amenity.garden") },
    { value: "balcony", label: t("amenity.balcony") },
    { value: "terrace", label: t("amenity.terrace") },
    { value: "electricity_prepaid", label: language === "fr" ? "Lumière (prépayée)" : "Electricity (prepaid)" },
    { value: "electricity_postpaid", label: language === "fr" ? "Lumière (fin de mois)" : "Electricity (monthly)" },
    { value: "water_borehole", label: language === "fr" ? "Eau (forage)" : "Water (borehole)" },
    { value: "water_tap", label: language === "fr" ? "Eau (robinet)" : "Water (tap)" },
    { value: "cctv", label: language === "fr" ? "Caméra de surveillance" : "CCTV" },
    { value: "elevator", label: language === "fr" ? "Ascenseur" : "Elevator" },
    { value: "reception", label: language === "fr" ? "Réception" : "Reception" },
    { value: "storage", label: language === "fr" ? "Stockage" : "Storage" },
    { value: "loading_dock", label: language === "fr" ? "Quai de chargement" : "Loading dock" },
    { value: "meeting_room", label: language === "fr" ? "Salle de réunion" : "Meeting room" },
  ];

  const [formData, setFormData] = useState<ListingData>({
    title: "",
    description: "",
    property_type: "apartment",
    listing_type: "rent",
    price: 0,
    price_unit: "month",
    deposit: null,
    bedrooms: 1,
    bathrooms: 1,
    living_rooms: null,
    kitchens: null,
    dining_rooms: null,
    laundry_rooms: null,
    area: null,
    city: "",
    neighborhood: "",
    address: "",
    latitude: null,
    longitude: null,
    amenities: [],
    images: [],
    whatsapp_enabled: false,
    whatsapp_number: null,
    is_agent_verified: false,
    is_furnished: false,
    floor: null,
    total_floors: null,
    kitchen_type: null,
    rules: null,
    payment_options: [],
  });

  const [visitPrice, setVisitPrice] = useState<number | null>(null);
  const [rentalMonths, setRentalMonths] = useState<number | null>(null);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">{t("createListing.loginRequired")}</h1>
          <p className="text-muted-foreground mb-6">
            {t("createListing.loginMessage")}
          </p>
          <Button onClick={() => navigate("/auth")}>{t("common.login")}</Button>
        </div>
        <Footer />
      </div>
    );
  }

  const updateFormData = (updates: Partial<ListingData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    const keys = Object.keys(updates);
    setErrors((prev) => {
      const newErrors = { ...prev };
      keys.forEach((key) => delete newErrors[key]);
      return newErrors;
    });
  };

  const validateStep = () => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.property_type) newErrors.property_type = language === "fr" ? "Sélectionnez un type de bien" : "Select a property type";
        if (!formData.listing_type) newErrors.listing_type = language === "fr" ? "Sélectionnez un type d'annonce" : "Select a listing type";
        break;
      case 2:
        if (!formData.city) newErrors.city = language === "fr" ? "Sélectionnez une ville" : "Select a city";
        if (!formData.address || formData.address.length < 5) newErrors.address = t("createListing.addressRequired");
        break;
      case 3:
        if (formData.images.length === 0) newErrors.images = language === "fr" ? "Ajoutez au moins une photo" : "Add at least one photo";
        break;
      case 4:
        if (formData.title.length < 10) newErrors.title = language === "fr" ? "Le titre doit contenir au moins 10 caractères" : "Title must be at least 10 characters";
        if (formData.description.length < 50) newErrors.description = language === "fr" ? "La description doit contenir au moins 50 caractères" : "Description must be at least 50 characters";
        if (formData.price < 1000) newErrors.price = language === "fr" ? "Le prix doit être supérieur à 1000 FCFA" : "Price must be greater than 1000 FCFA";
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      if (step === 4) {
        setShowPreview(true);
      } else {
        setStep((prev) => Math.min(prev + 1, 5));
      }
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handlePublish = async () => {
    try {
      const validated = listingSchema.parse(formData);
      setIsPublishing(true);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const { data: verificationData } = await supabase
        .from("user_verifications")
        .select("identity_document_verified")
        .eq("user_id", user.id)
        .maybeSingle();

      const isIdentityVerified = verificationData?.identity_document_verified === true;

      const { error } = await supabase.from("properties").insert({
        owner_id: user.id,
        title: validated.title,
        description: validated.description,
        property_type: validated.property_type,
        listing_type: validated.listing_type,
        price: validated.price,
        price_unit: validated.price_unit,
        deposit: validated.deposit,
        bedrooms: validated.bedrooms,
        bathrooms: validated.bathrooms,
        living_rooms: validated.living_rooms,
        kitchens: validated.kitchens,
        dining_rooms: validated.dining_rooms,
        laundry_rooms: validated.laundry_rooms,
        area: validated.area,
        city: validated.city,
        neighborhood: validated.neighborhood,
        address: validated.address,
        latitude: validated.latitude,
        longitude: validated.longitude,
        amenities: validated.amenities,
        images: validated.images,
        is_published: isIdentityVerified,
        is_available: true,
        whatsapp_enabled: validated.whatsapp_enabled,
        visit_price: visitPrice,
        rental_months: rentalMonths,
        is_agent_verified: validated.is_agent_verified,
      });

      clearTimeout(timeout);

      if (error) {
        console.error("Supabase error:", error);
        throw new Error(error.message);
      }

      if (isIdentityVerified) {
        toast.success(t("createListing.success"));
      } else {
        toast.success(
          language === "fr"
            ? "Annonce créée en brouillon. Elle sera publiée après vérification de votre identité."
            : "Listing created as draft. It will be published after your identity is verified."
        );
      }
      navigate("/");
    } catch (error) {
      console.error("Publish error:", error);
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(e => e.message).join(", ");
        toast.error(messages);
      } else if (error instanceof Error) {
        if (error.message.includes("Failed to fetch") || error.name === "AbortError") {
          toast.error(language === "fr" 
            ? "Erreur de connexion. Vérifiez votre connexion internet et réessayez." 
            : "Connection error. Check your internet and try again.");
        } else {
          toast.error(error.message || (language === "fr" ? "Erreur lors de la publication de l'annonce." : "Error publishing listing."));
        }
      } else {
        toast.error(language === "fr" ? "Erreur lors de la publication de l'annonce." : "Error publishing listing.");
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const toggleAmenity = (value: string) => {
    const current = formData.amenities;
    const updated = current.includes(value)
      ? current.filter((a) => a !== value)
      : [...current, value];
    updateFormData({ amenities: updated });
  };

  const generateAIDescription = async () => {
    if (!formData.property_type || !formData.city) {
      toast.error(language === "fr" ? "Veuillez d'abord renseigner le type de bien et la ville." : "Please first fill in the property type and city.");
      return;
    }

    setIsGeneratingDescription(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(language === "fr" ? "Veuillez vous connecter pour utiliser cette fonctionnalité." : "Please login to use this feature.");
        return;
      }

      const propertyTypeLabels: Record<string, string> = {
        studio: "Studio",
        apartment: language === "fr" ? "Appartement" : "Apartment",
        house: language === "fr" ? "Maison" : "House",
        room: language === "fr" ? "Chambre" : "Room",
        villa: "Villa",
        duplex: "Duplex",
        land: language === "fr" ? "Terrain" : "Land",
        shop: language === "fr" ? "Boutique" : "Shop",
        store: language === "fr" ? "Magasin" : "Store",
        commercial_space: language === "fr" ? "Espace commercial" : "Commercial space",
        warehouse: language === "fr" ? "Entrepôt" : "Warehouse",
        office: language === "fr" ? "Bureau" : "Office",
        building: language === "fr" ? "Bâtiment" : "Building",
      };

      const listingTypeLabels: Record<string, string> = {
        rent: language === "fr" ? "location" : "rental",
        sale: language === "fr" ? "vente" : "sale",
        colocation: "colocation",
        short_term: language === "fr" ? "location courte durée" : "short-term rental",
      };

      const roomsInfo = [];
      if (formData.bedrooms !== null) roomsInfo.push(`${formData.bedrooms} ${language === "fr" ? "chambre(s)" : "bedroom(s)"}`);
      if (formData.bathrooms !== null) roomsInfo.push(`${formData.bathrooms} ${language === "fr" ? "salle(s) de bain" : "bathroom(s)"}`);
      if (formData.living_rooms !== null) roomsInfo.push(`${formData.living_rooms} ${language === "fr" ? "salon(s)" : "living room(s)"}`);
      if (formData.kitchens !== null) roomsInfo.push(`${formData.kitchens} ${language === "fr" ? "cuisine(s)" : "kitchen(s)"}`);
      if (formData.dining_rooms !== null) roomsInfo.push(`${formData.dining_rooms} ${language === "fr" ? "salle(s) à manger" : "dining room(s)"}`);
      if (formData.laundry_rooms !== null) roomsInfo.push(`${formData.laundry_rooms} ${language === "fr" ? "buanderie(s)" : "laundry room(s)"}`);

      const prompt = language === "fr" 
        ? `Génère une description attrayante et professionnelle pour une annonce immobilière avec les caractéristiques suivantes:
- Type: ${propertyTypeLabels[formData.property_type] || formData.property_type}
- Objectif: ${listingTypeLabels[formData.listing_type] || formData.listing_type}
- Ville: ${formData.city}
- Quartier: ${formData.neighborhood || "Non précisé"}
- Pièces: ${roomsInfo.join(", ") || "Non précisé"}
- Surface: ${formData.area ? formData.area + " m²" : "Non précisée"}
- Prix: ${formData.price ? formData.price.toLocaleString() + " FCFA" : "Non précisé"}
- Équipements: ${formData.amenities.length > 0 ? formData.amenities.join(", ") : "Non précisés"}

La description doit être en français, professionnelle, attrayante, et faire environ 100-150 mots. Mets en avant les points forts du bien.`
        : `Generate an attractive and professional description for a real estate listing with the following features:
- Type: ${propertyTypeLabels[formData.property_type] || formData.property_type}
- Purpose: ${listingTypeLabels[formData.listing_type] || formData.listing_type}
- City: ${formData.city}
- Neighborhood: ${formData.neighborhood || "Not specified"}
- Rooms: ${roomsInfo.join(", ") || "Not specified"}
- Area: ${formData.area ? formData.area + " sqm" : "Not specified"}
- Price: ${formData.price ? formData.price.toLocaleString() + " FCFA" : "Not specified"}
- Amenities: ${formData.amenities.length > 0 ? formData.amenities.join(", ") : "Not specified"}

The description should be in English, professional, attractive, and about 100-150 words. Highlight the property's strengths.`;

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/property-ai-search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: prompt }],
          }),
        }
      );

      if (!resp.ok) {
        throw new Error(language === "fr" ? "Erreur lors de la génération" : "Generation error");
      }

      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ") && !line.includes("[DONE]")) {
              try {
                const json = JSON.parse(line.slice(6));
                const content = json.choices?.[0]?.delta?.content;
                if (content) fullResponse += content;
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }

      const cleanedResponse = fullResponse
        .replace(/```properties[\s\S]*?```/g, "")
        .trim();

      if (cleanedResponse) {
        updateFormData({ description: cleanedResponse });
        toast.success(t("toast.descriptionGenerated"));
      }
    } catch (error) {
      console.error("AI error:", error);
      toast.error(language === "fr" ? "Erreur lors de la génération de la description." : "Error generating description.");
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const isResidential = (type: string) => {
    const residentialTypes = ["studio", "room", "apartment", "duplex", "house", "villa"];
    return residentialTypes.includes(type);
  };

  const isLand = (type: string) => type === "land";

  const isCommercial = (type: string) => {
    const commercialTypes = ["shop", "store", "commercial_space", "warehouse", "office", "building"];
    return commercialTypes.includes(type);
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{t("createListing.title")} - Habynex</title>
        <meta name="description" content={language === "fr" ? "Publiez votre annonce immobilière sur Habynex" : "Publish your real estate listing on Habynex"} />
      </Helmet>

      <Navbar />

      <main className="container mx-auto px-4 py-8 pb-32">
        {/* Progress */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                    step >= s.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  <s.icon className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm font-medium">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`w-8 sm:w-16 h-0.5 mx-2 ${
                      step > s.id ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            {/* Step 1: Property Type */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">{t("createListing.propertyType")}</h2>
                  <p className="text-muted-foreground">{t("createListing.whatType")}</p>
                </div>

                {/* Residential Properties */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    {language === "fr" ? "Résidentiel" : "Residential"}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {PROPERTY_TYPES.filter(p => p.category === "residential").map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => updateFormData({ property_type: type.value as ListingData["property_type"] })}
                        className={`p-6 rounded-xl border-2 text-center transition-all ${
                          formData.property_type === type.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <span className="text-3xl block mb-2">{type.icon}</span>
                        <span className="font-medium text-foreground">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Land */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    {language === "fr" ? "Terrain" : "Land"}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {PROPERTY_TYPES.filter(p => p.category === "land").map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => updateFormData({ property_type: type.value as ListingData["property_type"] })}
                        className={`p-6 rounded-xl border-2 text-center transition-all ${
                          formData.property_type === type.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <span className="text-3xl block mb-2">{type.icon}</span>
                        <span className="font-medium text-foreground">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Commercial Properties */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    {language === "fr" ? "Commercial" : "Commercial"}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {PROPERTY_TYPES.filter(p => p.category === "commercial").map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => updateFormData({ property_type: type.value as ListingData["property_type"] })}
                        className={`p-6 rounded-xl border-2 text-center transition-all ${
                          formData.property_type === type.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <span className="text-3xl block mb-2">{type.icon}</span>
                        <span className="font-medium text-foreground">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">{t("createListing.listingType")}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {LISTING_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => {
                          updateFormData({
                            listing_type: type.value as ListingData["listing_type"],
                            price_unit: type.value === "sale" ? "sale" : type.value === "short_term" ? "day" : "month",
                          });
                        }}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          formData.listing_type === type.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <span className="font-medium text-foreground block">{type.label}</span>
                        <span className="text-sm text-muted-foreground">{type.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Location */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">{t("property.location")}</h2>
                  <p className="text-muted-foreground">{t("createListing.whereIs")}</p>
                </div>

                <PropertyLocationPicker
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  address={formData.address}
                  city={formData.city}
                  neighborhood={formData.neighborhood}
                  onLocationChange={(data) => updateFormData(data)}
                />

                {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
              </motion.div>
            )}

            {/* Step 3: Photos */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">{t("createListing.step3")}</h2>
                  <p className="text-muted-foreground">{t("createListing.photosSubtitle")}</p>
                </div>

                <PropertyImageUpload
                  images={formData.images}
                  onChange={(images) => updateFormData({ images })}
                  userId={user.id}
                />

                {errors.images && <p className="text-sm text-destructive">{errors.images}</p>}
              </motion.div>
            )}

            {/* Step 4: Details */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">{t("createListing.step4")}</h2>
                  <p className="text-muted-foreground">
                    {language === "fr" ? "Décrivez votre bien en détail" : "Describe your property in detail"}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      {t("createListing.titleLabel")} *
                    </label>
                    <Input
                      value={formData.title}
                      onChange={(e) => updateFormData({ title: e.target.value })}
                      placeholder={t("createListing.titlePlaceholder")}
                      maxLength={100}
                    />
                    {errors.title && <p className="text-sm text-destructive mt-1">{errors.title}</p>}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-foreground">
                        {t("createListing.descriptionLabel")} *
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={generateAIDescription}
                        disabled={isGeneratingDescription}
                        className="gap-2"
                      >
                        {isGeneratingDescription ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        {t("createListing.generateAI")}
                      </Button>
                    </div>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => updateFormData({ description: e.target.value })}
                      placeholder={language === "fr" 
                        ? "Décrivez votre bien en détail (caractéristiques, environnement, accès...)" 
                        : "Describe your property in detail (features, environment, access...)"}
                      rows={5}
                      maxLength={2000}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.description.length}/2000 {language === "fr" ? "caractères" : "characters"}
                    </p>
                    {errors.description && (
                      <p className="text-sm text-destructive">{errors.description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        {t("createListing.priceLabel")} (FCFA) *
                      </label>
                      <Input
                        type="number"
                        value={formData.price || ""}
                        onChange={(e) => updateFormData({ price: parseInt(e.target.value) || 0 })}
                        placeholder="Ex: 150000"
                      />
                      {errors.price && <p className="text-sm text-destructive mt-1">{errors.price}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        {t("createListing.depositLabel")} (FCFA)
                      </label>
                      <Input
                        type="number"
                        value={formData.deposit || ""}
                        onChange={(e) =>
                          updateFormData({ deposit: parseInt(e.target.value) || null })
                        }
                        placeholder="Ex: 300000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        {language === "fr" ? "Prix de visite (FCFA)" : "Visit price (FCFA)"}
                        <span className="text-muted-foreground ml-1 font-normal">({language === "fr" ? "optionnel" : "optional"})</span>
                      </label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={visitPrice || ""}
                        onChange={(e) => setVisitPrice(parseInt(e.target.value) || null)}
                        placeholder="Ex: 5000"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        {language === "fr" ? "Durée du bail (mois)" : "Lease duration (months)"}
                        <span className="text-muted-foreground ml-1 font-normal">({language === "fr" ? "optionnel" : "optional"})</span>
                      </label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={rentalMonths || ""}
                        onChange={(e) => setRentalMonths(parseInt(e.target.value) || null)}
                        placeholder="Ex: 12"
                      />
                    </div>
                  </div>

                  {/* Residential Rooms Section */}
                  {isResidential(formData.property_type) && (
                    <div className="p-4 rounded-xl border-2 border-border bg-card/50 space-y-6">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Home className="w-5 h-5" />
                        {language === "fr" ? "Composition du logement" : "Property Composition"}
                      </h3>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                        <div>
                          <label className="text-sm font-medium text-foreground mb-3 block">
                            {t("createListing.bedroomsLabel")}
                          </label>
                          <NumberStepper
                            value={formData.bedrooms || 0}
                            onChange={(val) => updateFormData({ bedrooms: val })}
                            min={0}
                            max={20}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground mb-3 block">
                            {t("createListing.bathroomsLabel")}
                          </label>
                          <NumberStepper
                            value={formData.bathrooms || 0}
                            onChange={(val) => updateFormData({ bathrooms: val })}
                            min={0}
                            max={10}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground mb-3 block flex items-center gap-2">
                            <Sofa className="w-4 h-4" />
                            {language === "fr" ? "Salon(s)" : "Living room(s)"}
                          </label>
                          <NumberStepper
                            value={formData.living_rooms || 0}
                            onChange={(val) => updateFormData({ living_rooms: val })}
                            min={0}
                            max={10}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Logement meublé</span>
                          <Switch
                          checked={formData.is_furnished}
                          onCheckedChange={(val) => updateFormData({ is_furnished: val })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                         <Input
                            type="number"
                            placeholder="Étage"
                            onChange={(e) => updateFormData({ floor: parseInt(e.target.value) || null })}
                          />
                          <Input
                            type="number"
                            placeholder="Nombre total d'étages"
                            onChange={(e) => updateFormData({ total_floors: parseInt(e.target.value) || null })}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground mb-3 block flex items-center gap-2">
                            <Utensils className="w-4 h-4" />
                            {language === "fr" ? "Cuisine(s)" : "Kitchen(s)"}
                          </label>
                          <NumberStepper
                            value={formData.kitchens || 0}
                            onChange={(val) => updateFormData({ kitchens: val })}
                            min={0}
                            max={5}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground mb-3 block flex items-center gap-2">
                            <DoorOpen className="w-4 h-4" />
                            {language === "fr" ? "Salle(s) à manger" : "Dining room(s)"}
                          </label>
                          <NumberStepper
                            value={formData.dining_rooms || 0}
                            onChange={(val) => updateFormData({ dining_rooms: val })}
                            min={0}
                            max={5}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground mb-3 block flex items-center gap-2">
                            <WashingMachine className="w-4 h-4" />
                            {language === "fr" ? "Buanderie(s)" : "Laundry room(s)"}
                          </label>
                          <NumberStepper
                            value={formData.laundry_rooms || 0}
                            onChange={(val) => updateFormData({ laundry_rooms: val })}
                            min={0}
                            max={5}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Land Section */}
                  {isLand(formData.property_type) && (
                    <div className="p-4 rounded-xl border-2 border-border bg-card/50">
                      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Trees className="w-5 h-5" />
                        {language === "fr" ? "Caractéristiques du terrain" : "Land characteristics"}
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">
                            {t("createListing.areaLabel")} (m²) *
                          </label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            value={formData.area || ""}
                            onChange={(e) => updateFormData({ area: parseInt(e.target.value) || null })}
                            placeholder="Ex: 500"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {language === "fr" ? "Surface totale du terrain en mètres carrés" : "Total land area in square meters"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Commercial Section */}
                  {isCommercial(formData.property_type) && (
                    <div className="p-4 rounded-xl border-2 border-border bg-card/50 space-y-6">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        {language === "fr" ? "Caractéristiques commerciales" : "Commercial characteristics"}
                      </h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">
                            {t("createListing.areaLabel")} (m²)
                          </label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            value={formData.area || ""}
                            onChange={(e) => updateFormData({ area: parseInt(e.target.value) || null })}
                            placeholder="Ex: 150"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground mb-3 block">
                            {language === "fr" ? "Nombre d'étages" : "Number of floors"}
                          </label>
                          <NumberStepper
                            value={formData.bedrooms || 0}
                            onChange={(val) => updateFormData({ bedrooms: val })}
                            min={0}
                            max={20}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Area for residential if not already shown */}
                  {isResidential(formData.property_type) && (
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        {t("createListing.areaLabel")} (m²)
                      </label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={formData.area || ""}
                        onChange={(e) => updateFormData({ area: parseInt(e.target.value) || null })}
                        placeholder="Ex: 80"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-foreground mb-3 block">
                      {t("createListing.amenitiesLabel")}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {AMENITIES.map((amenity) => (
                        <div
                          key={amenity.value}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={amenity.value}
                            checked={formData.amenities.includes(amenity.value)}
                            onCheckedChange={() => toggleAmenity(amenity.value)}
                          />
                          <label
                            htmlFor={amenity.value}
                            className="text-sm text-foreground cursor-pointer"
                          >
                            {amenity.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* WhatsApp Contact Option */}
                  <div className="p-4 rounded-xl border-2 border-border bg-card/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#25D366]/20 flex items-center justify-center">
                          <MessageCircle className="w-5 h-5 text-[#25D366]" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {language === "fr" ? "Activer WhatsApp" : "Enable WhatsApp"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {language === "fr" 
                              ? "Permettre aux visiteurs de vous contacter via WhatsApp"
                              : "Allow visitors to contact you via WhatsApp"
                            }
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={formData.whatsapp_enabled}
                        onCheckedChange={(checked) => updateFormData({ whatsapp_enabled: checked })}
                      />
                    </div>
                    
                    {formData.whatsapp_enabled && (
                      <div className="mt-4">
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          {language === "fr" ? "Numéro WhatsApp (optionnel)" : "WhatsApp number (optional)"}
                        </label>
                        <Input
                          type="tel"
                          value={formData.whatsapp_number || ""}
                          onChange={(e) => updateFormData({ whatsapp_number: e.target.value || null })}
                          placeholder="+237 6XX XXX XXX"
                          className="max-w-xs"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {language === "fr" 
                            ? "Laissez vide pour utiliser le numéro de votre profil"
                            : "Leave empty to use your profile number"
                          }
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Agent Verification Option */}
                  <div className="p-4 rounded-xl border-2 border-blue-100 bg-blue-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {language === "fr" ? "Agent Vérifié" : "Agent Verified"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {language === "fr" 
                              ? "Cette annonce est publiée par un agent immobilier vérifié"
                              : "This listing is posted by a verified real estate agent"
                            }
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={formData.is_agent_verified}
                        onCheckedChange={(checked) => updateFormData({ is_agent_verified: checked })}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
        <div className="max-w-3xl mx-auto flex justify-between">
          <Button variant="outline" onClick={handleBack} disabled={step === 1}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("common.previous")}
          </Button>
          <Button variant="hero" onClick={handleNext}>
            {step === 4 ? (
              <>
                <Eye className="w-4 h-4 mr-2" />
                {t("createListing.step5")}
              </>
            ) : (
              <>
                {t("common.next")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <PropertyPreview
            data={formData as { title: string; description: string; property_type: string; listing_type: string; price: number; price_unit: string; deposit: number | null; bedrooms: number | null; bathrooms: number | null; living_rooms: number | null; kitchens: number | null; dining_rooms: number | null; laundry_rooms: number | null; area: number | null; city: string; neighborhood: string; address: string; amenities: string[]; images: string[]; is_agent_verified: boolean }}
            onClose={() => setShowPreview(false)}
            onPublish={handlePublish}
            isPublishing={isPublishing}
          />
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default CreateListing;