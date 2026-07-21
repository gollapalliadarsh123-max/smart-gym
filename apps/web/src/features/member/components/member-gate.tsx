'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getGymById, listMemberJoinRequests } from '@smart-gym/supabase';
import { useMemberContext } from '@/features/member/components/member-provider';
import { PageContainer } from '@/components/layout/page-container';
import { ErrorState, LoadingState } from '@/components/layout/feedback-states';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/** Routes members can use before their membership is approved/active. */
function isPreMembershipAllowed(pathname: string) {
  return (
    pathname === '/member/settings' ||
    pathname.startsWith('/member/settings/')
  );
}

export function MemberGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { client, isLoading, error, userId, membership } = useMemberContext();
  const allowWithoutMembership = isPreMembershipAllowed(pathname);

  const joinRequestsQuery = useQuery({
    queryKey: ['member-join-requests', userId ?? ''],
    queryFn: () => {
      if (!userId) return [];
      return listMemberJoinRequests(client, userId);
    },
    enabled: Boolean(userId) && !membership,
  });

  const pendingJoin = (joinRequestsQuery.data ?? []).find((r) => r.status === 'pending');
  const pendingGymQuery = useQuery({
    queryKey: ['pending-join-gym', pendingJoin?.gym_id ?? ''],
    queryFn: () => getGymById(client, pendingJoin!.gym_id),
    enabled: Boolean(pendingJoin?.gym_id),
  });

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

  // Profile can be edited before membership starts / while waiting for approval.
  if (!membership && allowWithoutMembership) {
    return <>{children}</>;
  }

  if (!membership) {
    const gymName = pendingGymQuery.data?.name;
    return (
      <PageContainer>
        <div className="mx-auto max-w-lg space-y-4 rounded-[20px] border border-border bg-card p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight">
            {pendingJoin ? 'Membership pending' : 'No active membership'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {pendingJoin
              ? `Your join request${gymName ? ` for ${gymName}` : ''} is waiting for owner approval. You can update your profile now — gym features unlock after approval.`
              : 'Join a gym with its code, then wait for the owner to approve you. You can still complete your profile while you wait.'}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href="/member/settings"
              className={cn(buttonVariants({ size: 'lg' }), 'min-h-11')}
            >
              Edit profile
            </Link>
            <Link
              href="/signup/member"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'min-h-11')}
            >
              Join a gym
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  return <>{children}</>;
}
