import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturedProperties from "@/components/FeaturedProperties";
import HowItWorks from "@/components/HowItWorks";
import Testimonials from "@/components/Testimonials";
import TrustSection from "@/components/TrustSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import { OnboardingQuestions } from "@/components/OnboardingQuestions";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user || loading) return;
      
      // If URL has onboarding=true, show it directly
      if (searchParams.get("onboarding") === "true") {
        setShowOnboarding(true);
        setSearchParams({});
        return;
      }

      // Check if user has completed onboarding using the onboarding_status table first
      setCheckingOnboarding(true);
      try {
        // First check the dedicated onboarding_status table
        const { data: onboardingStatus } = await supabase
          .from("onboarding_status")
          .select("completed_at")
          .eq("user_id", user.id)
          .maybeSingle();

        // If onboarding is already marked as complete, don't show it
        if (onboardingStatus?.completed_at) {
          setCheckingOnboarding(false);
          return;
        }

        // Fallback: check if profile has user_type set
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_type")
          .eq("user_id", user.id)
          .maybeSingle();

        // If user has no profile or hasn't set their user_type, show onboarding
        if (!profile || !profile.user_type) {
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, [user, loading, searchParams, setSearchParams]);

  return (
    <>
      <Helmet>
        <title>Habynex - Trouvez ou proposez votre logement idéal en Afrique | Plateforme immobilière intelligente</title>
        <meta 
          name="description" 
          content="Habynex est la plateforme immobilière intelligente pour trouver votre logement en Afrique. Location, colocation, vente - notre IA vous aide à trouver le bien parfait." 
        />
        <meta name="keywords" content="immobilier, location, appartement, maison, Cameroun, Yaoundé, Douala, logement, colocation, IA, Habynex" />
        <link rel="canonical" href="https://Habynex.com" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Habynex - Plateforme immobilière intelligente en Afrique" />
        <meta property="og:description" content="Trouvez ou proposz votre logement idéal grâce à notre IA. Location, colocation, vente - des milliers d'annonces vérifiées." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://Habynex.com" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Habynex - Plateforme immobilière intelligente" />
        <meta name="twitter:description" content="Trouvez ou proposez votre logement idéal grâce à notre IA." />
      </Helmet>

      {showOnboarding && user && (
        <OnboardingQuestions 
          userId={user.id} 
          onComplete={(accountType) => {
            setShowOnboarding(false);
            // Redirect non-seekers to identity verification
            if (accountType && accountType !== "seeker") {
              navigate("/identity-verification");
            }
          }} 
        />
      )}

      <main className="min-h-screen bg-background">
        <Navbar />
        <HeroSection />
        <FeaturedProperties />
        <HowItWorks />
        <Testimonials />
        <TrustSection />
        <CTASection />
        <Footer />
      </main>
    </>
  );
};

export default Index;
