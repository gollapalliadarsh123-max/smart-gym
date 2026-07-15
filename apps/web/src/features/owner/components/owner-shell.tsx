'use client';

import {
  ClipboardCheck,
  LayoutDashboard,
  Megaphone,
  Settings2,
  Users,
  Wallet,
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
      variant="owner"
      title={gym?.name ?? 'Owner'}
      subtitle={gym?.code ? `Code ${gym.code}` : 'Smart Gym'}
      nav={[
        { href: '/owner', label: 'Home', icon: LayoutDashboard, exact: true, primary: true },
        {
          href: '/owner/members',
          label: 'Members',
          icon: Users,
          badge: pendingCount,
          primary: true,
        },
        { href: '/owner/attendance', label: 'Attendance', icon: ClipboardCheck, primary: true },
        { href: '/owner/payments', label: 'Payments', icon: Wallet, primary: true },
        { href: '/owner/broadcast', label: 'Broadcast', icon: Megaphone },
        { href: '/owner/settings', label: 'Settings', icon: Settings2 },
      ]}
    >
      {children}
    </AppShell>
  );
}
