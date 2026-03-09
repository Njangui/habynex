// Ajouter ces fonctions si elles n'existent pas

export const checkExistingSubscription = async (userId: string): Promise<PushSubscription | null> => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) return null;

    // Vérifier si présent dans Supabase
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

export const unsubscribeFromPush = async (userId: string): Promise<boolean> => {
  if (!("serviceWorker" in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
    }

    // Supprimer de Supabase
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