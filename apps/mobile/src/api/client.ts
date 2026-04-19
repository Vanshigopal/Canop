import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import EncryptedStorage from 'react-native-encrypted-storage';
import { API_URL } from '@/config/constants';

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const client: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Inject auth token + tenant slug on every request
client.interceptors.request.use(async (config) => {
  const token = await EncryptedStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const tenantSlug = await EncryptedStorage.getItem('tenant_slug');
  if (tenantSlug) {
    config.headers['X-Tenant-Slug'] = tenantSlug;
  }

  return config;
});

// Auto-refresh on 401, then retry the original request once
client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableConfig | undefined;
    if (!originalRequest) return Promise.reject(error);

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await EncryptedStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        await EncryptedStorage.setItem('access_token', data.data.accessToken);
        await EncryptedStorage.setItem('refresh_token', data.data.refreshToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        }
        return client(originalRequest);
      } catch {
        await EncryptedStorage.clear();
        // AuthContext picks this up via /me failure on next mount
      }
    }

    return Promise.reject(error);
  },
);

export { client as api };
