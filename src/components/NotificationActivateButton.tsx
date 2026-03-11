import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useLanguage } from "@/contexts/LanguageContext";

export const NotificationActivateButton = () => {
  const { permissionState, isSubscribed, isLoading, subscribeToPush, unsubscribe } = usePushNotifications();
  const { language } = useLanguage();

  const handleEnable = async () => {
    await subscribeToPush();
  };

  const handleDisable = async () => {
    await unsubscribe();
  };

  if (permissionState === "granted" && isSubscribed) {
    return (
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="gap-2" disabled>
          <BellRing className="w-4 h-4 text-accent" />
          {language === "fr" ? "Notifications activées" : "Notifications enabled"}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDisable} disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellOff className="w-4 h-4" />}
        </Button>
      </div>
    );
  }

  if (permissionState === "denied") {
    return (
      <Button variant="outline" size="sm" className="gap-2" disabled>
        <BellOff className="w-4 h-4 text-destructive" />
        {language === "fr" ? "Notifications bloquées" : "Notifications blocked"}
      </Button>
    );
  }

  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={handleEnable} disabled={isLoading}>
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
      {language === "fr" ? "🔔 Activer les notifications" : "🔔 Enable notifications"}
    </Button>
  );
};