import { useEffect, useCallback, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";


// ======================================================
// UTILS
// ======================================================

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);

  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};


// ======================================================
// SERVICE WORKER
// ======================================================

const registerServiceWorker = async () => {
  if (!("serviceWorker" in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register("/service-worker.js");

    console.log("✅ Service Worker registered:", registration.scope);

    return registration;
  } catch (error) {
    console.error("❌ Service Worker error:", error);
    return null;
  }
};


// ======================================================
// HOOK
// ======================================================

export const usePushNotifications = () => {

  const { user } = useAuth();

  const channelsRef = useRef<any[]>([]);

  const [permissionState, setPermissionState] =
    useState<NotificationPermission>(
      typeof window !== "undefined" && "Notification" in window
        ? Notification.permission
        : "default"
    );


  // ======================================================
  // REGISTER SERVICE WORKER
  // ======================================================

  useEffect(() => {
    registerServiceWorker();
  }, []);


  // ======================================================
  // PUSH SUBSCRIPTION
  // ======================================================

  const subscribeToPush = useCallback(async () => {

    if (!user) return;

    try {

      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

      if (!vapidKey) {
        console.warn("⚠️ Missing VAPID key");
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      // check existing subscription
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey)
        });

      }

      await supabase
        .from("user_push_tokens")
        .upsert({
          user_id: user.id,
          subscription
        });

      console.log("✅ Push subscription saved");

    } catch (error) {

      console.error("❌ Push subscription failed:", error);

    }

  }, [user]);


  // ======================================================
  // REQUEST PERMISSION
  // ======================================================

  const requestPermission = useCallback(async () => {

    if (!("Notification" in window)) return false;

    const permission = await Notification.requestPermission();

    setPermissionState(permission);

    if (permission === "granted") {

      await subscribeToPush();

      toast.success("🔔 Notifications activées");

      return true;
    }

    toast.warning("Notifications refusées");

    return false;

  }, [subscribeToPush]);


  // ======================================================
  // AUTO REQUEST
  // ======================================================

  useEffect(() => {

    if (!user) return;

    if (permissionState === "default") {
      requestPermission();
    }

  }, [user, permissionState, requestPermission]);


  // ======================================================
  // BADGE
  // ======================================================

  const updateBadge = useCallback((count: number) => {

    if ("setAppBadge" in navigator) {
      (navigator as any).setAppBadge(count);
    }

  }, []);


  // ======================================================
  // CHANNEL CLEANUP
  // ======================================================

  const cleanupChannels = () => {

    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });

    channelsRef.current = [];

  };


  // ======================================================
  // REALTIME LISTENERS
  // ======================================================

  useEffect(() => {

    if (!user) return;

    cleanupChannels();


    // ==================================================
    // NEW MESSAGE
    // ==================================================

    const messageChannel = supabase
      .channel("messages-listener")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async ({ new: msg }: any) => {

          if (msg.sender_id === user.id) return;

          const { data: sender } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", msg.sender_id)
            .single();

          const senderName = sender?.full_name ?? "Utilisateur";

          toast.info(`💬 Nouveau message`, {
            description: `${senderName}: ${msg.content?.slice(0, 80)}`
          });

        }
      )
      .subscribe();

    channelsRef.current.push(messageChannel);



    // ==================================================
    // NEW INQUIRY
    // ==================================================

    const inquiryChannel = supabase
      .channel("inquiry-listener")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "property_inquiries" },
        async ({ new: inquiry }: any) => {

          const { data: property } = await supabase
            .from("properties")
            .select("title, owner_id")
            .eq("id", inquiry.property_id)
            .single();

          if (!property || property.owner_id !== user.id) return;

          toast.info("📩 Nouvelle demande", {
            description: `Propriété: ${property.title}`
          });

        }
      )
      .subscribe();

    channelsRef.current.push(inquiryChannel);



    // ==================================================
    // NEW REVIEW
    // ==================================================

    const reviewChannel = supabase
      .channel("review-listener")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "property_reviews" },
        async ({ new: review }: any) => {

          const { data: property } = await supabase
            .from("properties")
            .select("title, owner_id")
            .eq("id", review.property_id)
            .single();

          if (!property || property.owner_id !== user.id) return;

          const stars = "⭐".repeat(review.rating);

          toast.success(`Nouvel avis`, {
            description: `${stars} sur "${property.title}"`
          });

        }
      )
      .subscribe();

    channelsRef.current.push(reviewChannel);



    // ==================================================
    // VERIFICATION STATUS
    // ==================================================

    const verificationChannel = supabase
      .channel("verification-listener")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_verifications",
          filter: `user_id=eq.${user.id}`
        },
        ({ new: newData, old: oldData }: any) => {

          if (
            oldData.level_2_status !== "approved" &&
            newData.level_2_status === "approved"
          ) {

            toast.success("✅ Vérification approuvée");

          }

          if (
            oldData.level_2_status !== "rejected" &&
            newData.level_2_status === "rejected"
          ) {

            toast.error("❌ Vérification refusée");

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
    updateBadge
  };

};