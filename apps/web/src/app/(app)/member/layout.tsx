import { MemberProvider } from '@/features/member/components/member-provider';
import { MemberGate } from '@/features/member/components/member-gate';
import { MemberShell } from '@/features/member/components/member-shell';
import type { ReactNode } from 'react';

export default function MemberLayout({ children }: { children: ReactNode }) {
  return (
    <MemberProvider>
      <MemberShell>
        <MemberGate>{children}</MemberGate>
      </MemberShell>
    </MemberProvider>
  );
}
