import type { Metadata } from 'next';
import { MemberPartnerGymsPanel } from '@/features/member/components/member-partner-gyms-panel';

export const metadata: Metadata = { title: 'Partner gyms' };

export default function Page() {
  return <MemberPartnerGymsPanel />;
}
