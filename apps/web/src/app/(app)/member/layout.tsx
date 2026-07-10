import { MemberProvider } from '@/features/member/components/member-provider';
import { MemberShell } from '@/features/member/components/member-shell';
import { MemberGate } from '@/features/member/components/member-gate';
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
