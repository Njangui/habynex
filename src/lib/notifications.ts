import { supabase } from './supabase';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push-notification`;

interface NotificationOptions {
  icon?: string;
  badge?: string;
  image?: string;
  url?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string }>;
}

/**
 * Envoie une notification push à un utilisateur
 */
export const sendPushNotification = async (
  userId: string,
  title: string,
  body: string,
  options: NotificationOptions = {}
): Promise<{ success: boolean; summary?: any; error?: string }> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        userId,
        title,
        body,
        ...options,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to send notification');
    }

    console.log('Notification sent:', result);
    return { success: true, summary: result };

  } catch (error: any) {
    console.error('Send notification error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Scénarios prédéfinis pour Habynex
 */
export const notifyNewMessage = (recipientId: string, senderName: string, messagePreview: string) => {
  return sendPushNotification(
    recipientId,
    `Nouveau message de ${senderName}`,
    messagePreview.substring(0, 100) + (messagePreview.length > 100 ? '...' : ''),
    { url: '/messages' }
  );
};

export const notifyVisitRequest = (ownerId: string, propertyTitle: string, tenantName: string) => {
  return sendPushNotification(
    ownerId,
    'Nouvelle demande de visite',
    `${tenantName} souhaite visiter "${propertyTitle}"`,
    { url: '/visites' }
  );
};

export const notifyVisitConfirmed = (tenantId: string, propertyTitle: string, date: string) => {
  return sendPushNotification(
    tenantId,
    'Visite confirmée',
    `Votre visite pour "${propertyTitle}" est confirmée le ${date}`,
    { url: '/mes-visites' }
  );
};

export const notifyNewProperty = (userId: string, propertyTitle: string, location: string) => {
  return sendPushNotification(
    userId,
    'Nouveau bien disponible',
    `"${propertyTitle}" à ${location} correspond à vos critères`,
    { url: '/recherche' }
  );
};