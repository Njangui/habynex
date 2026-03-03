import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Home, Mail, Lock, User, Phone, Eye, EyeOff, ArrowLeft, Loader2, MessageCircle } from "lucide-react";
import { z } from "zod";
import { useLanguage } from "@/contexts/LanguageContext";
import yaoundeCityscape from "@/assets/yaounde-cityscape.jpg";
import logo from "@/assets/Habynex-logo.jpeg";

// Validation schemas
const emailSchema = z.string().email("Adresse email invalide");
const passwordSchema = z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères");
const phoneSchema = z.string().regex(/^\+?[0-9]{9,15}$/, "Numéro de téléphone invalide");

type AuthMode = "login" | "signup" | "phone";

// Helper function to get user-friendly error messages
const getAuthErrorMessage = (error: any, language: string): string => {
  const errorCode = error?.code || error?.message || "";
  
  // Map common Supabase auth errors to user-friendly messages
  const errorMap: Record<string, { fr: string; en: string }> = {
    "user_already_exists": {
      fr: "Un compte existe déjà avec cet email. Connectez-vous plutôt.",
      en: "An account already exists with this email. Please sign in instead."
    },
    "invalid_credentials": {
      fr: "L'email ou le mot de passe est incorrect.",
      en: "Email or password is incorrect."
    },
    "email_not_confirmed": {
      fr: "Veuillez confirmer votre email avant de vous connecter.",
      en: "Please confirm your email before signing in."
    },
    "too_many_requests": {
      fr: "Trop de tentatives. Veuillez réessayer dans quelques minutes.",
      en: "Too many attempts. Please try again in a few minutes."
    },
    "weak_password": {
      fr: "Le mot de passe est trop faible. Utilisez au moins 6 caractères.",
      en: "Password is too weak. Use at least 6 characters."
    },
    "invalid_email": {
      fr: "L'adresse email n'est pas valide.",
      en: "The email address is not valid."
    },
    "signup_disabled": {
      fr: "Les inscriptions sont temporairement désactivées.",
      en: "Sign ups are temporarily disabled."
    },
    "Database error saving new user": {
      fr: "Erreur lors de la création du profil. Veuillez réessayer.",
      en: "Error creating profile. Please try again."
    }
  };

  // Check if error message contains any known error
  for (const [key, messages] of Object.entries(errorMap)) {
    if (errorCode.toLowerCase().includes(key.toLowerCase()) || 
        (error?.message && error.message.toLowerCase().includes(key.toLowerCase()))) {
      return language === "fr" ? messages.fr : messages.en;
    }
  }

  // Check for specific error patterns
  if (error?.message?.includes("already registered") || error?.message?.includes("already exists")) {
    return language === "fr" 
      ? "Un compte existe déjà avec cet email. Connectez-vous plutôt."
      : "An account already exists with this email. Please sign in instead.";
  }

  if (error?.message?.includes("Invalid login credentials")) {
    return language === "fr"
      ? "L'email ou le mot de passe est incorrect."
      : "Email or password is incorrect.";
  }

  if (error?.message?.includes("rate limit") || error?.status === 429) {
    return language === "fr"
      ? "Trop de tentatives. Veuillez patienter avant de réessayer."
      : "Too many attempts. Please wait before trying again.";
  }

  // Default error message
  return language === "fr" 
    ? "Une erreur est survenue lors de l'authentification. Veuillez réessayer."
    : "An authentication error occurred. Please try again.";
};

