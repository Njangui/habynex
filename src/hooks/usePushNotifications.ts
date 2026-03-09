// src/hooks/usePushNotifications.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  registerServiceWorker,
  sendMessageToSW,
  updateSWBadge,
} from '@/services/serviceWorkerManager';

// Types
interface NotificationPreferences {
  push_new_message?: boolean;
  push_new_inquiry?: boolean;
  [key: string]: boolean | undefined;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permissionState, setPermissionState] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const channelsRef = useRef<any[]>([]);
  const isMountedRef = useRef(true);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel).catch(console.error);
      });
      channelsRef.current = [];
    };
  }, []);

  // Enregistrer le SW au montage
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Vérifier l'abonnement existant
  useEffect(() => {
    if (!user) return;
    
    const checkExisting = async () => {
      if (!('PushManager' in window)) return;
      
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          // Vérifier dans Supabase
          const { data } = await supabase
            .from('push_subscriptions')
            .select('id')
            .eq('user_id', user.id)
            .eq('endpoint', subscription.endpoint)
            .single();
          
          if (isMountedRef.current) {
            setIsSubscribed(!!data);
          }
        }
      } catch (error) {
        console.error('Check subscription error:', error);
      }
    };
    
    checkExisting();
  }, [user]);

  // Convertir base64url en Uint8Array
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
  };

  // S'abonner aux push
  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return false;
    }

    if (!('PushManager' in window)) {
      toast.error('Les notifications push ne sont pas supportées');
      return false;
    }

    setIsLoading(true);
    try {
      const permissionResult = await Notification.requestPermission();
      
      if (isMountedRef.current) {
        setPermissionState(permissionResult);
      }

      if (permissionResult !== 'granted') {
        toast.error('Permission refusée');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          import.meta.env.VITE_VAPID_PUBLIC_KEY
        ),
      });

      // Extraire les clés
      const p256dhKey = sub.getKey('p256dh');
      const authKey = sub.getKey('auth');

      if (!p256dhKey || !authKey) {
        throw new Error('Failed to get subscription keys');
      }

      const p256dh = btoa(String.fromCharCode(...new Uint8Array(p256dhKey)));
      const auth = btoa(String.fromCharCode(...new Uint8Array(authKey)));

      // Sauvegarder dans Supabase
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(
          {
            user_id: user.id,
            endpoint: sub.endpoint,
            p256dh: p256dh,
            auth: auth,
          },
          { onConflict: 'user_id,endpoint' }
        );

      if (error) {
        await sub.unsubscribe();
        throw error;
      }

      if (isMountedRef.current) {
        setIsSubscribed(true);
      }
      
      toast.success('Notifications activées !');
      return true;
    } catch (error: any) {
      console.error('Subscribe error:', error);
      toast.error("Erreur lors de l'activation");
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [user]);

  // Se désabonner
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);

      if (isMountedRef.current) {
        setIsSubscribed(false);
      }
      
      toast.success('Notifications désactivées');
      return true;
    } catch (error: any) {
      console.error('Unsubscribe error:', error);
      toast.error('Erreur lors de la désactivation');
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [user]);

  // Récupérer les préférences
  const fetchPreferences = useCallback(async (): Promise<NotificationPreferences | null> => {
    if (!user) return null;
    
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('push_new_message, push_new_inquiry')
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      console.warn('Preferences fetch error:', error.message);
      return null;
    }
    
    return data;
  }, [user]);

  // Realtime pour nouveaux messages
  useEffect(() => {
    if (!user) return;

    const handleNewMessage = async (payload: any) => {
      if (document.visibilityState === 'visible') return;
      
      const msg = payload.new;
      if (msg.sender_id === user.id) return;

      const prefs = await fetchPreferences();
      if (prefs?.push_new_message === false) return;

      const { data: conv } = await supabase
        .from('conversations')
        .select('tenant_id, owner_id')
        .eq('id', msg.conversation_id)
        .single();

      if (!conv) return;
      if (conv.tenant_id !== user.id && conv.owner_id !== user.id) return;

      // Notification native
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('💬 Nouveau message', {
          body: msg.content?.substring(0, 100) || 'Nouveau message',
          icon: '/icon-192x192.png',
          tag: `msg-${msg.conversation_id}`,
          data: { url: `/messages?conversation=${msg.conversation_id}` },
        });
      } else {
        toast.info('💬 Nouveau message', {
          description: msg.content?.substring(0, 100),
        });
      }
      
      // Mettre à jour le badge
      updateSWBadge();
    };

    const channel = supabase
      .channel(`messages-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        handleNewMessage
      )
      .subscribe();

    channelsRef.current.push(channel);

    return () => {
      supabase.removeChannel(channel).catch(console.error);
    };
  }, [user, fetchPreferences]);

  // Realtime pour nouvelles demandes
  useEffect(() => {
    if (!user) return;

    const handleNewInquiry = async (payload: any) => {
      if (document.visibilityState === 'visible') return;
      
      const inquiry = payload.new;
      
      const prefs = await fetchPreferences();
      if (prefs?.push_new_inquiry === false) return;

      const { data: prop } = await supabase
        .from('properties')
        .select('title, owner_id')
        .eq('id', inquiry.property_id)
        .single();

      if (!prop || prop.owner_id !== user.id) return;

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('📩 Nouvelle demande', {
          body: `${inquiry.sender_name} - "${prop.title}"`,
          icon: '/icon-192x192.png',
          tag: `inquiry-${inquiry.id}`,
          data: { url: '/dashboard' },
        });
      } else {
        toast.info('📩 Nouvelle demande', {
          description: `${inquiry.sender_name} - "${prop.title}"`,
        });
      }
      
      updateSWBadge();
    };

    const channel = supabase
      .channel(`inquiries-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'property_inquiries' },
        handleNewInquiry
      )
      .subscribe();

    channelsRef.current.push(channel);

    return () => {
      supabase.removeChannel(channel).catch(console.error);
    };
  }, [user, fetchPreferences]);

  return {
    permissionState,
    isSubscribed,
    isLoading,
    subscribeToPush,
    unsubscribe,
  };
};