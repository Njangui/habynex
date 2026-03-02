import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { 
  Heart, Eye, Search, MessageSquare, Star, 
  MapPin, Building2, TrendingUp, ArrowRight
} from "lucide-react";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NotificationActivateButton } from "@/components/NotificationActivateButton";

interface FavoriteProperty {
  id: string;
  property_id: string;
  created_at: string;
  property?: {
    id: string;
    title: string;
    city: string;
    neighborhood: string | null;
    price: number;
    price_unit: string;
    images: string[] | null;
    property_type: string;
    bedrooms: number | null;
    bathrooms: number | null;
  };
}

const SeekerDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  
  const [favorites, setFavorites] = useState<FavoriteProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?redirect=/seeker-dashboard");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      setProfile(profileData);

      // Fetch favorites with property details
      const { data: favoritesData, error: favError } = await supabase
        .from("property_favorites")
        .select(`
          id,
          property_id,
          created_at,
          property:properties(
            id,
            title,
            city,
            neighborhood,
            price,
            price_unit,
            images,
            property_type,
            bedrooms,
            bathrooms
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (favError) throw favError;
      setFavorites(favoritesData || []);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        variant: "destructive",
        title: t("seekerDashboard.error"),
        description: t("seekerDashboard.loadError")
      });
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (favoriteId: string) => {
    try {
      const { error } = await supabase
        .from("property_favorites")
        .delete()
        .eq("id", favoriteId);

      if (error) throw error;
      
      setFavorites(prev => prev.filter(f => f.id !== favoriteId));
      toast({ title: t("seekerDashboard.removedFromFavorites") });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("seekerDashboard.error"),
        description: t("seekerDashboard.removeError")
      });
    }
  };

  const getPropertyTypeLabel = (type: string) => {
    const labels: Record<string, Record<string, string>> = {
      studio: { fr: "Studio", en: "Studio" },
      apartment: { fr: "Appartement", en: "Apartment" },
      house: { fr: "Maison", en: "House" },
      room: { fr: "Chambre", en: "Room" },
      villa: { fr: "Villa", en: "Villa" },
    };
    return labels[type]?.[language] || type;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t("seekerDashboard.title")}</title>
        <meta name="description" content={t("seekerDashboard.metaDesc")} />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="pt-20 pb-12">
          <div className="container mx-auto px-4">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <h1 className="text-3xl font-bold text-foreground">
                {t("seekerDashboard.hello")}{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''} 👋
              </h1>
              <p className="text-muted-foreground mt-1">
                {t("seekerDashboard.findSearches")}
              </p>
              <div className="mt-3">
                <NotificationActivateButton />
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
            >
              <Card 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate("/search")}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Search className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{t("seekerDashboard.search")}</h3>
                    <p className="text-sm text-muted-foreground">{t("seekerDashboard.exploreListings")}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate("/profile")}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-accent/10">
                    <Heart className="w-6 h-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{t("seekerDashboard.modifyPreferences")}</h3>
                    <p className="text-sm text-muted-foreground">{language === "fr" ? "Ajustez vos critères" : "Adjust your criteria"}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate("/messages")}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-500/10">
                    <MessageSquare className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{t("seekerDashboard.messages")}</h3>
                    <p className="text-sm text-muted-foreground">{t("seekerDashboard.yourConversations")}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </motion.div>

            {/* Search Preferences */}
            {profile && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-8"
              >
                <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      {t("seekerDashboard.searchPreferences")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {profile.city && (
                        <Badge variant="secondary" className="gap-1">
                          <MapPin className="w-3 h-3" />
                          {profile.city}
                        </Badge>
                      )}
                      {profile.budget_min && profile.budget_max && (
                        <Badge variant="secondary">
                          {profile.budget_min.toLocaleString()} - {profile.budget_max.toLocaleString()} FCFA
                        </Badge>
                      )}
                      {profile.preferred_property_types?.map((type: string) => (
                        <Badge key={type} variant="outline">
                          {getPropertyTypeLabel(type)}
                        </Badge>
                      ))}
                    </div>
                    <Button 
                      variant="link" 
                      className="px-0 mt-2"
                      onClick={() => navigate("/profile")}
                    >
                      {t("seekerDashboard.modifyPreferences")}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Favorites */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  {t("seekerDashboard.myFavorites")} ({favorites.length})
                </h2>
              </div>

              {favorites.length === 0 ? (
                <Card className="p-12 text-center">
                  <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {t("seekerDashboard.noFavorites")}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {t("seekerDashboard.saveFavorites")}
                  </p>
                  <Button onClick={() => navigate("/search")}>
                    {t("seekerDashboard.browseListings")}
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {favorites.map((fav, index) => (
                    <motion.div
                      key={fav.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="overflow-hidden group">
                        <div 
                          className="aspect-video bg-cover bg-center cursor-pointer relative"
                          style={{ 
                            backgroundImage: fav.property?.images?.[0] 
                              ? `url(${fav.property.images[0]})` 
                              : 'linear-gradient(135deg, hsl(var(--muted)), hsl(var(--secondary)))'
                          }}
                          onClick={() => navigate(`/property/${fav.property_id}`)}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 bg-background/80 hover:bg-background"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFavorite(fav.id);
                            }}
                          >
                            <Heart className="w-4 h-4 fill-primary text-primary" />
                          </Button>
                        </div>
                        <CardContent className="p-4">
                          <h3 
                            className="font-semibold text-foreground line-clamp-1 cursor-pointer hover:text-primary transition-colors"
                            onClick={() => navigate(`/property/${fav.property_id}`)}
                          >
                            {fav.property?.title || (language === "fr" ? "Annonce" : "Listing")}
                          </h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {fav.property?.city}
                            {fav.property?.neighborhood && ` • ${fav.property.neighborhood}`}
                          </p>
                          <div className="flex items-center justify-between mt-3">
                            <span className="font-semibold text-primary">
                              {fav.property?.price.toLocaleString()} FCFA
                              <span className="text-xs text-muted-foreground">
                                /{fav.property?.price_unit === "month" 
                                  ? (language === "fr" ? "mois" : "mo") 
                                  : fav.property?.price_unit}
                              </span>
                            </span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {fav.property?.bedrooms && (
                                <span>{fav.property.bedrooms} {t("seekerDashboard.rooms")}</span>
                              )}
                              {fav.property?.bathrooms && (
                                <span>{fav.property.bathrooms} {t("seekerDashboard.bathrooms")}</span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </main>
      </div>
    </>
  );
};

export default SeekerDashboard;
