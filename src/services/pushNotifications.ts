import { supabase } from "@/integrations/supabase/client";

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

let cachedVapidKey: string | null = null;

export const getVapidPublicKey = async (): Promise<string | null> => {
  if (cachedVapidKey) return cachedVapidKey;

  try {
    const { data, error } = await supabase.functions.invoke("get-vapid-key");
    if (error || !data?.vapidPublicKey) {
      console.error("[Push] Failed to fetch VAPID key:", error);
      return null;
    }
    cachedVapidKey = data.vapidPublicKey;
    console.log("[Push] VAPID key fetched successfully");
    return cachedVapidKey;
  } catch (err) {
    console.error("[Push] Error fetching VAPID key:", err);
    return null;
  }
};

export const subscribeToPush = async (
  userId: string
): Promise<boolean> => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("[Push] Push not supported");
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const vapidKey = await getVapidPublicKey();
      if (!vapidKey) {
        console.error("[Push] No VAPID key available");
        return false;
      }

      console.log("[Push] Creating new subscription...");
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
      console.log("[Push] Subscription created");
    } else {
      console.log("[Push] Existing subscription found");
    }

    return await saveSubscription(userId, subscription);
  } catch (error) {
    console.error("[Push] Subscribe error:", error);
    return false;
  }
};

export const saveSubscription = async (
  userId: string,
  subscription: PushSubscription
): Promise<boolean> => {
  const subscriptionJson = subscription.toJSON();
  const deviceType = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? "mobile" : "web";
  const token = subscription.endpoint;

  console.log("[Push] Saving subscription for user:", userId);

  const { error } = await supabase.from("user_push_tokens" as any).upsert(
    {
      user_id: userId,
      token,
      subscription: subscriptionJson,
      device_type: deviceType,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,token" }
  );

  if (error) {
    console.error("[Push] Save failed:", error);
    return false;
  }

  console.log("[Push] Subscription saved");
  return true;
};

export const unsubscribeFromPush = async (userId: string): Promise<void> => {
  try {
    // Remove tokens from DB
    await supabase.from("user_push_tokens" as any).delete().eq("user_id", userId);

    // Unsubscribe browser
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
    }

    console.log("[Push] Unsubscribed successfully");
  } catch (err) {
    console.error("[Push] Unsubscribe error:", err);
  }
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  return await Notification.requestPermission();
};
