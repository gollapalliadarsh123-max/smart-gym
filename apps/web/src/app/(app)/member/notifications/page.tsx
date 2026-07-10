import type { Metadata } from 'next';
import { MemberNotificationsPanel } from '@/features/member/components/member-notifications-panel';

export const metadata: Metadata = {
  title: 'Notifications',
};

export default function MemberNotificationsPage() {
  return <MemberNotificationsPanel />;
}
