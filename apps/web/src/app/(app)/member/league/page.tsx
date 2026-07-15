import type { Metadata } from 'next';
import { MemberLeaguePanel } from '@/features/member/components/member-league-panel';
import { PageContainer } from '@/components/layout/page-container';

export const metadata: Metadata = { title: 'League' };

export default function Page() {
  return (
    <PageContainer>
      <MemberLeaguePanel />
    </PageContainer>
  );
}
