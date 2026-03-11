import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Home, Search, MessageCircle, User, Menu, X, Plus, Sparkles, 
  LogOut, LayoutDashboard, Moon, Sun, Shield, Heart, Building2, Globe, Bell 
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LanguageToggle } from "@/components/LanguageToggle";
import logo from "@/assets/Habynex-logo.jpeg";
import ContactUs from "@/pages/ContactUs";

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark") || 
             localStorage.getItem("theme") === "dark" ||
             (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
    return false;
  });
  const { user, signOut, loading } = useAuth();
  const { isSeeker, isPropertyProvider, profile } = useUserProfile();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  useEffect(() => {
    if (user) {
      checkAdminRole();
    }
  }, [user]);

  const checkAdminRole = async () => {
    try {
      const { data } = await supabase.rpc("current_user_has_role", { _role: "admin" });
      setIsAdmin(!!data);
    } catch (error) {
      console.error("Error checking admin role:", error);
    }
  };

  const toggleDarkMode = () => setIsDark(!isDark);

  interface NavLink {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    requiresAuth?: boolean;
  }

  // Navigation links based on user type
  const getNavLinks = (): NavLink[] => {
    const baseLinks: NavLink[] = [
      { name: t("common.home"), href: "/", icon: Home },
      { name: t("common.search"), href: "/search", icon: Search },
      { name: t("Contact"), href: "/contact", icon: ContactUs },
    ];

    if (!user) return baseLinks;

    const authLinks: NavLink[] = [
      { name: t("common.messages"), href: "/messages", icon: MessageCircle, requiresAuth: true },
      { name: language === "fr" ? "Notifications" : "Notifications", href: "/notifications", icon: Bell, requiresAuth: true },
    ];

    if (isSeeker) {
      return [
        ...baseLinks,
        { name: t("nav.favorites"), href: "/seeker-dashboard", icon: Heart, requiresAuth: true },
        ...authLinks,
      ];
    }

    if (isPropertyProvider) {
      return [
        ...baseLinks,
        { name: t("common.dashboard"), href: "/dashboard", icon: LayoutDashboard, requiresAuth: true },
        ...authLinks,
      ];
    }

    // Default
    return [
      ...baseLinks,
      { name: t("common.dashboard"), href: "/dashboard", icon: LayoutDashboard, requiresAuth: true },
      ...authLinks,
    ];
  };

  const navLinks = getNavLinks();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-primary/5 via-background/95 to-primary/5 backdrop-blur-xl border-b border-primary/10">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <motion.a
          href="/"
          className="flex items-center gap-3"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-1.5 shadow-sm border border-primary/20">
            <img src={logo} alt="Habynex" className="w-full h-full rounded-lg object-contain" />
          </div>
          <span className="text-2xl font-bold hidden sm:block">
            <span className="text-primary">H</span>
            <span className="text-foreground">abynex</span>
          </span>
        </motion.a>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            if (link.requiresAuth && !user) return null;
            return (
              <Link
                key={link.name}
                to={link.href}
                className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-200 font-medium"
              >
                {link.name}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              to="/admin"
              className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-200 font-medium flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Admin
            </Link>
          )}
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-2">
          {/* Language Toggle */}
          <LanguageToggle />
          
          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={toggleDarkMode}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
          
          {/* Show publish button only for property providers or unset profiles */}
          {(!profile || isPropertyProvider) && (
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => navigate("/create-listing")}
            >
              <Plus className="w-4 h-4" />
              {t("common.publish")}
            </Button>
          )}
          
          {!loading && (
            <>
              {user ? (
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full"
                    onClick={() => navigate("/profile")}
                  >
                    <User className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full"
                    onClick={handleSignOut}
                  >
                    <LogOut className="w-5 h-5" />
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate("/auth")}
                >
                  {t("common.login")}
                </Button>
              )}
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-b border-border overflow-hidden"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
              {/* Language Toggle - Always visible at top for mobile */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary/50">
                <Globe className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">{language === "fr" ? "Langue" : "Language"}:</span>
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={() => setLanguage("fr")}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      language === "fr" 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-background hover:bg-secondary"
                    }`}
                  >
                    🇫🇷 FR
                  </button>
                  <button
                    onClick={() => setLanguage("en")}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      language === "en" 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-background hover:bg-secondary"
                    }`}
                  >
                    🇬🇧 EN
                  </button>
                </div>
              </div>

              <hr className="my-2 border-border" />

              {navLinks.map((link) => {
                if (link.requiresAuth && !user) return null;
                return (
                  <Link
                    key={link.name}
                    to={link.href}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <link.icon className="w-5 h-5" />
                    {link.name}
                  </Link>
                );
              })}
              
              <Button 
                        variant="outline" 
                        className="gap-2 justify-center"
                        onClick={() => {
                          navigate("/profile");
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <User className="w-4 h-4" />
                        Mon profil
                      </Button>

              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Shield className="w-5 h-5" />
                  Administration
                </Link>
              )}
              
              {/* Mobile Language Toggle - Always visible */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground">
                <Globe className="w-5 h-5" />
                <div className="flex gap-2">
                  <button
                    onClick={() => setLanguage("fr")}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      language === "fr" 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-secondary hover:bg-secondary/80"
                    }`}
                  >
                    🇫🇷 FR
                  </button>
                  <button
                    onClick={() => setLanguage("en")}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      language === "en" 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-secondary hover:bg-secondary/80"
                    }`}
                  >
                    🇬🇧 EN
                  </button>
                </div>
              </div>
              
              {/* Mobile Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                {isDark ? (language === "fr" ? "Mode clair" : "Light mode") : (language === "fr" ? "Mode sombre" : "Dark mode")}
              </button>
              
              <hr className="my-2 border-border" />
              
              {!loading && (
                <>
                  {user ? (
                    <>
                      <Button 
                        variant="outline" 
                        className="gap-2 justify-center"
                        onClick={() => {
                          navigate("/profile");
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <User className="w-4 h-4" />
                        Mon profil
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="gap-2 justify-center"
                        onClick={() => {
                          handleSignOut();
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <LogOut className="w-4 h-4" />
                        Déconnexion
                      </Button>
                    </>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="gap-2 justify-center"
                      onClick={() => {
                        navigate("/auth");
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <User className="w-4 h-4" />
                      Connexion / Inscription
                    </Button>
                  )}
                </>
              )}
              
              {/* Show publish button only for property providers */}
              {(!profile || isPropertyProvider) && (
                <Button 
                  variant="outline" 
                  className="gap-2 justify-center"
                  onClick={() => {
                    navigate("/create-listing");
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Publier une annonce
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
