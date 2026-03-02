import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface NotificationPreferences {
  id: string;
  user_id: string;
  // Email notifications
  email_new_message: boolean;
  email_new_inquiry: boolean;
  email_property_views: boolean;
  email_recommendations: boolean;
  email_marketing: boolean;
  email_weekly_digest: boolean;
  // Push notifications
  push_new_message: boolean;
  push_new_inquiry: boolean;
  push_property_views: boolean;
  push_recommendations: boolean;
  push_marketing: boolean;
  // SMS notifications
  sms_new_message: boolean;
  sms_new_inquiry: boolean;
  sms_urgent_only: boolean;
  // Quiet hours
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  // Frequency
  digest_frequency: "daily" | "weekly" | "monthly" | "never";
  created_at: string;
  updated_at: string;
}

const defaultPreferences: Partial<NotificationPreferences> = {
  email_new_message: true,
  email_new_inquiry: true,
  email_property_views: true,
  email_recommendations: true,
  email_marketing: false,
  email_weekly_digest: true,
  push_new_message: true,
  push_new_inquiry: true,
  push_property_views: true,
  push_recommendations: true,
  push_marketing: false,
  sms_new_message: false,
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
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No preferences found, create default
          const { data: newPrefs, error: insertError } = await supabase
            .from("notification_preferences")
            .insert({ user_id: user.id, ...defaultPreferences })
            .select()
            .single();

          if (insertError) throw insertError;
          setPreferences(newPrefs as NotificationPreferences);
        } else {
          throw error;
        }
      } else {
        setPreferences(data as NotificationPreferences);
      }
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    if (!user || !preferences) return false;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("notification_preferences")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;

      setPreferences((prev) => prev ? { ...prev, ...updates } : null);
      
      toast({
        title: "Préférences mises à jour",
        description: "Vos préférences de notification ont été sauvegardées.",
      });
      
      return true;
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour les préférences.",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const togglePreference = async (key: keyof NotificationPreferences) => {
    if (!preferences) return;
    const currentValue = preferences[key];
    if (typeof currentValue === "boolean") {
      await updatePreferences({ [key]: !currentValue });
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    loading,
    saving,
    updatePreferences,
    togglePreference,
    refetch: fetchPreferences,
  };
};
