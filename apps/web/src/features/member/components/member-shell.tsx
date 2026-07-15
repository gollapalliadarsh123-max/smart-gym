'use client';

import {
  Bell,
  CreditCard,
  Dumbbell,
  Home,
  Trophy,
  Users,
  Utensils,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useMemberContext } from '@/features/member/components/member-provider';
import type { ReactNode } from 'react';

export function MemberShell({ children }: { children: ReactNode }) {
  const { profile, gym } = useMemberContext();
  const name =
    profile?.full_name?.trim() ||
    `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() ||
    'Member';

  return (
    <AppShell
      title={name}
      subtitle={gym?.name ?? gym?.code ?? 'Smart Gym'}
      nav={[
        { href: '/member', label: 'Home', icon: Home, exact: true, primary: true },
        { href: '/member/attendance', label: 'Attendance', icon: Dumbbell, primary: true },
        { href: '/member/diet', label: 'Diet', icon: Utensils, primary: true },
        { href: '/member/payments', label: 'Payments', icon: CreditCard, primary: true },
        { href: '/member/league', label: 'League', icon: Trophy },
        { href: '/member/friends', label: 'Friends', icon: Users, primary: true },
        { href: '/member/notifications', label: 'Alerts', icon: Bell },
      ]}
    >
      {children}
    </AppShell>
  );
}
