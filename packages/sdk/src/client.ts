import axios, { type AxiosInstance } from "axios";

export interface RaquelClientOptions {
  baseUrl: string;
  getAccessToken?: () => string | null;
  onUnauthorized?: () => void;
}

export class RaquelClient {
  private axios: AxiosInstance;

  constructor(private opts: RaquelClientOptions) {
    this.axios = axios.create({
      baseURL: this.opts.baseUrl,
      timeout: 15000,
      withCredentials: true,
    });

    this.axios.interceptors.request.use((config) => {
      const token = this.opts.getAccessToken?.();
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    this.axios.interceptors.response.use(
      (r) => r,
      (err) => {
        if (err.response?.status === 401) this.opts.onUnauthorized?.();
        return Promise.reject(err);
      },
    );
  }

  async health(): Promise<{ status: string; service: string }> {
    const { data } = await this.axios.get("/health");
    return data;
  }

  // Session 3 will add: login, logout, refresh, me
  // Session 5 will add: students, teachers, batches
  // etc.
}
