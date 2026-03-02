import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import {
  CreditCard,
  Camera,
  Upload,
  CheckCircle,
  Loader2,
  ArrowRight,
  Shield,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

const IdentityVerification = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();

  const [idFrontUrl, setIdFrontUrl] = useState<string | null>(null);
  const [idBackUrl, setIdBackUrl] = useState<string | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (
    file: File,
    docType: string
  ): Promise<string | null> => {
    if (!user) return null;

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/identity/${docType}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("verification-documents")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("verification-documents")
        .getPublicUrl(filePath);

      // Get verification record
      const { data: verification } = await supabase
        .from("user_verifications")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (verification) {
        await supabase.from("verification_documents").insert({
          user_id: user.id,
          verification_id: verification.id,
          document_type: docType as any,
          file_url: urlData.publicUrl,
          file_name: file.name,
          verification_level: "level_2",
          status: "pending",
        });
      }

      return urlData.publicUrl;
    } catch (error: any) {
      toast.error(error.message || "Erreur lors du téléchargement");
      return null;
    }
  };

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "front" | "back" | "selfie"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(
        language === "fr"
          ? "Le fichier est trop volumineux (max 10 Mo)"
          : "File is too large (max 10MB)"
      );
      return;
    }

    setUploadingField(field);

    const docType =
      field === "front"
        ? "id_card"
        : field === "back"
        ? "id_card"
        : "selfie_with_id";

    const url = await uploadFile(file, docType);

    if (url) {
      if (field === "front") setIdFrontUrl(url);
      if (field === "back") setIdBackUrl(url);
      if (field === "selfie") setSelfieUrl(url);
    }

    setUploadingField(null);
  };

  const allUploaded = idFrontUrl && idBackUrl && selfieUrl;

  const handleSubmit = async () => {
    if (!user || !allUploaded) return;

    setLoading(true);
    try {
      // Mark identity documents as submitted (pending admin review)
      await supabase
        .from("user_verifications")
        .update({
          level_2_status: "pending",
        })
        .eq("user_id", user.id);

      toast.success(
        language === "fr"
          ? "Documents soumis ! Votre identité sera vérifiée sous 24-48h."
          : "Documents submitted! Your identity will be verified within 24-48h."
      );

      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    toast.info(
      language === "fr"
        ? "Vous pourrez vérifier votre identité plus tard depuis votre profil. Vos annonces ne seront visibles qu'après vérification."
        : "You can verify your identity later from your profile. Your listings will only be visible after verification."
    );
    navigate("/");
  };

  const UploadBox = ({
    label,
    description,
    icon: Icon,
    uploaded,
    inputRef,
    field,
  }: {
    label: string;
    description: string;
    icon: any;
    uploaded: boolean;
    inputRef: React.RefObject<HTMLInputElement>;
    field: "front" | "back" | "selfie";
  }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => !uploaded && inputRef.current?.click()}
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
        uploaded
          ? "border-green-500 bg-green-500/5"
          : "border-border hover:border-primary hover:bg-primary/5"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleUpload(e, field)}
        className="hidden"
      />

      {uploadingField === field ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {language === "fr" ? "Téléchargement..." : "Uploading..."}
          </p>
        </div>
      ) : uploaded ? (
        <div className="flex flex-col items-center gap-3">
          <CheckCircle className="w-10 h-10 text-green-500" />
          <p className="text-sm font-medium text-green-600">{label}</p>
          <p className="text-xs text-muted-foreground">
            {language === "fr" ? "Téléchargé ✓" : "Uploaded ✓"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
            <Icon className="w-7 h-7 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <Upload className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
    </motion.div>
  );

  return (
    <>
      <Helmet>
        <title>
          {language === "fr"
            ? "Vérification d'identité | Habinex"
            : "Identity Verification | Habinex"}
        </title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-lg">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mb-2">
                {language === "fr"
                  ? "Vérification d'identité"
                  : "Identity Verification"}
              </h1>
              <p className="text-muted-foreground">
                {language === "fr"
                  ? "Pour la sécurité de tous, veuillez fournir vos documents d'identité. Vos annonces seront visibles après validation par notre équipe."
                  : "For everyone's safety, please provide your identity documents. Your listings will be visible after validation by our team."}
              </p>
            </motion.div>

            {/* Info banner */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
                <CardContent className="p-4 flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">
                      {language === "fr"
                        ? "Documents acceptés"
                        : "Accepted documents"}
                    </p>
                    <ul className="mt-1 text-muted-foreground space-y-0.5">
                      <li>
                        •{" "}
                        {language === "fr"
                          ? "Carte nationale d'identité (recto & verso)"
                          : "National ID card (front & back)"}
                      </li>
                      <li>
                        •{" "}
                        {language === "fr"
                          ? "Passeport (page photo & page info)"
                          : "Passport (photo page & info page)"}
                      </li>
                      <li>
                        •{" "}
                        {language === "fr"
                          ? "Selfie tenant votre pièce d'identité bien visible"
                          : "Selfie holding your ID clearly visible"}
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Upload boxes */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4 mb-8"
            >
              <UploadBox
                label={
                  language === "fr"
                    ? "CNI / Passeport - Recto"
                    : "ID / Passport - Front"
                }
                description={
                  language === "fr"
                    ? "Face avant de votre pièce d'identité"
                    : "Front side of your ID"
                }
                icon={CreditCard}
                uploaded={!!idFrontUrl}
                inputRef={frontRef as React.RefObject<HTMLInputElement>}
                field="front"
              />

              <UploadBox
                label={
                  language === "fr"
                    ? "CNI / Passeport - Verso"
                    : "ID / Passport - Back"
                }
                description={
                  language === "fr"
                    ? "Face arrière de votre pièce d'identité"
                    : "Back side of your ID"
                }
                icon={CreditCard}
                uploaded={!!idBackUrl}
                inputRef={backRef as React.RefObject<HTMLInputElement>}
                field="back"
              />

              <UploadBox
                label={
                  language === "fr"
                    ? "Selfie avec pièce d'identité"
                    : "Selfie with ID"
                }
                description={
                  language === "fr"
                    ? "Photo de vous tenant votre pièce d'identité"
                    : "Photo of you holding your ID"
                }
                icon={Camera}
                uploaded={!!selfieUrl}
                inputRef={selfieRef as React.RefObject<HTMLInputElement>}
                field="selfie"
              />
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              <Button
                onClick={handleSubmit}
                disabled={!allUploaded || loading}
                className="w-full gap-2"
                size="lg"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                {language === "fr"
                  ? "Soumettre pour vérification"
                  : "Submit for verification"}
              </Button>

              <button
                onClick={handleSkip}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                {language === "fr"
                  ? "Passer pour l'instant →"
                  : "Skip for now →"}
              </button>
            </motion.div>
          </div>
        </main>
      </div>
    </>
  );
};

export default IdentityVerification;
