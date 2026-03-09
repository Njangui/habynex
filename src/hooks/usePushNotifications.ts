import { useEffect, useCallback, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { registerServiceWorker } from "@/services/serviceWorkerManager";
import {
  subscribeToPush as subscribeToPushService,
  requestNotificationPermission,
  unsubscribeFromPush,
  checkExistingSubscription,
} from "@/services/pushNotifications";
import { updateAppBadge, fetchUnreadCount } from "@/services/notificationService";

// Types
interface NotificationPreferences {
  push_new_message?: boolean;
  push_new_inquiry?: boolean;
  [key: string]: boolean | undefined;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permissionState, setPermissionState] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window 
      ? Notification.permission 
      : "default"
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Refs pour cleanup
  const channelsRef = useRef<any[]>([]);
  const isMountedRef = useRef(true);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Nettoyer tous les channels
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel).catch(console.error);
      });
      channelsRef.current = [];
    };
  }, []);

  // Register service worker on mount
  useEffect(() => {
    const init = async () => {
      try {
        await registerServiceWorker();
        
        // Vérifier si déjà abonné
        if (user && "PushManager" in window) {
          const existing = await checkExistingSubscription(user.id);
          if (isMountedRef.current) {
            setIsSubscribed(!!existing);
          }
        }
      } catch (error) {
        console.error("[push] SW registration failed:", error);
      }
    };
    
    init();
  }, [user]);

  // Subscribe to push avec gestion d'erreur
  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    if (!user) {
      toast.error("Vous devez être connecté");
      return false;
    }

    if (!("PushManager" in window)) {
      toast.error("Les notifications push ne sont pas supportées par votre navigateur");
      return false;
    }

    setIsLoading(true);
    try {
      const success = await subscribeToPushService(user.id);
      
      if (isMountedRef.current) {
        setIsSubscribed(success);
      }
      
      return success;
    } catch (error: any) {
      console.error("[push] Subscription error:", error);
      toast.error("Erreur lors de l'activation des notifications");
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [user]);

  // Unsubscribe
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    setIsLoading(true);
    try {
      const success = await unsubscribeFromPush(user.id);
      
      if (isMountedRef.current) {
        setIsSubscribed(!success);
      }
      
      if (success) {
        toast.success("Notifications désactivées");
      }
      
      return success;
    } catch (error: any) {
      console.error("[push] Unsubscribe error:", error);
      toast.error("Erreur lors de la désactivation");
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [user]);

  // Request permission + subscribe
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Les notifications ne sont pas supportées.");
      return false;
    }

    setIsLoading(true);
    try {
      const result = await requestNotificationPermission();
      
      if (isMountedRef.current) {
        setPermissionState(result);
      }

      if (result === "granted") {
        const success = await subscribeToPush();
        if (success) {
          toast.success("Notifications activées !");
        } else {
          toast.error("Permission accordée mais l'enregistrement a échoué.");
        }
        return success;
      }

      if (result === "denied") {
        toast.error("Notifications bloquées. Activez-les dans les paramètres du navigateur.");
      }

      return false;
    } catch (error: any) {
      console.error("[push] Permission error:", error);
      toast.error("Erreur lors de la demande de permission");
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [subscribeToPush]);

  // Auto-subscribe quand permission déjà accordée (vérifier doublon)
  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    if (!("Notification" in window) || !("PushManager" in window)) return;
    
    if (Notification.permission === "granted" && !isSubscribed) {
      // Vérifier si déjà abonné côté serveur avant de resubscribe
      checkExistingSubscription(user.id).then(existing => {
        if (!existing && isMountedRef.current) {
          subscribeToPush();
        }
      });
    }
  }, [user, isSubscribed, subscribeToPush]);

  // Récupérer les préférences utilisateur
  const fetchPreferences = useCallback(async (): Promise<NotificationPreferences | null> => {
    if (!user) return null;
    
    const { data, error } = await supabase
      .from("notification_preferences")
      .select("push_new_message, push_new_inquiry")
      .eq("user_id", user.id)
      .single();
    
    if (error) {
      console.warn("[push] Preferences fetch error:", error.message);
      return null;
    }
    
    return data;
  }, [user]);

  // Badge management via realtime
  useEffect(() => {
    if (!user) return;

    const refresh = async () => {
      try {
        const count = await fetchUnreadCount(user.id);
        if (isMountedRef.current) {
          updateAppBadge(count);
        }
      } catch (error) {
        console.error("[push] Badge refresh error:", error);
      }
    };

    refresh();

    const channel = supabase
      .channel(`badge-${user.id}`)
      .on(
        "postgres_changes",
        { 
          event: "INSERT", 
          schema: "public", 
          table: "notification_history", 
          filter: `user_id=eq.${user.id}` 
        },
        () => refresh()
      )
      .subscribe();

    channelsRef.current.push(channel);

    return () => {
      supabase.removeChannel(channel).catch(console.error);
      channelsRef.current = channelsRef.current.filter(c => c !== channel);
    };
  }, [user]);

  // Realtime toast for new messages (avec filtre préférences + visibilité)
  useEffect(() => {
    if (!user) return;

    const handleNewMessage = async (payload: any) => {
      // Ne pas notifier si l'app est active
      if (document.visibilityState === "visible") return;
      
      const msg = payload.new as any;
      if (msg.sender_id === user.id) return;

      // Vérifier préférences
      const prefs = await fetchPreferences();
      if (prefs?.push_new_message === false) return;

      const { data: conv, error } = await supabase
        .from("conversations")
        .select("tenant_id, owner_id")
        .eq("id", msg.conversation_id)
        .single();

      if (error || !conv) return;
      if (conv.tenant_id !== user.id && conv.owner_id !== user.id) return;

      // Notification native si supportée, sinon toast
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("💬 Nouveau message", {
          body: msg.content?.substring(0, 100) || "Vous avez reçu un message",
          icon: "/icon-192x192.png",
          badge: "/badge-72x72.png",
          tag: `msg-${msg.conversation_id}`,
          data: { url: `/messages?conversation=${msg.conversation_id}` },
        });
      } else {
        toast.info("💬 Nouveau message", {
          description: msg.content?.substring(0, 100) || "Vous avez reçu un message",
        });
      }
    };

    const channel = supabase
      .channel(`messages-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        handleNewMessage
      )
      .subscribe();

    channelsRef.current.push(channel);

    return () => {
      supabase.removeChannel(channel).catch(console.error);
      channelsRef.current = channelsRef.current.filter(c => c !== channel);
    };
  }, [user, fetchPreferences]);

  // Realtime toast for inquiries (avec filtre préférences + visibilité)
  useEffect(() => {
    if (!user) return;

    const handleNewInquiry = async (payload: any) => {
      // Ne pas notifier si l'app est active
      if (document.visibilityState === "visible") return;
      
      const inquiry = payload.new as any;
      
      // Vérifier préférences
      const prefs = await fetchPreferences();
      if (prefs?.push_new_inquiry === false) return;

      const { data: prop, error } = await supabase
        .from("properties")
        .select("title, owner_id")
        .eq("id", inquiry.property_id)
        .single();

      if (error || !prop || prop.owner_id !== user.id) return;

      // Notification native si supportée
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("📩 Nouvelle demande", {
          body: `${inquiry.sender_name} - "${prop.title}"`,
          icon: "/icon-192x192.png",
          badge: "/badge-72x72.png",
          tag: `inquiry-${inquiry.id}`,
          data: { url: "/dashboard" },
        });
      } else {
        toast.info("📩 Nouvelle demande", {
          description: `${inquiry.sender_name} - "${prop.title}"`,
        });
      }
    };

    const channel = supabase
      .channel(`inquiries-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "property_inquiries" },
        handleNewInquiry
      )
      .subscribe();

    channelsRef.current.push(channel);

    return () => {
      supabase.removeChannel(channel).catch(console.error);
      channelsRef.current = channelsRef.current.filter(c => c !== channel);
    };
  }, [user, fetchPreferences]);

  return {
    requestPermission,
    unsubscribe,
    permissionState,
    isSubscribed,
    isLoading,
    updateBadge: updateAppBadge,
    subscribeToPush,
  };
};