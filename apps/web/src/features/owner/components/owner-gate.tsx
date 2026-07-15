'use client';

import { useOwnerContext } from '@/features/owner/components/owner-provider';
import { PageContainer } from '@/components/layout/page-container';
import { ErrorState, LoadingState } from '@/components/layout/feedback-states';
import type { ReactNode } from 'react';

export function OwnerGate({ children }: { children: ReactNode }) {
  const { isLoading, error, gym, userId } = useOwnerContext();

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading your gym…" />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <ErrorState title="Could not load gym" description={error.message} />
      </PageContainer>
    );
  }

  if (!userId) {
    return (
      <PageContainer>
        <ErrorState title="Sign in required" description="Please log in to continue." />
      </PageContainer>
    );
  }

  if (!gym) {
    return (
      <PageContainer>
        <ErrorState
          title="No gym found"
          description="Your account does not own a gym yet. Complete owner signup or contact support."
        />
      </PageContainer>
    );
  }

  return <>{children}</>;
}
