'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import {
  Banknote,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Link2,
  Megaphone,
  TrendingUp,
  UserPlus,
  Users,
  Activity,
  type LucideIcon,
} from 'lucide-react';
import {
  attendanceCodeSchema,
  calculateCrowdLevel,
  countLiveMembers,
  getTodayYmd,
  type CrowdLevel,
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
import { OwnerStatsCharts } from '@/features/owner/components/owner-stats-charts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const OWNER_CROWD_LABELS = ['Empty', 'Low', 'Medium', 'Busy', 'Very Busy'] as const;

function ownerCrowdLabel(level: CrowdLevel): (typeof OWNER_CROWD_LABELS)[number] {
  if (level <= 0) return 'Empty';
  if (level === 1) return 'Low';
  if (level === 2) return 'Medium';
  if (level === 3 || level === 4) return 'Busy';
  return 'Very Busy';
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

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function firstName(
  profile: { full_name?: string | null; first_name?: string | null } | null | undefined,
) {
  if (profile?.first_name?.trim()) return profile.first_name.trim();
  const full = profile?.full_name?.trim();
  if (full) return full.split(/\s+/)[0] ?? 'Owner';
  return 'Owner';
}

function formatShortTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function DashboardCard({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        'rounded-[20px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] dark:border-border dark:bg-card dark:shadow-none',
        className,
      )}
    >
      {children}
    </div>
  );
}

type ActivityItem = {
  id: string;
  type: 'check-in' | 'payment' | 'join';
  title: string;
  detail: string;
  at: string;
};

