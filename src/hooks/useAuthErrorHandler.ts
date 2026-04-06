// src/hooks/useAuthErrorHandler.ts
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAuthErrorHandler = () => {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token rafraîchi avec succès');
      }
      
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        console.log('Utilisateur déconnecté, nettoyage...');
        // Nettoyer le cache local
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('habynex_')) {
            localStorage.removeItem(key);
          }
        });
      }
    });

    // Intercepter les erreurs de fetch pour détecter les 401
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      if (response.status === 401) {
        console.warn('Token expiré détecté, tentative de rafraîchissement...');
        const { error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.error('Impossible de rafraîchir la session:', error);
          // Rediriger vers login si nécessaire
          // window.location.href = '/login';
        }
      }
      
      return response;
    };

    return () => {
      subscription.unsubscribe();
      window.fetch = originalFetch;
    };
  }, []);
};
