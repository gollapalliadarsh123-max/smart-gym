'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TypedSupabaseClient } from '../client/browser';
import {
  generateDailyAttendanceCode,
  getMemberAttendanceForDate,
  listAttendanceForGymDate,
  listAttendanceForGymRange,
  listMemberAttendance,
  markAttendanceByCode,
  selfCheckIn,
} from '../services/attendance';
import { queryKeys } from './query-keys';

export function useGymAttendanceToday(
  client: TypedSupabaseClient,
  gymId: string | null | undefined,
  dateYmd: string,
) {
  return useQuery({
    queryKey: queryKeys.attendanceToday(gymId ?? '', dateYmd),
    queryFn: () => {
      if (!gymId) return [];
      return listAttendanceForGymDate(client, gymId, dateYmd);
    },
    enabled: Boolean(gymId),
    refetchInterval: 30_000,
  });
}

export function useGymAttendanceHistory(
  client: TypedSupabaseClient,
  gymId: string | null | undefined,
  fromYmd: string,
  toYmd: string,
) {
  return useQuery({
    queryKey: ['attendance-history', gymId ?? '', fromYmd, toYmd] as const,
    queryFn: () => {
      if (!gymId) return [];
      return listAttendanceForGymRange(client, gymId, fromYmd, toYmd);
    },
    enabled: Boolean(gymId),
  });
}

export function useMemberAttendanceToday(
  client: TypedSupabaseClient,
  userId: string | null | undefined,
  dateYmd: string,
) {
  return useQuery({
    queryKey: ['member-attendance-today', userId ?? '', dateYmd] as const,
    queryFn: () => {
      if (!userId) return null;
      return getMemberAttendanceForDate(client, userId, dateYmd);
    },
    enabled: Boolean(userId),
  });
}

export function useMemberAttendanceHistory(
  client: TypedSupabaseClient,
  userId: string | null | undefined,
  limit = 30,
) {
  return useQuery({
    queryKey: ['member-attendance-history', userId ?? '', limit] as const,
    queryFn: () => {
      if (!userId) return [];
      return listMemberAttendance(client, userId, limit);
    },
    enabled: Boolean(userId),
  });
}

export function useDailyAttendanceCode(
  client: TypedSupabaseClient,
  gymId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ['daily-attendance-code', gymId ?? ''] as const,
    queryFn: () => {
      if (!gymId) return '';
      return generateDailyAttendanceCode(client, gymId);
    },
    enabled: Boolean(gymId) && enabled,
    staleTime: 60_000,
  });
}

export function useMarkAttendanceByCode(client: TypedSupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { gymId: string; code: string }) =>
      markAttendanceByCode(client, input.gymId, input.code),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['attendance-today', variables.gymId] });
      void queryClient.invalidateQueries({ queryKey: ['attendance-history', variables.gymId] });
    },
  });
}

export function useSelfCheckIn(client: TypedSupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (gymId: string) => selfCheckIn(client, gymId),
    onSuccess: (_data, gymId) => {
      void queryClient.invalidateQueries({ queryKey: ['attendance-today', gymId] });
      void queryClient.invalidateQueries({ queryKey: ['member-attendance-today'] });
      void queryClient.invalidateQueries({ queryKey: ['member-attendance-history'] });
    },
  });
}
