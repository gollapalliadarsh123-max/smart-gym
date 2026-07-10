'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCurrentUserId, useOwnerGyms, useProfile, type Tables } from '@smart-gym/supabase';
import { createClient } from '@/lib/supabase/client';

interface OwnerContextValue {
  client: ReturnType<typeof createClient>;
  userId: string | null;
  profile: Tables<'profiles'> | null | undefined;
  gym: Tables<'gyms'> | null;
  gyms: Tables<'gyms'>[];
  isLoading: boolean;
  error: Error | null;
}

const OwnerContext = createContext<OwnerContextValue | null>(null);

export function OwnerProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => createClient(), []);

  const userQuery = useQuery({
    queryKey: ['current-user-id'],
    queryFn: () => getCurrentUserId(client),
  });

  const userId = userQuery.data ?? null;
  const profileQuery = useProfile(client, userId);
  const gymsQuery = useOwnerGyms(client, userId);

  const value: OwnerContextValue = {
    client,
    userId,
    profile: profileQuery.data,
    gym: gymsQuery.data?.[0] ?? null,
    gyms: gymsQuery.data ?? [],
    isLoading: userQuery.isLoading || profileQuery.isLoading || gymsQuery.isLoading,
    error:
      (userQuery.error as Error | null) ??
      (profileQuery.error as Error | null) ??
      (gymsQuery.error as Error | null) ??
      null,
  };

  return <OwnerContext.Provider value={value}>{children}</OwnerContext.Provider>;
}

export function useOwnerContext() {
  const ctx = useContext(OwnerContext);
  if (!ctx) {
    throw new Error('useOwnerContext must be used within OwnerProvider');
  }
  return ctx;
}
