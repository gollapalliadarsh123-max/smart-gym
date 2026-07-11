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
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function InfoCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="sg-info-card">
      <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <h2 className="mt-2 text-3xl font-extrabold tracking-tight">{value}</h2>
    </div>
  );
}

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
  const pending = pendingQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];
  const monthlyRevenue = sumPaidInMonth(payments);
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
      await navigator.clipboard.writeText(
        checkInUrl.startsWith('http')
          ? checkInUrl
          : `${window.location.origin}${checkInUrl}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy link.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="sg-panel overflow-hidden !p-0">
        <div className="bg-gradient-to-r from-indigo-600 to-sky-500 px-6 py-7 text-white">
          <h1 className="text-3xl font-extrabold tracking-tight">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-indigo-50">
            Track members, payments, attendance, live crowd, and notifications
            {gym?.name ? ` · ${gym.name}` : ''}.
          </p>
        </div>
      </div>

      <div className="sg-panel">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-extrabold">What should I do next?</h3>
          <span className="sg-tag">Quick start</span>
        </div>
        <p className="text-sm text-muted-foreground">
          1) Approve pending members. 2) Mark attendance. 3) Review payments before closing the day.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/owner/members" className={cn(buttonVariants({ variant: 'outline' }))}>
            Open Members
          </Link>
          <Link href="/owner/attendance" className={cn(buttonVariants({ variant: 'outline' }))}>
            Open Attendance
          </Link>
          <Link href="/owner/payments" className={cn(buttonVariants())}>
            Open Payments
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InfoCard label="Total Members" value={members.length} />
        <InfoCard label="Active Members" value={active.length} />
        <InfoCard label="Monthly Revenue" value={`₹${monthlyRevenue.toFixed(0)}`} />
        <InfoCard label="Pending Requests" value={pending.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <div className="sg-panel">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-extrabold">Mark Attendance</h3>
            <span className="sg-tag">4-Digit Code</span>
          </div>
          <form onSubmit={(e) => void handleMark(e)} className="flex flex-wrap gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Enter 4-digit code"
              maxLength={4}
              className="max-w-[180px] font-mono text-lg tracking-widest"
              inputMode="numeric"
            />
            <Button type="submit" disabled={mark.isPending || !gymId}>
              {mark.isPending ? 'Marking…' : 'Mark Attendance'}
            </Button>
          </form>
          {message ? (
            <p className="mt-3 text-sm text-emerald-600" role="status">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="sg-panel">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-extrabold">QR self check-in</h3>
            <span className="sg-tag">Members scan</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Share this link or display it at the desk. Members open it while logged in to check in
            for today.
          </p>
          <Input className="mt-3 font-mono text-xs" readOnly value={checkInUrl || '—'} />
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            disabled={!gymId}
            onClick={() => void copyCheckInLink()}
          >
            {copied ? 'Copied' : 'Copy check-in link'}
          </Button>
        </div>

        <div className="sg-panel lg:col-span-2 xl:col-span-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-extrabold">Live Crowd</h3>
            <span className="sg-tag">Live</span>
          </div>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border/60 bg-white/50 p-3 dark:bg-white/5">
              <p className="text-xs font-bold text-muted-foreground uppercase">Live Crowd</p>
              <p className="mt-1 text-2xl font-extrabold">{liveCount}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-white/50 p-3 dark:bg-white/5">
              <p className="text-xs font-bold text-muted-foreground uppercase">Crowd Level</p>
              <p className="mt-1 text-2xl font-extrabold">{crowdLevel} / 5</p>
            </div>
          </div>
          <CrowdMeter
            compact
            level={crowdLevel}
            liveCount={liveCount}
            activeCount={(activeMembersQuery.data ?? []).length}
          />
        </div>
      </div>

      {pending.length > 0 ? (
        <div className="sg-panel">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-lg font-extrabold">Pending join requests</h3>
            <Link href="/owner/members" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
              Review all
            </Link>
          </div>
          <ul className="space-y-2 text-sm">
            {pending.slice(0, 5).map((req) => (
              <li
                key={req.id}
                className="flex justify-between gap-4 border-b border-border/40 py-2 last:border-0"
              >
                <span className="font-semibold">
                  {profileLabel(profiles[req.user_id], req.user_id)}
                </span>
                <span className="text-muted-foreground">{req.message || 'No message'}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="sg-panel">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-extrabold">Send notification</h3>
          <span className="sg-tag">Broadcast</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Announce updates to all members from the Notifications page.
        </p>
        <Link href="/owner/broadcast" className={cn(buttonVariants(), 'mt-4 inline-flex')}>
          Open broadcast
        </Link>
      </div>
    </div>
  );
}
