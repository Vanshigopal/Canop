import {
  useQuery,
  useMutation,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import type { AxiosResponse } from 'axios';

// Convenience wrappers around react-query that strip the standard
// API envelope ({ ok, data }) so screens deal with plain payloads.

export function useApiQuery<T>(
  key: readonly unknown[],
  fetcher: () => Promise<AxiosResponse<{ ok: boolean; data: T }>>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<T>({
    queryKey: key,
    queryFn: async () => {
      const res = await fetcher();
      return res.data.data;
    },
    ...options,
  });
}

export function useApiMutation<TData, TVariables>(
  fn: (vars: TVariables) => Promise<AxiosResponse<{ ok: boolean; data: TData }>>,
  options?: UseMutationOptions<TData, unknown, TVariables>,
) {
  return useMutation<TData, unknown, TVariables>({
    mutationFn: async (vars) => {
      const res = await fn(vars);
      return res.data.data;
    },
    ...options,
  });
}
