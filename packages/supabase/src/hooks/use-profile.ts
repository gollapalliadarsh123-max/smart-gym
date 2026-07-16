'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TypedSupabaseClient } from '../client/browser';
import { getProfile, updateProfile } from '../services/profiles';
import type { TablesUpdate } from '../types/database';
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

export function useUpdateProfile(client: TypedSupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; patch: TablesUpdate<'profiles'> }) =>
      updateProfile(client, input.userId, input.patch),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile(variables.userId) });
      void queryClient.invalidateQueries({ queryKey: ['profiles-map'] });
    },
  });
}
