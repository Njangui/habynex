import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { 
  Building2, 
  FileCheck, 
  UserCheck, 
  CheckCircle, 
  Loader2,
  ArrowRight,
  Home,
  Briefcase,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { UserVerification } from "@/hooks/useVerification";

interface VerificationLevel4Props {
  verification: UserVerification | null;
  onComplete: () => Promise<boolean>;
  onClose: () => void;
}

export const VerificationLevel4 = ({
  verification,
  onComplete,
  onClose,
}: VerificationLevel4Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const accountType = verification?.account_type || "owner";
  
  const [step, setStep] = useState<"docs" | "business" | "complete">("docs");
  const [loading, setLoading] = useState(false);
  
  const [docsUploaded, setDocsUploaded] = useState(false);
  const [businessDocUrl, setBusinessDocUrl] = useState<string | null>(null);
  
  const docsInputRef = useRef<HTMLInputElement>(null);
  const businessInputRef = useRef<HTMLInputElement>(null);

  const uploadDocument = async (
    file: File,
    docType: string
  ): Promise<string | null> => {
    if (!user || !verification) return null;
    
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/level_4/${docType}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("verification-documents")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("verification-documents")
        .getPublicUrl(filePath);

      const url = `${urlData.publicUrl}?t=${Date.now()}`;

      // Save document record
      await supabase
        .from("verification_documents")
        .insert({
          user_id: user.id,
          verification_id: verification.id,
          document_type: docType as any,
          file_url: url,
          file_name: file.name,
          verification_level: "level_4",
        });

      return url;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
      return null;
    }
  };

  const handleDocsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setLoading(true);
    try {
      for (const file of Array.from(files)) {
        // For owners: property ownership proof
        // For agents: management mandate
        // For agencies: business registration
        const docType = accountType === "owner" 
          ? "other" // Attestation de propriété
          : accountType === "agent" 
          ? "management_mandate" 
          : "business_register";
        await uploadDocument(file, docType);
      }
      
      setDocsUploaded(true);
      toast({
        title: "Documents téléchargés",
        description: "Documents envoyés pour vérification.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBusinessUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    const url = await uploadDocument(file, "business_register");
    if (url) {
      setBusinessDocUrl(url);
      await supabase
        .from("user_verifications")
        .update({ business_verified: true })
        .eq("user_id", user?.id);
      toast({
        title: "Document téléchargé",
        description: "Le registre de commerce a été envoyé.",
      });
    }
    setLoading(false);
  };

  const handleComplete = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Mark level 4 as pending approval
      await supabase
        .from("user_verifications")
        .update({
          level_4_status: "pending",
        })
        .eq("user_id", user.id);
      
      await onComplete();
      setStep("complete");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const getOwnerContent = () => (
    <>
      <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto">
        <Home className="w-8 h-8 text-purple-500" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">Certification Propriétaire</h3>
        <p className="text-muted-foreground text-sm mt-1">
          Prouvez que vous êtes propriétaire du bien
        </p>
        <p className="text-xs text-primary mt-1">+40 points</p>
      </div>
      <div className="text-left bg-muted/50 rounded-lg p-4 text-sm">
        <p className="font-medium mb-2">Documents acceptés :</p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Titre foncier</li>
          <li>Attestation de propriété</li>
          <li>Contrat de vente notarié</li>
          <li>Certificat d'immatriculation foncière</li>
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          💡 Alternative: Vous pouvez demander une visite d'un agent agréé (payant)
        </p>
      </div>
    </>
  );

  const getAgentContent = () => (
    <>
      <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto">
        <Briefcase className="w-8 h-8 text-blue-500" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">Certification Agent</h3>
        <p className="text-muted-foreground text-sm mt-1">
          Documents professionnels requis
        </p>
        <p className="text-xs text-primary mt-1">+40 points</p>
      </div>
      <div className="text-left bg-muted/50 rounded-lg p-4 text-sm">
        <p className="font-medium mb-2">Documents requis :</p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Registre de commerce (RCCM)</li>
          <li>Mandat de gestion</li>
          <li>Carte professionnelle (si applicable)</li>
        </ul>
      </div>
    </>
  );

  const getAgencyContent = () => (
    <>
      <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
        <Building2 className="w-8 h-8 text-green-500" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">Certification Agence</h3>
        <p className="text-muted-foreground text-sm mt-1">
          Documents légaux de l'agence
        </p>
        <p className="text-xs text-primary mt-1">+40 points</p>
      </div>
      <div className="text-left bg-muted/50 rounded-lg p-4 text-sm">
        <p className="font-medium mb-2">Documents requis :</p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Registre de commerce (RCCM)</li>
          <li>Statuts de l'entreprise</li>
          <li>Attestation fiscale</li>
          <li>Agrément ministériel (si applicable)</li>
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          📞 Un entretien téléphonique peut être requis
        </p>
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {["docs", "business", "complete"].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                step === s
                  ? "bg-primary text-primary-foreground"
                  : i < ["docs", "business", "complete"].indexOf(step)
                  ? "bg-success text-success-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {i < ["docs", "business", "complete"].indexOf(step) ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                i + 1
              )}
            </div>
            {i < 2 && (
              <div
                className={cn(
                  "w-12 h-0.5 mx-1",
                  i < ["docs", "business", "complete"].indexOf(step)
                    ? "bg-success"
                    : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6"
      >
        {step === "docs" && (
          <div className="text-center space-y-4">
            {accountType === "owner" && getOwnerContent()}
            {accountType === "agent" && getAgentContent()}
            {accountType === "agency" && getAgencyContent()}

            <input
              ref={docsInputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              onChange={handleDocsUpload}
              className="hidden"
            />

            {docsUploaded ? (
              <div className="flex items-center justify-center gap-2 text-success">
                <CheckCircle className="w-5 h-5" />
                <span>Documents téléchargés</span>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => docsInputRef.current?.click()}
                disabled={loading}
                className="gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileCheck className="w-4 h-4" />
                )}
                Télécharger les documents
              </Button>
            )}

            <div className="flex flex-col gap-2 pt-4">
              {accountType !== "owner" ? (
                <Button
                  onClick={() => setStep("business")}
                  disabled={!docsUploaded}
                >
                  Continuer
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={!docsUploaded || loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Soumettre pour vérification
                </Button>
              )}
            </div>
          </div>
        )}

        {step === "business" && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
              <Building2 className="w-8 h-8 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Registre de commerce</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Document RCCM ou équivalent
              </p>
            </div>

            <input
              ref={businessInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleBusinessUpload}
              className="hidden"
            />

            {businessDocUrl ? (
              <div className="flex items-center justify-center gap-2 text-success">
                <CheckCircle className="w-5 h-5" />
                <span>Registre téléchargé</span>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => businessInputRef.current?.click()}
                disabled={loading}
                className="gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileCheck className="w-4 h-4" />
                )}
                Télécharger le RCCM
              </Button>
            )}

            <div className="flex flex-col gap-2 pt-4">
              <Button
                onClick={handleComplete}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Soumettre pour vérification
              </Button>
              <button
                onClick={() => setStep("docs")}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Retour
              </button>
            </div>
          </div>
        )}

        {step === "complete" && (
          <div className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto"
            >
              <UserCheck className="w-10 h-10 text-purple-500" />
            </motion.div>
            <div>
              <h3 className="text-xl font-semibold">Demande soumise ! 🎉</h3>
              <p className="text-muted-foreground mt-2">
                Votre demande de certification est en cours de traitement.
                {accountType === "agency" && " Un entretien peut être planifié."}
              </p>
              <p className="text-sm text-primary mt-2">
                <span className="font-semibold">+40 points</span> à l'approbation
              </p>
            </div>
            <Button onClick={onClose} className="mt-4">
              Fermer
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default VerificationLevel4;
