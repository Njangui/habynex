import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { Home, Key, Building2, Megaphone, Calculator, Scale, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const services = [
  {
    icon: Home,
    titleFr: "Achat de maison",
    titleEn: "Home Purchase",
    descFr: "Trouvez et achetez la maison de vos rêves au Cameroun. Nous vous accompagnons de la recherche à la signature.",
    descEn: "Find and buy your dream home in Cameroon. We guide you from search to signing.",
  },
  {
    icon: Key,
    titleFr: "Location",
    titleEn: "Rental",
    descFr: "Louez un appartement, une maison ou un studio. Des milliers d'annonces vérifiées dans toutes les villes.",
    descEn: "Rent an apartment, house or studio. Thousands of verified listings in all cities.",
  },
  {
    icon: Building2,
    titleFr: "Gestion immobilière",
    titleEn: "Property Management",
    descFr: "Confiez-nous la gestion de vos biens. Locataires, maintenance, encaissement – on s'occupe de tout.",
    descEn: "Entrust us with your property management. Tenants, maintenance, payments – we handle it all.",
  },
  {
    icon: Megaphone,
    titleFr: "Promotion immobilière",
    titleEn: "Real Estate Marketing",
    descFr: "Boostez la visibilité de vos biens avec nos outils marketing avancés et notre réseau d'acheteurs.",
    descEn: "Boost your property visibility with our advanced marketing tools and buyer network.",
  },
  {
    icon: Calculator,
    titleFr: "Estimation de bien",
    titleEn: "Property Valuation",
    descFr: "Obtenez une estimation précise de la valeur de votre bien grâce à notre IA et nos experts locaux.",
    descEn: "Get an accurate valuation of your property with our AI and local experts.",
  },
  {
    icon: Scale,
    titleFr: "Assistance juridique",
    titleEn: "Legal Assistance",
    descFr: "Bénéficiez de conseils juridiques pour vos transactions immobilières. Contrats, litiges, réglementations.",
    descEn: "Get legal advice for your real estate transactions. Contracts, disputes, regulations.",
  },
];

const Services = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const fr = language === "fr";

  return (
    <>
      <Helmet>
        <title>{fr ? "Nos Services | Habinex" : "Our Services | Habinex"}</title>
        <meta name="description" content={fr ? "Découvrez tous les services immobiliers Habinex : achat, location, gestion, estimation et assistance juridique." : "Discover all Habinex real estate services: purchase, rental, management, valuation and legal assistance."} />
      </Helmet>

      <main className="min-h-screen bg-background">
        <Navbar />

        {/* Hero */}
        <section className="pt-24 pb-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold text-foreground mb-4"
            >
              {fr ? "Nos Services" : "Our Services"}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
            >
              {fr
                ? "Des solutions complètes pour tous vos besoins immobiliers au Cameroun"
                : "Complete solutions for all your real estate needs in Cameroon"}
            </motion.p>
          </div>
        </section>

        {/* Services Grid */}
        <section className="pb-24 px-4">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-card rounded-xl p-6 shadow-elegant border border-border hover:shadow-lg transition-all group"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <service.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {fr ? service.titleFr : service.titleEn}
                </h3>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  {fr ? service.descFr : service.descEn}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-primary hover:text-primary"
                  onClick={() => navigate("/contact")}
                >
                  {fr ? "Nous contacter" : "Contact us"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        </section>

        <Footer />
      </main>
    </>
  );
};

export default Services;
