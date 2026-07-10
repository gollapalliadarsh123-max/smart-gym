import type { Metadata } from 'next';
import { MemberDietPanel } from '@/features/member/components/member-diet-panel';

export const metadata: Metadata = {
  title: 'Diet',
};

export default function MemberDietPage() {
  return <MemberDietPanel />;
}
