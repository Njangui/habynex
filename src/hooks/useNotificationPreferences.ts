import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface NotificationPreferences {
  id: string;
  user_id: string;

  // email
  email_new_message: boolean;
  email_new_inquiry: boolean;
  email_property_views: boolean;
  email_recommendations: boolean;
  email_marketing: boolean;
  email_weekly_digest: boolean;

  // push
  push_new_message: boolean;
  push_new_inquiry: boolean;
  push_property_views: boolean;
  push_recommendations: boolean;
  push_marketing: boolean;

  // sms
  sms_new_message: boolean;
  sms_new_inquiry: boolean;
  sms_urgent_only: boolean;

  // quiet hours
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;

  digest_frequency: "daily" | "weekly" | "monthly" | "never";

  created_at: string;
  updated_at: string;
}

const DEFAULT_PREFS = {
  email_new_message: true,
  email_new_inquiry: true,
  email_property_views: true,
  email_recommendations: true,
  email_marketing: true,
  email_weekly_digest: true,

  push_new_message: true,
  push_new_inquiry: true,
  push_property_views: true,
  push_recommendations: true,
  push_marketing: true,

  sms_new_message: true,
  sms_new_inquiry: true,
  sms_urgent_only: true,

  quiet_hours_enabled: false,
  quiet_hours_start: "22:00",
  quiet_hours_end: "08:00",

  digest_frequency: "weekly",
};

export const useNotificationPreferences = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // =================================================
  // FETCH PREFERENCES
  // =================================================

  const fetchPreferences = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // create default preferences
        const { data: created, error: insertError } = await supabase
          .from("notification_preferences")
          .insert({
            user_id: user.id,
            ...DEFAULT_PREFS,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setPreferences(created as NotificationPreferences);
      } else {
        setPreferences(data as NotificationPreferences);
      }
    } catch (err) {
      console.error("Notification prefs error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // =================================================
  // UPDATE
  // =================================================

  const updatePreferences = useCallback(
    async (updates: Partial<NotificationPreferences>) => {
      if (!user) return false;

      setSaving(true);

      try {
        const { error } = await supabase
          .from("notification_preferences")
          .update(updates)
          .eq("user_id", user.id);

        if (error) throw error;

        setPreferences((prev) =>
          prev ? { ...prev, ...updates } : prev
        );

        toast({
          title: "Notifications mises à jour",
          description: "Vos préférences ont été sauvegardées.",
        });

        return true;
      } catch (error) {
        console.error("Update notification prefs error:", error);

        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de sauvegarder vos préférences.",
        });

        return false;
      } finally {
        setSaving(false);
      }
    },
    [user, toast]
  );

  // =================================================
  // GLOBAL ENABLE / DISABLE
  // =================================================

  const enableAllNotifications = async () => {
    const allEnabled = Object.keys(DEFAULT_PREFS).reduce((acc, key) => {
      if (typeof DEFAULT_PREFS[key as keyof typeof DEFAULT_PREFS] === "boolean") {
        acc[key] = true;
      }
      return acc;
    }, {} as any);

    return updatePreferences(allEnabled);
  };

  const disableAllNotifications = async () => {
    const allDisabled = Object.keys(DEFAULT_PREFS).reduce((acc, key) => {
      if (typeof DEFAULT_PREFS[key as keyof typeof DEFAULT_PREFS] === "boolean") {
        acc[key] = false;
      }
      return acc;
    }, {} as any);

    return updatePreferences(allDisabled);
  };

  // =================================================
  // MASTER TOGGLE
  // =================================================

  const toggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      return enableAllNotifications();
    } else {
      return disableAllNotifications();
    }
  };

  // =================================================
  // INIT
  // =================================================

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    loading,
    saving,

    enableAllNotifications,
    disableAllNotifications,
    toggleNotifications,

    updatePreferences,
    refetch: fetchPreferences,
  };
};