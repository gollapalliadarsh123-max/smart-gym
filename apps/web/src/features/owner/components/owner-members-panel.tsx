'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Banknote,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Copy,
  Eye,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Search,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  MEMBERSHIP_PLANS,
  MEMBERSHIP_PLAN_LABELS,
  PAYMENT_MODES,
  PAYMENT_STATUS_LABELS,
  addDaysToYmd,
  calculateDaysLeft,
  getMembershipExpiryLine,
  getPlanLabel,
  getTodayYmd,
  type MembershipPlan,
  type PaymentStatus,
} from '@smart-gym/shared';
import {
  useApproveMember,
  useGymAttendanceHistory,
  useGymMembers,
  usePendingJoinRequests,
  useProfilesMap,
  useRejectJoinRequest,
  type Tables,
} from '@smart-gym/supabase';
import { useOwnerContext } from '@/features/owner/components/owner-provider';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type Membership = Tables<'gym_memberships'>;
type JoinRequest = Tables<'join_requests'>;
type Profile = Tables<'profiles'>;

type ListTab = 'pending' | 'active' | 'expired' | 'all';
type StatusFilter = 'all' | 'active' | 'expired' | 'pending' | 'cancelled' | 'rejected';
type PlanFilter = 'all' | MembershipPlan;
type SortKey = 'name' | 'joined' | 'expiry' | 'attendance';

const EXPIRING_SOON_DAYS = 7;
const ATTENDANCE_WINDOW_DAYS = 30;

function defaultPriceForPlan(
  gym: {
    price_1_month: number;
    price_3_month: number;
    price_6_month: number;
    price_12_month: number;
  } | null,
  plan: MembershipPlan,
): number {
  if (!gym) return 0;
  switch (plan) {
    case '1_month':
      return Number(gym.price_1_month) || 0;
    case '3_month':
      return Number(gym.price_3_month) || 0;
    case '6_month':
      return Number(gym.price_6_month) || 0;
    case '12_month':
      return Number(gym.price_12_month) || 0;
  }
}

function displayName(profile: Profile | undefined, userId: string) {
  if (!profile) return userId.slice(0, 8) + '…';
  if (profile.full_name?.trim()) return profile.full_name.trim();
  const combined = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
  return combined || profile.email || userId.slice(0, 8) + '…';
}

function initials(profile: Profile | undefined, userId: string) {
  const name = displayName(profile, userId);
  const parts = name.replace(/…$/, '').split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  return (parts[0]?.slice(0, 2) || userId.slice(0, 2)).toUpperCase();
}

function formatDate(ymd: string | null | undefined) {
  if (!ymd) return '—';
  try {
    const [y, m, d] = ymd.split('-').map(Number);
    if (!y || !m || !d) return ymd;
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return ymd;
  }
}

function CardShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-[20px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] dark:border-border dark:bg-card dark:shadow-none',
        className,
      )}
    >
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
    pending: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
    expired: 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200',
    cancelled: 'bg-slate-100 text-slate-600 dark:bg-muted dark:text-muted-foreground',
    rejected: 'bg-slate-100 text-slate-600 dark:bg-muted dark:text-muted-foreground',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize',
        styles[status] ?? 'bg-slate-100 text-slate-700 dark:bg-muted dark:text-foreground',
      )}
    >
      {status}
    </span>
  );
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  const styles: Record<PaymentStatus, string> = {
    paid: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
    not_paid: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
    refunded: 'bg-slate-100 text-slate-600 dark:bg-muted dark:text-muted-foreground',
    failed: 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        styles[status],
      )}
    >
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}

function PlanBadge({ plan }: { plan: MembershipPlan | null }) {
  if (!plan) return <span className="text-sm text-slate-400">—</span>;
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-muted dark:text-foreground">
      {getPlanLabel(plan)}
    </span>
  );
}

