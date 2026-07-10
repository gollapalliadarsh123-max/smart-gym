import type { Metadata } from 'next';
import { OwnerOverview } from '@/features/owner/components/owner-overview';

export const metadata: Metadata = {
  title: 'Owner dashboard',
};

export default function OwnerDashboardPage() {
  return <OwnerOverview />;
}
