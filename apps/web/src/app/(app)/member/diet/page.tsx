import type { Metadata } from 'next';
import { MemberDietPanel } from '@/features/member/components/member-diet-panel';
import { PageContainer } from '@/components/layout/page-container';

export const metadata: Metadata = { title: 'Diet' };

export default function Page() {
  return (
    <PageContainer>
      <MemberDietPanel />
    </PageContainer>
  );
}
