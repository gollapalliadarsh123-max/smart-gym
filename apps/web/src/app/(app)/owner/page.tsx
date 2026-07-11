import type { Metadata } from 'next';
import { OwnerLegacyDashboard } from '@/features/legacy-ui/owner-legacy-dashboard';

export const metadata: Metadata = {
  title: 'Owner dashboard',
};

export default function OwnerPage() {
  return <OwnerLegacyDashboard />;
}
