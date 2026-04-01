import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, MapPin, Wallet, Users, Bed, Car, 
  Wifi, Dog, TreePine, Dumbbell, ChevronRight, 
  ChevronLeft, Check, Sparkles, Building2, Briefcase,
  Search, Calendar, Heart, Shield, Clock, Key,
  FileText, UserCheck, Star, MessageSquare,
  Utensils, DoorOpen, WashingMachine, Sofa,
  Trees, Store, Warehouse, Factory, Scissors,
  Coffee, Wine, BedDouble, Pill, Stethoscope,
  Presentation, Wrench, Zap, Droplets, Camera,
  MapPinned, BadgeCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface OnboardingQuestionsProps {
  userId: string;
  onComplete: (accountType?: string) => void;
}

interface Question {
  id: string;
  title: string;
  titleEn: string;
  subtitle: string;
  subtitleEn: string;
  type: "single" | "multiple" | "range" | "text" | "amenities";
  options?: { value: string; label: string; labelEn: string; icon: React.ElementType; description?: string; descriptionEn?: string; category?: string }[];
  field: string;
  showFor?: string[];
  maxSelect?: number;
}

export const OnboardingQuestions = ({ userId, onComplete }: OnboardingQuestionsProps) => {
  const { language, t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({
    account_type: "",
    city: "",
    preferred_neighborhoods: "",
    budget_min: 50000,
    budget_max: 500000,
    preferred_property_types: [],
    preferred_listing_types: [],
    preferred_amenities: [],
    move_in_timeline: "",
    experience_years: "",
    properties_count: "",
    verification_intent: "",
    communication_preference: [],
    // New fields from listing creation
    must_have_features: [],
    deal_breakers: [],
    preferred_floor: null,
    parking_needed: false,
    pet_friendly: false,
    furnished_preference: null,
  });
  const [saving, setSaving] = useState(false);

  // Unified property types matching listing creation
  const PROPERTY_TYPES = [
    // Residential
    { value: "studio", label: "Studio", labelEn: "Studio", icon: Home, category: "residential" },
    { value: "room", label: "Chambre", labelEn: "Room", icon: Bed, category: "residential" },
    { value: "apartment", label: "Appartement", labelEn: "Apartment", icon: Building2, category: "residential" },
    { value: "duplex", label: "Duplex", labelEn: "Duplex", icon: Home, category: "residential" },
    { value: "house", label: "Maison", labelEn: "House", icon: Home, category: "residential" },
    { value: "villa", label: "Villa", labelEn: "Villa", icon: Home, category: "residential" },
    { value: "penthouse", label: "Penthouse", labelEn: "Penthouse", icon: Building2, category: "residential" },
    { value: "furnished_apartment", label: "Appartement meublé", labelEn: "Furnished Apartment", icon: Sofa, category: "residential" },
    { value: "shared_room", label: "Colocation", labelEn: "Shared Room", icon: Users, category: "residential" },
    // Land
    { value: "land", label: "Terrain", labelEn: "Land", icon: Trees, category: "land" },
    // Commercial
    { value: "shop", label: "Boutique", labelEn: "Shop", icon: Store, category: "commercial" },
    { value: "store", label: "Magasin", labelEn: "Store", icon: Store, category: "commercial" },
    { value: "commercial_space", label: "Espace commercial", labelEn: "Commercial Space", icon: Building2, category: "commercial" },
    { value: "warehouse", label: "Entrepôt", labelEn: "Warehouse", icon: Warehouse, category: "commercial" },
    { value: "office", label: "Bureau", labelEn: "Office", icon: Briefcase, category: "commercial" },
    { value: "building", label: "Bâtiment", labelEn: "Building", icon: Factory, category: "commercial" },
    // New commercial types
    { value: "beauty_salon", label: "Institut de beauté", labelEn: "Beauty Salon", icon: Sparkles, category: "commercial" },
    { value: "hair_salon", label: "Salon de coiffure", labelEn: "Hair Salon", icon: Scissors, category: "commercial" },
    { value: "restaurant", label: "Restaurant", labelEn: "Restaurant", icon: Utensils, category: "commercial" },
    { value: "cafe", label: "Café", labelEn: "Café", icon: Coffee, category: "commercial" },
    { value: "bar", label: "Bar", labelEn: "Bar", icon: Wine, category: "commercial" },
    { value: "hotel", label: "Hôtel", labelEn: "Hotel", icon: BedDouble, category: "commercial" },
    { value: "pharmacy", label: "Pharmacie", labelEn: "Pharmacy", icon: Pill, category: "commercial" },
    { value: "clinic", label: "Clinique", labelEn: "Clinic", icon: Stethoscope, category: "commercial" },
    { value: "gym", label: "Salle de sport", labelEn: "Gym", icon: Dumbbell, category: "commercial" },
    { value: "coworking", label: "Espace coworking", labelEn: "Coworking", icon: Users, category: "commercial" },
    { value: "showroom", label: "Showroom", labelEn: "Showroom", icon: Presentation, category: "commercial" },
    { value: "workshop", label: "Atelier", labelEn: "Workshop", icon: Wrench, category: "commercial" },
  ];

  // Enhanced amenities matching listing creation
  const AMENITIES = [
    // Essential
    { value: "wifi", label: "WiFi", labelEn: "WiFi", icon: Wifi, category: "essential" },
    { value: "parking", label: "Parking", labelEn: "Parking", icon: Car, category: "essential" },
    { value: "security", label: "Sécurité", labelEn: "Security", icon: Shield, category: "essential" },
    { value: "generator", label: "Groupe électrogène", labelEn: "Generator", icon: Zap, category: "essential" },
    { value: "water_tank", label: "Réservoir d'eau", labelEn: "Water Tank", icon: Droplets, category: "essential" },
    // Comfort
    { value: "air_conditioning", label: "Climatisation", labelEn: "Air Conditioning", icon: Sparkles, category: "comfort" },
    { value: "furnished", label: "Meublé", labelEn: "Furnished", icon: Sofa, category: "comfort" },
    { value: "garden", label: "Jardin", labelEn: "Garden", icon: TreePine, category: "comfort" },
    { value: "balcony", label: "Balcon", labelEn: "Balcony", icon: Home, category: "comfort" },
    { value: "terrace", label: "Terrasse", labelEn: "Terrace", icon: Home, category: "comfort" },
    // Services
    { value: "gym", label: "Salle de sport", labelEn: "Gym", icon: Dumbbell, category: "services" },
    { value: "pool", label: "Piscine", labelEn: "Pool", icon: Droplets, category: "services" },
    { value: "elevator", label: "Ascenseur", labelEn: "Elevator", icon: Building2, category: "services" },
    { value: "cctv", label: "Caméra surveillance", labelEn: "CCTV", icon: Camera, category: "services" },
    // Practical
    { value: "pets_allowed", label: "Animaux acceptés", labelEn: "Pets Allowed", icon: Dog, category: "practical" },
    { value: "wheelchair_access", label: "Accès handicapé", labelEn: "Wheelchair Access", icon: UserCheck, category: "practical" },
  ];

  const LISTING_TYPES = [
    { value: "rent", label: "Location", labelEn: "Rent", icon: Key, description: "Location mensuelle", descriptionEn: "Monthly rental" },
    { value: "sale", label: "Achat", labelEn: "Buy", icon: Home, description: "Acheter un bien", descriptionEn: "Buy a property" },
    { value: "colocation", label: "Colocation", labelEn: "Roommate", icon: Users, description: "Partager un logement", descriptionEn: "Shared housing" },
    { value: "short_term", label: "Court séjour", labelEn: "Short stay", icon: Calendar, description: "Location journalière", descriptionEn: "Daily rental" },
  ];

  const TIMELINE_OPTIONS = [
    { value: "immediate", label: "Immédiatement", labelEn: "Immediately", icon: Clock, description: "Dans les prochains jours", descriptionEn: "In the next few days" },
    { value: "within_month", label: "Ce mois-ci", labelEn: "This month", icon: Calendar, description: "D'ici 30 jours", descriptionEn: "Within 30 days" },
    { value: "within_3months", label: "D'ici 3 mois", labelEn: "Within 3 months", icon: Calendar, description: "Pas pressé", descriptionEn: "No rush" },
    { value: "flexible", label: "Flexible", labelEn: "Flexible", icon: Heart, description: "Pas de date précise", descriptionEn: "No specific date" },
  ];

  const FURNISHED_OPTIONS = [
    { value: "furnished", label: "Meublé", labelEn: "Furnished", icon: Sofa, description: "Prêt à emménager", descriptionEn: "Move-in ready" },
    { value: "unfurnished", label: "Non meublé", labelEn: "Unfurnished", icon: Home, description: "Apporter mes meubles", descriptionEn: "Bring my own furniture" },
    { value: "either", label: "Les deux", labelEn: "Either", icon: Check, description: "Pas de préférence", descriptionEn: "No preference" },
  ];

  // Unified questions flow
  const getQuestions = (): Question[] => {
    const baseQuestions: Question[] = [
      {
        id: "account_type",
        title: "Quel est votre profil ?",
        titleEn: "What is your profile?",
        subtitle: "Cela nous aide à personnaliser votre expérience",
        subtitleEn: "This helps us personalize your experience",
        type: "single",
        field: "account_type",
        options: [
          { value: "seeker", label: "Je cherche un logement", labelEn: "I'm looking for a home", icon: Search, description: "Locataire ou acheteur", descriptionEn: "Tenant or buyer" },
          { value: "owner", label: "Je suis propriétaire", labelEn: "I'm an owner", icon: Home, description: "Je mets mon bien en location/vente", descriptionEn: "I'm renting/selling my property" },
          { value: "agent", label: "Je suis agent immobilier", labelEn: "I'm a real estate agent", icon: Briefcase, description: "Je gère des biens pour des propriétaires", descriptionEn: "I manage properties for owners" },
          { value: "agency", label: "Je représente une agence", labelEn: "I represent an agency", icon: Building2, description: "Agence immobilière professionnelle", descriptionEn: "Professional real estate agency" },
        ],
      },
    ];

    const seekerQuestions: Question[] = [
      {
        id: "city",
        title: "Dans quelle ville cherchez-vous ?",
        titleEn: "In which city are you looking?",
        subtitle: "Nous vous montrerons les biens disponibles dans cette zone",
        subtitleEn: "We'll show you available properties in this area",
        type: "text",
        field: "city",
        showFor: ["seeker"],
      },
      {
        id: "neighborhoods",
        title: "Quels quartiers préférez-vous ?",
        titleEn: "Which neighborhoods do you prefer?",
        subtitle: "Séparez par des virgules (ex: Bastos, Mvan, Essos)",
        subtitleEn: "Separate with commas (e.g., Bastos, Mvan, Essos)",
        type: "text",
        field: "preferred_neighborhoods",
        showFor: ["seeker"],
      },
      {
        id: "listing_types",
        title: "Quel type d'offre recherchez-vous ?",
        titleEn: "What type of offer are you looking for?",
        subtitle: "Vous pouvez en sélectionner plusieurs",
        subtitleEn: "You can select multiple options",
        type: "multiple",
        field: "preferred_listing_types",
        showFor: ["seeker"],
        maxSelect: 2,
        options: LISTING_TYPES,
      },
      {
        id: "property_types",
        title: "Quel type de bien recherchez-vous ?",
        titleEn: "What type of property are you looking for?",
        subtitle: "Sélectionnez jusqu'à 3 types",
        subtitleEn: "Select up to 3 types",
        type: "multiple",
        field: "preferred_property_types",
        showFor: ["seeker"],
        maxSelect: 3,
        options: PROPERTY_TYPES.filter(p => p.category === "residential"),
      },
      {
        id: "budget",
        title: "Quel est votre budget ?",
        titleEn: "What is your budget?",
        subtitle: "Indiquez la fourchette de prix qui vous convient",
        subtitleEn: "Indicate your preferred price range",
        type: "range",
        field: "budget", // Note: this is just for grouping, actual fields are budget_min and budget_max
        showFor: ["seeker"],
      },
      {
        id: "furnished",
        title: "Préférence meublé/non meublé ?",
        titleEn: "Furnished or unfurnished preference?",
        subtitle: "Cela nous aide à filtrer les résultats",
        subtitleEn: "This helps us filter results",
        type: "single",
        field: "furnished_preference",
        showFor: ["seeker"],
        options: FURNISHED_OPTIONS,
      },
      {
        id: "amenities",
        title: "Quels équipements sont essentiels ?",
        titleEn: "What amenities are essential?",
        subtitle: "Sélectionnez vos must-haves (max 5)",
        subtitleEn: "Select your must-haves (max 5)",
        type: "amenities",
        field: "preferred_amenities",
        showFor: ["seeker"],
        maxSelect: 5,
        options: AMENITIES,
      },
      {
        id: "move_timeline",
        title: "Quand souhaitez-vous emménager ?",
        titleEn: "When do you want to move in?",
        subtitle: "Cela nous aide à prioriser les annonces",
        subtitleEn: "This helps us prioritize listings",
        type: "single",
        field: "move_in_timeline",
        showFor: ["seeker"],
        options: TIMELINE_OPTIONS,
      },
    ];

    const ownerAgentQuestions: Question[] = [
      {
        id: "city_owner",
        title: "Dans quelle ville proposez-vous des biens ?",
        titleEn: "In which city do you offer properties?",
        subtitle: "Cela nous aide à cibler les locataires potentiels",
        subtitleEn: "This helps us target potential tenants",
        type: "text",
        field: "city",
        showFor: ["owner", "agent", "agency"],
      },
      {
        id: "experience",
        title: "Votre expérience dans l'immobilier ?",
        titleEn: "Your experience in real estate?",
        subtitle: "Votre expérience renforce la confiance",
        subtitleEn: "Your experience builds trust",
        type: "single",
        field: "experience_years",
        showFor: ["owner", "agent", "agency"],
        options: [
          { value: "new", label: "Je débute", labelEn: "Just starting", icon: Sparkles, description: "Premier bien", descriptionEn: "First property" },
          { value: "1-3", label: "1 à 3 ans", labelEn: "1-3 years", icon: Calendar, description: "Quelques biens", descriptionEn: "Few properties" },
          { value: "3-5", label: "3 à 5 ans", labelEn: "3-5 years", icon: Star, description: "Expérience confirmée", descriptionEn: "Confirmed experience" },
          { value: "5+", label: "Plus de 5 ans", labelEn: "5+ years", icon: BadgeCheck, description: "Expert", descriptionEn: "Expert" },
        ],
      },
      {
        id: "properties_managed",
        title: "Combien de biens gérez-vous ?",
        titleEn: "How many properties do you manage?",
        subtitle: "Pour adapter nos outils à vos besoins",
        subtitleEn: "To adapt our tools to your needs",
        type: "single",
        field: "properties_count",
        showFor: ["owner", "agent", "agency"],
        options: [
          { value: "1", label: "1 bien", labelEn: "1 property", icon: Home, description: "Propriétaire individuel", descriptionEn: "Individual owner" },
          { value: "2-5", label: "2 à 5 biens", labelEn: "2-5 properties", icon: Building2, description: "Petit portefeuille", descriptionEn: "Small portfolio" },
          { value: "6-10", label: "6 à 10 biens", labelEn: "6-10 properties", icon: Building2, description: "Portefeuille moyen", descriptionEn: "Medium portfolio" },
          { value: "10+", label: "Plus de 10", labelEn: "10+ properties", icon: Factory, description: "Grand portefeuille", descriptionEn: "Large portfolio" },
        ],
      },
      {
        id: "verification_intent",
        title: "Vérifier votre profil ?",
        titleEn: "Verify your profile?",
        subtitle: "Les profils vérifiés attirent 3x plus de locataires",
        subtitleEn: "Verified profiles attract 3x more tenants",
        type: "single",
        field: "verification_intent",
        showFor: ["owner", "agent", "agency"],
        options: [
          { value: "yes", label: "Oui, maintenant", labelEn: "Yes, now", icon: Shield, description: "Badge vérifié", descriptionEn: "Verified badge" },
          { value: "later", label: "Plus tard", labelEn: "Later", icon: Clock, description: "Je verrai après", descriptionEn: "I'll see later" },
        ],
      },
    ];

    const accountType = answers.account_type;
    if (!accountType) return baseQuestions;
    
    return accountType === "seeker" 
      ? [...baseQuestions, ...seekerQuestions]
      : [...baseQuestions, ...ownerAgentQuestions];
  };

  const questions = getQuestions();
  const safeStep = Math.min(currentStep, questions.length - 1);
  const currentQuestion = questions[safeStep];
  const progress = ((safeStep + 1) / questions.length) * 100;

  const handleSingleSelect = (value: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.field]: value }));
    if (currentQuestion.field === "account_type") {
      setCurrentStep(0);
    }
  };

  const handleMultipleSelect = (value: string, maxSelect?: number) => {
    const currentValues = answers[currentQuestion.field] || [];
    const isSelected = currentValues.includes(value);
    
    let newValues: string[];
    if (isSelected) {
      newValues = currentValues.filter((v: string) => v !== value);
    } else {
      if (maxSelect && currentValues.length >= maxSelect) {
        toast.info(language === "fr" ? `Maximum ${maxSelect} sélections` : `Maximum ${maxSelect} selections`);
        return;
      }
      newValues = [...currentValues, value];
    }
    setAnswers(prev => ({ ...prev, [currentQuestion.field]: newValues }));
  };

  const handleTextChange = (value: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.field]: value }));
  };

  const handleRangeChange = (field: "budget_min" | "budget_max", value: number) => {
    setAnswers(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    if (currentQuestion.type === "single") {
      return !!answers[currentQuestion.field];
    }
    if (currentQuestion.type === "text") {
      return !!answers[currentQuestion.field]?.trim();
    }
    if (currentQuestion.type === "multiple" || currentQuestion.type === "amenities") {
      return answers[currentQuestion.field]?.length > 0;
    }
    if (currentQuestion.type === "range") {
      // Pour le range, on vérifie que les deux valeurs sont présentes et valides
      return answers.budget_min > 0 && answers.budget_max > 0 && answers.budget_max > answers.budget_min;
    }
    return true;
  };

  const handleNext = () => {
    if (safeStep < questions.length - 1) {
      setCurrentStep(safeStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (safeStep > 0) {
      setCurrentStep(safeStep - 1);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    
    try {
      const neighborhoods = answers.preferred_neighborhoods
        ? answers.preferred_neighborhoods.split(",").map((n: string) => n.trim()).filter(Boolean)
        : [];

      // Prepare data for recommendations algorithm
      const profileData: Record<string, any> = {
        user_type: answers.account_type,
        city: answers.city || null,
        preferred_property_types: answers.preferred_property_types,
        preferred_neighborhoods: neighborhoods,
        preferred_listing_types: answers.preferred_listing_types,
        preferred_amenities: answers.preferred_amenities,
        move_in_timeline: answers.move_in_timeline,
        furnished_preference: answers.furnished_preference,
        updated_at: new Date().toISOString(),
      };

      // N'ajouter les champs budget que pour les seeker et s'ils existent
      if (answers.account_type === "seeker") {
        if (answers.budget_min !== undefined && answers.budget_min !== null) {
          profileData.budget_min = answers.budget_min;
        }
        if (answers.budget_max !== undefined && answers.budget_max !== null) {
          profileData.budget_max = answers.budget_max;
        }
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update(profileData)
        .eq("user_id", userId);

      if (profileError) throw profileError;

      await supabase
        .from("onboarding_status")
        .upsert({
          user_id: userId,
          completed_at: new Date().toISOString(),
          version: 2, // Incremented for new schema
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (answers.account_type !== "seeker") {
        const accountType = answers.account_type as "owner" | "agent" | "agency";
        
        const { data: existingVerification } = await supabase
          .from("user_verifications")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        const verificationData = {
          account_type: accountType,
          experience_years: answers.experience_years,
          properties_count: answers.properties_count,
          verification_intent: answers.verification_intent,
        };

        if (existingVerification) {
          await supabase
            .from("user_verifications")
            .update(verificationData)
            .eq("user_id", userId);
        } else {
          await supabase
            .from("user_verifications")
            .insert({ 
              user_id: userId,
              ...verificationData
            });
        }
      }

      toast.success(language === "fr" ? "Profil configuré avec succès !" : "Profile set up successfully!");
      onComplete(answers.account_type);
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error(language === "fr" ? "Erreur lors de la sauvegarde" : "Error saving preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "essential": return Zap;
      case "comfort": return Sofa;
      case "services": return Star;
      case "practical": return Check;
      default: return Sparkles;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background overflow-y-auto"
    >
      <div className="w-full max-w-2xl mx-auto p-6 py-8">
        {/* Progress bar */}
        <div className="mb-6 sticky top-0 bg-background z-10 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground font-medium">
              {language === "fr" ? "Étape" : "Step"} {safeStep + 1} / {questions.length}
            </span>
            <button 
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("common.skip")}
            </button>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Question content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="text-center space-y-2">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3"
              >
                {currentQuestion.type === "amenities" ? (
                  <Sparkles className="w-7 h-7 text-primary" />
                ) : currentQuestion.field === "city" || currentQuestion.field === "preferred_neighborhoods" ? (
                  <MapPinned className="w-7 h-7 text-primary" />
                ) : currentQuestion.type === "range" ? (
                  <Wallet className="w-7 h-7 text-primary" />
                ) : (
                  <Sparkles className="w-7 h-7 text-primary" />
                )}
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground">
                {language === "fr" ? currentQuestion.title : currentQuestion.titleEn}
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                {language === "fr" ? currentQuestion.subtitle : currentQuestion.subtitleEn}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-4">
              {/* Single/Multiple select cards */}
              {(currentQuestion.type === "single" || currentQuestion.type === "multiple") && currentQuestion.options && (
                <div className={`grid gap-3 ${currentQuestion.type === "multiple" ? "grid-cols-2 sm:grid-cols-2" : "grid-cols-1"}`}>
                  {currentQuestion.options.map((option) => {
                    const Icon = option.icon;
                    const isSelected = currentQuestion.type === "single" 
                      ? answers[currentQuestion.field] === option.value
                      : answers[currentQuestion.field]?.includes(option.value);
                    
                    return (
                      <motion.button
                        key={option.value}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => currentQuestion.type === "single" 
                          ? handleSingleSelect(option.value)
                          : handleMultipleSelect(option.value, currentQuestion.maxSelect)
                        }
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/30 bg-card"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-foreground block text-sm">
                            {language === "fr" ? option.label : option.labelEn}
                          </span>
                          {(option.description || option.descriptionEn) && (
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {language === "fr" ? option.description : option.descriptionEn}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="w-5 h-5 text-primary shrink-0" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Amenities grid with categories */}
              {currentQuestion.type === "amenities" && currentQuestion.options && (
                <div className="space-y-4">
                  {["essential", "comfort", "services", "practical"].map((category) => {
                    const categoryAmenities = currentQuestion.options?.filter(o => o.category === category);
                    if (!categoryAmenities?.length) return null;
                    
                    const CategoryIcon = getCategoryIcon(category);
                    
                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground px-1">
                          <CategoryIcon className="w-4 h-4" />
                          <span className="capitalize">
                            {category === "essential" && (language === "fr" ? "Essentiels" : "Essential")}
                            {category === "comfort" && (language === "fr" ? "Confort" : "Comfort")}
                            {category === "services" && (language === "fr" ? "Services" : "Services")}
                            {category === "practical" && (language === "fr" ? "Pratique" : "Practical")}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {categoryAmenities.map((option) => {
                            const Icon = option.icon;
                            const isSelected = answers[currentQuestion.field]?.includes(option.value);
                            
                            return (
                              <motion.button
                                key={option.value}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleMultipleSelect(option.value, currentQuestion.maxSelect)}
                                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                                  isSelected
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/30 bg-card"
                                }`}
                              >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                                }`}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-medium text-foreground text-center leading-tight">
                                  {language === "fr" ? option.label : option.labelEn}
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Text input */}
              {currentQuestion.type === "text" && (
                <div className="max-w-md mx-auto">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder={currentQuestion.field === "preferred_neighborhoods" 
                        ? (language === "fr" ? "Bastos, Mvan, Essos..." : "Bastos, Mvan, Essos...")
                        : (language === "fr" ? "Douala, Yaoundé..." : "Douala, Yaoundé...")}
                      value={answers[currentQuestion.field] || ""}
                      onChange={(e) => handleTextChange(e.target.value)}
                      className="pl-10 h-12 text-base"
                    />
                  </div>
                </div>
              )}

              {/* Budget range */}
              {currentQuestion.type === "range" && (
                <div className="max-w-md mx-auto space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        {t("onboarding.budgetMin")}
                      </label>
                      <div className="relative">
                        <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="number"
                          value={answers.budget_min}
                          onChange={(e) => handleRangeChange("budget_min", parseInt(e.target.value) || 0)}
                          className="pl-9"
                          min={0}
                          step={10000}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        {t("onboarding.budgetMax")}
                      </label>
                      <div className="relative">
                        <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="number"
                          value={answers.budget_max}
                          onChange={(e) => handleRangeChange("budget_max", parseInt(e.target.value) || 0)}
                          className="pl-9"
                          min={answers.budget_min}
                          step={10000}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <span className="text-lg font-semibold text-foreground">
                      {answers.budget_min.toLocaleString()} - {answers.budget_max.toLocaleString()} FCFA
                    </span>
                    <span className="text-xs text-muted-foreground block mt-1">
                      {language === "fr" ? "par mois" : "per month"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Selection counter for multiple */}
            {(currentQuestion.type === "multiple" || currentQuestion.type === "amenities") && currentQuestion.maxSelect && (
              <div className="text-center text-sm text-muted-foreground">
                {answers[currentQuestion.field]?.length || 0} / {currentQuestion.maxSelect} {language === "fr" ? "sélectionnés" : "selected"}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6 sticky bottom-0 bg-background pb-4">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={safeStep === 0}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                {t("common.previous")}
              </Button>
              
              <Button
                onClick={handleNext}
                disabled={!canProceed() || saving}
                className="gap-2 min-w-[120px]"
              >
                {safeStep === questions.length - 1 ? (
                  saving ? (
                    <span className="animate-pulse">{t("common.loading")}</span>
                  ) : (
                    <>
                      {t("onboarding.complete")}
                      <Check className="w-4 h-4" />
                    </>
                  )
                ) : (
                  <>
                    {t("common.next")}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default OnboardingQuestions;