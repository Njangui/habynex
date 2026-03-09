import React from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useAuth } from '../contexts/AuthContext'; // Adaptez selon votre auth

export const PushNotificationToggle: React.FC = () => {
  const { user } = useAuth(); // Adaptez selon votre contexte auth
  const { 
    permission, 
    subscription, 
    isSupported, 
    isLoading, 
    subscribe, 
    unsubscribe 
  } = usePushNotifications(user?.id);

  if (!isSupported) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg">
        <p className="text-gray-600">
          Votre navigateur ne supporte pas les notifications push.
        </p>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="font-semibold text-red-800">Notifications bloquées</h3>
        <p className="text-red-600 text-sm mt-1">
          Vous avez bloqué les notifications. Pour les réactiver, modifiez les paramètres de votre navigateur.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white border rounded-lg shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">
            Notifications push
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {subscription 
              ? 'Vous recevez les notifications sur cet appareil'
              : 'Activez pour recevoir les alertes en temps réel'
            }
          </p>
        </div>
        
        {subscription ? (
          <button
            onClick={unsubscribe}
            disabled={isLoading}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors"
          >
            {isLoading ? '...' : 'Désactiver'}
          </button>
        ) : (
          <button
            onClick={subscribe}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? '...' : 'Activer'}
          </button>
        )}
      </div>

      {subscription && (
        <div className="mt-3 flex items-center text-sm text-green-600">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Activé
        </div>
      )}
    </div>
  );
};