import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { unsubscribeFromPush } from "@/services/pushNotifications";
import { useState } from "react";
import { toast } from "sonner";

export const NotificationActivateButton = () => {
  const { requestPermission, permissionState, subscribeToPush } = usePushNotifications();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleDisable = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await unsubscribeFromPush(user.id);
      toast.success(language === "fr" ? "Notifications désactivées" : "Notifications disabled");
    } catch (err) {
      console.error("Error disabling notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async () => {
    setLoading(true);
    try {
      if (permissionState === "granted") {
        await subscribeToPush();
        toast.success(language === "fr" ? "Notifications réactivées !" : "Notifications re-enabled!");
      } else {
        await requestPermission();
      }
    } finally {
      setLoading(false);
    }
  };

  if (permissionState === "granted") {
    return (
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="gap-2" disabled>
          <BellRing className="w-4 h-4 text-accent" />
          {language === "fr" ? "Notifications activées" : "Notifications enabled"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDisable}
          disabled={loading}
          className="text-muted-foreground"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellOff className="w-4 h-4" />}
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
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={handleEnable}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Bell className="w-4 h-4" />
      )}
      {loading
        ? "..."
        : language === "fr" ? "🔔 Activer les notifications" : "🔔 Enable notifications"
      }
    </Button>
  );
};
