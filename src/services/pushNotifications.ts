// src/services/pushNotifications.ts
import { supabase } from "@/integrations/supabase/client";

// Vérifie si un utilisateur a déjà une subscription existante
export const checkExistingSubscription = async (userId: string): Promise<PushSubscription | null> => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return null;

    const { data } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("endpoint", subscription.endpoint)
      .single();

    return data ? subscription : null;
  } catch (error) {
    console.error("Check subscription error:", error);
    return null;
  }
};

// Désabonne un utilisateur des notifications push
export const unsubscribeFromPush = async (userId: string): Promise<boolean> => {
  if (!("serviceWorker" in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId);

    return !error;
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return false;
  }
};