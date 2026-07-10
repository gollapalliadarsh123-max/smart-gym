import type { Metadata } from 'next';
import { OwnerPaymentsPanel } from '@/features/owner/components/owner-payments-panel';

export const metadata: Metadata = {
  title: 'Payments',
};

export default function OwnerPaymentsPage() {
  return <OwnerPaymentsPanel />;
}
