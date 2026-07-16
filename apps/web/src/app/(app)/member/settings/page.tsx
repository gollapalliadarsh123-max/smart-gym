import type { Metadata } from 'next';
import { MemberSettingsPanel } from '@/features/member/components/member-settings-panel';
import { PageContainer } from '@/components/layout/page-container';

export const metadata: Metadata = { title: 'Profile Settings' };

export default function Page() {
  return (
    <PageContainer>
      <MemberSettingsPanel />
    </PageContainer>
  );
}
