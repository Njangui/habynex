import { useEffect, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const registerServiceWorker = async () => {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/service-worker.js");
      console.log("Service worker registered", registration.scope);
      return registration;
    } catch (e) {
      console.warn("Service worker registration failed:", e);
    }
  }
  return null;
};

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permissionState, setPermissionState] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );

  // Register service worker on mount
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Subscribe to push and save subscription to DB
  const subscribeToPush = useCallback(async () => {
    if (!user) return false;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const reg = registration as any;
      let subscription = await reg.pushManager?.getSubscription();

      if (!subscription && reg.pushManager) {
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          console.error("VAPID public key is missing");
          return false;
        }
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      if (!subscription) {
        // PushManager not available (e.g. iOS without standalone mode)
        // Save a basic token for identification
        const deviceType = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? "mobile" : "web";
        const tokenId = `${deviceType}-${navigator.userAgent.slice(0, 80)}`;
        await supabase.from("user_push_tokens" as any).upsert(
          {
            user_id: user.id,
            token: tokenId,
            device_type: deviceType,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,token" }
        );
        return true;
      }

      // Save subscription JSON to database
      const subscriptionJson = subscription.toJSON();
      const deviceType = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? "mobile" : "web";

      await supabase.from("user_push_tokens" as any).upsert(
        {
          user_id: user.id,
          token: subscription.endpoint,
          subscription: subscriptionJson,
          device_type: deviceType,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,token" }
      );

      return true;
    } catch (error) {
      console.error("Push subscription error:", error);
      return false;
    }
  }, [user]);

  // Request permission - called on page load after delay or by button
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      toast.error("Les notifications ne sont pas supportées sur ce navigateur.");
      return false;
    }
    if (Notification.permission === "granted") {
      setPermissionState("granted");
      await subscribeToPush();
      return true;
    }
    if (Notification.permission === "denied") {
      setPermissionState("denied");
      return false;
    }
    const result = await Notification.requestPermission();
    setPermissionState(result);
    if (result === "granted") {
      await subscribeToPush();
      toast.success("Notifications activées !");
    }
    return result === "granted";
  }, [subscribeToPush]);

  // Auto-request permission after 3 seconds if user is logged in
  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "default") {
      // If already granted, make sure we subscribe
      if (Notification.permission === "granted") {
        subscribeToPush();
      }
      return;
    }

    const timer = setTimeout(() => {
      requestPermission();
    }, 3000);

    return () => clearTimeout(timer);
  }, [user, requestPermission, subscribeToPush]);

  // Badge management
  const updateBadge = useCallback((count: number) => {
    if ("setAppBadge" in navigator) {
      if (count > 0) {
        (navigator as any).setAppBadge(count).catch(console.error);
      } else {
        (navigator as any).clearAppBadge?.().catch(console.error);
      }
    }
  }, []);

  // Listen for unread notification count to update badge
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from("notification_history")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (count != null) updateBadge(count);
    };

    fetchUnreadCount();

    const channel = supabase
      .channel("badge-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notification_history", filter: `user_id=eq.${user.id}` },
        () => fetchUnreadCount()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, updateBadge]);

  // Realtime listeners for in-app toasts (when app is open)
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

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("push-verification")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "user_verifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;

          if (oldData.level_2_status !== "approved" && newData.level_2_status === "approved") {
            toast.success("✅ Identité approuvée", {
              description: "Votre identité a été vérifiée avec succès.",
            });
          }
          if (oldData.level_2_status !== "rejected" && newData.level_2_status === "rejected") {
            toast.error("❌ Identité rejetée", {
              description: "Veuillez resoumettre vos documents.",
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return { requestPermission, permissionState, updateBadge };
};
