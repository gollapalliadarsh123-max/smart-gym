'use client';

import {
  Bell,
  CreditCard,
  Dumbbell,
  Home,
  Settings,
  Users,
} from 'lucide-react';
import { usePendingJoinRequests } from '@smart-gym/supabase';
import { AppShell } from '@/components/layout/app-shell';
import { useOwnerContext } from '@/features/owner/components/owner-provider';
import type { ReactNode } from 'react';

export function OwnerShell({ children }: { children: ReactNode }) {
  const { client, gym } = useOwnerContext();
  const pendingQuery = usePendingJoinRequests(client, gym?.id);
  const pendingCount = pendingQuery.data?.length ?? 0;

  return (
    <AppShell
      title={gym?.name ?? 'Owner'}
      subtitle={gym?.code ? `Code ${gym.code}` : 'Smart Gym'}
      nav={[
        { href: '/owner', label: 'Home', icon: Home, exact: true, primary: true },
        {
          href: '/owner/members',
          label: 'Members',
          icon: Users,
          badge: pendingCount,
          primary: true,
        },
        { href: '/owner/attendance', label: 'Attendance', icon: Dumbbell, primary: true },
        { href: '/owner/payments', label: 'Payments', icon: CreditCard, primary: true },
        { href: '/owner/broadcast', label: 'Broadcast', icon: Bell },
        { href: '/owner/settings', label: 'Settings', icon: Settings },
      ]}
    >
      {children}
    </AppShell>
  );
}
