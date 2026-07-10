import type { Metadata } from 'next';
import { MemberLeaguePanel } from '@/features/member/components/member-league-panel';

export const metadata: Metadata = {
  title: 'League',
};

export default function MemberLeaguePage() {
  return <MemberLeaguePanel />;
}
