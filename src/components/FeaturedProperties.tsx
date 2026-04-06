// src/components/FeaturedProperties.tsx
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import PropertyCard from "./PropertyCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, SlidersHorizontal, Sparkles, Home } from "lucide-react";
import { useRecommendations } from "@/hooks/useRecommendations";
import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const FeaturedProperties = () => {
  const ITEMS_PER_PAGE = 6;
  const { user } = useAuth();
  const { recommendations, loading, error } = useRecommendations(user?.id, ITEMS_PER_PAGE);
  const [activeFilter, setActiveFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const { language } = useLanguage();

  const labels = {
    all: language === "fr" ? "Tous" : "All",
    rent: language === "fr" ? "Location" : "Rent",
    sale: language === "fr" ? "Vente" : "Sale",
    colocation: language === "fr" ? "Colocation" : "Colocation",
    short_term: language === "fr" ? "Court séjour" : "Short term",
  };

  // ✅ PROTECTION : s'assurer que recommendations est toujours un tableau
  const safeRecommendations = useMemo(() => {
    if (!recommendations) return [];
    if (!Array.isArray(recommendations)) {
      console.error("recommendations n'est pas un tableau:", recommendations);
      return [];
    }
    return recommendations;
  }, [recommendations]);

  console.log("=== FeaturedProperties ===");
  console.log("User:", user?.id);
  console.log("Loading:", loading);
  console.log("Error:", error);
  console.log("Safe recommendations count:", safeRecommendations.length);

  // ✅ FILTRAGE avec protection
  const filtered = useMemo(() => {
    if (activeFilter === "all") return safeRecommendations;
    return safeRecommendations.filter((p: any) => p && p.listing_type === activeFilter);
  }, [safeRecommendations, activeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  
  const paginated = useMemo(() => {
    return filtered.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
  }, [filtered, currentPage]);

  useEffect(() => setCurrentPage(1), [activeFilter]);

  // LOGIQUE DES MESSAGES avec protection
  const shouldShowGenericMessage = useMemo(() => {
    return safeRecommendations.length > 0 && safeRecommendations.some(r => r?.isGenericFallback);
  }, [safeRecommendations]);

  const shouldShowSimilarMessage = useMemo(() => {
    return safeRecommendations.length > 0 && safeRecommendations.some(r => r?.isSimilarFallback);
  }, [safeRecommendations]);

  // RENDU
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        
        {/* HEADER */} 
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-primary">{labels.all}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-2 text-foreground">
              {language === "fr" ? "Propriétés en vedette" : "Featured Properties"}
            </h2>
            <p className="text-muted-foreground">
              {language === "fr" ? "Découvrez les meilleures offres" : "Discover the best offers"}
            </p>
          </motion.div>

          <div className="flex gap-3">
            <Link to="/search">
              <Button variant="outline" size="sm" className="gap-2 border-primary/20">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                {language === "fr" ? "Filtres" : "Filters"}
              </Button>
            </Link>
          </div>
        </div>

        {/* FILTRES */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(labels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                activeFilter === key
                  ? "bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg"
                  : "hover:bg-primary/10 text-foreground bg-secondary"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* MESSAGES CLAIRS */}
        {shouldShowSimilarMessage && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-center text-yellow-800 text-sm">
              {language === "fr"
                ? "⚠️ Nous n'avons pas trouvé de propriété exactement correspondant à vos critères. Voici des suggestions proches."
                : "⚠️ No exact match found. Here are similar recommendations."}
            </p>
          </div>
        )}

        {shouldShowGenericMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-center text-green-800 text-sm">
              {language === "fr"
                ? "👋 Bienvenue ! Voici les propriétés les plus récentes et populaires."
                : "👋 Welcome! Here are the most recent and popular properties."}
            </p>
          </div>
        )}

        {/* ÉTAT DE CHARGEMENT */}
        {loading && (
          <div className="text-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        )}

        {/* ERREUR */}
        {error && !loading && (
          <div className="text-center py-16">
            <p className="text-red-500 mb-2">Erreur: {error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="text-primary underline"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* GRID avec protection */}
        {!loading && !error && paginated.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginated.map((property, index) => (
              <motion.div
                key={property?.id || `prop-${index}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                {/* ✅ Protection : ne pas rendre si property est invalide */}
                {property && <PropertyCard property={property} variant="featured" />}
              </motion.div>
            ))}
          </div>
        ) : !loading && !error && (
          <div className="text-center py-16">
            <Home className="w-16 h-16 mx-auto mb-4 text-primary" />
            <p className="text-foreground">Aucune propriété trouvée</p>
            {user?.id && (
              <p className="text-muted-foreground text-sm mt-2">
                Essayez de modifier vos critères dans votre profil
              </p>
            )}
          </div>
        )}

        {/* PAGINATION avec protection */}
        {totalPages > 1 && !loading && paginated.length > 0 && (
          <div className="flex justify-center mt-10 gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-lg bg-secondary disabled:opacity-50"
            >
              ←
            </button>
            <span className="px-4 py-2 text-foreground">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-lg bg-secondary disabled:opacity-50"
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
