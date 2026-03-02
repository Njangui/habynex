import { useState, useEffect, useCallback, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { Search as SearchIcon, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SearchFilters from "@/components/SearchFilters";
import SearchResults from "@/components/SearchResults";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const PAGE_SIZE = 15;
const MAX_SEARCH_LENGTH = 100;
const MIN_SEARCH_INTERVAL = 500; // ms

// Sanitize user input for ILIKE patterns
const sanitizeSearchInput = (input: string): string => {
  // Escape special LIKE characters and trim
  return input.replace(/[%_\\[\]]/g, '\\$&').trim();
};

interface Filters {
  location: string;
  neighborhood: string;
  propertyType: string;
  listingType: string;
  priceMin: number;
  priceMax: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
}

const Search = () => {
  const { t, language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [filters, setFilters] = useState<Filters>({
    location: searchParams.get("city") || "",
    neighborhood: searchParams.get("neighborhood") || "",
    propertyType: searchParams.get("type") || "",
    listingType: searchParams.get("listing") || "rent",
    priceMin: parseInt(searchParams.get("priceMin") || "0"),
    priceMax: parseInt(searchParams.get("priceMax") || "500000"),
    bedrooms: parseInt(searchParams.get("bedrooms") || "0"),
    bathrooms: parseInt(searchParams.get("bathrooms") || "0"),
    amenities: searchParams.get("amenities")?.split(",").filter(Boolean) || [],
  });
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const lastSearchRef = useRef<number>(0);

  const fetchProperties = useCallback(async (resetPage = true) => {
    // Rate limiting
    const now = Date.now();
    if (now - lastSearchRef.current < MIN_SEARCH_INTERVAL) {
      toast.error(language === "fr" ? "Veuillez patienter avant de rechercher à nouveau" : "Please wait before searching again");
      return;
    }
    lastSearchRef.current = now;

    // Validate search input length
    if (searchQuery.length > MAX_SEARCH_LENGTH) {
      toast.error(language === "fr" ? "La recherche est trop longue (max 100 caractères)" : "Search is too long (max 100 characters)");
      return;
    }

    if (resetPage) {
      setPage(0);
    }
    
    setLoading(true);
    
    const currentPage = resetPage ? 0 : page;
    
    let query = supabase
      .from("properties")
      .select("*", { count: "exact" })
      .eq("is_published", true);

    // Apply filters with sanitized inputs
    if (filters.location) {
      const sanitizedLocation = sanitizeSearchInput(filters.location);
      query = query.ilike("city", `%${sanitizedLocation}%`);
    }

    if (filters.neighborhood) {
      const sanitizedNeighborhood = sanitizeSearchInput(filters.neighborhood);
      query = query.ilike("neighborhood", `%${sanitizedNeighborhood}%`);
    }
    
    if (filters.propertyType) {
      query = query.eq("property_type", filters.propertyType as "apartment" | "house" | "room" | "studio" | "villa");
    }
    
    if (filters.listingType) {
      query = query.eq("listing_type", filters.listingType as "colocation" | "rent" | "sale" | "short_term");
    }
    
    if (filters.priceMin > 0) {
      query = query.gte("price", filters.priceMin);
    }
    
    if (filters.priceMax < 500000) {
      query = query.lte("price", filters.priceMax);
    }
    
    if (filters.bedrooms > 0) {
      query = query.gte("bedrooms", filters.bedrooms);
    }
    
    if (filters.bathrooms > 0) {
      query = query.gte("bathrooms", filters.bathrooms);
    }

    if (filters.amenities.length > 0) {
      query = query.contains("amenities", filters.amenities);
    }

    // Apply text search with sanitized input
    if (searchQuery) {
      const sanitizedQuery = sanitizeSearchInput(searchQuery);
      query = query.or(`title.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%,city.ilike.%${sanitizedQuery}%,neighborhood.ilike.%${sanitizedQuery}%`);
    }

    // Apply pagination and ordering
    query = query
      .order("created_at", { ascending: false })
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching properties:", error);
      toast.error(t("error.generic"));
    } else {
      setProperties(data || []);
      setTotalCount(count || 0);
    }

    setLoading(false);
  }, [filters, searchQuery, page, language, t]);

  useEffect(() => {
    fetchProperties();
  }, []);

  // Handle page changes
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchProperties(false);
  };

  const handleSearch = () => {
    // Validate search input
    if (searchQuery.length > MAX_SEARCH_LENGTH) {
      toast.error(language === "fr" ? "La recherche est trop longue (max 100 caractères)" : "Search is too long (max 100 characters)");
      return;
    }

    // Update URL params
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (filters.location) params.set("city", filters.location);
    if (filters.neighborhood) params.set("neighborhood", filters.neighborhood);
    if (filters.propertyType) params.set("type", filters.propertyType);
    if (filters.listingType) params.set("listing", filters.listingType);
    if (filters.priceMin > 0) params.set("priceMin", filters.priceMin.toString());
    if (filters.priceMax < 500000) params.set("priceMax", filters.priceMax.toString());
    if (filters.bedrooms > 0) params.set("bedrooms", filters.bedrooms.toString());
    if (filters.bathrooms > 0) params.set("bathrooms", filters.bathrooms.toString());
    if (filters.amenities.length > 0) params.set("amenities", filters.amenities.join(","));
    
    setSearchParams(params);
    fetchProperties(true);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <>
      <Helmet>
        <title>{t("search.title")} | Habynex</title>
        <meta 
          name="description" 
          content={language === "fr" 
            ? "Recherchez votre logement idéal au Cameroun. Filtrez par budget, type de bien, localisation et commodités."
            : "Search for your ideal home in Cameroon. Filter by budget, property type, location and amenities."
          } 
        />
      </Helmet>

      <main className="min-h-screen bg-background">
        <Navbar />

        {/* Search Header */}
        <section className="pt-24 pb-8 bg-gradient-to-b from-secondary/50 to-background">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto text-center mb-8"
            >
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                {language === "fr" ? "Trouvez votre " : "Find your "}
                <span className="text-gradient">{language === "fr" ? "logement idéal" : "ideal home"}</span>
              </h1>
              <p className="text-muted-foreground">
                {language === "fr" 
                  ? "Explorez des milliers d'annonces vérifiées au Cameroun"
                  : "Explore thousands of verified listings in Cameroon"
                }
              </p>
            </motion.div>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-card rounded-2xl p-3 shadow-sm border border-border/50">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder={t("search.placeholder")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="pl-12 h-12 border-0 bg-secondary rounded-xl"
                    />
                  </div>
                  <Button onClick={handleSearch} variant="hero" size="lg" className="gap-2 px-6">
                    <SearchIcon className="w-5 h-5" />
                    {t("common.search")}
                  </Button>
                </div>
                
                {/* AI Suggestion */}
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <span>{language === "fr" ? "Essayez :" : "Try:"}</span>
                    <button 
                      className="text-primary hover:underline font-medium"
                      onClick={() => {
                        setSearchQuery(language === "fr" ? "studio meublé moins de 100000" : "furnished studio under 100000");
                        handleSearch();
                      }}
                    >
                      {language === "fr" 
                        ? '"Studio meublé moins de 100 000 FCFA"'
                        : '"Furnished studio under 100,000 FCFA"'
                      }
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Results Section */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Filters Sidebar */}
              <aside className="lg:w-80 shrink-0">
                <SearchFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  onSearch={handleSearch}
                />
              </aside>

              {/* Results */}
              <div className="flex-1">
                {/* Mobile Filter Button */}
                <div className="lg:hidden mb-4">
                  <SearchFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    onSearch={handleSearch}
                  />
                </div>

                <SearchResults
                  properties={properties}
                  loading={loading}
                  totalCount={totalCount}
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </>
  );
};

export default Search;
