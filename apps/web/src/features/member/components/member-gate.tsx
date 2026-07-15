'use client';

import { useMemberContext } from '@/features/member/components/member-provider';
import { PageContainer } from '@/components/layout/page-container';
import { ErrorState, LoadingState } from '@/components/layout/feedback-states';
import type { ReactNode } from 'react';

export function MemberGate({ children }: { children: ReactNode }) {
  const { isLoading, error, userId, membership } = useMemberContext();

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading your membership…" />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <ErrorState title="Could not load membership" description={error.message} />
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

  if (!membership) {
    return (
      <PageContainer>
        <ErrorState
          title="No active membership"
          description="Join a gym with its code, then wait for the owner to approve you."
        />
      </PageContainer>
    );
  }

  return <>{children}</>;
}
