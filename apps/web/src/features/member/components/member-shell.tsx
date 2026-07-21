'use client';

import {
  Bell,
  CreditCard,
  Dumbbell,
  Home,
  MapPinned,
  Settings,
  Trophy,
  Users,
  Utensils,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getGymById } from '@smart-gym/supabase';
import { AppShell } from '@/components/layout/app-shell';
import { GymSwitcher } from '@/components/layout/gym-switcher';
import { useMemberContext } from '@/features/member/components/member-provider';
import type { ReactNode } from 'react';

export function MemberShell({ children }: { children: ReactNode }) {
  const { client, profile, gym, membership, memberships, switchGym } = useMemberContext();
  const name =
    profile?.full_name?.trim() ||
    `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() ||
    'Member';

  const gymIds = memberships.map((m) => m.gym_id);
  const gymOptionsQuery = useQuery({
    queryKey: ['member-gym-options', gymIds.join(',')],
    queryFn: async () => {
      const rows = await Promise.all(gymIds.map((id) => getGymById(client, id)));
      return rows.filter(Boolean).map((g) => ({
        id: g!.id,
        name: g!.name,
        code: g!.code,
      }));
    },
    enabled: gymIds.length > 0,
  });

  const switcherGyms =
    gymOptionsQuery.data ??
    (gym ? [{ id: gym.id, name: gym.name, code: gym.code }] : []);

  const headerSlot =
    switcherGyms.length > 1 ? (
      <div className="min-w-0">
        <p className="mb-1 truncate text-xs text-muted-foreground">{name}</p>
        <GymSwitcher
          gyms={switcherGyms}
          selectedId={gym?.id}
          onSelect={switchGym}
        />
      </div>
    ) : undefined;

  const hasMembership = Boolean(membership);
  const nav = hasMembership
    ? [
        { href: '/member', label: 'Home', icon: Home, exact: true, primary: true },
        { href: '/member/attendance', label: 'Attendance', icon: Dumbbell, primary: true },
        { href: '/member/diet', label: 'Diet', icon: Utensils, primary: true },
        { href: '/member/payments', label: 'Payments', icon: CreditCard, primary: true },
        { href: '/member/friends', label: 'Friends', icon: Users, primary: true },
        { href: '/member/partner-gyms', label: 'Partners', icon: MapPinned },
        { href: '/member/league', label: 'League', icon: Trophy },
        { href: '/member/notifications', label: 'Alerts', icon: Bell },
        { href: '/member/settings', label: 'Profile', icon: Settings },
      ]
    : [
        { href: '/member', label: 'Home', icon: Home, exact: true, primary: true },
        { href: '/member/settings', label: 'Profile', icon: Settings, primary: true },
      ];

  return (
    <AppShell
      title={name}
      subtitle={
        gym?.name ?? gym?.code ?? (hasMembership ? 'Smart Gym' : 'Complete your profile')
      }
      headerSlot={headerSlot}
      nav={nav}
    >
      {children}
    </AppShell>
  );
}