export function OwnerOverview() {
  const { client, gym, profile } = useOwnerContext();
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
  const payments = paymentsQuery.data ?? [];
  const monthlyRevenue = sumPaidInMonth(payments);
  const todayRows = todayQuery.data ?? [];
  const activeCount = (activeMembersQuery.data ?? []).length;

  const activityUserIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of todayRows.slice(0, 12)) ids.add(row.user_id);
    for (const pay of payments.slice(0, 12)) ids.add(pay.user_id);
    for (const req of pending.slice(0, 12)) ids.add(req.user_id);
    return [...ids];
  }, [todayRows, payments, pending]);

  const pendingIds = useMemo(() => pending.map((p) => p.user_id), [pending]);
  const profileIds = useMemo(
    () => [...new Set([...activityUserIds, ...pendingIds])],
    [activityUserIds, pendingIds],
  );
  const profilesQuery = useProfilesMap(client, profileIds);
  const profiles = profilesQuery.data ?? {};

  const liveCount = countLiveMembers(
    todayRows.map((row) => ({
      user_id: row.user_id,
      expires_at: row.expires_at,
      check_in_timestamp: row.checked_in_at,
    })),
  );
  const crowdLevel = calculateCrowdLevel(liveCount, activeCount);
  const crowdStatus = ownerCrowdLabel(crowdLevel);
  const crowdProgress = Math.round((crowdLevel / 5) * 100);

  const now = new Date();
  const greet = greetingForHour(now.getHours());
  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const recentActivity = useMemo((): ActivityItem[] => {
    const items: ActivityItem[] = [];

    for (const row of todayRows) {
      items.push({
        id: `check-${row.id}`,
        type: 'check-in',
        title: 'Check-in',
        detail: profileLabel(profiles[row.user_id], row.user_id),
        at: row.checked_in_at,
      });
    }

    for (const pay of payments.slice(0, 30)) {
      items.push({
        id: `pay-${pay.id}`,
        type: 'payment',
        title: 'Payment',
        detail: `${profileLabel(profiles[pay.user_id], pay.user_id)} · ₹${Number(pay.amount || 0).toFixed(0)}`,
        at: pay.paid_at || pay.created_at,
      });
    }

    for (const req of pending) {
      items.push({
        id: `join-${req.id}`,
        type: 'join',
        title: 'Join request',
        detail: profileLabel(profiles[req.user_id], req.user_id),
        at: req.created_at,
      });
    }

    return items
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 10);
  }, [todayRows, payments, pending, profiles]);

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

  const kpis: {
    label: string;
    value: string | number;
    hint: string;
    icon: LucideIcon;
  }[] = [
    {
      label: 'Active Members',
      value: active.length,
      hint: `${members.length} total members`,
      icon: Users,
    },
    {
      label: "Today's Attendance",
      value: todayRows.length,
      hint: liveCount > 0 ? `${liveCount} currently live` : 'No one live right now',
      icon: ClipboardCheck,
    },
    {
      label: 'Monthly Revenue',
      value: `₹${monthlyRevenue.toFixed(0)}`,
      hint: 'Paid this calendar month',
      icon: Banknote,
    },
    {
      label: 'Live Crowd',
      value: liveCount,
      hint: crowdStatus,
      icon: Activity,
    },
  ];

  const quickActions: {
    href: string;
    label: string;
    description: string;
    icon: LucideIcon;
  }[] = [
    {
      href: '#mark-attendance',
      label: 'Mark Attendance',
      description: 'Enter a 4-digit code',
      icon: ClipboardCheck,
    },
    {
      href: '/owner/payments',
      label: 'Record Payment',
      description: 'Log a member payment',
      icon: Banknote,
    },
    {
      href: '/owner/members',
      label: 'Add Member',
      description: 'Review requests & members',
      icon: UserPlus,
    },
    {
      href: '/owner/broadcast',
      label: 'Broadcast',
      description: 'Message your gym',
      icon: Megaphone,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-5 sm:space-y-8 sm:px-6 sm:py-7 lg:py-9">
      {/* Personalized header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            {greet}, {firstName(profile)}
          </p>
          <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-foreground">
            {gym?.name ?? 'Your gym'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-muted-foreground">{dateLabel}</p>
        </div>
        {pending.length > 0 ? (
          <Link
            href="/owner/members"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-50 px-4 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950/70"
          >
            <UserPlus className="size-4" aria-hidden />
            {pending.length} pending request{pending.length === 1 ? '' : 's'}
          </Link>
        ) : null}
      </header>

      {/* KPI cards */}
      <section aria-label="Key metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <DashboardCard key={kpi.label} className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-500 dark:text-muted-foreground">
                    {kpi.label}
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums dark:text-foreground">
                    {kpi.value}
                  </p>
                  <p className="mt-1.5 truncate text-xs text-slate-500 dark:text-muted-foreground">
                    {kpi.hint}
                  </p>
                </div>
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <Icon className="size-5" aria-hidden />
                </span>
              </div>
            </DashboardCard>
          );
        })}
      </section>

      {/* Quick actions */}
      <section aria-labelledby="owner-quick-actions">
        <div className="mb-3 flex items-end justify-between gap-3 sm:mb-4">
          <div>
            <h2
              id="owner-quick-actions"
              className="text-base font-semibold tracking-tight text-slate-900 dark:text-foreground"
            >
              Quick Actions
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-muted-foreground">
              Common owner tasks in one place
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const className =
              'group flex min-h-[5.5rem] items-center gap-4 rounded-[20px] border border-slate-200/80 bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-emerald-200 hover:bg-emerald-50/40 dark:border-border dark:bg-card dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20 sm:px-5';
            const body = (
              <>
                <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition-colors group-hover:bg-emerald-600 group-hover:text-white dark:bg-muted dark:text-foreground">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900 dark:text-foreground">
                    {action.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-muted-foreground">
                    {action.description}
                  </span>
                </span>
              </>
            );
            if (action.href.startsWith('#')) {
              return (
                <a key={action.label} href={action.href} className={className}>
                  {body}
                </a>
              );
            }
            return (
              <Link key={action.label} href={action.href} className={className}>
                {body}
              </Link>
            );
          })}
        </div>
      </section>

      <OwnerStatsCharts client={client} gymId={gymId} />

      <div className="grid gap-4 lg:grid-cols-5 lg:gap-5">
        {/* Live crowd */}
        <DashboardCard className="p-5 sm:p-6 lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-foreground">
                Live Crowd
              </h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-muted-foreground">
                Floor occupancy right now
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
              {crowdStatus}
            </span>
          </div>

          <div className="mt-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-4xl font-semibold tracking-tight tabular-nums text-slate-900 dark:text-foreground">
                {liveCount}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">
                live · {activeCount} active members
              </p>
            </div>
            <TrendingUp className="size-8 text-emerald-600/80" aria-hidden />
          </div>

          <div
            className="mt-6"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={5}
            aria-valuenow={crowdLevel}
            aria-label={`Crowd ${crowdStatus}, level ${crowdLevel} of 5`}
          >
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-muted">
              <div
                className="h-full rounded-full bg-emerald-600 transition-[width] duration-300 ease-out"
                style={{ width: `${crowdProgress}%` }}
              />
            </div>
            <div className="mt-2.5 flex justify-between gap-1 text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:text-[11px]">
              {OWNER_CROWD_LABELS.map((label) => (
                <span
                  key={label}
                  className={cn(
                    'truncate',
                    label === crowdStatus && 'text-emerald-700 dark:text-emerald-400',
                  )}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </DashboardCard>

        {/* Recent activity */}
        <DashboardCard className="flex flex-col p-5 sm:p-6 lg:col-span-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-foreground">
                Recent Activity
              </h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-muted-foreground">
                Check-ins, payments, and join requests
              </p>
            </div>
            <Link
              href="/owner/members"
              className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
            >
              View all
            </Link>
          </div>

          {recentActivity.length === 0 ? (
            <div className="mt-8 flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center dark:border-border">
              <CheckCircle2 className="size-8 text-slate-300" aria-hidden />
              <p className="mt-3 text-sm font-medium text-slate-700 dark:text-foreground">
                No recent activity
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-muted-foreground">
                Check-ins and payments will appear here.
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100 dark:divide-border">
              {recentActivity.map((item) => (
                <li key={item.id} className="flex items-start gap-3 py-3.5 first:pt-2">
                  <span
                    className={cn(
                      'mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl',
                      item.type === 'check-in' &&
                        'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
                      item.type === 'payment' &&
                        'bg-slate-100 text-slate-700 dark:bg-muted dark:text-foreground',
                      item.type === 'join' &&
                        'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
                    )}
                  >
                    {item.type === 'check-in' ? (
                      <ClipboardCheck className="size-4" aria-hidden />
                    ) : item.type === 'payment' ? (
                      <Banknote className="size-4" aria-hidden />
                    ) : (
                      <UserPlus className="size-4" aria-hidden />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-foreground">
                        {item.title}
                      </p>
                      <time
                        className="shrink-0 text-xs text-slate-400"
                        dateTime={item.at}
                      >
                        {formatShortTime(item.at)}
                      </time>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-muted-foreground">
                      {item.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>
      </div>

      {/* Existing tools — same logic as before */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardCard id="mark-attendance" className="scroll-mt-24 p-5 sm:p-6">
          <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-foreground">
            Mark attendance
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-muted-foreground">
            Enter a member’s 4-digit code
          </p>
          <form onSubmit={(e) => void handleMark(e)} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="4-digit code"
              maxLength={4}
              className="min-h-12 rounded-2xl border-slate-200 font-mono text-lg tracking-widest sm:max-w-[180px]"
              inputMode="numeric"
              aria-label="Attendance code"
            />
            <Button
              type="submit"
              className="min-h-12 rounded-2xl bg-emerald-600 px-6 hover:bg-emerald-700"
              disabled={mark.isPending || !gymId}
            >
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
        </DashboardCard>

        <DashboardCard className="p-5 sm:p-6">
          <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-foreground">
            Self check-in link
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-muted-foreground">
            Share with members at the desk
          </p>
          <div className="mt-5 flex items-center gap-2">
            <Link2 className="size-4 shrink-0 text-slate-400" aria-hidden />
            <Input
              className="min-h-12 rounded-2xl border-slate-200 font-mono text-xs"
              readOnly
              value={checkInUrl || '—'}
              aria-label="Check-in URL"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-3 min-h-12 rounded-2xl"
            disabled={!gymId}
            onClick={() => void copyCheckInLink()}
          >
            <Copy className="size-4" aria-hidden />
            {copied ? 'Copied' : 'Copy link'}
          </Button>
        </DashboardCard>
      </div>
    </div>
  );
}