function MemberAvatar({
  profile,
  userId,
  size = 'md',
}: {
  profile: Profile | undefined;
  userId: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClass =
    size === 'lg' ? 'size-14 text-base' : size === 'sm' ? 'size-9 text-xs' : 'size-10 text-sm';
  if (profile?.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatar_url}
        alt=""
        className={cn('shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-card', sizeClass)}
      />
    );
  }
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-800 ring-2 ring-white dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-card',
        sizeClass,
      )}
      aria-hidden
    >
      {initials(profile, userId)}
    </span>
  );
}

function AttendanceBar({ pct }: { pct: number }) {
  return (
    <div className="min-w-[7rem]">
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="font-medium tabular-nums text-slate-700 dark:text-foreground">{pct}%</span>
        <span className="text-slate-400">30d</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-muted">
        <div
          className="h-full rounded-full bg-emerald-600 transition-[width]"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-slate-200 bg-slate-50/60 px-6 py-14 text-center dark:border-border dark:bg-muted/20">
      <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm dark:bg-card dark:text-emerald-300">
        <Users className="size-7" aria-hidden />
      </span>
      <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

function SideDrawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]"
        aria-label="Close drawer"
        onClick={onClose}
      />
      <aside
        className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl dark:bg-card"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-border">
          <h2 className="truncate text-base font-semibold text-slate-900 dark:text-foreground">{title}</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className="min-h-11 min-w-11"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="size-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </aside>
    </div>
  );
}

