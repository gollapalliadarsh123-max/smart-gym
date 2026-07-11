import type { Metadata } from 'next';
import { MemberLegacyDashboard } from '@/features/legacy-ui/member-legacy-dashboard';

export const metadata: Metadata = {
  title: 'Member dashboard',
};

export default function MemberPage() {
  return <MemberLegacyDashboard />;
}
