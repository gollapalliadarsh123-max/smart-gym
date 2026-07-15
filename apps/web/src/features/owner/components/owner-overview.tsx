'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  attendanceCodeSchema,
  calculateCrowdLevel,
  countLiveMembers,
  getTodayYmd,
} from '@smart-gym/shared';
import {
  sumPaidInMonth,
  useGymAttendanceToday,
  useGymMembers,
  useGymPayments,
  useMarkAttendanceByCode,
  usePendingJoinRequests,
  useProfilesMap,
} from '@smart-gym/supabase';
import { useOwnerContext } from '@/features/owner/components/owner-provider';
import { CrowdMeter } from '@/features/attendance/components/crowd-meter';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/layout/section-card';
import { StatCard } from '@/components/layout/stat-card';
import { EmptyState } from '@/components/layout/feedback-states';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function profileLabel(
  profile: { full_name?: string; first_name?: string; last_name?: string; email?: string } | undefined,
  userId: string,
) {
  if (!profile) return userId.slice(0, 8) + '…';
  if (profile.full_name?.trim()) return profile.full_name.trim();
  const name = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
  return name || profile.email || userId.slice(0, 8) + '…';
}

export function OwnerOverview() {
  const { client, gym } = useOwnerContext();
  const gymId = gym?.id;
  const today = getTodayYmd();

  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const membersQuery = useGymMembers(client, gymId);
  const pendingQuery = usePendingJoinRequests(client, gymId);
  const paymentsQuery = useGymPayments(client, { gymId, limit: 200 });
  const todayQuery = useGymAttendanceToday(client, gymId, today);
  const activeMembersQuery = useGymMembers(client, gymId, 'active');
  const mark = useMarkAttendanceByCode(client);

  const members = membersQuery.data ?? [];
  const active = members.filter((m) => m.status === 'active');
  const pending = useMemo(() => pendingQuery.data ?? [], [pendingQuery.data]);
  const monthlyRevenue = sumPaidInMonth(paymentsQuery.data ?? []);
  const todayRows = todayQuery.data ?? [];

  const pendingIds = useMemo(() => pending.map((p) => p.user_id), [pending]);
  const profilesQuery = useProfilesMap(client, pendingIds);
  const profiles = profilesQuery.data ?? {};

  const liveCount = countLiveMembers(
    todayRows.map((row) => ({
      user_id: row.user_id,
      expires_at: row.expires_at,
      check_in_timestamp: row.checked_in_at,
    })),
  );
  const crowdLevel = calculateCrowdLevel(liveCount, (activeMembersQuery.data ?? []).length);

  const checkInUrl =
    typeof window !== 'undefined' && gymId
      ? `${window.location.origin}/check-in?gym=${gymId}`
      : gymId
        ? `/check-in?gym=${gymId}`
        : '';

  async function handleMark(e: React.FormEvent) {
    e.preventDefault();
    if (!gymId) return;
    setMessage(null);
    setError(null);
    const parsed = attendanceCodeSchema.safeParse(code);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid 4-digit code.');
      return;
    }
    try {
      const result = await mark.mutateAsync({ gymId, code: parsed.data });
      setCode('');
      setMessage(
        result.already_marked
          ? 'Member was already marked today.'
          : 'Attendance marked successfully.',
      );
      await todayQuery.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark attendance.');
    }
  }

  async function copyCheckInLink() {
    if (!checkInUrl) return;
    try {
      const absolute = checkInUrl.startsWith('http')
        ? checkInUrl
        : `${window.location.origin}${checkInUrl}`;
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy link.');
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title={gym?.name ?? 'Owner dashboard'}
        description="Members, attendance, payments, and requests in one place."
        actions={
          <>
            <Link href="/owner/members" className={cn(buttonVariants({ size: 'lg' }), 'min-h-11')}>
              Members
            </Link>
            <Link
              href="/owner/payments"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'min-h-11')}
            >
              Record payment
            </Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active members" value={active.length} hint={`${members.length} total`} />
        <StatCard label="Today’s attendance" value={todayRows.length} />
        <StatCard label="Monthly income" value={`₹${monthlyRevenue.toFixed(0)}`} />
        <StatCard
          label="Pending requests"
          value={pending.length}
          hint={pending.length ? 'Needs review' : 'All clear'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Mark attendance" description="Enter a member’s 4-digit code">
          <form onSubmit={(e) => void handleMark(e)} className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="4-digit code"
              maxLength={4}
              className="min-h-11 font-mono text-lg tracking-widest sm:max-w-[160px]"
              inputMode="numeric"
              aria-label="Attendance code"
            />
            <Button type="submit" className="min-h-11" disabled={mark.isPending || !gymId}>
              {mark.isPending ? 'Marking…' : 'Mark'}
            </Button>
          </form>
          {message ? (
            <p className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-300" role="status">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </SectionCard>

        <SectionCard title="Self check-in link" description="Share with members at the desk">
          <Input className="min-h-11 font-mono text-xs" readOnly value={checkInUrl || '—'} aria-label="Check-in URL" />
          <Button
            type="button"
            variant="outline"
            className="mt-3 min-h-11"
            disabled={!gymId}
            onClick={() => void copyCheckInLink()}
          >
            {copied ? 'Copied' : 'Copy link'}
          </Button>
        </SectionCard>
      </div>

      <SectionCard title="Live crowd">
        <div className="mb-4 grid grid-cols-2 gap-3">
          <StatCard label="Live now" value={liveCount} />
          <StatCard label="Level" value={`${crowdLevel} / 5`} />
        </div>
        <CrowdMeter
          compact
          level={crowdLevel}
          liveCount={liveCount}
          activeCount={(activeMembersQuery.data ?? []).length}
        />
      </SectionCard>

      <SectionCard
        title="Pending join requests"
        action={
          <Link href="/owner/members" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            Review all
          </Link>
        }
      >
        {pending.length === 0 ? (
          <EmptyState title="No pending requests" description="New join requests will show up here." />
        ) : (
          <ul className="divide-y divide-border">
            {pending.slice(0, 5).map((req) => (
              <li key={req.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium">{profileLabel(profiles[req.user_id], req.user_id)}</span>
                <span className="text-sm text-muted-foreground">{req.message || 'No message'}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </PageContainer>
  );
}
