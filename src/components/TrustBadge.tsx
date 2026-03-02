import { 
  CheckCircle, 
  Shield, 
  Home, 
  UserCheck, 
  Star,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type BadgeType = 
  | "account_confirmed" 
  | "identity_verified" 
  | "property_verified" 
  | "owner_certified"
  | "agent_certified" 
  | "agency_certified"
  | "super_owner";

interface TrustBadgeProps {
  type: BadgeType;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const badgeConfig: Record<BadgeType, {
  icon: typeof CheckCircle;
  label: string;
  description: string;
  colorClass: string;
  bgClass: string;
}> = {
  account_confirmed: {
    icon: CheckCircle,
    label: "Compte confirmé",
    description: "Email et téléphone vérifiés",
    colorClass: "text-success",
    bgClass: "bg-success/10",
  },
  identity_verified: {
    icon: Shield,
    label: "Identité vérifiée",
    description: "Pièce d'identité validée par notre équipe",
    colorClass: "text-blue-500",
    bgClass: "bg-blue-500/10",
  },
  property_verified: {
    icon: Home,
    label: "Logement vérifié",
    description: "Propriété inspectée et validée",
    colorClass: "text-accent",
    bgClass: "bg-accent/10",
  },
  owner_certified: {
    icon: UserCheck,
    label: "Propriétaire certifié",
    description: "Propriétaire vérifié avec attestation de propriété",
    colorClass: "text-emerald-600",
    bgClass: "bg-emerald-600/10",
  },
  agent_certified: {
    icon: UserCheck,
    label: "Agent certifié",
    description: "Agent immobilier professionnel certifié",
    colorClass: "text-purple-500",
    bgClass: "bg-purple-500/10",
  },
  agency_certified: {
    icon: UserCheck,
    label: "Agence certifiée",
    description: "Agence immobilière professionnelle certifiée",
    colorClass: "text-indigo-600",
    bgClass: "bg-indigo-600/10",
  },
  super_owner: {
    icon: Star,
    label: "Super propriétaire",
    description: "Trust Score supérieur à 80, excellent historique",
    colorClass: "text-gold",
    bgClass: "bg-gold/10",
  },
};

const sizeConfig = {
  sm: {
    icon: "w-3 h-3",
    badge: "px-1.5 py-0.5 text-xs gap-1",
    iconOnly: "w-5 h-5",
  },
  md: {
    icon: "w-4 h-4",
    badge: "px-2 py-1 text-sm gap-1.5",
    iconOnly: "w-6 h-6",
  },
  lg: {
    icon: "w-5 h-5",
    badge: "px-3 py-1.5 text-base gap-2",
    iconOnly: "w-8 h-8",
  },
};

export const TrustBadge = ({ 
  type, 
  size = "md", 
  showLabel = false,
  className 
}: TrustBadgeProps) => {
  const config = badgeConfig[type];
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  if (showLabel) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span 
              className={cn(
                "inline-flex items-center rounded-full font-medium",
                config.bgClass,
                config.colorClass,
                sizes.badge,
                className
              )}
            >
              <Icon className={sizes.icon} />
              {config.label}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{config.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span 
            className={cn(
              "inline-flex items-center justify-center rounded-full",
              config.bgClass,
              config.colorClass,
              sizes.iconOnly,
              className
            )}
          >
            <Icon className={sizes.icon} />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{config.label}</p>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface TrustBadgesProps {
  badges: BadgeType[];
  size?: "sm" | "md" | "lg";
  showLabels?: boolean;
  className?: string;
}

export const TrustBadges = ({ 
  badges, 
  size = "sm", 
  showLabels = false,
  className 
}: TrustBadgesProps) => {
  if (badges.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {badges.map((badge) => (
        <TrustBadge 
          key={badge} 
          type={badge} 
          size={size} 
          showLabel={showLabels} 
        />
      ))}
    </div>
  );
};

interface TrustScoreProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export const TrustScore = ({ 
  score, 
  size = "md", 
  showLabel = true,
  className 
}: TrustScoreProps) => {
  const getScoreColor = () => {
    if (score >= 80) return "text-success bg-success/10";
    if (score >= 60) return "text-accent bg-accent/10";
    if (score >= 40) return "text-gold bg-gold/10";
    if (score >= 25) return "text-orange-500 bg-orange-500/10";
    return "text-destructive bg-destructive/10";
  };

  const getScoreLabel = () => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Très bon";
    if (score >= 40) return "Bon";
    if (score >= 25) return "À améliorer";
    return "Risqué";
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span 
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full font-semibold",
              getScoreColor(),
              sizeClasses[size],
              className
            )}
          >
            {score < 40 && <AlertTriangle className="w-3 h-3" />}
            <span>{score}</span>
            {showLabel && <span className="font-normal">/ 100</span>}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">Trust Score: {getScoreLabel()}</p>
          <p className="text-xs text-muted-foreground">
            Score basé sur les vérifications et l'historique
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TrustBadge;