const AuthPage = () => {
  const { t, language } = useLanguage();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const validateEmail = (email: string) => {
    try {
      emailSchema.parse(email);
      return true;
    } catch {
      return false;
    }
  };

  const validatePassword = (password: string) => {
    try {
      passwordSchema.parse(password);
      return true;
    } catch {
      return false;
    }
  };

  const validatePhone = (phone: string) => {
    try {
      phoneSchema.parse(phone);
      return true;
    } catch {
      return false;
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(email)) {
      toast({
        variant: "destructive",
        title: language === "fr" ? "Email invalide" : "Invalid email",
        description: language === "fr" ? "Veuillez entrer une adresse email valide." : "Please enter a valid email address.",
      });
      return;
    }

    if (!validatePassword(password)) {
      toast({
        variant: "destructive",
        title: language === "fr" ? "Mot de passe invalide" : "Invalid password",
        description: language === "fr" ? "Le mot de passe doit contenir au moins 6 caractères." : "Password must be at least 6 characters.",
      });
      return;
    }

    if (mode === "signup" && !fullName.trim()) {
      toast({
        variant: "destructive",
        title: language === "fr" ? "Nom requis" : "Name required",
        description: language === "fr" ? "Veuillez entrer votre nom complet." : "Please enter your full name.",
      });
      return;
    }

    if (mode === "signup" && !acceptedTerms) {
      toast({
        variant: "destructive",
        title: language === "fr" ? "CGU requises" : "Terms required",
        description: language === "fr" ? "Vous devez accepter les conditions générales d'utilisation." : "You must accept the terms of service.",
      });
      return;
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        const redirectUrl = `${window.location.origin}/`;
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: fullName.trim(),
              whatsapp_number: whatsappNumber.trim() || null,
            },
          },
        });

        if (error) {
          // Handle specific error cases
          if (error.message.includes("already registered") || error.message.includes("already exists")) {
            toast({
              variant: "destructive",
              title: language === "fr" ? "Compte existant" : "Account exists",
              description: language === "fr" ? "Un compte existe déjà avec cet email. Connectez-vous plutôt." : "An account already exists with this email. Please sign in instead.",
            });
            setMode("login");
          } else if (error.message.includes("rate limit") || error.status === 429) {
            toast({
              variant: "destructive",
              title: language === "fr" ? "Trop de tentatives" : "Too many attempts",
              description: language === "fr" ? "Veuillez patienter quelques minutes avant de réessayer." : "Please wait a few minutes before trying again.",
            });
          } else {
            throw error;
          }
        } else {
          // Vérifier si une session a été créée (confirmation email désactivée)
          if (data.session) {
            // L'utilisateur est automatiquement connecté
            toast({
              title: language === "fr" ? "Compte créé !" : "Account created!",
              description: language === "fr" 
                ? "Bienvenue sur Habynex ! Vous êtes maintenant connecté." 
                : "Welcome to Habynex! You are now logged in.",
            });
            navigate("/?onboarding=true");
          } else {
            // L'utilisateur doit confirmer son email
            toast({
              title: language === "fr" ? "Vérifiez votre email" : "Check your email",
              description: language === "fr" 
                ? "Un lien de confirmation vous a été envoyé. Veuillez vérifier votre boîte de réception." 
                : "A confirmation link has been sent to your email. Please check your inbox.",
            });
            setMode("login"); // Revenir au mode connexion
          }
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              variant: "destructive",
              title: language === "fr" ? "Identifiants incorrects" : "Invalid credentials",
              description: language === "fr" ? "L'email ou le mot de passe est incorrect." : "Email or password is incorrect.",
            });
          } else {
            throw error;
          }
        } else {
          toast({
            title: language === "fr" ? "Connexion réussie !" : "Login successful!",
            description: language === "fr" ? "Bienvenue sur Habynex !" : "Welcome to Habynex!",
          });
          navigate("/");
        }
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      // Handle network errors
      if (error.message?.includes("Failed to fetch") || error.name === "TypeError") {
        toast({
          variant: "destructive",
          title: language === "fr" ? "Erreur de connexion" : "Connection error",
          description: language === "fr" 
            ? "Vérifiez votre connexion internet et réessayez." 
            : "Check your internet connection and try again.",
        });
      } else {
        const errorMessage = getAuthErrorMessage(error, language);
        toast({
          variant: "destructive",
          title: language === "fr" ? "Erreur d'authentification" : "Authentication error",
          description: errorMessage,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      console.error("Google auth error:", error);
      toast({
        variant: "destructive",
        title: language === "fr" ? "Erreur Google" : "Google error",
        description: getAuthErrorMessage(error, language),
      });
      setLoading(false);
    }
  };

  const handlePhoneSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePhone(phone)) {
      toast({
        variant: "destructive",
        title: language === "fr" ? "Numéro invalide" : "Invalid number",
        description: language === "fr" ? "Veuillez entrer un numéro de téléphone valide (ex: +237600000000)." : "Please enter a valid phone number (ex: +237600000000).",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
      });

      if (error) throw error;

      setOtpSent(true);
      toast({
        title: language === "fr" ? "Code envoyé !" : "Code sent!",
        description: language === "fr" ? "Un code de vérification a été envoyé à votre numéro." : "A verification code has been sent to your number.",
      });
    } catch (error: any) {
      console.error("Phone OTP error:", error);
      toast({
        variant: "destructive",
        title: language === "fr" ? "Erreur SMS" : "SMS error",
        description: getAuthErrorMessage(error, language),
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: "sms",
      });

      if (error) throw error;

      toast({
        title: language === "fr" ? "Connexion réussie !" : "Login successful!",
        description: language === "fr" ? "Bienvenue sur Habynex !" : "Welcome to Habynex!",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: language === "fr" ? "Code invalide" : "Invalid code",
        description: language === "fr" ? "Le code entré est incorrect ou expiré." : "The entered code is incorrect or expired.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Branding with Yaoundé Photo */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Image */}
        <img 
          src={yaoundeCityscape} 
          alt="Yaoundé Cityscape" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/70 to-accent/60" />
        
        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground">
          <a href="/" className="flex items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center overflow-hidden">
              <img src={logo} alt="Habynex" className="w-full h-full object-contain" />
            </div>
            <span className="text-2xl font-bold"><span className="text-primary-foreground/90">H</span>abynex</span>
          </a>

          <div className="max-w-md">
            <h1 className="text-4xl font-bold mb-4">
              {language === "fr" 
                ? "Trouvez votre logement idéal en Afrique" 
                : "Find your ideal home in Africa"}
            </h1>
            <p className="text-primary-foreground/90 text-lg">
              {language === "fr"
                ? "Rejoignez des milliers d'utilisateurs qui font confiance à Habynex pour leur recherche de logement."
                : "Join thousands of users who trust Habynex for their home search."}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full bg-primary-foreground/30 backdrop-blur-sm border-2 border-primary-foreground/50"
                />
              ))}
            </div>
            <p className="text-sm text-primary-foreground/90">
              {language === "fr" ? "+10,000 utilisateurs satisfaits" : "+10,000 satisfied users"}
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <a href="/" className="inline-flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center overflow-hidden">
                <img src={logo} alt="Habynex" className="w-full h-full object-contain" />
              </div>
              <span className="text-xl font-bold text-foreground"><span className="text-primary">H</span>abynex</span>
            </a>
          </div>

          {/* Back Button */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t("common.back")}</span>
          </button>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Header */}
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-foreground mb-2">
                  {mode === "login" && t("common.login")}
                  {mode === "signup" && t("common.signup")}
                  {mode === "phone" && (language === "fr" ? "Connexion par téléphone" : "Phone login")}
                </h2>
                <p className="text-muted-foreground">
                  {mode === "login" && (language === "fr" ? "Connectez-vous pour accéder à votre compte" : "Sign in to access your account")}
                  {mode === "signup" && (language === "fr" ? "Inscrivez-vous pour commencer votre recherche" : "Sign up to start your search")}
                  {mode === "phone" && (language === "fr" ? "Recevez un code de vérification par SMS" : "Receive a verification code by SMS")}
                </p>
              </div>

              {/* Email/Password Form */}
              {(mode === "login" || mode === "signup") && (
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  {mode === "signup" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="fullName">{t("auth.fullName")}</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            id="fullName"
                            type="text"
                            placeholder="Jean Dupont"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="whatsapp" className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-green-500" />
                          {language === "fr" ? "WhatsApp (optionnel)" : "WhatsApp (optional)"}
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            id="whatsapp"
                            type="tel"
                            placeholder="+237 6 00 00 00 00"
                            value={whatsappNumber}
                            onChange={(e) => setWhatsappNumber(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {language === "fr" 
                            ? "Ce numéro sera utilisé pour les contacts WhatsApp sur vos annonces" 
                            : "This number will be used for WhatsApp contacts on your listings"}
                        </p>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">{t("auth.email")}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder={language === "fr" ? "vous@exemple.com" : "you@example.com"}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">{t("auth.password")}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {mode === "signup" && (
                    <div className="flex items-start space-x-2">
                      <Checkbox 
                        id="terms" 
                        checked={acceptedTerms}
                        onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                      />
                      <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight cursor-pointer">
                        {language === "fr" ? (
                          <>J'accepte les <Link to="/terms" target="_blank" className="text-primary hover:underline font-medium">conditions générales d'utilisation</Link></>
                        ) : (
                          <>I agree to the <Link to="/terms" target="_blank" className="text-primary hover:underline font-medium">terms of service</Link></>
                        )}
                      </label>
                    </div>
                  )}

                  <Button type="submit" variant="hero" className="w-full" disabled={loading || (mode === "signup" && !acceptedTerms)}>
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {mode === "login" ? t("auth.loginBtn") : t("auth.signupBtn")}
                  </Button>
                </form>
              )}

              {/* Phone Form */}
              {mode === "phone" && (
                <form onSubmit={otpSent ? handlePhoneVerifyOtp : handlePhoneSendOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("auth.phone")}</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+237 6 00 00 00 00"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pl-10"
                        disabled={otpSent}
                        required
                      />
                    </div>
                  </div>

                  {otpSent && (
                    <div className="space-y-2">
                      <Label htmlFor="otp">{t("verification.enterOtp")}</Label>
                      <Input
                        id="otp"
                        type="text"
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="text-center text-2xl tracking-widest"
                        maxLength={6}
                        required
                      />
                    </div>
                  )}

                  <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {otpSent ? t("verification.verifyOtp") : t("verification.sendOtp")}
                  </Button>

                  {otpSent && (
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="w-full text-sm text-muted-foreground hover:text-foreground"
                    >
                      {language === "fr" ? "Changer de numéro" : "Change number"}
                    </button>
                  )}
                </form>
              )}

              {/* Divider */}
              {(mode === "login" || mode === "signup") && (
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">{t("auth.orContinueWith")}</span>
                  </div>
                </div>
              )}

              {/* Social Auth */}
              {(mode === "login" || mode === "signup") && (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleAuth}
                    disabled={loading}
                    className="gap-2 hover:bg-muted/50 transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMode("phone")}
                    disabled={loading}
                    className="gap-2"
                  >
                    <Phone className="w-5 h-5" />
                    {t("auth.phone")}
                  </Button>
                </div>
              )}

              {/* Mode Toggle */}
              <div className="mt-6 text-center text-sm">
                {mode === "login" && (
                  <>
                    <span className="text-muted-foreground">{t("auth.noAccount")} </span>
                    <button
                      type="button"
                      onClick={() => setMode("signup")}
                      className="text-primary hover:underline font-medium"
                    >
                      {t("auth.signupBtn")}
                    </button>
                  </>
                )}
                {mode === "signup" && (
                  <>
                    <span className="text-muted-foreground">{t("auth.hasAccount")} </span>
                    <button
                      type="button"
                      onClick={() => setMode("login")}
                      className="text-primary hover:underline font-medium"
                    >
                      {t("auth.loginBtn")}
                    </button>
                  </>
                )}
                {mode === "phone" && (
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-primary hover:underline font-medium"
                  >
                    {language === "fr" ? "Connexion par email" : "Login with email"}
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;