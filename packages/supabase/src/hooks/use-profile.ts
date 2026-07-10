'use client';

import { useQuery } from '@tanstack/react-query';
import type { TypedSupabaseClient } from '../client/browser';
import { getProfile } from '../services/profiles';
import { queryKeys } from './query-keys';

export function useProfile(client: TypedSupabaseClient, userId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.profile(userId ?? ''),
    queryFn: () => {
      if (!userId) return null;
      return getProfile(client, userId);
    },
    enabled: Boolean(userId),
  });
}
