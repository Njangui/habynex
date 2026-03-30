import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import PropertyCard from "./PropertyCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, SlidersHorizontal, Sparkles, Home } from "lucide-react";
import { useRecommendations } from "@/hooks/useRecommendations";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

// IMAGES FALLBACK
import property1 from "@/assets/property-1.jpg";
import property2 from "@/assets/property-2.jpg";
import property3 from "@/assets/property-3.jpg";
import property4 from "@/assets/property-4.jpg";
import property5 from "@/assets/property-5.jpg";
import property6 from "@/assets/property-6.jpg";

// DONNÉES FALLBACK COMPLÈTES
const fallbackProperties = [
  {
    id: "fb-1",
    title: "Appartement moderne avec terrasse",
    price: 250000,
    price_unit: "month",
    images: [property1],
    bedrooms: 3,
    bathrooms: 2,
    area: 120,
    rating: 4.8,
    is_verified: true,
    is_furnished: false,
    is_available: true,
    listing_type: "rent",
    created_at: new Date().toISOString(),
    owner_id: "owner-1",
    owner_profile: { full_name: "Jean Dupont", avatar_url: null, is_verified: true },
    city: "Yaoundé",
    neighborhood: "Bastos",
    location: "Bastos, Yaoundé",
  },
  {
    id: "fb-2",
    title: "Studio lumineux centre-ville",
    price: 75000,
    price_unit: "month",
    images: [property2],
    bedrooms: 1,
    bathrooms: 1,
    area: 35,
    rating: 4.5,
    is_verified: true,
    is_furnished: true,
    is_available: true,
    listing_type: "rent",
    created_at: new Date().toISOString(),
    owner_id: "owner-2",
    owner_profile: { full_name: "Marie Claire", avatar_url: null, is_verified: true },
    city: "Douala",
    neighborhood: "Bonanjo",
    location: "Bonanjo, Douala",
  },
  {
    id: "fb-3",
    title: "Villa traditionnelle avec jardin",
    price: 45000000,
    price_unit: "sale",
    images: [property3],
    bedrooms: 5,
    bathrooms: 3,
    area: 280,
    rating: 4.9,
    is_verified: true,
    is_furnished: false,
    is_available: true,
    listing_type: "sale",
    created_at: new Date().toISOString(),
    owner_id: "owner-3",
    owner_profile: { full_name: "Pierre Martin", avatar_url: null, is_verified: true },
    city: "Douala",
    neighborhood: "Bonapriso",
    location: "Bonapriso, Douala",
  },
  {
    id: "fb-4",
    title: "Colocation ambiance conviviale",
    price: 50000,
    price_unit: "month",
    images: [property4],
    bedrooms: 1,
    bathrooms: 1,
    area: 18,
    rating: 4.6,
    is_verified: false,
    is_furnished: true,
    is_available: true,
    listing_type: "colocation",
    created_at: new Date().toISOString(),
    owner_id: "owner-4",
    owner_profile: { full_name: "Sophie Alain", avatar_url: null, is_verified: false },
    city: "Yaoundé",
    neighborhood: "Messa",
    location: "Messa, Yaoundé",
  },
  {
    id: "fb-5",
    title: "Penthouse vue panoramique",
    price: 500000,
    price_unit: "month",
    images: [property5],
    bedrooms: 4,
    bathrooms: 3,
    area: 200,
    rating: 5.0,
    is_verified: true,
    is_furnished: true,
    is_available: true,
    listing_type: "rent",
    created_at: new Date().toISOString(),
    owner_id: "owner-5",
    owner_profile: { full_name: "Robert Kamga", avatar_url: null, is_verified: true },
    city: "Douala",
    neighborhood: "Akwa",
    location: "Akwa, Douala",
  },
  {
    id: "fb-6",
    title: "Chambre meublée étudiant",
    price: 35000,
    price_unit: "month",
    images: [property6],
    bedrooms: 1,
    bathrooms: 1,
    area: 15,
    rating: 4.3,
    is_verified: false,
    is_furnished: true,
    is_available: true,
    listing_type: "short_term",
    created_at: new Date().toISOString(),
    owner_id: "owner-6",
    owner_profile: { full_name: "Alice M.", avatar_url: null, is_verified: false },
    city: "Yaoundé",
    neighborhood: "Ngoa-Ekelle",
    location: "Ngoa-Ekelle, Yaoundé",
  },
];

