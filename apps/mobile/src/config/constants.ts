// Production: replace with the user's deployed API URL.
// Development: use 10.0.2.2 from Android emulator to reach host machine.
// Physical device: use the host machine's LAN IP (e.g., 192.168.1.5:3001).

export const API_URL = __DEV__
  ? 'http://10.0.2.2:3001/api/v1'
  : 'https://api.canop.app/api/v1';

export const WS_URL = __DEV__
  ? 'http://10.0.2.2:3001'
  : 'https://api.canop.app';

export const APP_VERSION = '0.1.0';
export const APP_NAME = 'Canop';
export const PLATFORM = 'android';
