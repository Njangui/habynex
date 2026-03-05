import { useEffect, useCallback, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ================= UTILS =================

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

// ================= SERVICE WORKER =================

const registerServiceWorker = async () => {
  if (!("serviceWorker" in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register(
      "/service-worker.js"
    );

    console.log("✅ Service worker registered", registration.scope);

    return registration;
  } catch (err) {
    console.warn("❌ Service worker registration failed:", err);
    return null;
  }
};

// ================= HOOK =================

export const usePushNotifications = () => {
  const { user } = useAuth();

  const channelsRef = useRef<any[]>([]);

  const [permissionState, setPermissionState] =
    useState<NotificationPermission>(
      typeof window !== "undefined" && "Notification" in window
        ? Notification.permission
        : "default"
    );

  // ================= SERVICE WORKER =================

  useEffect(() => {
    registerServiceWorker();
  }, []);

  // ================= SUBSCRIBE PUSH =================

  const subscribeToPush = useCallback(async () => {
    if (!user) return;

    try {
      const registration = await navigator.serviceWorker.ready;

      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      await supabase.from("user_push_tokens").upsert({
        user_id: user.id,
        subscription,
      });

      console.log("✅ Push subscribed");
    } catch (err) {
      console.error("Push subscription error", err);
    }
  }, [user]);

  // ================= REQUEST PERMISSION =================

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;

    const permission = await Notification.requestPermission();

    setPermissionState(permission);

    if (permission === "granted") {
      await subscribeToPush();
      return true;
    }

    return false;
  }, [subscribeToPush]);

  // ================= AUTO REQUEST =================

  useEffect(() => {
    if (!user) return;

    if (permissionState === "default") {
      requestPermission();
    }
  }, [user, permissionState, requestPermission]);

  // ================= BADGE =================

  const updateBadge = useCallback((count: number) => {
    if ("setAppBadge" in navigator) {
      (navigator as any).setAppBadge(count);
    }
  }, []);

  // ================= CLEAN CHANNELS =================

  const cleanupChannels = () => {
    channelsRef.current.forEach((channel) => {
      supabase.removeChannel(channel);
    });

    channelsRef.current = [];
  };

  // ================= REALTIME LISTENERS =================

  useEffect(() => {
    if (!user) return;

    cleanupChannels();

    // ---------- MESSAGE LISTENER ----------

    const messageChannel = supabase
      .channel("messages-listener")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const msg = payload.new as any;

          if (msg.sender_id === user.id) return;

          const [{ data: conv }, { data: sender }] = await Promise.all([
            supabase
              .from("conversations")
              .select("tenant_id, owner_id, property_id")
              .eq("id", msg.conversation_id)
              .single(),

            supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", msg.sender_id)
              .single(),
          ]);

          if (!conv) return;

          if (conv.tenant_id !== user.id && conv.owner_id !== user.id) return;

          let propertyTitle = "";

          if (conv.property_id) {
            const { data: property } = await supabase
              .from("properties")
              .select("title")
              .eq("id", conv.property_id)
              .single();

            propertyTitle = property?.title
              ? ` à propos de "${property.title}"`
              : "";
          }

          const senderName = sender?.full_name || "Quelqu'un";

          toast.info(`💬 Nouveau message de ${senderName}${propertyTitle}`, {
            description: msg.content?.substring(0, 90),
          });
        }
      )
      .subscribe();

    channelsRef.current.push(messageChannel);

    // ---------- INQUIRIES ----------

    const inquiryChannel = supabase
      .channel("inquiries-listener")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "property_inquiries" },
        async (payload) => {
          const inquiry = payload.new as any;

          const { data: property } = await supabase
            .from("properties")
            .select("title, owner_id")
            .eq("id", inquiry.property_id)
            .single();

          if (!property || property.owner_id !== user.id) return;

          toast.info(`📩 Nouvelle demande`, {
            description: `Pour "${property.title}"`,
          });
        }
      )
      .subscribe();

    channelsRef.current.push(inquiryChannel);

    // ---------- REVIEWS ----------

    const reviewChannel = supabase
      .channel("reviews-listener")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "property_reviews" },
        async (payload) => {
          const review = payload.new as any;

          const { data: property } = await supabase
            .from("properties")
            .select("title, owner_id")
            .eq("id", review.property_id)
            .single();

          if (!property || property.owner_id !== user.id) return;

          const stars = "⭐".repeat(review.rating);

          toast.info(`⭐ Nouvel avis sur "${property.title}"`, {
            description: `${stars} ${review.comment?.substring(0, 80)}`,
          });
        }
      )
      .subscribe();

    channelsRef.current.push(reviewChannel);

    // ---------- VERIFICATION ----------

    const verificationChannel = supabase
      .channel("verification-listener")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_verifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;

          if (
            oldData.level_2_status !== "approved" &&
            newData.level_2_status === "approved"
          ) {
            toast.success("✅ Identité approuvée");
          }

          if (
            oldData.level_2_status !== "rejected" &&
            newData.level_2_status === "rejected"
          ) {
            toast.error("❌ Identité rejetée");
          }
        }
      )
      .subscribe();

    channelsRef.current.push(verificationChannel);

    return cleanupChannels;
  }, [user]);

  return {
    requestPermission,
    permissionState,
    updateBadge,
  };
};