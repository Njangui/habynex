import { supabase } from "@/integrations/supabase/client";

export const updateAppBadge = (count: number) => {
  if ("setAppBadge" in navigator) {
    if (count > 0) {
      (navigator as any).setAppBadge(count).catch(() => {});
    } else {
      (navigator as any).clearAppBadge?.().catch(() => {});
    }
  }
};

export const fetchUnreadCount = async (userId: string): Promise<number> => {
  const { count } = await supabase
    .from("notification_history")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  return count ?? 0;
};

export const testNotification = async (
  type: string,
  record: any,
  userIds?: string[]
) => {
  return supabase.functions.invoke("push-notify-events", {
    body: { type, record, user_ids: userIds },
  });
};

export const testDirectPush = async (
  userId: string,
  title: string,
  body: string,
  url = "/"
) => {
  return supabase.functions.invoke("push-notify", {
    body: { userId, title, body, data: { url, type: "test" } },
  });
};
