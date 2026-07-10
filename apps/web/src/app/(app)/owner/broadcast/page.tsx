import type { Metadata } from 'next';
import { OwnerBroadcastPanel } from '@/features/owner/components/owner-broadcast-panel';

export const metadata: Metadata = {
  title: 'Broadcast',
};

export default function OwnerBroadcastPage() {
  return <OwnerBroadcastPanel />;
}
