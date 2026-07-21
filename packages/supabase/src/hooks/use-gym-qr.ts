'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TypedSupabaseClient } from '../client/browser';
import {
  checkInByQrToken,
  getActiveGymQr,
  listGymQrHistory,
  listRecentQrScanLogs,
  regenerateGymQr,
} from '../services/gym-qr';
import { queryKeys } from './query-keys';

export function useActiveGymQr(
  client: TypedSupabaseClient,
  gymId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.gymQr(gymId ?? ''),
    queryFn: () => {
      if (!gymId) return null;
      return getActiveGymQr(client, gymId);
    },
    enabled: Boolean(gymId),
  });
}

export function useGymQrHistory(
  client: TypedSupabaseClient,
  gymId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.gymQrHistory(gymId ?? ''),
    queryFn: () => {
      if (!gymId) return [];
      return listGymQrHistory(client, gymId);
    },
    enabled: Boolean(gymId),
  });
}

export function useQrScanLogs(
  client: TypedSupabaseClient,
  gymId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.qrScanLogs(gymId ?? ''),
    queryFn: () => {
      if (!gymId) return [];
      return listRecentQrScanLogs(client, gymId);
    },
    enabled: Boolean(gymId),
  });
}

export function useRegenerateGymQr(client: TypedSupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { gymId: string; reason?: string }) =>
      regenerateGymQr(client, input.gymId, input.reason),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.gymQr(variables.gymId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.gymQrHistory(variables.gymId) });
    },
  });
}

export function useCheckInByQrToken(client: TypedSupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => checkInByQrToken(client, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      void queryClient.invalidateQueries({ queryKey: ['member-attendance-today'] });
      void queryClient.invalidateQueries({ queryKey: ['member-attendance-history'] });
      void queryClient.invalidateQueries({ queryKey: ['partner-allowance'] });
      void queryClient.invalidateQueries({ queryKey: ['member-partner-visits'] });
      void queryClient.invalidateQueries({ queryKey: ['qr-scan-logs'] });
    },
  });
}
