'use client';

import { DashboardShell } from '@/features/dashboard/components/dashboard-shell';
import { useMemberContext } from '@/features/member/components/member-provider';
import type { ReactNode } from 'react';

const NAV = [
  { href: '/member', label: 'Dashboard', exact: true },
  { href: '/member/notifications', label: 'Notifications' },
  { href: '/member/attendance', label: 'Attendance' },
  { href: '/member/payments', label: 'Payments' },
  { href: '/member/diet', label: 'Diet', icon: '✦' },
  { href: '/member/league', label: 'Leaderboard', icon: '✦' },
  { href: '/member/friends', label: 'Friends & Chat', icon: '✦' },
];

export function MemberShell({ children }: { children: ReactNode }) {
  const { profile, gym } = useMemberContext();
  const name =
    profile?.full_name?.trim() ||
    `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() ||
    'Member';

  return (
    <DashboardShell
      title={name}
      subtitle={gym?.code ? `GYM ${gym.code}` : 'Smart Gym'}
      nav={NAV}
    >
      {children}
    </DashboardShell>
  );
}
