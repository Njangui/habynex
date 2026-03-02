import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Plus, ArrowRight, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const CTASection = () => {
  const { t } = useLanguage();

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* For Seekers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl gradient-primary p-8 sm:p-10"
          >
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-foreground/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-primary-foreground/20 flex items-center justify-center mb-6">
                <Home className="w-7 h-7 text-primary-foreground" />
              </div>
              
              <h3 className="text-2xl sm:text-3xl font-bold text-primary-foreground mb-3">
                {t("cta.seekerTitle")}
              </h3>
              <p className="text-primary-foreground/80 mb-6 max-w-md">
                {t("cta.seekerDesc")}
              </p>
              
              <Link to="/search">
                <Button
                  variant="secondary"
                  size="lg"
                  className="gap-2 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                >
                  <Sparkles className="w-5 h-5" />
                  {t("cta.seekerBtn")}
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* For Owners */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="relative overflow-hidden rounded-3xl bg-card border border-border p-8 sm:p-10"
          >
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
                <Plus className="w-7 h-7 text-accent" />
              </div>
              
              <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
                {t("cta.ownerTitle")}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                {t("cta.ownerDesc")}
              </p>
              
              <Link to="/create-listing">
                <Button variant="accent" size="lg" className="gap-2">
                  <Plus className="w-5 h-5" />
                  {t("cta.ownerBtn")}
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
