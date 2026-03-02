import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { 
  Mail, 
  Phone, 
  Camera, 
  CheckCircle, 
  Loader2,
  Upload,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { UserVerification } from "@/hooks/useVerification";

interface VerificationLevel1Props {
  verification: UserVerification | null;
  onComplete: (data: {
    email_verified: boolean;
    phone_verified: boolean;
    has_real_photo: boolean;
  }) => Promise<boolean>;
  onClose: () => void;
}

export const VerificationLevel1 = ({
  verification,
  onComplete,
  onClose,
}: VerificationLevel1Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<"email" | "phone" | "photo" | "complete">("email");
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [expectedOtp, setExpectedOtp] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track what's verified
  const [emailVerified, setEmailVerified] = useState(verification?.email_verified || false);
  const [phoneVerified, setPhoneVerified] = useState(verification?.phone_verified || false);
  const [hasRealPhoto, setHasRealPhoto] = useState(verification?.has_real_photo || false);

  const handleSendEmailVerification = async () => {
    setLoading(true);
    try {
      // Email is already verified via Supabase auth
      if (user?.email_confirmed_at) {
        setEmailVerified(true);
        toast({
          title: "Email déjà vérifié !",
          description: "Votre adresse email est confirmée.",
        });
        setStep("phone");
      } else {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email: user?.email || "",
        });

        if (error) throw error;

        toast({
          title: "Email envoyé !",
          description: "Vérifiez votre boîte de réception et cliquez sur le lien de confirmation.",
        });
      }
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

  // Send OTP via Africa's Talking
  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 9) {
      toast({
        variant: "destructive",
        title: "Numéro invalide",
        description: "Veuillez entrer un numéro de téléphone valide (au moins 9 chiffres).",
      });
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+237${phoneNumber.replace(/^0/, '')}`;

      const { data, error } = await supabase.functions.invoke("send-sms-otp", {
        body: { phone: formattedPhone },
      });

      if (error) throw error;

      if (data.success) {
        setExpectedOtp(data.otp);
        setOtpSent(true);
        toast({
          title: "Code envoyé !",
          description: `Un code de vérification a été envoyé au ${formattedPhone}`,
        });
      } else {
        throw new Error(data.error || "Échec de l'envoi du SMS");
      }
    } catch (error: any) {
      console.error("OTP error:", error);
      toast({
        variant: "destructive",
        title: "Erreur d'envoi",
        description: "Impossible d'envoyer le SMS. Vérifiez votre numéro ou réessayez plus tard.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Code invalide",
        description: "Veuillez entrer le code à 6 chiffres.",
      });
      return;
    }

    setLoading(true);
    try {
      if (otpCode === expectedOtp) {
        const formattedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+237${phoneNumber.replace(/^0/, '')}`;

        // Save verified phone to profile
        const { error } = await supabase
          .from("profiles")
          .update({ phone: formattedPhone, phone_verified: true })
          .eq("user_id", user?.id);

        if (error) throw error;

        setPhoneVerified(true);
        toast({
          title: "Téléphone vérifié ! ✓",
          description: "Votre numéro a été validé avec succès.",
        });
        setStep("photo");
      } else {
        toast({
          variant: "destructive",
          title: "Code incorrect",
          description: "Le code entré ne correspond pas. Réessayez.",
        });
      }
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setLoading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const url = `${publicUrl}?t=${Date.now()}`;
      setAvatarUrl(url);

      await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("user_id", user.id);

      setHasRealPhoto(true);
      toast({
        title: "Photo uploadée !",
        description: "Votre photo de profil a été ajoutée.",
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

  const handleComplete = async () => {
    // Both email and phone are now mandatory
    if (!emailVerified) {
      toast({
        variant: "destructive",
        title: "Email requis",
        description: "Vous devez valider votre email pour continuer.",
      });
      return;
    }
    
    if (!phoneVerified) {
      toast({
        variant: "destructive",
        title: "Téléphone requis",
        description: "Vous devez valider votre numéro de téléphone pour continuer.",
      });
      return;
    }

    setLoading(true);
    const success = await onComplete({
      email_verified: emailVerified,
      phone_verified: phoneVerified,
      has_real_photo: hasRealPhoto,
    });

    if (success) {
      setStep("complete");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {["email", "phone", "photo", "complete"].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                step === s
                  ? "bg-primary text-primary-foreground"
                  : i < ["email", "phone", "photo", "complete"].indexOf(step)
                  ? "bg-success text-success-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {i < ["email", "phone", "photo", "complete"].indexOf(step) ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                i + 1
              )}
            </div>
            {i < 3 && (
              <div
                className={cn(
                  "w-8 h-0.5 mx-1",
                  i < ["email", "phone", "photo", "complete"].indexOf(step)
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
        {step === "email" && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Vérification de l'email</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {user?.email}
              </p>
              <p className="text-xs text-primary mt-1">+5 points (obligatoire)</p>
            </div>

            {user?.email_confirmed_at || emailVerified ? (
              <div className="flex items-center justify-center gap-2 text-success">
                <CheckCircle className="w-5 h-5" />
                <span>Email vérifié ✓</span>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Cliquez pour recevoir un lien de confirmation par email.
                </p>
                <Button onClick={handleSendEmailVerification} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Envoyer le lien de vérification
                </Button>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <Button
                variant={emailVerified || user?.email_confirmed_at ? "default" : "outline"}
                onClick={() => {
                  if (user?.email_confirmed_at) setEmailVerified(true);
                  setStep("phone");
                }}
              >
                {emailVerified || user?.email_confirmed_at ? "Continuer" : "Passer cette étape"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === "phone" && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Phone className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Vérification du téléphone</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Un code SMS sera envoyé pour valider votre numéro
              </p>
              <p className="text-xs text-primary mt-1">+5 points (obligatoire)</p>
            </div>

            {phoneVerified ? (
              <div className="flex items-center justify-center gap-2 text-success">
                <CheckCircle className="w-5 h-5" />
                <span>Téléphone vérifié ✓</span>
              </div>
            ) : (
              <div className="space-y-4">
                {!otpSent ? (
                  <>
                    <div className="max-w-xs mx-auto">
                      <Label htmlFor="phone">Numéro de téléphone</Label>
                      <div className="flex gap-2 mt-1">
                        <span className="flex items-center px-3 bg-muted rounded-l-md border border-r-0 border-input text-sm">
                          +237
                        </span>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="6 XX XX XX XX"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                          className="rounded-l-none"
                        />
                      </div>
                    </div>
                    <Button onClick={handleSendOTP} disabled={loading || phoneNumber.length < 9}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Envoyer le code SMS
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="max-w-xs mx-auto">
                      <Label htmlFor="otp">Code de vérification</Label>
                      <Input
                        id="otp"
                        type="text"
                        placeholder="Entrez le code à 6 chiffres"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="text-center text-lg tracking-widest mt-1"
                        maxLength={6}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button onClick={handleVerifyOTP} disabled={loading || otpCode.length !== 6}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Vérifier le code
                      </Button>
                      <button
                        onClick={() => {
                          setOtpSent(false);
                          setOtpCode("");
                        }}
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        Renvoyer le code
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {phoneVerified && (
              <div className="flex flex-col gap-2 pt-4">
                <Button onClick={() => setStep("photo")}>
                  Continuer
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        )}

        {step === "photo" && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Camera className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Photo de profil</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Ajoutez une vraie photo pour gagner la confiance
              </p>
              <p className="text-xs text-primary mt-1">+10 points</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            {avatarUrl || hasRealPhoto ? (
              <div className="relative w-24 h-24 mx-auto">
                <img
                  src={avatarUrl || ""}
                  alt="Avatar"
                  className="w-24 h-24 rounded-full object-cover border-4 border-success"
                />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-success flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success-foreground" />
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="w-24 h-24 mx-auto rounded-full border-2 border-dashed border-muted-foreground/50 flex flex-col items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-1">Upload</span>
                  </>
                )}
              </button>
            )}

            <div className="flex flex-col gap-2 pt-4">
              <Button
                onClick={handleComplete}
                disabled={loading || !hasRealPhoto}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Terminer la vérification
              </Button>
              {!hasRealPhoto && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-primary hover:underline"
                >
                  Choisir une photo
                </button>
              )}
            </div>
          </div>
        )}

        {step === "complete" && (
          <div className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto"
            >
              <CheckCircle className="w-10 h-10 text-success" />
            </motion.div>
            <div>
              <h3 className="text-xl font-semibold">Niveau 1 complété ! 🎉</h3>
              <p className="text-muted-foreground mt-2">
                Vous avez gagné jusqu'à <span className="font-semibold text-success">+20 points</span> de confiance.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Vous pouvez maintenant passer aux autres niveaux de vérification !
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

export default VerificationLevel1;
