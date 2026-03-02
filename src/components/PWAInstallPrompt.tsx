import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    // Check if already installed or dismissed
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone === true;
    const wasDismissed = localStorage.getItem("pwa-install-dismissed");

    if (isStandalone || wasDismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    
    // For iOS - show manual instructions after 3 seconds
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS && !isStandalone) {
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  if (!showBanner || dismissed) return null;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-card border-t border-border shadow-lg animate-in slide-in-from-bottom">
      <div className="container mx-auto flex items-center gap-4">
        <div className="p-2 rounded-xl bg-primary/10">
          <Download className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm">
            {language === "fr" ? "Installer Habynex" : "Install Habynex"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isIOS
              ? (language === "fr"
                ? "Appuyez sur Partager puis 'Sur l'écran d'accueil'"
                : "Tap Share then 'Add to Home Screen'")
              : (language === "fr"
                ? "Installez l'app pour une meilleure expérience"
                : "Install the app for a better experience")}
          </p>
        </div>
        {!isIOS && deferredPrompt && (
          <Button size="sm" onClick={handleInstall} className="shrink-0">
            {language === "fr" ? "Installer" : "Install"}
          </Button>
        )}
        <button onClick={handleDismiss} className="p-1 rounded-full hover:bg-secondary">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};
