import type { Metadata } from 'next';
import { OwnerPartnershipsPanel } from '@/features/owner/components/owner-partnerships-panel';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';

export const metadata: Metadata = { title: 'Partnerships' };

export default function Page() {
  return (
    <PageContainer>
      <PageHeader
        title="Partnerships"
        description="Connect with partner gyms for multi-gym member access."
      />
      <OwnerPartnershipsPanel />
    </PageContainer>
  );
}
