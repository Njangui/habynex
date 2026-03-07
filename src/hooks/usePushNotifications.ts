import { useEffect, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { registerServiceWorker } from "@/services/serviceWorkerManager";
import {
  subscribeToPush as subscribeToPushService,
  requestNotificationPermission,
  unsubscribeFromPush,
} from "@/services/pushNotifications";
import { updateAppBadge, fetchUnreadCount } from "@/services/notificationService";

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permissionState, setPermissionState] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );

  // Register service worker on mount
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Subscribe to push
  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    return subscribeToPushService(user.id);
  }, [user]);

  // Request permission + subscribe
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      toast.error("Les notifications ne sont pas supportées.");
      return false;
    }

    const result = await requestNotificationPermission();
    setPermissionState(result);

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
  }, [subscribeToPush]);

  // Auto-subscribe when permission already granted (no auto-request)
  useEffect(() => {
    if (!user || typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted") {
      subscribeToPush();
    }
  }, [user, subscribeToPush]);

  // Badge management via realtime
  useEffect(() => {
    if (!user) return;

    const refresh = async () => {
      const count = await fetchUnreadCount(user.id);
      updateAppBadge(count);
    };

    refresh();

    const channel = supabase
      .channel("badge-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notification_history", filter: `user_id=eq.${user.id}` },
        () => refresh()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Realtime toast for new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("push-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const msg = payload.new as any;
          if (msg.sender_id === user.id) return;

          const { data: conv } = await supabase
            .from("conversations")
            .select("tenant_id, owner_id")
            .eq("id", msg.conversation_id)
            .single();

          if (!conv) return;
          if (conv.tenant_id !== user.id && conv.owner_id !== user.id) return;

          toast.info("💬 Nouveau message", {
            description: msg.content?.substring(0, 100) || "Vous avez reçu un message",
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Realtime toast for inquiries
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("push-inquiries")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "property_inquiries" },
        async (payload) => {
          const inquiry = payload.new as any;
          const { data: prop } = await supabase
            .from("properties")
            .select("title, owner_id")
            .eq("id", inquiry.property_id)
            .single();

          if (!prop || prop.owner_id !== user.id) return;

          toast.info("📩 Nouvelle demande", {
            description: `${inquiry.sender_name} - "${prop.title}"`,
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return { requestPermission, permissionState, updateBadge: updateAppBadge, subscribeToPush };
};
