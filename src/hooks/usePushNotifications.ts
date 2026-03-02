import { useEffect, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type NotificationType =
  | "new_matching_property"
  | "new_message"
  | "visit_accepted"
  | "visit_reminder"
  | "new_contact"
  | "new_review"
  | "identity_approved"
  | "identity_rejected";

interface NotificationPayload {
  type: NotificationType;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

const showBrowserNotification = (title: string, body: string, onClick?: () => void) => {
  if (Notification.permission !== "granted") return;
  const notification = new Notification(title, {
    body,
    icon: "/favicon.png",
    badge: "/favicon.png",
  });
  if (onClick) {
    notification.onclick = () => {
      window.focus();
      onClick();
      notification.close();
    };
  }
};

const saveNotification = async (
  userId: string,
  payload: NotificationPayload
) => {
  await supabase.from("notification_history").insert([{
    user_id: userId,
    notification_type: payload.type,
    channel: "push",
    title: payload.title,
    content: payload.content,
    metadata: (payload.metadata || {}) as any,
  }]);
};

// Register service worker
const registerServiceWorker = async () => {
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("/service-worker.js");
    } catch (e) {
      console.warn("Service worker registration failed:", e);
    }
  }
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

  // Request permission manually (user-triggered only)
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      toast.error("Les notifications ne sont pas supportées sur ce navigateur.");
      return false;
    }
    if (Notification.permission === "granted") {
      setPermissionState("granted");
      return true;
    }
    if (Notification.permission === "denied") {
      toast.error("Les notifications sont bloquées. Activez-les dans les paramètres de votre navigateur.");
      setPermissionState("denied");
      return false;
    }
    const result = await Notification.requestPermission();
    setPermissionState(result);
    if (result === "granted" && user) {
      // Save token in DB
      await saveToken();
      toast.success("Notifications activées !");
    }
    return result === "granted";
  }, [user]);

  const saveToken = useCallback(async () => {
    if (!user) return;
    const deviceType = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? "mobile" : "web";
    // Use a simple identifier since we don't have real push tokens without a push service
    const tokenId = `${deviceType}-${navigator.userAgent.slice(0, 50)}`;
    
    await supabase.from("user_push_tokens" as any).upsert({
      user_id: user.id,
      token: tokenId,
      device_type: deviceType,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,token" });
  }, [user]);

  // Listen for new messages
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
            .select("tenant_id, owner_id, property_id")
            .eq("id", msg.conversation_id)
            .single();

          if (!conv) return;
          if (conv.tenant_id !== user.id && conv.owner_id !== user.id) return;

          const notification: NotificationPayload = {
            type: "new_message",
            title: "Nouveau message",
            content: msg.content?.substring(0, 100) || "Vous avez reçu un nouveau message",
            metadata: { conversation_id: msg.conversation_id, property_id: conv.property_id },
          };

          toast.info(notification.title, { description: notification.content });
          showBrowserNotification(notification.title, notification.content, () => {
            window.location.href = `/messages?conversation=${msg.conversation_id}`;
          });
          saveNotification(user.id, notification);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Listen for new inquiries
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

          const notification: NotificationPayload = {
            type: "new_contact",
            title: "Nouvelle demande de contact",
            content: `${inquiry.sender_name} vous contacte pour "${prop.title}"`,
            metadata: { property_id: inquiry.property_id },
          };

          toast.info(notification.title, { description: notification.content });
          showBrowserNotification(notification.title, notification.content, () => {
            window.location.href = "/dashboard";
          });
          saveNotification(user.id, notification);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Listen for new reviews
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("push-reviews")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "property_reviews" },
        async (payload) => {
          const review = payload.new as any;
          const { data: prop } = await supabase
            .from("properties")
            .select("title, owner_id")
            .eq("id", review.property_id)
            .single();

          if (!prop || prop.owner_id !== user.id) return;

          const notification: NotificationPayload = {
            type: "new_review",
            title: "Nouvel avis reçu",
            content: `Votre bien "${prop.title}" a reçu un avis (${review.rating}/5)`,
            metadata: { property_id: review.property_id },
          };

          toast.info(notification.title, { description: notification.content });
          showBrowserNotification(notification.title, notification.content);
          saveNotification(user.id, notification);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Listen for identity verification changes
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
            const notification: NotificationPayload = {
              type: "identity_approved",
              title: "Identité approuvée ✅",
              content: "Votre identité a été vérifiée. Vos annonces sont maintenant visibles.",
            };
            toast.success(notification.title, { description: notification.content });
            showBrowserNotification(notification.title, notification.content);
            saveNotification(user.id, notification);
          }

          if (oldData.level_2_status !== "rejected" && newData.level_2_status === "rejected") {
            const notification: NotificationPayload = {
              type: "identity_rejected",
              title: "Identité rejetée ❌",
              content: "Votre vérification d'identité a été rejetée. Veuillez resoumettre vos documents.",
            };
            toast.error(notification.title, { description: notification.content });
            showBrowserNotification(notification.title, notification.content, () => {
              window.location.href = "/identity-verification";
            });
            saveNotification(user.id, notification);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Periodic check for matching properties (seekers only)
  const checkMatchingProperties = useCallback(async () => {
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("city, preferred_property_types, budget_min, budget_max, user_type")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.user_type !== "seeker") return;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    let query = supabase
      .from("properties")
      .select("id, title, city, price, property_type")
      .eq("is_published", true)
      .eq("is_available", true)
      .gte("created_at", oneHourAgo);

    if (profile.city) query = query.eq("city", profile.city);
    if (profile.budget_max) query = query.lte("price", profile.budget_max);

    const { data: newProps } = await query.limit(3);

    if (newProps && newProps.length > 0) {
      const matchingTypes = profile.preferred_property_types || [];
      const matches = newProps.filter(
        (p) => matchingTypes.length === 0 || matchingTypes.includes(p.property_type)
      );

      if (matches.length > 0) {
        const notification: NotificationPayload = {
          type: "new_matching_property",
          title: `${matches.length} nouveau(x) bien(s) correspondant(s)`,
          content: matches.map((m) => m.title).join(", ").substring(0, 120),
          metadata: { property_ids: matches.map((m) => m.id) },
        };

        toast.info(notification.title, { description: notification.content });
        showBrowserNotification(notification.title, notification.content, () => {
          window.location.href = "/search";
        });
        saveNotification(user.id, notification);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    
    const checkIfSeeker = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("user_id", user.id)
        .single();
      
      if (profile?.user_type !== "seeker") return;
      
      const interval = setInterval(checkMatchingProperties, 30 * 60 * 1000);
      const timeout = setTimeout(checkMatchingProperties, 10000);
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    };
    
    checkIfSeeker();
  }, [user, checkMatchingProperties]);

  return { requestPermission, permissionState };
};
