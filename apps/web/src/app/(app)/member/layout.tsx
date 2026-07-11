import { MemberProvider } from '@/features/member/components/member-provider';
import { MemberGate } from '@/features/member/components/member-gate';
import type { ReactNode } from 'react';
import '@/styles/legacy.css';

export default function MemberLayout({ children }: { children: ReactNode }) {
  return (
    <MemberProvider>
      <MemberGate>{children}</MemberGate>
    </MemberProvider>
  );
}
