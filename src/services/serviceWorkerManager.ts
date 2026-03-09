// Envoyer message au SW
export const sendMessageToSW = async (type: string, data?: any): Promise<any> => {
  if (!("serviceWorker" in navigator)) return null;

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

// Mettre à jour le badge depuis l'app
export const updateSWBadge = async (): Promise<void> => {
  await sendMessageToSW("UPDATE_BADGE");
};

// Forcer le skip waiting
export const skipWaiting = async (): Promise<void> => {
  await sendMessageToSW("SKIP_WAITING");
  window.location.reload();
};

// Vérifier si nouveau SW disponible
export const checkForUpdates = async (): Promise<boolean> => {
  const registration = await navigator.serviceWorker.ready;
  await registration.update();
  return !!registration.waiting;
};