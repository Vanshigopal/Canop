import EncryptedStorage from 'react-native-encrypted-storage';

// Thin typed wrapper over EncryptedStorage. All values are stored
// in Android Keystore (AES-256) — never plain SharedPreferences.

const KEYS = {
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
  tenantSlug: 'tenant_slug',
  deviceId: 'device_id',
  selectedChildId: 'selected_child_id',
} as const;

export const SecureStorage = {
  async getAccessToken(): Promise<string | null> {
    return EncryptedStorage.getItem(KEYS.accessToken);
  },
  async setAccessToken(value: string): Promise<void> {
    await EncryptedStorage.setItem(KEYS.accessToken, value);
  },

  async getRefreshToken(): Promise<string | null> {
    return EncryptedStorage.getItem(KEYS.refreshToken);
  },
  async setRefreshToken(value: string): Promise<void> {
    await EncryptedStorage.setItem(KEYS.refreshToken, value);
  },

  async getTenantSlug(): Promise<string | null> {
    return EncryptedStorage.getItem(KEYS.tenantSlug);
  },
  async setTenantSlug(value: string): Promise<void> {
    await EncryptedStorage.setItem(KEYS.tenantSlug, value);
  },

  async getDeviceId(): Promise<string> {
    let id = await EncryptedStorage.getItem(KEYS.deviceId);
    if (!id) {
      // Generate a stable per-install device id (random UUIDv4 fallback)
      id = `android-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      await EncryptedStorage.setItem(KEYS.deviceId, id);
    }
    return id;
  },

  async getSelectedChildId(): Promise<string | null> {
    return EncryptedStorage.getItem(KEYS.selectedChildId);
  },
  async setSelectedChildId(value: string): Promise<void> {
    await EncryptedStorage.setItem(KEYS.selectedChildId, value);
  },

  async clearSession(): Promise<void> {
    await EncryptedStorage.removeItem(KEYS.accessToken);
    await EncryptedStorage.removeItem(KEYS.refreshToken);
  },

  async clearAll(): Promise<void> {
    await EncryptedStorage.clear();
  },
};
