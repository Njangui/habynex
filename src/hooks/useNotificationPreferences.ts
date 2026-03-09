import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// Types stricts
export type NotificationChannel = "email" | "push" | "sms";
export type DigestFrequency = "daily" | "weekly" | "monthly" | "never";

export interface NotificationPreferences {
  id: string;
  user_id: string;

  // Email
  email_new_message: boolean;
  email_new_inquiry: boolean;
  email_property_views: boolean;
  email_recommendations: boolean;
  email_marketing: boolean;
  email_weekly_digest: boolean;

  // Push
  push_new_message: boolean;
  push_new_inquiry: boolean;
  push_property_views: boolean;
  push_recommendations: boolean;
  push_marketing: boolean;

  // SMS
  sms_new_message: boolean;
  sms_new_inquiry: boolean;
  sms_urgent_only: boolean;

  // Quiet hours
  quiet_hours_enabled: boolean;
  quiet_hours_start: string; // Format "HH:mm"
  quiet_hours_end: string;   // Format "HH:mm"

  digest_frequency: DigestFrequency;

  created_at: string;
  updated_at: string;
}

// Clés des préférences par type
type BooleanPreferenceKey = keyof Omit<NotificationPreferences, 
  "id" | "user_id" | "quiet_hours_start" | "quiet_hours_end" | 
  "digest_frequency" | "created_at" | "updated_at"
>;

