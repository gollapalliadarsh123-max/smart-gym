import type { Metadata } from 'next';
import { MemberSocialPanel } from '@/features/member/components/member-social-panel';

export const metadata: Metadata = {
  title: 'Friends',
};

export default function MemberFriendsPage() {
  return <MemberSocialPanel />;
}