// THEME
const getInitialTheme = () => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("theme");
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
};

const FeaturedProperties = () => {
  const ITEMS_PER_PAGE = 6;
  const { recommendations, loading, error } = useRecommendations(ITEMS_PER_PAGE);
  const [activeFilter, setActiveFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [theme, setTheme] = useState(getInitialTheme());
  const { language } = useLanguage();

  const isDark = theme === "dark";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const themeClasses = {
    bg: isDark ? "bg-slate-950" : "bg-slate-50",
    text: isDark ? "text-slate-100" : "text-slate-900",
    textMuted: isDark ? "text-slate-400" : "text-slate-500",
  };

  const labels = {
    all: language === "fr" ? "Tous" : "All",
    rent: language === "fr" ? "Location" : "Rent",
    sale: language === "fr" ? "Vente" : "Sale",
    colocation: language === "fr" ? "Colocation" : "Colocation",
    short_term: language === "fr" ? "Court séjour" : "Short term",
  };

  // DÉCISION: utiliser fallback si erreur OU pas de données OU chargement terminé sans résultat
  const shouldUseFallback = error || (!loading && recommendations.length === 0);
  
  // DONNÉES À AFFICHER
  const displayData = shouldUseFallback ? fallbackProperties : recommendations;

  console.log("=== FeaturedProperties ===");
  console.log("Loading:", loading);
  console.log("Error:", error);
  console.log("DB count:", recommendations.length);
  console.log("Use fallback:", shouldUseFallback);
  console.log("Display count:", displayData.length);

  // FILTRAGE
  const filtered = activeFilter === "all" 
    ? displayData 
    : displayData.filter((p: any) => p.listing_type === activeFilter);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => setCurrentPage(1), [activeFilter]);

  // RENDU
  return (
    <section className={cn("py-20", themeClasses.bg)}>
      <div className="container mx-auto px-4">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-orange-500">{labels.all}</span>
            </div>
            <h2 className={cn("text-3xl sm:text-4xl font-bold mb-2", themeClasses.text)}>
              {language === "fr" ? "Propriétés en vedette" : "Featured Properties"}
            </h2>
            <p className={themeClasses.textMuted}>
              {language === "fr" ? "Découvrez les meilleures offres" : "Discover the best offers"}
            </p>
          </motion.div>

          <div className="flex gap-3">
            <Link to="/search">
              <Button variant="outline" size="sm" className="gap-2 border-orange-200 dark:border-orange-800">
                <SlidersHorizontal className="w-4 h-4 text-orange-500" />
                {language === "fr" ? "Filtres" : "Filters"}
              </Button>
            </Link>
          </div>
        </div>

        {/* FILTRES */}
        <div className="flex flex-wrap gap-2 mb-8">
          {Object.entries(labels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                activeFilter === key
                  ? "bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg"
                  : cn("hover:bg-orange-100 dark:hover:bg-orange-900/20", themeClasses.text, "bg-slate-100 dark:bg-slate-800")
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* MESSAGE FALLBACK */}
        {shouldUseFallback && (
          <div className="mb-6 p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800">
            <p className="text-yellow-700 dark:text-yellow-400 text-sm text-center">
              ⚠️ {language === "fr" ? "Mode démo : affichage des annonces de test" : "Demo mode: showing test listings"}
            </p>
          </div>
        )}

        {/* GRID */}
        {paginated.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginated.map((property, index) => (
              <motion.div
                key={property.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <PropertyCard property={property} variant="featured" />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Home className="w-16 h-16 mx-auto mb-4 text-orange-400" />
            <p className={themeClasses.text}>Aucune propriété trouvée</p>
          </div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-10 gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-50"
            >
              ←
            </button>
            <span className={cn("px-4 py-2", themeClasses.text)}>
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-50"
            >
              →
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedProperties;