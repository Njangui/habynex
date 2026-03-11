import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home, Mail, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  const refreshPage = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-xl text-center space-y-8">

        {/* Logo / Branding */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex justify-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Search className="w-10 h-10 text-primary" />
          </div>
        </motion.div>

        {/* Title */}
        <h1 className="text-5xl font-bold text-foreground">
          404
        </h1>

        {/* Message */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">
            Oups… cette page semble introuvable.
          </h2>

          <p className="text-muted-foreground leading-relaxed">
            L’équipe <span className="font-semibold text-primary">Habynex</span>  
            s’excuse pour ce petit problème.  
            La page que vous recherchez n’existe peut-être plus ou l’adresse est incorrecte.
          </p>

          <p className="text-muted-foreground">
            Notre équipe technique travaille constamment à améliorer la plateforme 
            afin de vous offrir la meilleure expérience pour trouver un logement 
            en toute sécurité.
          </p>

          <p className="text-muted-foreground">
            Merci beaucoup pour votre patience et votre compréhension ❤️
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">

          <Link to="/">
            <Button className="gap-2">
              <Home className="w-4 h-4" />
              Retour à l'accueil
            </Button>
          </Link>

          <Link to="/contact">
            <Button variant="outline" className="gap-2">
              <Mail className="w-4 h-4" />
              Nous contacter
            </Button>
          </Link>

          <Button
            variant="ghost"
            className="gap-2"
            onClick={refreshPage}
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser la page
          </Button>

        </div>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground pt-6">
          Si le problème persiste, n'hésitez pas à nous envoyer un message.  
          Nous ferons le nécessaire pour le résoudre rapidement.
        </p>

      </div>
    </div>
  );
};

export default NotFound;