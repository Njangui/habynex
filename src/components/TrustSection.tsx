import { motion } from "framer-motion";
import { Shield, Users, Star, Award, CheckCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const TrustSection = () => {
  const { t } = useLanguage();

  const stats = [
    { icon: Users, value: "10,000+", labelKey: "trust.activeUsers" },
    { icon: Shield, value: "100%", labelKey: "trust.secureTransactions" },
    { icon: Star, value: "4.9/5", labelKey: "trust.averageRating" },
    { icon: Award, value: "500+", labelKey: "trust.verifiedOwners" },
  ];

  const features = [
    "trust.feature1",
    "trust.feature2",
    "trust.feature3",
    "trust.feature4",
    "trust.feature5",
    "trust.feature6",
  ];

  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-4">
              <Shield className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">{t("trust.badge")}</span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              {t("trust.title")}
            </h2>
            
            <p className="text-muted-foreground mb-8">
              {t("trust.subtitle")}
            </p>

            {/* Features List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map((featureKey, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5 text-accent shrink-0" />
                  <span className="text-foreground">{t(featureKey)}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-4"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.labelKey}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-2xl p-6 shadow-sm border border-border text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{t(stat.labelKey)}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
