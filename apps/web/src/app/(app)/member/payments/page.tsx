import type { Metadata } from 'next';
import { MemberPaymentsPanel } from '@/features/member/components/member-payments-panel';

export const metadata: Metadata = {
  title: 'Payments',
};

export default function MemberPaymentsPage() {
  return <MemberPaymentsPanel />;
}
