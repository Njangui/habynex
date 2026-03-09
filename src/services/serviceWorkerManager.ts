// src/services/serviceWorkerManager.ts

/**
 * Enregistre le Service Worker au chargement de l'application
 */
export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
          console.log('SW registered:', registration.scope);
          
          // Écouter les mises à jour
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New SW available - refresh to update');
              }
            });
          });
        })
        .catch((err) => {
          console.error('SW registration failed:', err);
        });
    });
  }
};

/**
 * Envoie un message au Service Worker
 */
export const sendMessageToSW = async (type: string, data?: any): Promise<any> => {
  if (!('serviceWorker' in navigator)) return null;

  const registration = await navigator.serviceWorker.ready;
  if (!registration.active) return null;

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => {
      resolve(event.data);
    };
    
    registration.active.postMessage({ type, data }, [channel.port2]);
  });
};

/**
 * Met à jour le badge depuis l'app
 */
export const updateSWBadge = async (): Promise<void> => {
  await sendMessageToSW('UPDATE_BADGE');
};

/**
 * Force le skip waiting et recharge la page
 */
export const skipWaiting = async (): Promise<void> => {
  await sendMessageToSW('SKIP_WAITING');
  window.location.reload();
};

/**
 * Vérifie si un nouveau SW est disponible
 */
export const checkForUpdates = async (): Promise<boolean> => {
  const registration = await navigator.serviceWorker.ready;
  await registration.update();
  return !!registration.waiting;
};

// Export par défaut pour compatibilité
export default {
  registerServiceWorker,
  sendMessageToSW,
  updateSWBadge,
  skipWaiting,
  checkForUpdates,
};