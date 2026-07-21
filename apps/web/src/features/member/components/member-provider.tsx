'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCurrentUserId,
  getGymById,
  useActiveMemberships,
  useProfile,
  type Tables,
} from '@smart-gym/supabase';
import { createClient } from '@/lib/supabase/client';

const SELECTED_MEMBER_GYM_KEY = 'smart-gym:selected-member-gym-id';

interface MemberContextValue {
  client: ReturnType<typeof createClient>;
  userId: string | null;
  profile: Tables<'profiles'> | null | undefined;
  membership: Tables<'gym_memberships'> | null | undefined;
  memberships: Tables<'gym_memberships'>[];
  gym: Tables<'gyms'> | null;
  role: 'member';
  switchGym: (gymId: string) => void;
  isLoading: boolean;
  error: Error | null;
}

const MemberContext = createContext<MemberContextValue | null>(null);

function readStoredGymId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(SELECTED_MEMBER_GYM_KEY);
  } catch {
    return null;
  }
}

function writeStoredGymId(gymId: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SELECTED_MEMBER_GYM_KEY, gymId);
  } catch {
    // ignore
  }
}

export function MemberProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSelectedGymId(readStoredGymId());
    setHydrated(true);
  }, []);

  const userQuery = useQuery({
    queryKey: ['current-user-id'],
    queryFn: () => getCurrentUserId(client),
  });

  const userId = userQuery.data ?? null;
  const profileQuery = useProfile(client, userId);
  const membershipsQuery = useActiveMemberships(client, userId);
  const memberships = membershipsQuery.data ?? [];

  useEffect(() => {
    if (!hydrated || membershipsQuery.isLoading) return;
    if (!memberships.length) {
      setSelectedGymId(null);
      return;
    }

    const stillValid = selectedGymId && memberships.some((m) => m.gym_id === selectedGymId);
    if (stillValid) return;

    const nextId = memberships[0]!.gym_id;
    setSelectedGymId(nextId);
    writeStoredGymId(nextId);
  }, [hydrated, memberships, membershipsQuery.isLoading, selectedGymId]);

  const membership =
    memberships.find((m) => m.gym_id === selectedGymId) ?? memberships[0] ?? null;
  const gymId = membership?.gym_id;

  const gymQuery = useQuery({
    queryKey: ['member-gym', gymId ?? ''],
    queryFn: async () => {
      if (!gymId) return null;
      return getGymById(client, gymId);
    },
    enabled: Boolean(gymId),
  });

  const switchGym = useCallback(
    (gymIdNext: string) => {
      if (!memberships.some((m) => m.gym_id === gymIdNext)) return;
      setSelectedGymId(gymIdNext);
      writeStoredGymId(gymIdNext);
      void queryClient.invalidateQueries();
    },
    [memberships, queryClient],
  );

  const value: MemberContextValue = {
    client,
    userId,
    profile: profileQuery.data,
    membership,
    memberships,
    gym: gymQuery.data ?? null,
    role: 'member',
    switchGym,
    isLoading:
      !hydrated ||
      userQuery.isLoading ||
      profileQuery.isLoading ||
      membershipsQuery.isLoading ||
      (Boolean(gymId) && gymQuery.isLoading),
    error:
      (userQuery.error as Error | null) ??
      (profileQuery.error as Error | null) ??
      (membershipsQuery.error as Error | null) ??
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
