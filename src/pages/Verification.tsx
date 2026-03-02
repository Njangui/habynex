import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useVerification } from "@/hooks/useVerification";
import { useLanguage } from "@/contexts/LanguageContext";
import { VerificationProgress } from "@/components/VerificationProgress";
import { VerificationLevel1 } from "@/components/VerificationLevel1";
import { VerificationLevel2 } from "@/components/VerificationLevel2";
import { VerificationLevel3 } from "@/components/VerificationLevel3";
import { VerificationLevel4 } from "@/components/VerificationLevel4";
import { TrustBadges, TrustScore } from "@/components/TrustBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const VerificationPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { verification, eligibility, loading, badges, completeLevel1, refetch } = useVerification();
  const { t, language } = useLanguage();
  const [levelDialogOpen, setLevelDialogOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  
  // Check if user is a seeker (only needs level 1)
  const isSeeker = verification?.account_type === undefined;

  const handleStartLevel = (level: number) => {
    setSelectedLevel(level);
    setLevelDialogOpen(true);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t("common.back")}</span>
          </button>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  {language === "fr" ? "Vérification & Trust Score" : "Verification & Trust Score"}
                </h1>
                <p className="text-muted-foreground">
                  {language === "fr" 
                    ? "Augmentez votre crédibilité et votre visibilité" 
                    : "Increase your credibility and visibility"}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Current Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {language === "fr" ? "Votre statut actuel" : "Your current status"}
                </CardTitle>
                <CardDescription>
                  {language === "fr" 
                    ? "Vos badges et votre score de confiance" 
                    : "Your badges and trust score"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-4">
                  <TrustScore score={verification?.trust_score || 0} size="lg" />
                  {badges.length > 0 ? (
                    <TrustBadges badges={badges} showLabels size="md" />
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      {language === "fr" 
                        ? "Aucun badge obtenu pour le moment" 
                        : "No badges earned yet"}
                    </span>
                  )}
                </div>

                {/* Trust Score Breakdown */}
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm mb-3">
                    {language === "fr" ? "Comment est calculé votre score" : "How your score is calculated"}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {language === "fr" ? "Vérification niveau 1" : "Level 1 verification"}
                      </span>
                      <span className={verification?.level_1_status === "approved" ? "text-success font-medium" : "text-muted-foreground"}>
                        {verification?.level_1_status === "approved" ? "+30 pts" : "0 pts"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {language === "fr" ? "Avis positifs" : "Positive reviews"} ({verification?.positive_reviews_count || 0})
                      </span>
                      <span className="text-success font-medium">
                        +{(verification?.positive_reviews_count || 0) * 5} pts
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {language === "fr" ? "Avis négatifs" : "Negative reviews"} ({verification?.negative_reviews_count || 0})
                      </span>
                      <span className="text-destructive font-medium">
                        -{(verification?.negative_reviews_count || 0) * 10} pts
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {language === "fr" ? "Signalements validés" : "Validated reports"} ({verification?.reports_count || 0})
                      </span>
                      <span className="text-destructive font-medium">
                        -{(verification?.reports_count || 0) * 15} pts
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {language === "fr" ? "Taux de réponse" : "Response rate"} ({verification?.response_rate || 100}%)
                      </span>
                      <span className="text-success font-medium">
                        +{Math.floor((verification?.response_rate || 100) / 5)} pts
                      </span>
                    </div>
                  </div>
                </div>

                {verification?.is_suspended && (
                  <div className="mt-4 p-4 bg-destructive/10 rounded-lg border border-destructive/30">
                    <p className="text-destructive font-medium">
                      ⚠️ {language === "fr" ? "Votre compte est suspendu" : "Your account is suspended"}
                    </p>
                    <p className="text-sm text-destructive/80 mt-1">
                      {language === "fr" ? "Raison:" : "Reason:"} {verification.suspension_reason || (language === "fr" ? "Trust Score trop bas" : "Trust Score too low")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">
                  {language === "fr" ? "Avantages de la vérification" : "Verification benefits"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-success">✓</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {language === "fr" ? "Confiance accrue" : "Increased trust"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {language === "fr" 
                          ? "Les utilisateurs préfèrent les profils vérifiés" 
                          : "Users prefer verified profiles"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-success">✓</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {language === "fr" ? "Meilleur classement" : "Better ranking"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {language === "fr" 
                          ? "Vos annonces apparaissent en priorité" 
                          : "Your listings appear first"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-success">✓</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {language === "fr" ? "Badges visibles" : "Visible badges"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {language === "fr" 
                          ? "Affichez vos certifications sur votre profil" 
                          : "Display your certifications on your profile"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-success">✓</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {language === "fr" ? "Accès aux paiements" : "Payment access"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {language === "fr" 
                          ? "Débloquez les transactions sécurisées" 
                          : "Unlock secure transactions"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Verification Progress */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <VerificationProgress
              verification={verification}
              eligibility={eligibility}
              onStartLevel={handleStartLevel}
              isSeeker={isSeeker}
            />
          </motion.div>

          {/* Level Dialog */}
          <Dialog open={levelDialogOpen} onOpenChange={setLevelDialogOpen}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedLevel === 1 && (language === "fr" ? "Vérification de base" : "Basic verification")}
                  {selectedLevel === 2 && (language === "fr" ? "Vérification d'identité" : "Identity verification")}
                  {selectedLevel === 3 && (language === "fr" ? "Vérification du logement" : "Property verification")}
                  {selectedLevel === 4 && (language === "fr" ? "Certification professionnelle" : "Professional certification")}
                </DialogTitle>
              </DialogHeader>
              {selectedLevel === 1 && (
                <VerificationLevel1
                  verification={verification}
                  onComplete={completeLevel1}
                  onClose={() => setLevelDialogOpen(false)}
                />
              )}
              {selectedLevel === 2 && (
                <VerificationLevel2
                  verification={verification}
                  onComplete={async () => {
                    await refetch();
                    return true;
                  }}
                  onClose={() => setLevelDialogOpen(false)}
                />
              )}
              {selectedLevel === 3 && (
                <VerificationLevel3
                  verification={verification}
                  onComplete={async () => {
                    await refetch();
                    return true;
                  }}
                  onClose={() => setLevelDialogOpen(false)}
                />
              )}
              {selectedLevel === 4 && (
                <VerificationLevel4
                  verification={verification}
                  onComplete={async () => {
                    await refetch();
                    return true;
                  }}
                  onClose={() => setLevelDialogOpen(false)}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
};

export default VerificationPage;
