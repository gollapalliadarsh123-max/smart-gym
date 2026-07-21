'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  getCurrentUserId,
  getGymById,
  useActiveMembership,
  useMemberAttendanceToday,
  usePartnerCheckIn,
  useSelfCheckIn,
} from '@smart-gym/supabase';
import { getTodayYmd } from '@smart-gym/shared';
import { createClient } from '@/lib/supabase/client';
import { AuthLayout } from '@/features/auth/components/auth-layout';
import { AuthCard } from '@/features/auth/components/auth-card';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function CheckInInner() {
  const searchParams = useSearchParams();
  const gymId = searchParams.get('gym');
  const client = useMemo(() => createClient(), []);
  const today = getTodayYmd();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userQuery = useQuery({
    queryKey: ['current-user-id'],
    queryFn: () => getCurrentUserId(client),
  });
  const userId = userQuery.data ?? null;
  const membershipAtGymQuery = useActiveMembership(client, userId, gymId);
  const anyMembershipQuery = useActiveMembership(client, userId);
  const gymQuery = useQuery({
    queryKey: ['check-in-gym', gymId ?? ''],
    queryFn: () => (gymId ? getGymById(client, gymId) : null),
    enabled: Boolean(gymId),
  });
  const todayAttendance = useMemberAttendanceToday(client, userId, today, gymId);
  const selfCheckIn = useSelfCheckIn(client);
  const partnerCheckIn = usePartnerCheckIn(client);

  if (!gymId) {
    return <p className="text-sm text-destructive">Missing gym in check-in link.</p>;
  }

  if (userQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Checking session…</p>;
  }

  if (!userId) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">Sign in to check in at this gym.</p>
        <Link
          href={`/login?next=${encodeURIComponent(`/check-in?gym=${gymId}`)}`}
          className={cn(buttonVariants(), 'inline-flex')}
        >
          Sign in
        </Link>
      </div>
    );
  }

  const isHomeGym = Boolean(membershipAtGymQuery.data);
  const hasAnyMembership = Boolean(anyMembershipQuery.data);
  const canAttemptPartner = !isHomeGym && hasAnyMembership;
  const noAccess =
    !membershipAtGymQuery.isLoading &&
    !anyMembershipQuery.isLoading &&
    !isHomeGym &&
    !hasAnyMembership;

  async function handleCheckIn() {
    setMessage(null);
    setError(null);
    try {
      if (isHomeGym) {
        const result = await selfCheckIn.mutateAsync(gymId!);
        setMessage(result.already_marked ? 'Already checked in today.' : 'You are checked in.');
      } else {
        const result = await partnerCheckIn.mutateAsync({
          visitedGymId: gymId!,
          checkInMethod: 'qr',
        });
        if (result.success) setMessage(result.message);
        else setError(result.message);
      }
      await todayAttendance.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in failed.');
    }
  }

  const pending =
    selfCheckIn.isPending ||
    partnerCheckIn.isPending ||
    membershipAtGymQuery.isLoading ||
    anyMembershipQuery.isLoading;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Checking in at</p>
        <p className="mt-1 text-xl font-semibold">{gymQuery.data?.name ?? 'Gym'}</p>
        {canAttemptPartner ? (
          <p className="mt-1 text-xs text-muted-foreground">Partner gym check-in</p>
        ) : null}
      </div>

      {noAccess ? (
        <p className="text-sm text-destructive" role="alert">
          You need an active membership to check in.
        </p>
      ) : (
        <Button
          className="w-full"
          size="lg"
          disabled={pending || Boolean(todayAttendance.data)}
          onClick={() => void handleCheckIn()}
        >
          {todayAttendance.data
            ? 'Already checked in today'
            : pending
              ? 'Checking in…'
              : canAttemptPartner
                ? 'Partner check-in'
                : 'Confirm check-in'}
        </Button>
      )}

      {message ? (
        <p className="text-center text-sm" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-center text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/member/attendance" className="text-primary underline-offset-4 hover:underline">
          Back to attendance
        </Link>
      </p>
    </div>
  );
}

export function CheckInPageClient() {
  return (
    <AuthLayout>
      <AuthCard title="Self check-in" description="Confirm your presence at the gym.">
        <Suspense fallback={<p className="text-center text-sm text-muted-foreground">Loading…</p>}>
          <CheckInInner />
        </Suspense>
      </AuthCard>
    </AuthLayout>
  );
}
