import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useLanguage } from "@/contexts/LanguageContext";

export const NotificationActivateButton = () => {
  const { requestPermission, permissionState } = usePushNotifications();
  const { language } = useLanguage();

  if (permissionState === "granted") {
    return (
      <Button variant="outline" size="sm" className="gap-2" disabled>
        <BellRing className="w-4 h-4 text-green-500" />
        {language === "fr" ? "Notifications activées" : "Notifications enabled"}
      </Button>
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
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={requestPermission}
    >
      <Bell className="w-4 h-4" />
      {language === "fr" ? "🔔 Activer les notifications" : "🔔 Enable notifications"}
    </Button>
  );
};
