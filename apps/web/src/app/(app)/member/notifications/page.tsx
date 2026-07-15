import type { Metadata } from 'next';
import { MemberNotificationsPanel } from '@/features/member/components/member-notifications-panel';
import { PageContainer } from '@/components/layout/page-container';

export const metadata: Metadata = { title: 'Notifications' };

export default function Page() {
  return (
    <PageContainer>
      <MemberNotificationsPanel />
    </PageContainer>
  );
}
