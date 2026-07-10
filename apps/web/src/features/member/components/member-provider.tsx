'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getCurrentUserId,
  getGymById,
  useActiveMembership,
  useProfile,
  type Tables,
} from '@smart-gym/supabase';
import { createClient } from '@/lib/supabase/client';

interface MemberContextValue {
  client: ReturnType<typeof createClient>;
  userId: string | null;
  profile: Tables<'profiles'> | null | undefined;
  membership: Tables<'gym_memberships'> | null | undefined;
  gym: Tables<'gyms'> | null;
  isLoading: boolean;
  error: Error | null;
}

const MemberContext = createContext<MemberContextValue | null>(null);

export function MemberProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => createClient(), []);

  const userQuery = useQuery({
    queryKey: ['current-user-id'],
    queryFn: () => getCurrentUserId(client),
  });

  const userId = userQuery.data ?? null;
  const profileQuery = useProfile(client, userId);
  const membershipQuery = useActiveMembership(client, userId);

  const gymId = membershipQuery.data?.gym_id;
  const gymQuery = useQuery({
    queryKey: ['member-gym', gymId ?? ''],
    queryFn: async () => {
      if (!gymId) return null;
      return getGymById(client, gymId);
    },
    enabled: Boolean(gymId),
  });

  const value: MemberContextValue = {
    client,
    userId,
    profile: profileQuery.data,
    membership: membershipQuery.data,
    gym: gymQuery.data ?? null,
    isLoading:
      userQuery.isLoading ||
      profileQuery.isLoading ||
      membershipQuery.isLoading ||
      (Boolean(gymId) && gymQuery.isLoading),
    error:
      (userQuery.error as Error | null) ??
      (profileQuery.error as Error | null) ??
      (membershipQuery.error as Error | null) ??
      (gymQuery.error as Error | null) ??
      null,
  };

  return <MemberContext.Provider value={value}>{children}</MemberContext.Provider>;
}

export function useMemberContext() {
  const ctx = useContext(MemberContext);
  if (!ctx) {
    throw new Error('useMemberContext must be used within MemberProvider');
  }
  return ctx;
}