const DEFAULT_PREFS: Omit<NotificationPreferences, "id" | "user_id" | "created_at" | "updated_at"> = {
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

// Validation des heures silencieuses
const validateQuietHours = (start: string, end: string): boolean => {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(start) && timeRegex.test(end);
};

export const useNotificationPreferences = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Ref pour éviter les appels multiples
  const isCreatingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // =================================================
  // FETCH PREFERENCES
  // =================================================

  const fetchPreferences = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setPreferences(null);
      return;
    }

    // Annuler l'appel précédent
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Éviter création multiple
        if (isCreatingRef.current) return;
        isCreatingRef.current = true;

        const { data: created, error: insertError } = await supabase
          .from("notification_preferences")
          .insert({
            user_id: user.id,
            ...DEFAULT_PREFS,
          })
          .select()
          .single();

        isCreatingRef.current = false;

        if (insertError) {
          // Si conflit (déjà créé entre-temps), refetch
          if (insertError.code === "23505") {
            return fetchPreferences();
          }
          throw insertError;
        }

        setPreferences(created as NotificationPreferences);
      } else {
        setPreferences(data as NotificationPreferences);
      }
    } catch (err: any) {
      console.error("[prefs] Fetch error:", err);
      setError(err.message);
      setPreferences(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // =================================================
  // UPDATE (avec optimistic locking)
  // =================================================

  const updatePreferences = useCallback(
    async (
      updates: Partial<Omit<NotificationPreferences, "id" | "user_id" | "created_at" | "updated_at">>,
      options: { silent?: boolean; skipOptimistic?: boolean } = {}
    ): Promise<boolean> => {
      if (!user || !preferences) return false;

      // Validation des heures silencieuses
      if (updates.quiet_hours_start || updates.quiet_hours_end) {
        const start = updates.quiet_hours_start || preferences.quiet_hours_start;
        const end = updates.quiet_hours_end || preferences.quiet_hours_end;
        
        if (!validateQuietHours(start, end)) {
          toast({
            variant: "destructive",
            title: "Format invalide",
            description: "Les heures doivent être au format HH:mm (ex: 22:00)",
          });
          return false;
        }
      }

      setSaving(true);
      setError(null);

      // Optimistic update
      const previousPrefs = { ...preferences };
      if (!options.skipOptimistic) {
        setPreferences(prev => prev ? { ...prev, ...updates } : prev);
      }

      try {
        const { error } = await supabase
          .from("notification_preferences")
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .eq("updated_at", preferences.updated_at); // Optimistic locking

        if (error) {
          // Conflit de version, refetch
          if (error.code === "PGRST116") {
            toast({
              variant: "destructive",
              title: "Conflit détecté",
              description: "Vos préférences ont été modifiées ailleurs. Rechargement...",
            });
            fetchPreferences();
            return false;
          }
          throw error;
        }

        if (!options.silent) {
          toast({
            title: "Préférences sauvegardées",
            description: "Vos paramètres de notification ont été mis à jour.",
          });
        }

        return true;
      } catch (err: any) {
        console.error("[prefs] Update error:", err);
        
        // Rollback optimistic
        setPreferences(previousPrefs);
        setError(err.message);
        
        toast({
          variant: "destructive",
          title: "Erreur de sauvegarde",
          description: err.message || "Impossible de sauvegarder vos préférences.",
        });
        
        return false;
      } finally {
        setSaving(false);
      }
    },
    [user, preferences, toast, fetchPreferences]
  );

  // =================================================
  // UPDATE PAR CANAL (plus sûr)
  // =================================================

  const updateChannelPreferences = useCallback(
    async (channel: NotificationChannel, enabled: boolean) => {
      const channelKeys: Record<NotificationChannel, BooleanPreferenceKey[]> = {
        email: [
          "email_new_message",
          "email_new_inquiry",
          "email_property_views",
          "email_recommendations",
          "email_marketing",
          "email_weekly_digest",
        ],
        push: [
          "push_new_message",
          "push_new_inquiry",
          "push_property_views",
          "push_recommendations",
          "push_marketing",
        ],
        sms: ["sms_new_message", "sms_new_inquiry", "sms_urgent_only"],
      };

      const updates = channelKeys[channel].reduce((acc, key) => {
        acc[key] = enabled;
        return acc;
      }, {} as Partial<NotificationPreferences>);

      return updatePreferences(updates);
    },
    [updatePreferences]
  );

  // =================================================
  // TOGGLE INDIVIDUEL (type-safe)
  // =================================================

  const togglePreference = useCallback(
    async (key: BooleanPreferenceKey) => {
      if (!preferences) return false;
      
      const newValue = !preferences[key];
      return updatePreferences({ [key]: newValue });
    },
    [preferences, updatePreferences]
  );

  // =================================================
  // GLOBAL ENABLE / DISABLE (corrigé)
  // =================================================

  const enableAllNotifications = useCallback(async () => {
    const allEnabled: Partial<NotificationPreferences> = {};
    
    (Object.keys(DEFAULT_PREFS) as Array<keyof typeof DEFAULT_PREFS>).forEach((key) => {
      if (typeof DEFAULT_PREFS[key] === "boolean") {
        (allEnabled as any)[key] = true;
      }
    });

    return updatePreferences(allEnabled, { silent: true });
  }, [updatePreferences]);

  const disableAllNotifications = useCallback(async () => {
    const allDisabled: Partial<NotificationPreferences> = {};
    
    (Object.keys(DEFAULT_PREFS) as Array<keyof typeof DEFAULT_PREFS>).forEach((key) => {
      if (typeof DEFAULT_PREFS[key] === "boolean") {
        (allDisabled as any)[key] = false;
      }
    });

    // Toujours garder quiet_hours_enabled et digest_frequency
    allDisabled.quiet_hours_enabled = false;

    return updatePreferences(allDisabled, { silent: true });
  }, [updatePreferences]);

  const toggleNotifications = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        return enableAllNotifications();
      } else {
        return disableAllNotifications();
      }
    },
    [enableAllNotifications, disableAllNotifications]
  );

  // =================================================
  // RESET TO DEFAULTS
  // =================================================

  const resetToDefaults = useCallback(async () => {
    if (!user) return false;

    const confirm = window.confirm(
      "Êtes-vous sûr de vouloir réinitialiser toutes vos préférences aux valeurs par défaut ?"
    );

    if (!confirm) return false;

    return updatePreferences(DEFAULT_PREFS);
  }, [user, updatePreferences]);

  // =================================================
  // SET QUIET HOURS (validation complète)
  // =================================================

  const setQuietHours = useCallback(
    async (enabled: boolean, start?: string, end?: string) => {
      const updates: Partial<NotificationPreferences> = {
        quiet_hours_enabled: enabled,
      };

      if (start !== undefined) updates.quiet_hours_start = start;
      if (end !== undefined) updates.quiet_hours_end = end;

      return updatePreferences(updates);
    },
    [updatePreferences]
  );

  // =================================================
  // CHECK SI ACTIVÉ POUR UN TYPE SPÉCIFIQUE
  // =================================================

  const isEnabled = useCallback(
    (key: BooleanPreferenceKey): boolean => {
      return preferences?.[key] ?? DEFAULT_PREFS[key] ?? false;
    },
    [preferences]
  );

  const isChannelEnabled = useCallback(
    (channel: NotificationChannel): boolean => {
      const checks: Record<NotificationChannel, BooleanPreferenceKey[]> = {
        email: ["email_new_message"],
        push: ["push_new_message"],
        sms: ["sms_new_message"],
      };
      
      return checks[channel].some(key => isEnabled(key));
    },
    [isEnabled]
  );

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
    error,
    
    // Actions
    updatePreferences,
    updateChannelPreferences,
    togglePreference,
    toggleNotifications,
    enableAllNotifications,
    disableAllNotifications,
    resetToDefaults,
    setQuietHours,
    refetch: fetchPreferences,
    
    // Helpers
    isEnabled,
    isChannelEnabled,
    validateQuietHours,
  };
};