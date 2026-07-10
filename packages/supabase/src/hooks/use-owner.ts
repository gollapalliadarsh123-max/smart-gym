'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TypedSupabaseClient } from '../client/browser';
import type { Tables } from '../types/database';
import { listGymsByOwner } from '../services/gyms';
import { listGymMembers, approveMemberMembership, rejectJoinRequest, type ApproveMemberInput } from '../services/memberships';
import { getProfilesByIds } from '../services/profiles';
import { listPayments, type PaymentListFilters } from '../services/payments';
import { updateGym } from '../services/gyms';
import type { TablesUpdate } from '../types/database';
import { queryKeys } from './query-keys';

export function useOwnerGyms(client: TypedSupabaseClient, ownerId: string | null | undefined) {
  return useQuery({
    queryKey: ['owner-gyms', ownerId ?? ''] as const,
    queryFn: () => {
      if (!ownerId) return [];
      return listGymsByOwner(client, ownerId);
    },
    enabled: Boolean(ownerId),
  });
}

export function useGymMembers(
  client: TypedSupabaseClient,
  gymId: string | null | undefined,
  status?: Tables<'gym_memberships'>['status'],
) {
  return useQuery({
    queryKey: queryKeys.gymMembers(gymId ?? '', status),
    queryFn: () => {
      if (!gymId) return [];
      return listGymMembers(client, gymId, status);
    },
    enabled: Boolean(gymId),
  });
}

export function useProfilesMap(
  client: TypedSupabaseClient,
  userIds: string[],
) {
  const key = [...userIds].sort().join(',');
  return useQuery({
    queryKey: ['profiles-map', key] as const,
    queryFn: async () => {
      if (!userIds.length) return {} as Record<string, Tables<'profiles'>>;
      const profiles = await getProfilesByIds(client, userIds);
      return Object.fromEntries(profiles.map((p) => [p.user_id, p]));
    },
    enabled: userIds.length > 0,
  });
}

export function useGymPayments(
  client: TypedSupabaseClient,
  filters: PaymentListFilters & { gymId?: string | null },
) {
  const gymId = filters.gymId ?? null;
  return useQuery({
    queryKey: queryKeys.payments({ ...filters, gymId }),
    queryFn: () => {
      if (!gymId) return [];
      return listPayments(client, { ...filters, gymId });
    },
    enabled: Boolean(gymId),
  });
}

export function useApproveMember(client: TypedSupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApproveMemberInput) => approveMemberMembership(client, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.joinRequests(variables.gymId) });
      void queryClient.invalidateQueries({ queryKey: ['gym-members', variables.gymId] });
      void queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

export function useRejectJoinRequest(client: TypedSupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; gymId: string; reviewedBy: string }) =>
      rejectJoinRequest(client, input.userId, input.gymId, input.reviewedBy),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.joinRequests(variables.gymId) });
    },
  });
}

export function useUpdateGym(client: TypedSupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { gymId: string; patch: TablesUpdate<'gyms'> }) =>
      updateGym(client, input.gymId, input.patch),
    onSuccess: (gym) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.gym(gym.id) });
      void queryClient.invalidateQueries({ queryKey: ['owner-gyms'] });
    },
  });
}
