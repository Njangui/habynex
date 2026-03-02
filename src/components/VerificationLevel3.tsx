import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { 
  Camera, 
  Video, 
  MapPin, 
  FileText, 
  CheckCircle, 
  Loader2,
  ArrowRight,
  Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { UserVerification } from "@/hooks/useVerification";

interface VerificationLevel3Props {
  verification: UserVerification | null;
  onComplete: () => Promise<boolean>;
  onClose: () => void;
}

export const VerificationLevel3 = ({
  verification,
  onComplete,
  onClose,
}: VerificationLevel3Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<"photos" | "video" | "utility" | "complete">("photos");
  const [loading, setLoading] = useState(false);
  
  const [photosUploaded, setPhotosUploaded] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [utilityUrl, setUtilityUrl] = useState<string | null>(null);
  
  const photosInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const utilityInputRef = useRef<HTMLInputElement>(null);

  const uploadDocument = async (
    file: File,
    docType: string
  ): Promise<string | null> => {
    if (!user || !verification) return null;
    
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/level_3/${docType}_${Date.now()}.${fileExt}`;

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
          verification_level: "level_3",
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

  const handlePhotosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setLoading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadDocument(file, "property_photo");
      }
      
      setPhotosUploaded(true);
      toast({
        title: "Photos téléchargées",
        description: `${files.length} photo(s) envoyée(s) pour vérification.`,
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

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    const url = await uploadDocument(file, "property_video");
    if (url) {
      setVideoUrl(url);
      toast({
        title: "Vidéo téléchargée",
        description: "La vidéo a été envoyée pour vérification.",
      });
    }
    setLoading(false);
  };

  const handleUtilityUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    const url = await uploadDocument(file, "utility_bill");
    if (url) {
      setUtilityUrl(url);
      toast({
        title: "Facture téléchargée",
        description: "La facture a été envoyée pour vérification.",
      });
    }
    setLoading(false);
  };

  const handleComplete = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Mark level 3 as pending approval
      await supabase
        .from("user_verifications")
        .update({
          level_3_status: "pending",
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
        {["photos", "video", "utility", "complete"].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                step === s
                  ? "bg-primary text-primary-foreground"
                  : i < ["photos", "video", "utility", "complete"].indexOf(step)
                  ? "bg-success text-success-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {i < ["photos", "video", "utility", "complete"].indexOf(step) ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                i + 1
              )}
            </div>
            {i < 3 && (
              <div
                className={cn(
                  "w-8 h-0.5 mx-1",
                  i < ["photos", "video", "utility", "complete"].indexOf(step)
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
        {step === "photos" && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
              <Camera className="w-8 h-8 text-accent" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Photos du logement</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Téléchargez des photos récentes de votre logement
              </p>
              <p className="text-xs text-primary mt-1">+15 points</p>
            </div>

            <input
              ref={photosInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotosUpload}
              className="hidden"
            />

            {photosUploaded ? (
              <div className="flex items-center justify-center gap-2 text-success">
                <CheckCircle className="w-5 h-5" />
                <span>Photos téléchargées</span>
              </div>
            ) : (
              <button
                onClick={() => photosInputRef.current?.click()}
                disabled={loading}
                className="w-32 h-32 mx-auto rounded-xl border-2 border-dashed border-muted-foreground/50 flex flex-col items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">Photos</span>
                  </>
                )}
              </button>
            )}

            <div className="flex flex-col gap-2 pt-4">
              <Button
                onClick={() => setStep("video")}
                disabled={!photosUploaded}
              >
                Continuer
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === "video" && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto">
              <Video className="w-8 h-8 text-orange-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Vidéo du logement</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Une courte vidéo montrant l'intérieur (optionnel)
              </p>
              <p className="text-xs text-primary mt-1">+10 points</p>
            </div>

            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              className="hidden"
            />

            {videoUrl ? (
              <div className="flex items-center justify-center gap-2 text-success">
                <CheckCircle className="w-5 h-5" />
                <span>Vidéo téléchargée</span>
              </div>
            ) : (
              <button
                onClick={() => videoInputRef.current?.click()}
                disabled={loading}
                className="w-32 h-32 mx-auto rounded-xl border-2 border-dashed border-muted-foreground/50 flex flex-col items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Video className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">Vidéo</span>
                  </>
                )}
              </button>
            )}

            <div className="flex flex-col gap-2 pt-4">
              <Button onClick={() => setStep("utility")}>
                Continuer
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <button
                onClick={() => setStep("photos")}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Retour
              </button>
            </div>
          </div>
        )}

        {step === "utility" && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <FileText className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Facture de services</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Facture d'eau, électricité ou internet (optionnel)
              </p>
              <p className="text-xs text-primary mt-1">+5 points</p>
            </div>

            <input
              ref={utilityInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleUtilityUpload}
              className="hidden"
            />

            {utilityUrl ? (
              <div className="flex items-center justify-center gap-2 text-success">
                <CheckCircle className="w-5 h-5" />
                <span>Facture téléchargée</span>
              </div>
            ) : (
              <button
                onClick={() => utilityInputRef.current?.click()}
                disabled={loading}
                className="w-32 h-32 mx-auto rounded-xl border-2 border-dashed border-muted-foreground/50 flex flex-col items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <FileText className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">Facture</span>
                  </>
                )}
              </button>
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
                onClick={() => setStep("video")}
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
              className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto"
            >
              <Home className="w-10 h-10 text-accent" />
            </motion.div>
            <div>
              <h3 className="text-xl font-semibold">Documents soumis ! 🏠</h3>
              <p className="text-muted-foreground mt-2">
                Vos documents sont en cours de vérification. Vous serez notifié une fois la vérification terminée.
              </p>
              <p className="text-sm text-primary mt-2">
                Jusqu'à <span className="font-semibold">+30 points</span> à l'approbation
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

export default VerificationLevel3;
