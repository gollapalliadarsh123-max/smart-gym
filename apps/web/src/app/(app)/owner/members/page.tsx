import type { Metadata } from 'next';
import { OwnerMembersPanel } from '@/features/owner/components/owner-members-panel';

export const metadata: Metadata = {
  title: 'Members',
};

export default function OwnerMembersPage() {
  return <OwnerMembersPanel />;
}
