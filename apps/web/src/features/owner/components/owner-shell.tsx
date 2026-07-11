'use client';

import { usePendingJoinRequests } from '@smart-gym/supabase';
import { DashboardShell } from '@/features/dashboard/components/dashboard-shell';
import { useOwnerContext } from '@/features/owner/components/owner-provider';
import type { ReactNode } from 'react';

export function OwnerShell({ children }: { children: ReactNode }) {
  const { client, gym } = useOwnerContext();
  const pendingQuery = usePendingJoinRequests(client, gym?.id);
  const pendingCount = pendingQuery.data?.length ?? 0;

  const nav = [
    { href: '/owner', label: 'Dashboard', exact: true as const },
    { href: '/owner/members', label: 'Members', badge: pendingCount },
    { href: '/owner/attendance', label: 'Attendance' },
    { href: '/owner/payments', label: 'Payments' },
    { href: '/owner/broadcast', label: 'Notifications' },
    { href: '/owner/settings', label: 'Settings' },
  ];

  return (
    <DashboardShell
      title={gym?.name ?? 'Owner'}
      subtitle={gym?.code ? `Code ${gym.code}` : 'Smart Gym'}
      nav={nav}
    >
      {children}
    </DashboardShell>
  );
}
