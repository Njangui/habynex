export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!("serviceWorker" in navigator)) {
    console.warn("[SW] Service workers not supported");
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register("/service-worker.js");
    console.log("[SW] Registered, scope:", registration.scope);
    return registration;
  } catch (e) {
    console.error("[SW] Registration failed:", e);
    return null;
  }
};

export const getServiceWorkerReady = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
};
