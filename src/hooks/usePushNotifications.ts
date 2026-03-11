// src/hooks/usePushNotifications.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { registerServiceWorker, updateSWBadge } from "@/services/serviceWorkerManager";
import { checkExistingSubscription, unsubscribeFromPush } from "@/services/pushNotifications";

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permissionState, setPermissionState] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const channelsRef = useRef<any[]>([]);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      channelsRef.current.forEach((ch) => supabase.removeChannel(ch).catch(console.error));
      channelsRef.current = [];
    };
  }, []);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Vérifie l'abonnement existant
  useEffect(() => {
    if (!user) return;
    (async () => {
      const sub = await checkExistingSubscription(user.id);
      if (isMountedRef.current) setIsSubscribed(!!sub);
    })();
  }, [user]);

  // Convertit base64 en Uint8Array
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  };

  // S'abonner aux push
  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    if (!user) {
      toast.error("Vous devez être connecté");
      return false;
    }
    if (!("PushManager" in window)) {
      toast.error("Les notifications push ne sont pas supportées");
      return false;
    }

    setIsLoading(true);
    try {
      const permissionResult = await Notification.requestPermission();
      if (isMountedRef.current) setPermissionState(permissionResult);
      if (permissionResult !== "granted") {
        toast.error("Permission refusée");
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
      });

      const p256dhKey = sub.getKey("p256dh");
      const authKey = sub.getKey("auth");
      if (!p256dhKey || !authKey) throw new Error("Failed to get subscription keys");

      const p256dh = btoa(String.fromCharCode(...new Uint8Array(p256dhKey)));
      const auth = btoa(String.fromCharCode(...new Uint8Array(authKey)));

      const { error } = await supabase
        .from("push_subscriptions")
        .upsert({ user_id: user.id, endpoint: sub.endpoint, p256dh, auth }, { onConflict: "user_id,endpoint" });

      if (error) {
        await sub.unsubscribe();
        throw error;
      }

      if (isMountedRef.current) setIsSubscribed(true);
      toast.success("Notifications activées !");
      return true;
    } catch (error: any) {
      console.error("Subscribe error:", error);
      toast.error("Erreur lors de l'activation");
      return false;
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [user]);

  // Se désabonner
  const handleUnsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    setIsLoading(true);
    try {
      const success = await unsubscribeFromPush(user.id);
      if (success && isMountedRef.current) setIsSubscribed(false);
      return success;
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [user]);

  // Récupérer les préférences
  const fetchPreferences = useCallback(async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("notification_preferences")
      .select("push_new_message, push_new_inquiry")
      .eq("user_id", user.id)
      .single();
    if (error) console.warn("Preferences fetch error:", error.message);
    return data;
  }, [user]);

  // Notifications Realtime pour messages
  useEffect(() => {
    if (!user) return;

    const handleNewMessage = async (payload: any) => {
      if (document.visibilityState === "visible") return;
      const msg = payload.new;
      if (msg.sender_id === user.id) return;

      const prefs = await fetchPreferences();
      if (prefs?.push_new_message === false) return;

      const { data: conv } = await supabase.from("conversations").select("tenant_id, owner_id").eq("id", msg.conversation_id).single();
      if (!conv || (conv.tenant_id !== user.id && conv.owner_id !== user.id)) return;

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("💬 Nouveau message", {
          body: msg.content?.substring(0, 100) || "Nouveau message",
          icon: "/icon-192x192.png",
          tag: `msg-${msg.conversation_id}`,
          data: { url: `/messages?conversation=${msg.conversation_id}` },
        });
      } else {
        toast.info("💬 Nouveau message", { description: msg.content?.substring(0, 100) });
      }
      updateSWBadge();
    };

    const channel = supabase.channel(`messages-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, handleNewMessage)
      .subscribe();

    channelsRef.current.push(channel);
    return () => supabase.removeChannel(channel).catch(console.error);
  }, [user, fetchPreferences]);

  // Notifications Realtime pour demandes
  useEffect(() => {
    if (!user) return;

    const handleNewInquiry = async (payload: any) => {
      if (document.visibilityState === "visible") return;
      const inquiry = payload.new;

      const prefs = await fetchPreferences();
      if (prefs?.push_new_inquiry === false) return;

      const { data: prop } = await supabase.from("properties").select("title, owner_id").eq("id", inquiry.property_id).single();
      if (!prop || prop.owner_id !== user.id) return;

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("📩 Nouvelle demande", {
          body: `${inquiry.sender_name} - "${prop.title}"`,
          icon: "/icon-192x192.png",
          tag: `inquiry-${inquiry.id}`,
          data: { url: "/dashboard" },
        });
      } else {
        toast.info("📩 Nouvelle demande", { description: `${inquiry.sender_name} - "${prop.title}"` });
      }
      updateSWBadge();
    };

    const channel = supabase.channel(`inquiries-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "property_inquiries" }, handleNewInquiry)
      .subscribe();

    channelsRef.current.push(channel);
    return () => supabase.removeChannel(channel).catch(console.error);
  }, [user, fetchPreferences]);

  return {
    permissionState,
    isSubscribed,
    isLoading,
    subscribeToPush,
    unsubscribe: handleUnsubscribe,
  };
};