export function OwnerMembersPanel() {
  const { client, gym, userId } = useOwnerContext();
  const gymId = gym?.id;
  const today = getTodayYmd();
  const attendanceFrom = addDaysToYmd(today, -(ATTENDANCE_WINDOW_DAYS - 1));

  const pendingQuery = usePendingJoinRequests(client, gymId);
  const membersQuery = useGymMembers(client, gymId);
  const attendanceQuery = useGymAttendanceHistory(client, gymId, attendanceFrom, today);
  const approve = useApproveMember(client);
  const reject = useRejectJoinRequest(client);

  const pending = pendingQuery.data ?? [];
  const members = membersQuery.data ?? [];

  const profileIds = useMemo(() => {
    const ids = new Set<string>();
    pending.forEach((r) => ids.add(r.user_id));
    members.forEach((m) => ids.add(m.user_id));
    return [...ids];
  }, [pending, members]);

  const profilesQuery = useProfilesMap(client, profileIds);
  const profiles = profilesQuery.data ?? {};

  const attendanceCountByUser = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of attendanceQuery.data ?? []) {
      map.set(row.user_id, (map.get(row.user_id) ?? 0) + 1);
    }
    return map;
  }, [attendanceQuery.data]);

  function attendancePct(row: Membership) {
    const visits = attendanceCountByUser.get(row.user_id) ?? 0;
    const startYmd = row.starts_at || row.created_at?.slice(0, 10);
    let windowDays = ATTENDANCE_WINDOW_DAYS;
    if (startYmd) {
      const daysSinceStart = calculateDaysLeft(today, startYmd);
      // calculateDaysLeft(end, todayStart) gives today - start when we pass (today, start) wait:
      // calculateDaysLeft(endDate, todayYmd) = end - today.
      // So calculateDaysLeft(today, startYmd) = today - start. Perfect.
      if (daysSinceStart != null && daysSinceStart >= 0) {
        windowDays = Math.min(ATTENDANCE_WINDOW_DAYS, daysSinceStart + 1);
      }
    }
    return Math.round(Math.min(100, (visits / Math.max(1, windowDays)) * 100));
  }

  const [tab, setTab] = useState<ListTab>('pending');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [drafts, setDrafts] = useState<
    Record<string, { plan: MembershipPlan; amount: string; paymentMode: string; startDate: string }>
  >({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<
    | { type: 'member'; row: Membership }
    | { type: 'pending'; req: JoinRequest }
    | { type: 'invite' }
    | null
  >(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const activeMembers = useMemo(() => members.filter((m) => m.status === 'active'), [members]);
  const expiredMembers = useMemo(() => members.filter((m) => m.status === 'expired'), [members]);
  const expiringSoon = useMemo(() => {
    return activeMembers.filter((m) => {
      if (!m.ends_at) return false;
      const days = calculateDaysLeft(m.ends_at, today);
      return days != null && days >= 0 && days <= EXPIRING_SOON_DAYS;
    }).length;
  }, [activeMembers, today]);

  function getDraft(userIdKey: string) {
    return (
      drafts[userIdKey] ?? {
        plan: '1_month' as MembershipPlan,
        amount: String(defaultPriceForPlan(gym, '1_month')),
        paymentMode: 'Cash',
        startDate: getTodayYmd(),
      }
    );
  }

  function updateDraft(
    userIdKey: string,
    patch: Partial<{ plan: MembershipPlan; amount: string; paymentMode: string; startDate: string }>,
  ) {
    setDrafts((prev) => {
      const current = getDraft(userIdKey);
      const next = { ...current, ...patch };
      if (patch.plan && patch.amount === undefined) {
        next.amount = String(defaultPriceForPlan(gym, patch.plan));
      }
      return { ...prev, [userIdKey]: next };
    });
  }

  async function handleApprove(requestUserId: string) {
    if (!gymId || !userId) return;
    setActionError(null);
    const draft = getDraft(requestUserId);
    const amount = Number(draft.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      setActionError('Enter a valid amount.');
      return;
    }
    try {
      await approve.mutateAsync({
        userId: requestUserId,
        gymId,
        plan: draft.plan,
        amount,
        paymentMode: draft.paymentMode,
        startDateYmd: draft.startDate,
        reviewedBy: userId,
      });
      setDrawer(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Approve failed.');
    }
  }

  async function handleReject(requestUserId: string) {
    if (!gymId || !userId) return;
    setActionError(null);
    try {
      await reject.mutateAsync({
        userId: requestUserId,
        gymId,
        reviewedBy: userId,
      });
      setDrawer(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Reject failed.');
    }
  }

  async function copyGymCode() {
    if (!gym?.code) return;
    try {
      await navigator.clipboard.writeText(gym.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      setActionError('Could not copy gym code.');
    }
  }

  const filteredMembers = useMemo(() => {
    let rows = [...members];

    if (tab === 'active') rows = rows.filter((m) => m.status === 'active');
    else if (tab === 'expired') rows = rows.filter((m) => m.status === 'expired');

    if (statusFilter !== 'all') {
      rows = rows.filter((m) => m.status === statusFilter);
    }
    if (planFilter !== 'all') {
      rows = rows.filter((m) => m.plan === planFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((m) => {
        const p = profiles[m.user_id];
        const hay = [
          displayName(p, m.user_id),
          p?.email,
          p?.phone,
          m.plan,
          m.status,
          m.payment_status,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }

    rows.sort((a, b) => {
      const pa = profiles[a.user_id];
      const pb = profiles[b.user_id];
      if (sortKey === 'name') {
        return displayName(pa, a.user_id).localeCompare(displayName(pb, b.user_id));
      }
      if (sortKey === 'joined') {
        return (b.starts_at || b.created_at || '').localeCompare(a.starts_at || a.created_at || '');
      }
      if (sortKey === 'expiry') {
        return (a.ends_at || '9999').localeCompare(b.ends_at || '9999');
      }
      return attendancePct(b) - attendancePct(a);
    });

    return rows;
    // attendancePct is stable enough via attendanceCountByUser
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, tab, statusFilter, planFilter, search, profiles, sortKey, attendanceCountByUser]);

  const filteredPending = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pending;
    return pending.filter((req) => {
      const p = profiles[req.user_id];
      const hay = [displayName(p, req.user_id), p?.email, req.message]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [pending, search, profiles]);

  const tabs: { id: ListTab; label: string; count: number }[] = [
    { id: 'pending', label: 'Pending', count: pending.length },
    { id: 'active', label: 'Active', count: activeMembers.length },
    { id: 'expired', label: 'Expired', count: expiredMembers.length },
    { id: 'all', label: 'All Members', count: members.length },
  ];

  const kpis = [
    {
      label: 'Total Members',
      value: members.length,
      hint: 'All memberships',
      icon: Users,
    },
    {
      label: 'Active Members',
      value: activeMembers.length,
      hint: 'Currently active',
      icon: CheckCircle2,
    },
    {
      label: 'Expiring Soon',
      value: expiringSoon,
      hint: `Within ${EXPIRING_SOON_DAYS} days`,
      icon: CalendarClock,
    },
    {
      label: 'Pending Requests',
      value: pending.length,
      hint: pending.length ? 'Needs review' : 'All clear',
      icon: ClipboardList,
    },
  ];

  function memberActions(row: Membership, compact = false) {
    const linkBtn = cn(
      buttonVariants({ variant: 'outline', size: 'sm' }),
      'min-h-9 rounded-xl',
    );
    return (
      <div
        className={cn('flex flex-wrap items-center gap-1.5', compact && 'justify-end')}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-9 rounded-xl"
          onClick={() => setDrawer({ type: 'member', row })}
        >
          <Eye className="size-3.5" aria-hidden />
          View
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-9 rounded-xl"
          onClick={() => setDrawer({ type: 'member', row })}
        >
          <Pencil className="size-3.5" aria-hidden />
          Edit
        </Button>
        <Link href="/owner/payments" className={linkBtn}>
          <RefreshCw className="size-3.5" aria-hidden />
          Renew
        </Link>
        <Link href="/owner/payments" className={cn(linkBtn, compact && 'hidden xl:inline-flex')}>
          <Banknote className="size-3.5" aria-hidden />
          Payment
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              'inline-flex min-h-9 min-w-9 items-center justify-center rounded-xl border border-input bg-background text-sm hover:bg-muted',
            )}
            aria-label="More actions"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem onClick={() => setDrawer({ type: 'member', row })}>
              <Eye className="size-4" />
              View details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                window.location.assign('/owner/payments');
              }}
            >
              <Banknote className="size-4" />
              Record payment
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                const email = profiles[row.user_id]?.email;
                if (email) void navigator.clipboard.writeText(email);
              }}
            >
              <Copy className="size-4" />
              Copy email
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  const selectClass =
    'min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 dark:border-border dark:bg-card dark:text-foreground';

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-0 sm:space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-foreground">
            Members
          </h1>
          <p className="text-sm text-slate-500 dark:text-muted-foreground">
            Manage join requests and memberships for {gym?.name ?? 'your gym'}.
          </p>
        </div>
        <Button
          type="button"
          className="min-h-11 rounded-2xl bg-emerald-600 px-5 hover:bg-emerald-700"
          onClick={() => setDrawer({ type: 'invite' })}
        >
          <UserPlus className="size-4" aria-hidden />
          Add Member
        </Button>
      </header>

      {actionError ? (
        <p className="text-sm text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      {/* KPIs */}
      <section aria-label="Member metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <CardShell key={kpi.label} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-muted-foreground">
                    {kpi.label}
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-slate-900 dark:text-foreground">
                    {kpi.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-muted-foreground">{kpi.hint}</p>
                </div>
                <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <Icon className="size-5" aria-hidden />
                </span>
              </div>
            </CardShell>
          );
        })}
      </section>

      {/* Search + filters */}
      <CardShell className="p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
          <label className="relative block">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, phone…"
              className="min-h-11 rounded-2xl border-slate-200 pl-10"
              aria-label="Search members"
            />
          </label>
          <select
            className={selectClass}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            aria-label="Filter by status"
          >
            <option value="all">Status: All</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            className={selectClass}
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value as PlanFilter)}
            aria-label="Filter by membership"
          >
            <option value="all">Membership: All</option>
            {MEMBERSHIP_PLANS.map((plan) => (
              <option key={plan} value={plan}>
                {MEMBERSHIP_PLAN_LABELS[plan]}
              </option>
            ))}
          </select>
          <select
            className={selectClass}
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            aria-label="Sort members"
          >
            <option value="name">Sort: Name</option>
            <option value="joined">Sort: Join date</option>
            <option value="expiry">Sort: Expiry</option>
            <option value="attendance">Sort: Attendance</option>
          </select>
        </div>

        {/* Tabs */}
        <div
          className="mt-4 flex gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1 dark:bg-muted"
          role="tablist"
          aria-label="Member lists"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'min-h-10 shrink-0 rounded-xl px-3.5 text-sm font-semibold transition-colors sm:px-4',
                tab === t.id
                  ? 'bg-white text-emerald-800 shadow-sm dark:bg-background dark:text-emerald-300'
                  : 'text-slate-500 hover:text-slate-800 dark:text-muted-foreground',
              )}
            >
              {t.label}
              <span className="ml-1.5 tabular-nums text-xs opacity-70">{t.count}</span>
            </button>
          ))}
        </div>
      </CardShell>

      {/* Pending tab */}
      {tab === 'pending' ? (
        <section className="space-y-4" aria-label="Pending join requests">
          {pendingQuery.isLoading ? (
            <div className="h-40 animate-pulse rounded-[20px] bg-slate-100 dark:bg-muted" />
          ) : filteredPending.length === 0 ? (
            <EmptyState
              title={pending.length === 0 ? 'No pending requests' : 'No matching requests'}
              description={
                pending.length === 0
                  ? 'When someone requests to join with your gym code, they’ll show up here for approval.'
                  : 'Try a different search term.'
              }
              action={
                pending.length === 0 ? (
                  <Button
                    type="button"
                    className="min-h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => setDrawer({ type: 'invite' })}
                  >
                    <UserPlus className="size-4" />
                    Invite with gym code
                  </Button>
                ) : null
              }
            />
          ) : (
            filteredPending.map((req) => {
              const draft = getDraft(req.user_id);
              const profile = profiles[req.user_id];
              return (
                <CardShell key={req.id} className="p-5 transition-shadow hover:shadow-md">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <button
                      type="button"
                      className="flex min-w-0 items-start gap-3 text-left"
                      onClick={() => setDrawer({ type: 'pending', req })}
                    >
                      <MemberAvatar profile={profile} userId={req.user_id} />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-foreground">
                          {displayName(profile, req.user_id)}
                        </p>
                        <p className="truncate text-sm text-slate-500 dark:text-muted-foreground">
                          {profile?.email ?? req.user_id}
                        </p>
                        {req.message ? (
                          <p className="mt-2 text-sm text-slate-600 dark:text-muted-foreground">
                            {req.message}
                          </p>
                        ) : null}
                      </div>
                    </button>
                    <StatusBadge status="pending" />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field>
                      <FieldLabel>Plan</FieldLabel>
                      <select
                        className={selectClass}
                        value={draft.plan}
                        onChange={(e) =>
                          updateDraft(req.user_id, { plan: e.target.value as MembershipPlan })
                        }
                      >
                        {MEMBERSHIP_PLANS.map((plan) => (
                          <option key={plan} value={plan}>
                            {MEMBERSHIP_PLAN_LABELS[plan]}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field>
                      <FieldLabel>Amount</FieldLabel>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="min-h-11 rounded-2xl"
                        value={draft.amount}
                        onChange={(e) => updateDraft(req.user_id, { amount: e.target.value })}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Payment mode</FieldLabel>
                      <select
                        className={selectClass}
                        value={draft.paymentMode}
                        onChange={(e) => updateDraft(req.user_id, { paymentMode: e.target.value })}
                      >
                        {PAYMENT_MODES.map((mode) => (
                          <option key={mode} value={mode}>
                            {mode}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field>
                      <FieldLabel>Start date</FieldLabel>
                      <Input
                        type="date"
                        className="min-h-11 rounded-2xl"
                        value={draft.startDate}
                        onChange={(e) => updateDraft(req.user_id, { startDate: e.target.value })}
                      />
                    </Field>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      className="min-h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => void handleApprove(req.user_id)}
                      disabled={approve.isPending}
                    >
                      {approve.isPending ? 'Approving…' : 'Approve'}
                    </Button>
                    <Button
                      variant="outline"
                      className="min-h-11 rounded-2xl"
                      onClick={() => void handleReject(req.user_id)}
                      disabled={reject.isPending}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="ghost"
                      className="min-h-11 rounded-2xl"
                      onClick={() => setDrawer({ type: 'pending', req })}
                    >
                      View
                    </Button>
                  </div>
                </CardShell>
              );
            })
          )}
        </section>
      ) : membersQuery.isLoading ? (
        <div className="h-48 animate-pulse rounded-[20px] bg-slate-100 dark:bg-muted" />
      ) : filteredMembers.length === 0 ? (
        <EmptyState
          title={members.length === 0 ? 'No members yet' : 'No members match your filters'}
          description={
            members.length === 0
              ? 'Invite people with your gym code. Approved join requests will appear here.'
              : 'Adjust search, status, or membership filters to see more results.'
          }
          action={
            members.length === 0 ? (
              <Button
                type="button"
                className="min-h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setDrawer({ type: 'invite' })}
              >
                <UserPlus className="size-4" />
                Add Member
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <CardShell className="hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:border-border dark:bg-muted/40 dark:text-muted-foreground">
                    <th className="px-5 py-3.5 font-semibold">Member</th>
                    <th className="px-3 py-3.5 font-semibold">Membership</th>
                    <th className="px-3 py-3.5 font-semibold">Joined</th>
                    <th className="px-3 py-3.5 font-semibold">Expiry</th>
                    <th className="px-3 py-3.5 font-semibold">Attendance</th>
                    <th className="px-3 py-3.5 font-semibold">Payment</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((row) => {
                    const profile = profiles[row.user_id];
                    const daysLeft = row.ends_at ? calculateDaysLeft(row.ends_at, today) : null;
                    const pct = attendancePct(row);
                    return (
                      <tr
                        key={row.id}
                        className="cursor-pointer border-b border-slate-100 transition-colors last:border-0 hover:bg-emerald-50/40 dark:border-border dark:hover:bg-emerald-950/20"
                        onClick={() => setDrawer({ type: 'member', row })}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <MemberAvatar profile={profile} userId={row.user_id} />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate font-semibold text-slate-900 dark:text-foreground">
                                  {displayName(profile, row.user_id)}
                                </p>
                                <StatusBadge status={row.status} />
                              </div>
                              <p className="truncate text-xs text-slate-500 dark:text-muted-foreground">
                                {profile?.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <PlanBadge plan={row.plan} />
                        </td>
                        <td className="px-3 py-4 text-slate-600 dark:text-muted-foreground">
                          {formatDate(row.starts_at || row.created_at?.slice(0, 10))}
                        </td>
                        <td className="px-3 py-4">
                          <p className="text-slate-700 dark:text-foreground">{formatDate(row.ends_at)}</p>
                          <p
                            className={cn(
                              'text-xs',
                              daysLeft != null && daysLeft < 0
                                ? 'text-rose-600'
                                : daysLeft != null && daysLeft <= EXPIRING_SOON_DAYS
                                  ? 'text-amber-700'
                                  : 'text-slate-400',
                            )}
                          >
                            {row.ends_at ? getMembershipExpiryLine(row.ends_at, today) : '—'}
                          </p>
                        </td>
                        <td className="px-3 py-4">
                          <AttendanceBar pct={pct} />
                        </td>
                        <td className="px-3 py-4">
                          <PaymentBadge status={row.payment_status} />
                          <p className="mt-1 text-xs text-slate-400">
                            {row.payment_mode || '—'}
                            {row.amount != null ? ` · ₹${Number(row.amount).toFixed(0)}` : ''}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-right">{memberActions(row, true)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardShell>

          {/* Mobile / tablet cards */}
          <div className="grid gap-3 lg:hidden">
            {filteredMembers.map((row) => {
              const profile = profiles[row.user_id];
              const daysLeft = row.ends_at ? calculateDaysLeft(row.ends_at, today) : null;
              const pct = attendancePct(row);
              return (
                <CardShell
                  key={row.id}
                  className="p-4 transition-shadow hover:shadow-md"
                >
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 text-left"
                    onClick={() => setDrawer({ type: 'member', row })}
                  >
                    <MemberAvatar profile={profile} userId={row.user_id} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900 dark:text-foreground">
                          {displayName(profile, row.user_id)}
                        </p>
                        <StatusBadge status={row.status} />
                      </div>
                      <p className="truncate text-xs text-slate-500">{profile?.email}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <PlanBadge plan={row.plan} />
                        <PaymentBadge status={row.payment_status} />
                      </div>
                    </div>
                  </button>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-400">Joined</p>
                      <p className="font-medium text-slate-700 dark:text-foreground">
                        {formatDate(row.starts_at || row.created_at?.slice(0, 10))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Expiry</p>
                      <p className="font-medium text-slate-700 dark:text-foreground">
                        {formatDate(row.ends_at)}
                      </p>
                      <p
                        className={cn(
                          'text-xs',
                          daysLeft != null && daysLeft < 0 ? 'text-rose-600' : 'text-slate-400',
                        )}
                      >
                        {row.ends_at ? getMembershipExpiryLine(row.ends_at, today) : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <AttendanceBar pct={pct} />
                  </div>
                  <div className="mt-4 border-t border-slate-100 pt-3 dark:border-border">
                    {memberActions(row)}
                  </div>
                </CardShell>
              );
            })}
          </div>
        </>
      )}

      {/* Drawers */}
      <SideDrawer
        open={drawer?.type === 'member'}
        title="Member details"
        onClose={() => setDrawer(null)}
      >
        {drawer?.type === 'member' ? (
          <MemberDetailBody
            row={drawer.row}
            profile={profiles[drawer.row.user_id]}
            attendancePct={attendancePct(drawer.row)}
            today={today}
          />
        ) : null}
      </SideDrawer>

      <SideDrawer
        open={drawer?.type === 'pending'}
        title="Join request"
        onClose={() => setDrawer(null)}
      >
        {drawer?.type === 'pending' ? (
          <PendingDetailBody
            req={drawer.req}
            profile={profiles[drawer.req.user_id]}
            draft={getDraft(drawer.req.user_id)}
            updateDraft={updateDraft}
            onApprove={() => void handleApprove(drawer.req.user_id)}
            onReject={() => void handleReject(drawer.req.user_id)}
            approving={approve.isPending}
            rejecting={reject.isPending}
            selectClass={selectClass}
          />
        ) : null}
      </SideDrawer>

      <SideDrawer
        open={drawer?.type === 'invite'}
        title="Add member"
        onClose={() => setDrawer(null)}
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-600 dark:text-muted-foreground">
            Share your gym code so new members can send a join request. Approve them from the
            Pending tab.
          </p>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-muted">
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Gym code</p>
            <p className="mt-2 font-mono text-2xl font-semibold tracking-widest text-slate-900 dark:text-foreground">
              {gym?.code ?? '—'}
            </p>
          </div>
          <Button
            type="button"
            className="min-h-11 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700"
            disabled={!gym?.code}
            onClick={() => void copyGymCode()}
          >
            <Copy className="size-4" />
            {copiedCode ? 'Copied' : 'Copy gym code'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full rounded-2xl"
            onClick={() => {
              setTab('pending');
              setDrawer(null);
            }}
          >
            Go to Pending requests
          </Button>
        </div>
      </SideDrawer>
    </div>
  );
}

function MemberDetailBody({
  row,
  profile,
  attendancePct,
  today,
}: {
  row: Membership;
  profile: Profile | undefined;
  attendancePct: number;
  today: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <MemberAvatar profile={profile} userId={row.user_id} size="lg" />
        <div className="min-w-0">
          <p className="text-lg font-semibold text-slate-900 dark:text-foreground">
            {displayName(profile, row.user_id)}
          </p>
          <p className="text-sm text-slate-500">{profile?.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge status={row.status} />
            <PlanBadge plan={row.plan} />
            <PaymentBadge status={row.payment_status} />
          </div>
        </div>
      </div>

      <dl className="grid gap-3 text-sm">
        {[
          ['Phone', profile?.phone || '—'],
          ['Joined', formatDate(row.starts_at || row.created_at?.slice(0, 10))],
          ['Expires', formatDate(row.ends_at)],
          ['Expiry status', row.ends_at ? getMembershipExpiryLine(row.ends_at, today) : '—'],
          ['Payment mode', row.payment_mode || '—'],
          ['Amount', row.amount != null ? `₹${Number(row.amount).toFixed(2)}` : '—'],
        ].map(([label, value]) => (
          <div
            key={label}
            className="flex items-start justify-between gap-3 rounded-2xl bg-slate-50 px-3.5 py-3 dark:bg-muted"
          >
            <dt className="text-slate-500 dark:text-muted-foreground">{label}</dt>
            <dd className="text-right font-medium text-slate-900 dark:text-foreground">{value}</dd>
          </div>
        ))}
      </dl>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700 dark:text-foreground">
          Attendance (last 30 days)
        </p>
        <AttendanceBar pct={attendancePct} />
      </div>

      <div className="flex flex-col gap-2">
        <Link
          href="/owner/payments"
          className={cn(
            buttonVariants({ variant: 'default' }),
            'min-h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700',
          )}
        >
          <Banknote className="size-4" />
          Record payment / renew
        </Link>
        <Link
          href="/owner/attendance"
          className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11 rounded-2xl')}
        >
          View attendance
        </Link>
      </div>
    </div>
  );
}

function PendingDetailBody({
  req,
  profile,
  draft,
  updateDraft,
  onApprove,
  onReject,
  approving,
  rejecting,
  selectClass,
}: {
  req: JoinRequest;
  profile: Profile | undefined;
  draft: { plan: MembershipPlan; amount: string; paymentMode: string; startDate: string };
  updateDraft: (
    userIdKey: string,
    patch: Partial<{ plan: MembershipPlan; amount: string; paymentMode: string; startDate: string }>,
  ) => void;
  onApprove: () => void;
  onReject: () => void;
  approving: boolean;
  rejecting: boolean;
  selectClass: string;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <MemberAvatar profile={profile} userId={req.user_id} size="lg" />
        <div>
          <p className="text-lg font-semibold">{displayName(profile, req.user_id)}</p>
          <p className="text-sm text-slate-500">{profile?.email}</p>
          <div className="mt-2">
            <StatusBadge status="pending" />
          </div>
        </div>
      </div>
      {req.message ? (
        <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-muted dark:text-muted-foreground">
          {req.message}
        </p>
      ) : null}

      <div className="grid gap-3">
        <Field>
          <FieldLabel>Plan</FieldLabel>
          <select
            className={selectClass}
            value={draft.plan}
            onChange={(e) => updateDraft(req.user_id, { plan: e.target.value as MembershipPlan })}
          >
            {MEMBERSHIP_PLANS.map((plan) => (
              <option key={plan} value={plan}>
                {MEMBERSHIP_PLAN_LABELS[plan]}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel>Amount</FieldLabel>
          <Input
            type="number"
            min={0}
            step="0.01"
            className="min-h-11 rounded-2xl"
            value={draft.amount}
            onChange={(e) => updateDraft(req.user_id, { amount: e.target.value })}
          />
        </Field>
        <Field>
          <FieldLabel>Payment mode</FieldLabel>
          <select
            className={selectClass}
            value={draft.paymentMode}
            onChange={(e) => updateDraft(req.user_id, { paymentMode: e.target.value })}
          >
            {PAYMENT_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel>Start date</FieldLabel>
          <Input
            type="date"
            className="min-h-11 rounded-2xl"
            value={draft.startDate}
            onChange={(e) => updateDraft(req.user_id, { startDate: e.target.value })}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          className="min-h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700"
          onClick={onApprove}
          disabled={approving}
        >
          {approving ? 'Approving…' : 'Approve'}
        </Button>
        <Button
          variant="outline"
          className="min-h-11 rounded-2xl"
          onClick={onReject}
          disabled={rejecting}
        >
          Reject
        </Button>
      </div>
    </div>
  );
}
