import type { Metadata } from 'next';
import { TokenCheckInPageClient } from '@/features/attendance/components/token-check-in-page-client';

export const metadata: Metadata = { title: 'Gym check-in' };

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <TokenCheckInPageClient token={token} />;
}
