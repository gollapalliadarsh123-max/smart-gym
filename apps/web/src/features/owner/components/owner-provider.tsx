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
import { getCurrentUserId, useOwnerGyms, useProfile, type Tables } from '@smart-gym/supabase';
import { createClient } from '@/lib/supabase/client';

const SELECTED_GYM_KEY = 'smart-gym:selected-owner-gym-id';

interface OwnerContextValue {
  client: ReturnType<typeof createClient>;
  userId: string | null;
  profile: Tables<'profiles'> | null | undefined;
  gym: Tables<'gyms'> | null;
  gyms: Tables<'gyms'>[];
  role: 'owner';
  switchGym: (gymId: string) => void;
  isLoading: boolean;
  error: Error | null;
}

const OwnerContext = createContext<OwnerContextValue | null>(null);

function readStoredGymId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(SELECTED_GYM_KEY);
  } catch {
    return null;
  }
}

function writeStoredGymId(gymId: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SELECTED_GYM_KEY, gymId);
  } catch {
    // ignore storage failures
  }
}

export function OwnerProvider({ children }: { children: ReactNode }) {
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
  const gymsQuery = useOwnerGyms(client, userId);
  const gyms = gymsQuery.data ?? [];

  useEffect(() => {
    if (!hydrated || gymsQuery.isLoading) return;
    if (!gyms.length) {
      setSelectedGymId(null);
      return;
    }

    const stillValid = selectedGymId && gyms.some((g) => g.id === selectedGymId);
    if (stillValid) return;

    const nextId = gyms[0]!.id;
    setSelectedGymId(nextId);
    writeStoredGymId(nextId);
  }, [hydrated, gyms, gymsQuery.isLoading, selectedGymId]);

  const switchGym = useCallback(
    (gymId: string) => {
      if (!gyms.some((g) => g.id === gymId)) return;
      setSelectedGymId(gymId);
      writeStoredGymId(gymId);
      void queryClient.invalidateQueries();
    },
    [gyms, queryClient],
  );

  const gym = gyms.find((g) => g.id === selectedGymId) ?? gyms[0] ?? null;

  const value: OwnerContextValue = {
    client,
    userId,
    profile: profileQuery.data,
    gym,
    gyms,
    role: 'owner',
    switchGym,
    isLoading:
      !hydrated ||
      userQuery.isLoading ||
      profileQuery.isLoading ||
      gymsQuery.isLoading,
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
