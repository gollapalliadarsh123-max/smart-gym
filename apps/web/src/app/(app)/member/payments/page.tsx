import type { Metadata } from 'next';
import { MemberPaymentsPanel } from '@/features/member/components/member-payments-panel';
import { PageContainer } from '@/components/layout/page-container';

export const metadata: Metadata = { title: 'Payments' };

export default function Page() {
  return (
    <PageContainer>
      <MemberPaymentsPanel />
    </PageContainer>
  );
}
