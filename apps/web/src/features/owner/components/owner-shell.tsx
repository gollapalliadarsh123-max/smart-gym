'use client';

import {
  ClipboardCheck,
  Handshake,
  LayoutDashboard,
  Megaphone,
  QrCode,
  Settings2,
  Users,
  Wallet,
} from 'lucide-react';
import { usePendingJoinRequests } from '@smart-gym/supabase';
import { AppShell } from '@/components/layout/app-shell';
import { GymSwitcher } from '@/components/layout/gym-switcher';
import { useOwnerContext } from '@/features/owner/components/owner-provider';
import type { ReactNode } from 'react';

export function OwnerShell({ children }: { children: ReactNode }) {
  const { client, gym, gyms, switchGym } = useOwnerContext();
  const pendingQuery = usePendingJoinRequests(client, gym?.id);
  const pendingCount = pendingQuery.data?.length ?? 0;

  const switcher = (
    <GymSwitcher
      gyms={gyms.map((g) => ({ id: g.id, name: g.name, code: g.code }))}
      selectedId={gym?.id}
      onSelect={switchGym}
    />
  );

  return (
    <AppShell
      variant="owner"
      title={gym?.name ?? 'Owner'}
      subtitle={gym?.code ? `Code ${gym.code}` : 'Smart Gym'}
      headerSlot={switcher}
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
        { href: '/owner/gym-qr', label: 'Gym QR', icon: QrCode },
        { href: '/owner/partnerships', label: 'Partners', icon: Handshake },
        { href: '/owner/broadcast', label: 'Broadcast', icon: Megaphone },
        { href: '/owner/settings', label: 'Settings', icon: Settings2 },
      ]}
    >
      {children}
    </AppShell>
  );
}
