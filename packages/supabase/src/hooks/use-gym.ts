'use client';

import { useQuery } from '@tanstack/react-query';
import type { TypedSupabaseClient } from '../client/browser';
import { getGymByCode, getGymById } from '../services/gyms';
import { queryKeys } from './query-keys';

export function useGym(client: TypedSupabaseClient, gymId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.gym(gymId ?? ''),
    queryFn: () => {
      if (!gymId) return null;
      return getGymById(client, gymId);
    },
    enabled: Boolean(gymId),
  });
}

export function useGymByCode(client: TypedSupabaseClient, code: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.gymByCode(code ?? ''),
    queryFn: () => {
      if (!code) return null;
      return getGymByCode(client, code);
    },
    enabled: Boolean(code?.trim()),
  });
}
