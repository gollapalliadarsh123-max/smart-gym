import { OwnerProvider } from '@/features/owner/components/owner-provider';
import { OwnerGate } from '@/features/owner/components/owner-gate';
import type { ReactNode } from 'react';
import '@/styles/legacy.css';

export default function OwnerLayout({ children }: { children: ReactNode }) {
  return (
    <OwnerProvider>
      <OwnerGate>{children}</OwnerGate>
    </OwnerProvider>
  );
}
