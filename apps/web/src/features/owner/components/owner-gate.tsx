'use client';

import { useOwnerContext } from '@/features/owner/components/owner-provider';
import type { ReactNode } from 'react';

export function OwnerGate({ children }: { children: ReactNode }) {
  const { isLoading, error, gym, userId } = useOwnerContext();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading your gym…</p>;
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

  if (!gym) {
    return (
      <div className="space-y-2 rounded-xl border border-dashed border-border/80 bg-muted/30 p-8">
        <h2 className="text-lg font-medium">No gym found</h2>
        <p className="text-sm text-muted-foreground">
          Your account does not own a gym yet. Complete owner signup or contact support.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
