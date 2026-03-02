import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import PropertyCard from "./PropertyCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, SlidersHorizontal, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { useRecommendations } from "@/hooks/useRecommendations";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

// Fallback static data
import property1 from "@/assets/property-1.jpg";
import property2 from "@/assets/property-2.jpg";
import property3 from "@/assets/property-3.jpg";
import property4 from "@/assets/property-4.jpg";
import property5 from "@/assets/property-5.jpg";
import property6 from "@/assets/property-6.jpg";

const fallbackProperties = [
  {
    id: "fallback-1",
    title: "Appartement moderne avec terrasse",
    location: "Bastos, Yaoundé",
    price: 250000,
    priceUnit: "mois",
    image: property1,
    bedrooms: 3,
    bathrooms: 2,
    area: 120,
    rating: 4.8,
    isVerified: true,
    type: "Location",
  },
  {
    id: "fallback-2",
    title: "Studio lumineux centre-ville",
    location: "Bonanjo, Douala",
    price: 75000,
    priceUnit: "mois",
    image: property2,
    bedrooms: 1,
    bathrooms: 1,
    area: 35,
    rating: 4.5,
    isVerified: true,
    type: "Location",
  },
  {
    id: "fallback-3",
    title: "Villa traditionnelle avec jardin",
    location: "Bonapriso, Douala",
    price: 45000000,
    priceUnit: "vente",
    image: property3,
    bedrooms: 5,
    bathrooms: 3,
    area: 280,
    rating: 4.9,
    isVerified: true,
    type: "Vente",
  },
  {
    id: "fallback-4",
    title: "Colocation ambiance conviviale",
    location: "Messa, Yaoundé",
    price: 50000,
    priceUnit: "mois",
    image: property4,
    bedrooms: 1,
    bathrooms: 1,
    area: 18,
    rating: 4.6,
    isVerified: false,
    type: "Colocation",
  },
  {
    id: "fallback-5",
    title: "Penthouse vue panoramique",
    location: "Akwa, Douala",
    price: 500000,
    priceUnit: "mois",
    image: property5,
    bedrooms: 4,
    bathrooms: 3,
    area: 200,
    rating: 5.0,
    isVerified: true,
    type: "Location",
  },
  {
    id: "fallback-6",
    title: "Chambre meublée étudiant",
    location: "Ngoa-Ekelle, Yaoundé",
    price: 35000,
    priceUnit: "mois",
    image: property6,
    bedrooms: 1,
    bathrooms: 1,
    area: 15,
    rating: 4.3,
    isVerified: false,
    type: "Chambre",
  },
];

const FeaturedProperties = () => {
  const { recommendations, loading, error, refetch } = useRecommendations(6);
  const [activeFilter, setActiveFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(6);
  const [ownerTypes, setOwnerTypes] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);
  const { t, language } = useLanguage();

  // Fetch owner types for badges
  useEffect(() => {
    const fetchOwnerTypes = async () => {
      if (recommendations.length === 0) return;
      const ownerIds = [...new Set(recommendations.map((p: any) => p.owner_id).filter(Boolean))];
      if (ownerIds.length === 0) return;
      const { data } = await supabase
        .from("profiles")
        .select("user_id, user_type")
        .in("user_id", ownerIds);
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((p: any) => { map[p.user_id] = p.user_type || "seeker"; });
        setOwnerTypes(map);
      }
    };
    fetchOwnerTypes();
  }, [recommendations]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const listingTypeLabels: Record<string, string> = {
    rent: t("listing.rent"),
    sale: t("listing.sale"),
    colocation: t("listing.colocation"),
    short_term: t("listing.shortTerm"),
  };

  const filterLabels = [
    { key: "all", label: t("featured.all") },
    { key: "rent", label: t("listing.rent") },
    { key: "sale", label: t("listing.sale") },
    { key: "colocation", label: t("listing.colocation") },
    { key: "short_term", label: t("listing.shortTerm") },
  ];

  // Transform DB properties to card format
  const transformedProperties = recommendations.map((prop: any) => ({
    id: prop.id,
    title: prop.title,
    location: prop.neighborhood ? `${prop.neighborhood}, ${prop.city}` : prop.city,
    price: prop.price,
    priceUnit: prop.price_unit === "month" ? (language === "fr" ? "mois" : "month") : prop.price_unit,
    image: prop.images?.[0] || property1,
    bedrooms: prop.bedrooms || 1,
    bathrooms: prop.bathrooms || 1,
    area: prop.area || 0,
    isVerified: prop.is_verified || false,
    type: listingTypeLabels[prop.listing_type] || t("listing.rent"),
    listingType: prop.listing_type,
    ownerType: ownerTypes[prop.owner_id] || undefined,
  }));

  // Use DB data or fallback
  const displayProperties = transformedProperties.length > 0 ? transformedProperties : fallbackProperties.map(p => ({
    ...p,
    listingType: p.type === "Location" ? "rent" : p.type === "Vente" ? "sale" : p.type === "Colocation" ? "colocation" : "short_term"
  }));

  // Filter logic
  const allFiltered = activeFilter === "all" 
    ? displayProperties 
    : displayProperties.filter((p) => p.listingType === activeFilter);
  const filteredProperties = allFiltered.slice(0, visibleCount);
  const hasMore = allFiltered.length > visibleCount;

  return (
    <section id="search" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary">{t("featured.recommended")}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
              {t("featured.title")}
            </h2>
            <p className="text-muted-foreground">
              {t("featured.subtitle")}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex gap-3"
          >
            <Link to="/search">
              <Button variant="outline" size="sm" className="gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                {t("search.filters")}
              </Button>
            </Link>
            <Link to="/search">
              <Button variant="ghost" size="sm" className="gap-2">
                {t("common.view")} {t("common.all").toLowerCase()}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Filter Chips */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap gap-2 mb-8"
        >
          {filterLabels.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeFilter === filter.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">{t("featured.loading")}</span>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-12">
            <p className="text-destructive mb-4">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              {t("error.tryAgain")}
            </Button>
          </div>
        )}

        {/* Properties Grid */}
        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((property) => (
                <PropertyCard key={property.id} {...property} />
              ))}
            </div>

            {/* Pagination */}
            {allFiltered.length > 6 && (
              <div className="flex justify-center mt-8 gap-2">
                {Array.from({ length: Math.ceil(allFiltered.length / 6) }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setVisibleCount((i + 1) * 6)}
                    className={`w-10 h-10 rounded-full text-sm font-medium transition-all ${
                      Math.ceil(visibleCount / 6) === i + 1
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!loading && !error && filteredProperties.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t("featured.noResults")}</p>
          </div>
        )}

        {/* Load More */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          {hasMore && (
            <Button 
              variant="outline" 
              size="lg" 
              className="gap-2"
              onClick={() => setVisibleCount(prev => prev + 6)}
            >
              {language === "fr" ? "Voir plus de recommandations" : "See more recommendations"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
          <Link to="/search">
            <Button variant="ghost" size="lg" className="gap-2">
              {t("featured.viewMore")}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedProperties;
