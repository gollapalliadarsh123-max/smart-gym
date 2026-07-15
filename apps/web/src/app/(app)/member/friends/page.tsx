import type { Metadata } from 'next';
import { MemberSocialPanel } from '@/features/member/components/member-social-panel';
import { PageContainer } from '@/components/layout/page-container';

export const metadata: Metadata = { title: 'Friends' };

export default function Page() {
  return (
    <PageContainer>
      <MemberSocialPanel />
    </PageContainer>
  );
}
