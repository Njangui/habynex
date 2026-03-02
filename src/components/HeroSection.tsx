import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Home, Sparkles, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import heroImage from "@/assets/hero-cityscape.jpg";

const HeroSection = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSearch = () => {
    navigate("/search");
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-16">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Vue aérienne de la ville au coucher du soleil"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6"
          >
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">{t("hero.aiPowered")}</span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight"
          >
            {t("hero.title").split(" ").slice(0, 2).join(" ")}{" "}
            <span className="text-gradient">{t("hero.title").split(" ").slice(2, 4).join(" ")}</span>{" "}
            {t("hero.title").split(" ").slice(4).join(" ")}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
          >
            {t("hero.subtitle")}
          </motion.p>

          {/* Search Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-card rounded-2xl shadow-lg p-3 sm:p-4 max-w-3xl mx-auto"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Location Input */}
              <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary">
                <MapPin className="w-5 h-5 text-primary shrink-0" />
                <input
                  type="text"
                  placeholder={t("hero.searchPlaceholder")}
                  className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {/* Property Type */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary sm:w-48">
                <Home className="w-5 h-5 text-primary shrink-0" />
                <select className="flex-1 bg-transparent outline-none text-foreground cursor-pointer">
                  <option value="">{t("hero.propertyType")}</option>
                  <option value="studio">{t("property.studio")}</option>
                  <option value="apartment">{t("property.apartment")}</option>
                  <option value="house">{t("property.house")}</option>
                  <option value="room">{t("property.room")}</option>
                </select>
              </div>

              {/* Search Button */}
              <Button variant="hero" size="lg" className="gap-2" onClick={handleSearch}>
                <Search className="w-5 h-5" />
                <span className="hidden sm:inline">{t("common.search")}</span>
                <span className="hidden sm:inline">Rechercher</span>
              </Button>
            </div>

            {/* AI Search Suggestion */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="w-4 h-4 text-accent" />
                <span>{t("hero.askAI")}</span>
                <button className="text-primary hover:underline font-medium">
                  "Studio meublé à Yaoundé moins de 100 000 FCFA"
                </button>
              </div>
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-8 mt-12"
          >
            {[
              { value: "5,000+", label: t("hero.activeListings") },
              { value: "15+", label: t("hero.citiesCovered") },
              { value: "98%", label: t("hero.satisfaction") },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex flex-col items-center gap-2 text-muted-foreground"
        >
          <span className="text-sm">{t("hero.discover")}</span>
          <ArrowRight className="w-5 h-5 rotate-90" />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
