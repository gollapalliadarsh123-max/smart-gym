'use client';

import { useMemberContext } from '@/features/member/components/member-provider';
import type { ReactNode } from 'react';

export function MemberGate({ children }: { children: ReactNode }) {
  const { isLoading, error, userId, membership } = useMemberContext();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading your membership…</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error.message}
      </p>
    );
  }

  if (!userId) {
    return <p className="text-sm text-muted-foreground">Sign in required.</p>;
  }

  if (!membership) {
    return (
      <div className="space-y-2 rounded-xl border border-dashed border-border/80 bg-muted/30 p-8">
        <h2 className="text-lg font-medium">No active membership</h2>
        <p className="text-sm text-muted-foreground">
          Join a gym with its code, then wait for the owner to approve you before using attendance.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
