import { motion } from "framer-motion";
import { Search, MessageCircle, CalendarCheck, Key, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const HowItWorks = () => {
  const { t } = useLanguage();

  const steps = [
    {
      icon: Search,
      titleKey: "hiw.step1Title",
      descKey: "hiw.step1Desc",
      color: "primary",
    },
    {
      icon: MessageCircle,
      titleKey: "hiw.step2Title",
      descKey: "hiw.step2Desc",
      color: "accent",
    },
    {
      icon: CalendarCheck,
      titleKey: "hiw.step3Title",
      descKey: "hiw.step3Desc",
      color: "gold",
    },
    {
      icon: Key,
      titleKey: "hiw.step4Title",
      descKey: "hiw.step4Desc",
      color: "success",
    },
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {t("hiw.title")}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t("hiw.subtitle")}
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative max-w-5xl mx-auto">
          {/* Connection Line */}
          <div className="absolute top-16 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-accent to-gold hidden lg:block" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.titleKey}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative text-center"
              >
                {/* Step Number */}
                <div className="relative z-10 inline-flex items-center justify-center w-32 h-32 rounded-2xl bg-card shadow-elegant border border-border mb-6">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                    step.color === 'primary' ? 'bg-primary/10' :
                    step.color === 'accent' ? 'bg-accent/10' :
                    step.color === 'gold' ? 'bg-gold/10' :
                    'bg-success/10'
                  }`}>
                    <step.icon className={`w-8 h-8 ${
                      step.color === 'primary' ? 'text-primary' :
                      step.color === 'accent' ? 'text-accent' :
                      step.color === 'gold' ? 'text-gold' :
                      'text-success'
                    }`} />
                  </div>
                  <span className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </span>
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-foreground mb-2">{t(step.titleKey)}</h3>
                <p className="text-muted-foreground text-sm">{t(step.descKey)}</p>

                {/* Arrow (mobile) */}
                {index < steps.length - 1 && (
                  <div className="lg:hidden flex justify-center mt-4">
                    <ArrowRight className="w-6 h-6 text-muted-foreground rotate-90 sm:rotate-0" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
