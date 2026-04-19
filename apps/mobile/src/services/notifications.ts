import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';
import { Auth } from '@/api/endpoints';
import { SecureStorage } from '@/auth/SecureStorage';

export async function requestNotificationPermission(): Promise<boolean> {
  // Android 13+ requires the runtime POST_NOTIFICATIONS permission
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (result !== PermissionsAndroid.RESULTS.GRANTED) return false;
  }

  const authStatus = await messaging().requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
}

export async function registerFCMToken(): Promise<void> {
  try {
    const token = await messaging().getToken();
    const deviceId = await SecureStorage.getDeviceId();
    await Auth.registerDeviceToken(token, deviceId);
  } catch (err) {
    console.error('[fcm] Failed to register token:', err);
  }
}

export function setupNotificationListeners(
  onForeground: (title: string, body: string, data: Record<string, unknown>) => void,
): () => void {
  // Foreground: Firebase doesn't auto-display, so we hand off to the UI
  const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
    const { title, body } = remoteMessage.notification ?? {};
    onForeground(title ?? '', body ?? '', remoteMessage.data ?? {});
  });

  // Background tap → app brought to foreground
  const unsubscribeOpened = messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log('[fcm] Opened from background:', remoteMessage.data);
  });

  // Quit-state launch via notification
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        console.log('[fcm] Launched from quit state:', remoteMessage.data);
      }
    });

  return () => {
    unsubscribeForeground();
    unsubscribeOpened();
  };
}

// Background handler must be registered before app render in index.js,
// but we expose it from here so the bootstrap code stays cohesive.
export function setupBackgroundHandler(): void {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('[fcm] Background message:', remoteMessage.messageId);
  });
}
