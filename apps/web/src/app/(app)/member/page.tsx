import type { Metadata } from 'next';
import { MemberHome } from '@/features/member/components/member-home';

export const metadata: Metadata = { title: 'Member dashboard' };

export default function MemberPage() {
  return <MemberHome />;
}
