import type { Metadata } from 'next';
import { OwnerBroadcastPanel } from '@/features/owner/components/owner-broadcast-panel';
import { PageContainer } from '@/components/layout/page-container';

export const metadata: Metadata = { title: 'Broadcast' };

export default function Page() {
  return (
    <PageContainer>
      <OwnerBroadcastPanel />
    </PageContainer>
  );
}
