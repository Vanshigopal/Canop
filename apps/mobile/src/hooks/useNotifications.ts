import { useEffect } from 'react';
import {
  registerFCMToken,
  requestNotificationPermission,
  setupNotificationListeners,
} from '@/services/notifications';
import { useAuth } from '@/auth/AuthContext';

// Wires the FCM lifecycle to authentication state.
// On login → request permission, register token, subscribe to messages.
// On logout → AuthContext.logout() unregisters the token server-side.

export function useNotifications(
  onForeground: (title: string, body: string, data: Record<string, unknown>) => void,
) {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let unsubscribe: (() => void) | undefined;

    (async () => {
      const granted = await requestNotificationPermission();
      if (!granted) return;

      await registerFCMToken();
      unsubscribe = setupNotificationListeners(onForeground);
    })();

    return () => {
      unsubscribe?.();
    };
  }, [isAuthenticated, onForeground]);
}
