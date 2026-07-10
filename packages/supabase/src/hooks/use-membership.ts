'use client';

import { useQuery } from '@tanstack/react-query';
import type { TypedSupabaseClient } from '../client/browser';
import { getActiveMembership } from '../services/memberships';
import { listPendingJoinRequests } from '../services/join-requests';
import { queryKeys } from './query-keys';

export function useActiveMembership(
  client: TypedSupabaseClient,
  userId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.activeMembership(userId ?? ''),
    queryFn: () => {
      if (!userId) return null;
      return getActiveMembership(client, userId);
    },
    enabled: Boolean(userId),
  });
}

export function usePendingJoinRequests(
  client: TypedSupabaseClient,
  gymId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.joinRequests(gymId ?? ''),
    queryFn: () => {
      if (!gymId) return [];
      return listPendingJoinRequests(client, gymId);
    },
    enabled: Boolean(gymId),
  });
}
