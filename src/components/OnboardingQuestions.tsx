import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, MapPin, Wallet, Users, Bed, Car, 
  Wifi, Dog, TreePine, Dumbbell, ChevronRight, 
  ChevronLeft, Check, Sparkles, Building2, Briefcase,
  Search, Calendar, Heart, Shield, Clock, Key,
  FileText, UserCheck, Star, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  type: "single" | "multiple" | "range" | "text";
  options?: { value: string; label: string; labelEn: string; icon: React.ElementType; description?: string; descriptionEn?: string }[];
  field: string;
  showFor?: string[];
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
    // Owner/Agent specific
    experience_years: "",
    properties_count: "",
  });
  const [saving, setSaving] = useState(false);

  // Questions for SEEKERS
  const seekerQuestions: Question[] = [
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
      title: "Quels quartiers vous intéressent ?",
      titleEn: "Which neighborhoods interest you?",
      subtitle: "Séparez les quartiers par des virgules (ex: Bastos, Mvan, Essos)",
      subtitleEn: "Separate neighborhoods with commas (e.g., Bastos, Mvan, Essos)",
      type: "text",
      field: "preferred_neighborhoods",
      showFor: ["seeker"],
    },
    {
      id: "budget",
      title: "Quel est votre budget mensuel ?",
      titleEn: "What is your monthly budget?",
      subtitle: "Indiquez la fourchette de prix qui vous convient",
      subtitleEn: "Indicate your preferred price range",
      type: "range",
      field: "budget",
      showFor: ["seeker"],
    },
    {
      id: "property_types",
      title: "Quel type de bien recherchez-vous ?",
      titleEn: "What type of property are you looking for?",
      subtitle: "Vous pouvez en sélectionner plusieurs",
      subtitleEn: "You can select multiple options",
      type: "multiple",
      field: "preferred_property_types",
      showFor: ["seeker"],
      options: [
        { value: "studio", label: "Studio", labelEn: "Studio", icon: Home },
        { value: "apartment", label: "Appartement", labelEn: "Apartment", icon: Building2 },
        { value: "house", label: "Maison", labelEn: "House", icon: Home },
        { value: "villa", label: "Villa", labelEn: "Villa", icon: Home },
        { value: "room", label: "Chambre", labelEn: "Room", icon: Bed },
      ],
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
      options: [
        { value: "rent", label: "Location", labelEn: "Rent", icon: Key, description: "Location mensuelle", descriptionEn: "Monthly rental" },
        { value: "sale", label: "Achat", labelEn: "Buy", icon: Home, description: "Acheter un bien", descriptionEn: "Buy a property" },
        { value: "colocation", label: "Colocation", labelEn: "Roommate", icon: Users, description: "Partager un logement", descriptionEn: "Shared housing" },
        { value: "short_term", label: "Court séjour", labelEn: "Short stay", icon: Calendar, description: "Location journalière", descriptionEn: "Daily rental" },
      ],
    },
    {
      id: "move_timeline",
      title: "Quand souhaitez-vous emménager ?",
      titleEn: "When do you want to move in?",
      subtitle: "Cela nous aide à prioriser les annonces disponibles",
      subtitleEn: "This helps us prioritize available listings",
      type: "single",
      field: "move_in_timeline",
      showFor: ["seeker"],
      options: [
        { value: "immediate", label: "Immédiatement", labelEn: "Immediately", icon: Clock, description: "Dans les prochains jours", descriptionEn: "In the next few days" },
        { value: "within_month", label: "Ce mois-ci", labelEn: "This month", icon: Calendar, description: "D'ici 30 jours", descriptionEn: "Within 30 days" },
        { value: "within_3months", label: "D'ici 3 mois", labelEn: "Within 3 months", icon: Calendar, description: "Pas pressé", descriptionEn: "No rush" },
        { value: "flexible", label: "Flexible", labelEn: "Flexible", icon: Heart, description: "Pas de date précise", descriptionEn: "No specific date" },
      ],
    },
    {
      id: "amenities",
      title: "Quels équipements sont essentiels pour vous ?",
      titleEn: "What amenities are essential for you?",
      subtitle: "Nous prioriserons les biens avec ces équipements",
      subtitleEn: "We'll prioritize properties with these amenities",
      type: "multiple",
      field: "preferred_amenities",
      showFor: ["seeker"],
      options: [
        { value: "parking", label: "Parking", labelEn: "Parking", icon: Car },
        { value: "wifi", label: "WiFi", labelEn: "WiFi", icon: Wifi },
        { value: "pets", label: "Animaux", labelEn: "Pets", icon: Dog },
        { value: "garden", label: "Jardin", labelEn: "Garden", icon: TreePine },
        { value: "gym", label: "Sport", labelEn: "Gym", icon: Dumbbell },
        { value: "security", label: "Sécurité", labelEn: "Security", icon: Shield },
        { value: "furnished", label: "Meublé", labelEn: "Furnished", icon: Home },
        { value: "generator", label: "Groupe élec.", labelEn: "Generator", icon: Sparkles },
      ],
    },
  ];

  // Questions for OWNERS/AGENTS/AGENCIES
  const ownerAgentQuestions: Question[] = [
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
    {
      id: "city_owner",
      title: "Dans quelle ville proposez-vous des biens ?",
      titleEn: "In which city do you offer properties?",
      subtitle: "Cela nous aide à mieux cibler les locataires potentiels",
      subtitleEn: "This helps us better target potential tenants",
      type: "text",
      field: "city",
      showFor: ["owner", "agent", "agency"],
    },
    {
      id: "experience",
      title: "Depuis combien de temps êtes-vous dans l'immobilier ?",
      titleEn: "How long have you been in real estate?",
      subtitle: "Votre expérience renforce la confiance des locataires",
      subtitleEn: "Your experience builds tenant trust",
      type: "single",
      field: "experience_years",
      showFor: ["owner", "agent", "agency"],
      options: [
        { value: "new", label: "Je débute", labelEn: "Just starting", icon: Sparkles, description: "C'est mon premier bien", descriptionEn: "This is my first property" },
        { value: "1-3", label: "1 à 3 ans", labelEn: "1-3 years", icon: Calendar, description: "Quelques années d'expérience", descriptionEn: "A few years of experience" },
        { value: "3-5", label: "3 à 5 ans", labelEn: "3-5 years", icon: Star, description: "Expérience confirmée", descriptionEn: "Confirmed experience" },
        { value: "5+", label: "Plus de 5 ans", labelEn: "5+ years", icon: UserCheck, description: "Expert immobilier", descriptionEn: "Real estate expert" },
      ],
    },
    {
      id: "properties_managed",
      title: "Combien de biens gérez-vous actuellement ?",
      titleEn: "How many properties do you currently manage?",
      subtitle: "Cela nous aide à adapter nos outils à vos besoins",
      subtitleEn: "This helps us adapt our tools to your needs",
      type: "single",
      field: "properties_count",
      showFor: ["owner", "agent", "agency"],
      options: [
        { value: "1", label: "1 bien", labelEn: "1 property", icon: Home, description: "Propriétaire individuel", descriptionEn: "Individual owner" },
        { value: "2-5", label: "2 à 5 biens", labelEn: "2-5 properties", icon: Building2, description: "Petit portefeuille", descriptionEn: "Small portfolio" },
        { value: "6-10", label: "6 à 10 biens", labelEn: "6-10 properties", icon: Building2, description: "Portefeuille moyen", descriptionEn: "Medium portfolio" },
        { value: "10+", label: "Plus de 10", labelEn: "10+ properties", icon: Building2, description: "Grand portefeuille", descriptionEn: "Large portfolio" },
      ],
    },
    {
      id: "verification_intent",
      title: "Souhaitez-vous faire vérifier votre profil ?",
      titleEn: "Would you like to verify your profile?",
      subtitle: "Les profils vérifiés attirent 3x plus de locataires",
      subtitleEn: "Verified profiles attract 3x more tenants",
      type: "single",
      field: "verification_intent",
      showFor: ["owner", "agent", "agency"],
      options: [
        { value: "yes", label: "Oui, tout de suite", labelEn: "Yes, right away", icon: Shield, description: "Accéder au badge vérifié", descriptionEn: "Get the verified badge" },
        { value: "later", label: "Plus tard", labelEn: "Later", icon: Clock, description: "Je verrai après", descriptionEn: "I'll see later" },
        { value: "info", label: "J'aimerais en savoir plus", labelEn: "I'd like to know more", icon: FileText, description: "Voir les avantages", descriptionEn: "See the benefits" },
      ],
    },
    {
      id: "communication_pref",
      title: "Comment préférez-vous être contacté ?",
      titleEn: "How do you prefer to be contacted?",
      subtitle: "Nous respecterons vos préférences de communication",
      subtitleEn: "We'll respect your communication preferences",
      type: "multiple",
      field: "communication_preference",
      showFor: ["owner", "agent", "agency"],
      options: [
        { value: "whatsapp", label: "WhatsApp", labelEn: "WhatsApp", icon: MessageSquare },
        { value: "email", label: "Email", labelEn: "Email", icon: FileText },
        { value: "phone", label: "Téléphone", labelEn: "Phone", icon: Briefcase },
        { value: "app", label: "Messagerie Habinex", labelEn: "Habinex Messaging", icon: MessageSquare },
      ],
    },
  ];

  // Get filtered questions based on account type
  const getFilteredQuestions = () => {
    const accountType = answers.account_type;
    
    if (!accountType) {
      return [seekerQuestions[0]]; // Return first question
    }
    
    if (accountType === "seeker") {
      return seekerQuestions.filter(q => {
        if (!q.showFor) return true;
        return q.showFor.includes("seeker");
      });
    } else {
      return ownerAgentQuestions.filter(q => {
        if (!q.showFor) return true;
        return q.showFor.includes(accountType);
      });
    }
  };

  const filteredQuestions = getFilteredQuestions();
  const safeStep = Math.min(currentStep, filteredQuestions.length - 1);
  const currentQuestion = filteredQuestions[safeStep];
  const progress = ((safeStep + 1) / filteredQuestions.length) * 100;

  const handleSingleSelect = (value: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.field]: value }));
    // Reset step to 0 when changing account type to avoid out-of-bounds
    if (currentQuestion.field === "account_type") {
      setCurrentStep(0);
    }
  };

  const handleMultipleSelect = (value: string) => {
    const currentValues = answers[currentQuestion.field] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v: string) => v !== value)
      : [...currentValues, value];
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
    if (currentQuestion.type === "multiple") {
      return answers[currentQuestion.field]?.length > 0;
    }
    return true;
  };

  const handleNext = () => {
    const maxStep = filteredQuestions.length - 1;
    if (safeStep < maxStep) {
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
      // Map account type to user_type enum (seeker, owner, agent, agency)
      const userType = answers.account_type;

      const neighborhoods = answers.preferred_neighborhoods
        ? answers.preferred_neighborhoods.split(",").map((n: string) => n.trim()).filter(Boolean)
        : [];

      // Update profile - use update since profile is created on signup
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          user_type: userType,
          city: answers.city || null,
          budget_min: answers.budget_min,
          budget_max: answers.budget_max,
          preferred_property_types: answers.preferred_property_types,
          preferred_neighborhoods: neighborhoods,
          preferred_listing_types: answers.preferred_listing_types,
          preferred_amenities: answers.preferred_amenities,
          move_in_timeline: answers.move_in_timeline,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (profileError) throw profileError;

      // Also mark onboarding as complete in the dedicated table
      await supabase
        .from("onboarding_status")
        .upsert({
          user_id: userId,
          completed_at: new Date().toISOString(),
          version: 1,
          updated_at: new Date().toISOString(),
        });

      if (answers.account_type !== "seeker") {
        const accountType = answers.account_type as "owner" | "agent" | "agency";
        
        const { data: existingVerification } = await supabase
          .from("user_verifications")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (existingVerification) {
          await supabase
            .from("user_verifications")
            .update({ account_type: accountType })
            .eq("user_id", userId);
        } else {
          await supabase
            .from("user_verifications")
            .insert({ 
              user_id: userId,
              account_type: accountType
            });
        }
      }

      toast.success(language === "fr" ? "Profil mis à jour avec succès !" : "Profile updated successfully!");
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background"
    >
      <div className="w-full max-w-2xl mx-auto p-6">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              {language === "fr" ? "Question" : "Question"} {safeStep + 1} {language === "fr" ? "sur" : "of"} {filteredQuestions.length}
            </span>
            <button 
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {t("common.skip")}
            </button>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Question content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4"
              >
                <Sparkles className="w-8 h-8 text-primary" />
              </motion.div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                {language === "fr" ? currentQuestion.title : currentQuestion.titleEn}
              </h2>
              <p className="text-muted-foreground">
                {language === "fr" ? currentQuestion.subtitle : currentQuestion.subtitleEn}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-4">
              {currentQuestion.type === "single" && currentQuestion.options && (
                <div className="grid gap-3">
                  {currentQuestion.options.map((option) => {
                    const Icon = option.icon;
                    const isSelected = answers[currentQuestion.field] === option.value;
                    
                    return (
                      <motion.button
                        key={option.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSingleSelect(option.value)}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <span className="font-medium text-foreground block">
                            {language === "fr" ? option.label : option.labelEn}
                          </span>
                          {(option.description || option.descriptionEn) && (
                            <span className="text-xs text-muted-foreground">
                              {language === "fr" ? option.description : option.descriptionEn}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {currentQuestion.type === "multiple" && currentQuestion.options && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {currentQuestion.options.map((option) => {
                    const Icon = option.icon;
                    const isSelected = answers[currentQuestion.field]?.includes(option.value);
                    
                    return (
                      <motion.button
                        key={option.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleMultipleSelect(option.value)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-foreground text-center">
                          {language === "fr" ? option.label : option.labelEn}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {currentQuestion.type === "text" && (
                <div className="max-w-md mx-auto">
                  <Input
                    type="text"
                    placeholder={currentQuestion.field === "preferred_neighborhoods" 
                      ? (language === "fr" ? "Ex: Bastos, Mvan, Essos..." : "e.g., Bastos, Mvan, Essos...")
                      : (language === "fr" ? "Ex: Douala, Yaoundé..." : "e.g., Douala, Yaoundé...")}
                    value={answers[currentQuestion.field] || ""}
                    onChange={(e) => handleTextChange(e.target.value)}
                    className="text-center text-lg h-14"
                  />
                </div>
              )}

              {currentQuestion.type === "range" && (
                <div className="max-w-md mx-auto space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">
                        {t("onboarding.budgetMin")}
                      </label>
                      <div className="relative">
                        <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          type="number"
                          value={answers.budget_min}
                          onChange={(e) => handleRangeChange("budget_min", parseInt(e.target.value) || 0)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">
                        {t("onboarding.budgetMax")}
                      </label>
                      <div className="relative">
                        <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          type="number"
                          value={answers.budget_max}
                          onChange={(e) => handleRangeChange("budget_max", parseInt(e.target.value) || 0)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-center text-muted-foreground text-sm">
                    {answers.budget_min.toLocaleString()} - {answers.budget_max.toLocaleString()} FCFA
                  </p>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4">
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
                className="gap-2"
              >
                {safeStep === filteredQuestions.length - 1 ? (
                  saving ? (
                    <>
                      {t("common.loading")}
                    </>
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
