import { OwnerProvider } from '@/features/owner/components/owner-provider';
import { OwnerGate } from '@/features/owner/components/owner-gate';
import { OwnerShell } from '@/features/owner/components/owner-shell';
import type { ReactNode } from 'react';

export default function OwnerLayout({ children }: { children: ReactNode }) {
  return (
    <OwnerProvider>
      <OwnerShell>
        <OwnerGate>{children}</OwnerGate>
      </OwnerShell>
    </OwnerProvider>
  );
}
