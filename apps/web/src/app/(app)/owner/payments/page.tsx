import type { Metadata } from 'next';
import { OwnerPaymentsPanel } from '@/features/owner/components/owner-payments-panel';
import { PageContainer } from '@/components/layout/page-container';

export const metadata: Metadata = { title: 'Payments' };

export default function Page() {
  return (
    <PageContainer>
      <OwnerPaymentsPanel />
    </PageContainer>
  );
}
