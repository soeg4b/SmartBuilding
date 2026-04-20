'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api, ApiError } from '@/lib/api';

interface UseApiState<T> {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
}

interface UseApiOptions {
  /** Auto-refetch interval in milliseconds. 0 = disabled. */
  refetchInterval?: number;
  /** Dependencies that trigger a refetch when changed. */
  deps?: unknown[];
  /** If false, the fetch won't execute. Default true. */
  enabled?: boolean;
}

interface UseApiReturn<T> extends UseApiState<T> {
  refetch: () => Promise<void>;
  mutate: (data: T | null) => void;
}

export function useApi<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  options: UseApiOptions = {}
): UseApiReturn<T> {
  const { refetchInterval = 0, deps = [], enabled = true } = options;

  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    error: null,
    isLoading: true,
  });

  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }

    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const result = await api.get<T>(path, params);
      if (mountedRef.current) {
        setState({ data: result, error: null, isLoading: false });
      }
    } catch (err) {
      if (mountedRef.current) {
        setState((s) => ({
          ...s,
          error: err instanceof ApiError ? err : new ApiError(500, 'UNKNOWN', String(err)),
          isLoading: false,
        }));
      }
    }
  }, [path, JSON.stringify(params), enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Initial fetch and dependency-based refetch
  useEffect(() => {
    fetchData();
  }, [fetchData, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  // Interval-based refetch
  useEffect(() => {
    if (refetchInterval <= 0 || !enabled) return;

    const id = setInterval(fetchData, refetchInterval);
    return () => clearInterval(id);
  }, [fetchData, refetchInterval, enabled]);

  const mutate = useCallback((data: T | null) => {
    setState((s) => ({ ...s, data }));
  }, []);

  return { ...state, refetch: fetchData, mutate };
}

interface UseMutationState<T> {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
}

interface UseMutationReturn<TInput, TOutput> extends UseMutationState<TOutput> {
  execute: (input: TInput) => Promise<TOutput>;
  reset: () => void;
}

export function useMutation<TInput = unknown, TOutput = unknown>(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string
): UseMutationReturn<TInput, TOutput> {
  const [state, setState] = useState<UseMutationState<TOutput>>({
    data: null,
    error: null,
    isLoading: false,
  });

  const execute = useCallback(
    async (input: TInput): Promise<TOutput> => {
      setState({ data: null, error: null, isLoading: true });

      try {
        const fn =
          method === 'POST'
            ? api.post<TOutput>
            : method === 'PUT'
              ? api.put<TOutput>
              : method === 'PATCH'
                ? api.patch<TOutput>
                : api.delete<TOutput>;

        const result = method === 'DELETE' ? await api.delete<TOutput>(path) : await fn(path, input);
        setState({ data: result, error: null, isLoading: false });
        return result;
      } catch (err) {
        const apiErr = err instanceof ApiError ? err : new ApiError(500, 'UNKNOWN', String(err));
        setState({ data: null, error: apiErr, isLoading: false });
        throw apiErr;
      }
    },
    [method, path]
  );

  const reset = useCallback(() => {
    setState({ data: null, error: null, isLoading: false });
  }, []);

  return { ...state, execute, reset };
}
