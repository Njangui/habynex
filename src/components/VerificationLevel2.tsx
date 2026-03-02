import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { 
  CreditCard, 
  Camera, 
  PenTool, 
  CheckCircle, 
  Loader2,
  Upload,
  ArrowRight,
  FileImage
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { UserVerification } from "@/hooks/useVerification";

interface VerificationLevel2Props {
  verification: UserVerification | null;
  onComplete: () => Promise<boolean>;
  onClose: () => void;
}

export const VerificationLevel2 = ({
  verification,
  onComplete,
  onClose,
}: VerificationLevel2Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<"id" | "selfie" | "signature" | "complete">("id");
  const [loading, setLoading] = useState(false);
  
  const [idDocUrl, setIdDocUrl] = useState<string | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  
  const idInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const uploadDocument = async (
    file: File,
    docType: string,
    setUrl: (url: string) => void
  ) => {
    if (!user || !verification) return false;
    
    setLoading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/level_2/${docType}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("verification-documents")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("verification-documents")
        .getPublicUrl(filePath);

      const url = `${urlData.publicUrl}?t=${Date.now()}`;
      setUrl(url);

      // Save document record
      await supabase
        .from("verification_documents")
        .insert({
          user_id: user.id,
          verification_id: verification.id,
          document_type: docType as any,
          file_url: url,
          file_name: file.name,
          verification_level: "level_2",
        });

      toast({
        title: "Document téléchargé",
        description: "Votre document a été envoyé pour vérification.",
      });
      
      return true;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const success = await uploadDocument(file, "id_card", setIdDocUrl);
    if (success) {
      // Update verification status
      await supabase
        .from("user_verifications")
        .update({ identity_document_verified: true })
        .eq("user_id", user?.id);
    }
  };

  const handleSelfieUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const success = await uploadDocument(file, "selfie_with_id", setSelfieUrl);
    if (success) {
      await supabase
        .from("user_verifications")
        .update({ selfie_verified: true })
        .eq("user_id", user?.id);
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const success = await uploadDocument(file, "digital_signature", setSignatureUrl);
    if (success) {
      await supabase
        .from("user_verifications")
        .update({ signature_verified: true })
        .eq("user_id", user?.id);
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Mark level 2 as pending approval (admin needs to verify)
      await supabase
        .from("user_verifications")
        .update({
          level_2_status: "pending",
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

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {["id", "selfie", "signature", "complete"].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                step === s
                  ? "bg-primary text-primary-foreground"
                  : i < ["id", "selfie", "signature", "complete"].indexOf(step)
                  ? "bg-success text-success-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {i < ["id", "selfie", "signature", "complete"].indexOf(step) ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                i + 1
              )}
            </div>
            {i < 3 && (
              <div
                className={cn(
                  "w-8 h-0.5 mx-1",
                  i < ["id", "selfie", "signature", "complete"].indexOf(step)
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
        {step === "id" && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto">
              <CreditCard className="w-8 h-8 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Pièce d'identité</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Carte d'identité nationale ou passeport
              </p>
              <p className="text-xs text-primary mt-1">+10 points</p>
            </div>

            <input
              ref={idInputRef}
              type="file"
              accept="image/*"
              onChange={handleIdUpload}
              className="hidden"
            />

            {idDocUrl ? (
              <div className="relative">
                <img
                  src={idDocUrl}
                  alt="Pièce d'identité"
                  className="max-w-[200px] mx-auto rounded-lg border-4 border-success"
                />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-success flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success-foreground" />
                </div>
              </div>
            ) : (
              <button
                onClick={() => idInputRef.current?.click()}
                disabled={loading}
                className="w-32 h-32 mx-auto rounded-xl border-2 border-dashed border-muted-foreground/50 flex flex-col items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <FileImage className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">Upload CNI/Passeport</span>
                  </>
                )}
              </button>
            )}

            <div className="flex flex-col gap-2 pt-4">
              <Button
                onClick={() => setStep("selfie")}
                disabled={!idDocUrl}
              >
                Continuer
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === "selfie" && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <Camera className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Selfie avec document</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Prenez un selfie en tenant votre pièce d'identité
              </p>
              <p className="text-xs text-primary mt-1">+10 points</p>
            </div>

            <input
              ref={selfieInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleSelfieUpload}
              className="hidden"
            />

            {selfieUrl ? (
              <div className="relative w-24 h-24 mx-auto">
                <img
                  src={selfieUrl}
                  alt="Selfie"
                  className="w-24 h-24 rounded-full object-cover border-4 border-success"
                />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-success flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success-foreground" />
                </div>
              </div>
            ) : (
              <button
                onClick={() => selfieInputRef.current?.click()}
                disabled={loading}
                className="w-24 h-24 mx-auto rounded-full border-2 border-dashed border-muted-foreground/50 flex flex-col items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Camera className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-1">Selfie</span>
                  </>
                )}
              </button>
            )}

            <div className="flex flex-col gap-2 pt-4">
              <Button
                onClick={() => setStep("signature")}
                disabled={!selfieUrl}
              >
                Continuer
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <button
                onClick={() => setStep("id")}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Retour
              </button>
            </div>
          </div>
        )}

        {step === "signature" && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto">
              <PenTool className="w-8 h-8 text-purple-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Signature numérique</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Téléchargez une image de votre signature
              </p>
              <p className="text-xs text-primary mt-1">+5 points</p>
            </div>

            <input
              ref={signatureInputRef}
              type="file"
              accept="image/*"
              onChange={handleSignatureUpload}
              className="hidden"
            />

            {signatureUrl ? (
              <div className="relative">
                <img
                  src={signatureUrl}
                  alt="Signature"
                  className="max-w-[200px] max-h-[80px] mx-auto border-4 border-success rounded"
                />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-success flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success-foreground" />
                </div>
              </div>
            ) : (
              <button
                onClick={() => signatureInputRef.current?.click()}
                disabled={loading}
                className="w-48 h-16 mx-auto rounded-lg border-2 border-dashed border-muted-foreground/50 flex flex-col items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <PenTool className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-1">Signature</span>
                  </>
                )}
              </button>
            )}

            <div className="flex flex-col gap-2 pt-4">
              <Button
                onClick={handleComplete}
                disabled={loading || !signatureUrl}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Soumettre pour vérification
              </Button>
              <button
                onClick={() => setStep("selfie")}
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
              className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto"
            >
              <CheckCircle className="w-10 h-10 text-blue-500" />
            </motion.div>
            <div>
              <h3 className="text-xl font-semibold">Documents soumis ! 📄</h3>
              <p className="text-muted-foreground mt-2">
                Vos documents sont en cours de vérification. Vous serez notifié une fois la vérification terminée.
              </p>
              <p className="text-sm text-primary mt-2">
                Jusqu'à <span className="font-semibold">+25 points</span> à l'approbation
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

export default VerificationLevel2;
