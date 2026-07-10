'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TypedSupabaseClient } from '../client/browser';
import {
  getDietLogForDate,
  listDietLogDates,
  listDietLogs,
  saveDietDayAndSync,
  type SaveDietDayInput,
} from '../services/diet';
import { queryKeys } from './query-keys';

export function useDietLog(
  client: TypedSupabaseClient,
  userId: string | null | undefined,
  logDate: string,
) {
  return useQuery({
    queryKey: queryKeys.dietLog(userId ?? '', logDate),
    queryFn: () => {
      if (!userId) return null;
      return getDietLogForDate(client, userId, logDate);
    },
    enabled: Boolean(userId),
  });
}

export function useDietLogs(
  client: TypedSupabaseClient,
  userId: string | null | undefined,
  limit = 14,
) {
  return useQuery({
    queryKey: queryKeys.dietLogs(userId ?? ''),
    queryFn: () => {
      if (!userId) return [];
      return listDietLogs(client, userId, limit);
    },
    enabled: Boolean(userId),
  });
}

export function useDietLogDates(
  client: TypedSupabaseClient,
  userId: string | null | undefined,
  limit = 40,
) {
  return useQuery({
    queryKey: ['diet-log-dates', userId ?? '', limit] as const,
    queryFn: () => {
      if (!userId) return [];
      return listDietLogDates(client, userId, limit);
    },
    enabled: Boolean(userId),
  });
}

export function useSaveDietDay(client: TypedSupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveDietDayInput) => saveDietDayAndSync(client, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.dietLog(variables.userId, variables.logDate),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dietLogs(variables.userId) });
      void queryClient.invalidateQueries({ queryKey: ['diet-log-dates', variables.userId] });
      void queryClient.invalidateQueries({ queryKey: ['league-season'] });
    },
  });
}
