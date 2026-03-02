import { motion } from "framer-motion";
import { 
  CheckCircle, 
  Circle, 
  Lock, 
  Mail, 
  Phone, 
  Camera, 
  Shield, 
  Home, 
  UserCheck,
  Clock,
  AlertCircle,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { UserVerification, LevelEligibility } from "@/hooks/useVerification";

interface VerificationProgressProps {
  verification: UserVerification | null;
  eligibility: LevelEligibility | null;
  onStartLevel: (level: number) => void;
  isSeeker?: boolean;
}

interface LevelConfig {
  level: number;
  title: string;
  description: string;
  icon: typeof CheckCircle;
  points: number;
  requirements: string[];
  color: string;
}

const levels: LevelConfig[] = [
  {
    level: 1,
    title: "Vérification de base",
    description: "Email, téléphone et photo de profil",
    icon: Mail,
    points: 20,
    requirements: ["Email (+5)", "Téléphone (+5)", "Photo (+10)"],
    color: "text-success",
  },
  {
    level: 2,
    title: "Identité vérifiée",
    description: "Document d'identité et selfie",
    icon: Shield,
    points: 25,
    requirements: ["Carte d'identité / Passeport", "Selfie avec document", "Signature numérique"],
    color: "text-blue-500",
  },
  {
    level: 3,
    title: "Logement vérifié",
    description: "Preuves de propriété ou de gestion",
    icon: Home,
    points: 30,
    requirements: ["Photos originales", "Vidéo ou GPS", "Facture (optionnel)", "Visite terrain (optionnel)"],
    color: "text-accent",
  },
  {
    level: 4,
    title: "Certification Professionnelle",
    description: "Propriétaires, Agents et Agences immobilières",
    icon: UserCheck,
    points: 40,
    requirements: ["Propriétaire: Attestation propriété", "Agent: Registre commerce, Mandat", "Agence: Documents légaux, Entretien"],
    color: "text-purple-500",
  },
];

export const VerificationProgress = ({
  verification,
  eligibility,
  onStartLevel,
  isSeeker = false,
}: VerificationProgressProps) => {
  // Filter levels for seekers - only show level 1
  // For all users, only level 1 is active (levels 2-4 are disabled for now)
  const displayLevels = isSeeker ? levels.filter(l => l.level === 1) : levels.filter(l => l.level === 1);
  const getStatusForLevel = (level: number) => {
    if (!verification) return "pending";
    switch (level) {
      case 1: return verification.level_1_status;
      case 2: return verification.level_2_status;
      case 3: return verification.level_3_status;
      case 4: return verification.level_4_status;
      default: return "pending";
    }
  };

  const isLevelEligible = (level: number) => {
    if (!eligibility) return level === 1;
    switch (level) {
      case 1: return true;
      case 2: return eligibility.level_2_eligible;
      case 3: return eligibility.level_3_eligible;
      case 4: return eligibility.level_4_eligible;
      default: return false;
    }
  };

  const getEligibleAt = (level: number) => {
    if (!eligibility) return null;
    switch (level) {
      case 2: return eligibility.level_2_eligible_at;
      case 3: return eligibility.level_3_eligible_at;
      case 4: return eligibility.level_4_eligible_at;
      default: return null;
    }
  };

  const calculateProgress = () => {
    if (!verification) return 0;
    const totalLevels = isSeeker ? 1 : 4;
    let completed = 0;
    if (verification.level_1_status === "approved") completed++;
    if (!isSeeker) {
      if (verification.level_2_status === "approved") completed++;
      if (verification.level_3_status === "approved") completed++;
      if (verification.level_4_status === "approved") completed++;
    }
    return (completed / totalLevels) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg">Votre progression</h3>
            <p className="text-sm text-muted-foreground">
              Complétez les niveaux pour augmenter votre Trust Score
            </p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-primary">
              {verification?.trust_score || 0}
            </span>
            <span className="text-muted-foreground">/100</span>
          </div>
        </div>
        <Progress value={calculateProgress()} className="h-2" />
        <p className="text-xs text-muted-foreground mt-2">
          {Math.round(calculateProgress())}% complété
        </p>
      </div>

      {/* Level Cards */}
      <div className="space-y-4">
        {displayLevels.map((level, index) => {
          const status = getStatusForLevel(level.level);
          const isEligible = isLevelEligible(level.level);
          const eligibleAt = getEligibleAt(level.level);
          const isCompleted = status === "approved";
          const isPending = status === "pending" && isEligible;
          const isLocked = !isEligible;

          return (
            <motion.div
              key={level.level}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "bg-card rounded-xl border overflow-hidden transition-all",
                isCompleted ? "border-success/50" : "border-border",
                isLocked && "opacity-60"
              )}
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Status Icon */}
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
                      isCompleted ? "bg-success/10" : isLocked ? "bg-muted" : "bg-primary/10"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6 text-success" />
                    ) : isLocked ? (
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <level.icon className={cn("w-6 h-6", level.color)} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold">
                        Niveau {level.level}: {level.title}
                      </h4>
                      <Badge
                        variant={isCompleted ? "default" : status === "rejected" ? "destructive" : "secondary"}
                        className={cn(isCompleted && "bg-success")}
                      >
                        {isCompleted
                          ? "Complété"
                          : status === "rejected"
                          ? "Rejeté"
                          : isLocked
                          ? "Verrouillé"
                          : "En attente"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        +{level.points} points
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {level.description}
                    </p>

                    {/* Requirements */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {level.requirements.map((req, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted"
                        >
                          <Circle className="w-2 h-2" />
                          {req}
                        </span>
                      ))}
                    </div>

                    {/* Locked Message */}
                    {isLocked && eligibleAt && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>
                          Disponible {formatDistanceToNow(new Date(eligibleAt), { 
                            addSuffix: true,
                            locale: fr 
                          })}
                        </span>
                      </div>
                    )}

                    {/* Rejected Message */}
                    {status === "rejected" && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="w-4 h-4" />
                        <span>Vérification rejetée. Veuillez soumettre à nouveau.</span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  {!isLocked && !isCompleted && (
                    <Button
                      size="sm"
                      onClick={() => onStartLevel(level.level)}
                      className="flex-shrink-0"
                    >
                      Commencer
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Completed Bar */}
              {isCompleted && (
                <div className="h-1 bg-success" />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default VerificationProgress;
