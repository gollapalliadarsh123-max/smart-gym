import type { Metadata } from 'next';
import { OwnerMembersPanel } from '@/features/owner/components/owner-members-panel';
import { PageContainer } from '@/components/layout/page-container';

export const metadata: Metadata = { title: 'Members' };

export default function Page() {
  return (
    <PageContainer>
      <OwnerMembersPanel />
    </PageContainer>
  );
}
