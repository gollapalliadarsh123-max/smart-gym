import type { Metadata } from 'next';
import { CheckInPageClient } from '@/features/attendance/components/check-in-page-client';

export const metadata: Metadata = {
  title: 'Self check-in',
};

export default function CheckInPage() {
  return <CheckInPageClient />;
}
