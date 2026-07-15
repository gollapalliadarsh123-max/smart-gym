'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Banknote,
  CalendarClock,
  CheckCircle2,
  Download,
  Eye,
  Printer,
  RefreshCw,
  Search,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  MEMBERSHIP_PLANS,
  MEMBERSHIP_PLAN_LABELS,
  PAYMENT_STATUSES,
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
  sumPaidAmount,
  sumPaidInMonth,
  useGymAttendanceHistory,
  useGymMembers,
  useGymPayments,
  useProfilesMap,
  useRecordPayment,
  type Tables,
} from '@smart-gym/supabase';
import { useOwnerContext } from '@/features/owner/components/owner-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { cn } from '@/lib/utils';

type Payment = Tables<'payments'>;
type Membership = Tables<'gym_memberships'>;
type Profile = Tables<'profiles'>;

/** UI payment methods — stored as free-text payment_mode (no DB enum). */
const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Online'] as const;

const EXPIRING_SOON_DAYS = 7;
const ATTENDANCE_WINDOW = 30;

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

function memberLabel(profile: Profile | undefined, userId: string) {
  if (!profile) return userId.slice(0, 8) + '…';
  if (profile.full_name?.trim()) return profile.full_name.trim();
  const name = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
  return name || profile.email || userId.slice(0, 8) + '…';
}

function initials(profile: Profile | undefined, userId: string) {
  const name = memberLabel(profile, userId).replace(/…$/, '');
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  return (parts[0]?.slice(0, 2) || userId.slice(0, 2)).toUpperCase();
}

function formatMoney(n: number) {
  return `₹${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatYmd(ymd: string | null | undefined) {
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

function CardShell({
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

function StatusBadge({ status }: { status: PaymentStatus }) {
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
      {PAYMENT_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function buildReceiptHtml(opts: {
  gymName: string;
  memberName: string;
  email?: string;
  payment: Payment;
}) {
  const { gymName, memberName, email, payment } = opts;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Receipt ${payment.id.slice(0, 8)}</title>
<style>
  body{font-family:system-ui,sans-serif;padding:32px;color:#0f172a;max-width:420px;margin:0 auto}
  h1{font-size:18px;margin:0 0 4px} .muted{color:#64748b;font-size:13px}
  .box{border:1px solid #e2e8f0;border-radius:16px;padding:16px;margin-top:20px}
  .row{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px}
  .row:last-child{border:0} .amt{font-size:28px;font-weight:700;margin-top:16px}
  @media print{body{padding:0}}
</style></head><body>
  <h1>${gymName}</h1>
  <p class="muted">Payment receipt</p>
  <div class="amt">${formatMoney(Number(payment.amount || 0))}</div>
  <p class="muted">${PAYMENT_STATUS_LABELS[payment.status] ?? payment.status} · ${formatDate(payment.paid_at)}</p>
  <div class="box">
    <div class="row"><span class="muted">Member</span><span>${memberName}</span></div>
    <div class="row"><span class="muted">Email</span><span>${email || '—'}</span></div>
    <div class="row"><span class="muted">Plan</span><span>${payment.plan ? getPlanLabel(payment.plan) : '—'}</span></div>
    <div class="row"><span class="muted">Method</span><span>${payment.payment_mode || '—'}</span></div>
    <div class="row"><span class="muted">Receipt ID</span><span>${payment.id}</span></div>
  </div>
</body></html>`;
}

function openReceiptWindow(html: string, action: 'view' | 'print' | 'download', filename: string) {
  if (action === 'download') {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const w = window.open('', '_blank', 'noopener,noreferrer,width=480,height=720');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  if (action === 'print') {
    w.focus();
    w.print();
  }
}

const selectClass =
  'min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 dark:border-border dark:bg-card dark:text-foreground';

export function OwnerPaymentsPanel() {
  const { client, gym } = useOwnerContext();
  const gymId = gym?.id;
  const today = getTodayYmd();
  const attendanceFrom = addDaysToYmd(today, -(ATTENDANCE_WINDOW - 1));

  const formRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [status, setStatus] = useState<PaymentStatus | 'all'>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<MembershipPlan | 'all'>('all');
  const [applied, setApplied] = useState({
    search: '',
    fromDate: '',
    toDate: '',
    status: 'all' as PaymentStatus | 'all',
    method: 'all',
    plan: 'all' as MembershipPlan | 'all',
  });

  const [recordUserId, setRecordUserId] = useState('');
  const [memberQuery, setMemberQuery] = useState('');
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [recordPlan, setRecordPlan] = useState<MembershipPlan>('1_month');
  const [recordAmount, setRecordAmount] = useState('');
  const [recordMode, setRecordMode] = useState<string>(PAYMENT_METHODS[0]);
  const [recordExtend, setRecordExtend] = useState(true);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [lastPayment, setLastPayment] = useState<Payment | null>(null);

  const kpiPaymentsQuery = useGymPayments(client, {
    gymId,
    limit: 500,
  });
  const paymentsQuery = useGymPayments(client, {
    gymId,
    limit: 500,
    search: applied.search || undefined,
    fromDate: applied.fromDate || undefined,
    toDate: applied.toDate || undefined,
    status: applied.status,
  });
  const membersQuery = useGymMembers(client, gymId, 'active');
  const allMembersQuery = useGymMembers(client, gymId);
  const attendanceQuery = useGymAttendanceHistory(client, gymId, attendanceFrom, today);
  const recordPayment = useRecordPayment(client);

  const payments = paymentsQuery.data ?? [];
  const kpiPayments = kpiPaymentsQuery.data ?? [];
  const activeMembers = membersQuery.data ?? [];
  const allMembers = allMembersQuery.data ?? [];

  const profileIds = useMemo(() => {
    const ids = new Set<string>();
    payments.forEach((p) => ids.add(p.user_id));
    kpiPayments.forEach((p) => ids.add(p.user_id));
    activeMembers.forEach((m) => ids.add(m.user_id));
    allMembers.forEach((m) => ids.add(m.user_id));
    return [...ids];
  }, [payments, kpiPayments, activeMembers, allMembers]);

  const profilesQuery = useProfilesMap(client, profileIds);
  const profiles = profilesQuery.data ?? {};

  const membershipByUser = useMemo(() => {
    const map = new Map<string, Membership>();
    for (const m of allMembers) {
      const prev = map.get(m.user_id);
      if (!prev || (m.status === 'active' && prev.status !== 'active')) {
        map.set(m.user_id, m);
      }
    }
    for (const m of activeMembers) map.set(m.user_id, m);
    return map;
  }, [allMembers, activeMembers]);

  const attendanceByUser = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of attendanceQuery.data ?? []) {
      map.set(row.user_id, (map.get(row.user_id) ?? 0) + 1);
    }
    return map;
  }, [attendanceQuery.data]);

  function attendancePct(userId: string, membership?: Membership) {
    const visits = attendanceByUser.get(userId) ?? 0;
    const startYmd = membership?.starts_at || membership?.created_at?.slice(0, 10);
    let windowDays = ATTENDANCE_WINDOW;
    if (startYmd) {
      const days = calculateDaysLeft(today, startYmd);
      if (days != null && days >= 0) windowDays = Math.min(ATTENDANCE_WINDOW, days + 1);
    }
    return Math.round(Math.min(100, (visits / Math.max(1, windowDays)) * 100));
  }

  function outstandingBalance(membership?: Membership) {
    if (!membership) return 0;
    if (membership.payment_status === 'not_paid' || membership.payment_status === 'failed') {
      return Number(membership.amount || 0);
    }
    return 0;
  }

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (applied.method !== 'all' && p.payment_mode !== applied.method) return false;
      if (applied.plan !== 'all' && p.plan !== applied.plan) return false;
      return true;
    });
  }, [payments, applied.method, applied.plan]);

  const todayRevenue = useMemo(() => {
    return kpiPayments
      .filter((p) => p.status === 'paid' && p.paid_at && p.paid_at.slice(0, 10) === today)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [kpiPayments, today]);

  const monthRevenue = sumPaidInMonth(kpiPayments);
  const renewalsCount = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    return kpiPayments.filter(
      (p) =>
        p.status === 'paid' && p.paid_at && new Date(p.paid_at).getTime() >= monthStart.getTime(),
    ).length;
  }, [kpiPayments]);

  const expiringSoon = useMemo(() => {
    return activeMembers.filter((m) => {
      if (!m.ends_at) return false;
      const days = calculateDaysLeft(m.ends_at, today);
      return days != null && days >= 0 && days <= EXPIRING_SOON_DAYS;
    }).length;
  }, [activeMembers, today]);

  const chartData = useMemo(() => {
    const days: { key: string; label: string; value: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const ymd = addDaysToYmd(today, -i);
      const [y, m, d] = ymd.split('-').map(Number);
      const label =
        y && m && d
          ? new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          : ymd;
      days.push({ key: ymd, label, value: 0 });
    }
    const index = new Map(days.map((d, i) => [d.key, i]));
    for (const p of kpiPayments) {
      if (p.status !== 'paid' || !p.paid_at) continue;
      const ymd = p.paid_at.slice(0, 10);
      const i = index.get(ymd);
      if (i === undefined) continue;
      days[i]!.value += Number(p.amount || 0);
    }
    return days;
  }, [kpiPayments, today]);

  const selectedMember = recordUserId
    ? activeMembers.find((m) => m.user_id === recordUserId) ??
      membershipByUser.get(recordUserId)
    : undefined;
  const selectedProfile = recordUserId ? profiles[recordUserId] : undefined;

  const memberSuggestions = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    return activeMembers
      .filter((m) => {
        if (!q) return true;
        const p = profiles[m.user_id];
        const hay = [memberLabel(p, m.user_id), p?.email, p?.phone]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 8);
  }, [activeMembers, memberQuery, profiles]);

  useEffect(() => {
    if (!recordAmount && gym) {
      setRecordAmount(String(defaultPriceForPlan(gym, recordPlan)));
    }
    // intentionally once on mount with gym pricing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gym?.id]);

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    setApplied({
      search,
      fromDate,
      toDate,
      status,
      method: methodFilter,
      plan: planFilter,
    });
  }

  function onPlanChange(plan: MembershipPlan) {
    setRecordPlan(plan);
    setRecordAmount(String(defaultPriceForPlan(gym, plan)));
  }

  function selectMember(userId: string) {
    setRecordUserId(userId);
    setMemberQuery(memberLabel(profiles[userId], userId));
    setMemberPickerOpen(false);
    if (!recordAmount) {
      setRecordAmount(String(defaultPriceForPlan(gym, recordPlan)));
    }
  }

  async function handleRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!gymId || !recordUserId) {
      setRecordError('Select a member.');
      return;
    }
    const amount = Number(recordAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      setRecordError('Enter a valid amount.');
      return;
    }

    setRecordError(null);
    try {
      const result = await recordPayment.mutateAsync({
        gymId,
        userId: recordUserId,
        plan: recordPlan,
        amount,
        paymentMode: recordMode,
        extendMembership: recordExtend,
      });
      setLastPayment(result.payment);
      setRecordAmount(String(defaultPriceForPlan(gym, recordPlan)));
      await paymentsQuery.refetch();
      await kpiPaymentsQuery.refetch();
      await membersQuery.refetch();
    } catch (error) {
      setRecordError(error instanceof Error ? error.message : 'Failed to record payment.');
    }
  }

  function receiptHtml(payment: Payment) {
    return buildReceiptHtml({
      gymName: gym?.name ?? 'Smart Gym',
      memberName: memberLabel(profiles[payment.user_id], payment.user_id),
      email: profiles[payment.user_id]?.email,
      payment,
    });
  }

  const kpis = [
    {
      label: "Today's Revenue",
      value: formatMoney(todayRevenue),
      hint: 'Paid checkouts today',
      icon: Banknote,
    },
    {
      label: 'Monthly Revenue',
      value: formatMoney(monthRevenue),
      hint: 'Paid this calendar month',
      icon: RefreshCw,
    },
    {
      label: 'Renewals',
      value: renewalsCount,
      hint: 'Paid payments this month',
      icon: Users,
    },
    {
      label: 'Expiring Soon',
      value: expiringSoon,
      hint: `Within ${EXPIRING_SOON_DAYS} days`,
      icon: CalendarClock,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 sm:space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-foreground">
            Payments
          </h1>
          <p className="text-sm text-slate-500 dark:text-muted-foreground">
            Record renewals and review revenue for {gym?.name ?? 'your gym'}.
          </p>
        </div>
        <Button
          type="button"
          className="min-h-11 rounded-2xl bg-emerald-600 px-5 hover:bg-emerald-700"
          onClick={scrollToForm}
        >
          <UserPlus className="size-4" aria-hidden />
          Record Payment
        </Button>
      </header>

      {/* KPIs */}
      <section aria-label="Payment metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Record form */}
        <CardShell id="record-payment" className="scroll-mt-24 p-5 sm:p-6 lg:col-span-3">
          <div ref={formRef} className="scroll-mt-24">
            <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-foreground">
              Record payment
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-muted-foreground">
              Log a payment for an active member. Optionally renew membership.
            </p>

            <form onSubmit={(e) => void handleRecord(e)} className="mt-5 space-y-4">
              <Field>
                <FieldLabel>Member</FieldLabel>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <Input
                    value={memberQuery}
                    onChange={(e) => {
                      setMemberQuery(e.target.value);
                      setMemberPickerOpen(true);
                      if (recordUserId) setRecordUserId('');
                    }}
                    onFocus={() => setMemberPickerOpen(true)}
                    placeholder="Search member by name or email…"
                    className="min-h-12 rounded-2xl pl-10"
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-expanded={memberPickerOpen}
                  />
                  {memberPickerOpen && memberSuggestions.length > 0 ? (
                    <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-2xl border border-slate-200 bg-white py-1 shadow-lg dark:border-border dark:bg-card">
                      {memberSuggestions.map((m) => {
                        const p = profiles[m.user_id];
                        return (
                          <li key={m.id}>
                            <button
                              type="button"
                              className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              onClick={() => selectMember(m.user_id)}
                            >
                              <MemberAvatar profile={p} userId={m.user_id} size="sm" />
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold">
                                  {memberLabel(p, m.user_id)}
                                </span>
                                <span className="block truncate text-xs text-slate-500">
                                  {p?.email}
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Membership plan</FieldLabel>
                  <select
                    className={selectClass}
                    value={recordPlan}
                    onChange={(e) => onPlanChange(e.target.value as MembershipPlan)}
                  >
                    {MEMBERSHIP_PLANS.map((plan) => (
                      <option key={plan} value={plan}>
                        {MEMBERSHIP_PLAN_LABELS[plan]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field>
                  <FieldLabel>Amount (₹)</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className="min-h-12 rounded-2xl"
                    value={recordAmount}
                    onChange={(e) => setRecordAmount(e.target.value)}
                  />
                </Field>
                <Field className="sm:col-span-2">
                  <FieldLabel>Payment method</FieldLabel>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {PAYMENT_METHODS.map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setRecordMode(mode)}
                        className={cn(
                          'min-h-12 rounded-2xl border text-sm font-semibold transition-colors',
                          recordMode === mode
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-border dark:text-muted-foreground',
                        )}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 dark:border-border dark:bg-muted">
                <input
                  type="checkbox"
                  className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                  checked={recordExtend}
                  onChange={(e) => setRecordExtend(e.target.checked)}
                />
                <span className="text-sm font-medium text-slate-800 dark:text-foreground">
                  Extend / renew membership with this payment
                </span>
              </label>

              <Button
                type="submit"
                disabled={recordPayment.isPending || !gymId}
                className="min-h-12 w-full rounded-2xl bg-emerald-600 text-base font-semibold hover:bg-emerald-700 sm:w-auto sm:min-w-[200px]"
              >
                {recordPayment.isPending ? 'Saving…' : 'Record payment'}
              </Button>

              {recordError ? (
                <p className="text-sm text-destructive" role="alert">
                  {recordError}
                </p>
              ) : null}
            </form>

            {lastPayment ? (
              <div
                className="mt-5 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40 sm:flex-row sm:items-center sm:justify-between"
                role="status"
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                    <CheckCircle2 className="size-5" aria-hidden />
                  </span>
                  <div>
                    <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                      Payment recorded successfully
                    </p>
                    <p className="text-sm text-emerald-800 dark:text-emerald-200">
                      {memberLabel(profiles[lastPayment.user_id], lastPayment.user_id)} ·{' '}
                      {formatMoney(Number(lastPayment.amount || 0))}
                      {recordExtend ? ' · Membership renewed' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-10 rounded-xl"
                    onClick={() => {
                      openReceiptWindow(
                        receiptHtml(lastPayment),
                        'view',
                        `receipt-${lastPayment.id}.html`,
                      );
                    }}
                  >
                    <Eye className="size-3.5" />
                    View
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-10 rounded-xl"
                    onClick={() =>
                      openReceiptWindow(
                        receiptHtml(lastPayment),
                        'print',
                        `receipt-${lastPayment.id}.html`,
                      )
                    }
                  >
                    <Printer className="size-3.5" />
                    Print
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-10 rounded-xl"
                    onClick={() =>
                      openReceiptWindow(
                        receiptHtml(lastPayment),
                        'download',
                        `receipt-${lastPayment.id}.html`,
                      )
                    }
                  >
                    <Download className="size-3.5" />
                    Download
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="min-h-10 rounded-xl"
                    onClick={() => setLastPayment(null)}
                    aria-label="Dismiss"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </CardShell>

        {/* Selected member summary */}
        <CardShell className="p-5 sm:p-6 lg:col-span-2">
          <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-foreground">
            Member summary
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-muted-foreground">
            Shown when a member is selected
          </p>

          {!recordUserId || !selectedMember ? (
            <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center dark:border-border">
              <Users className="size-8 text-slate-300" aria-hidden />
              <p className="mt-3 text-sm font-medium text-slate-700 dark:text-foreground">
                Select a member
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Search above to see plan, expiry, and balance.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="flex items-start gap-3">
                <MemberAvatar profile={selectedProfile} userId={recordUserId} size="lg" />
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-slate-900 dark:text-foreground">
                    {memberLabel(selectedProfile, recordUserId)}
                  </p>
                  <p className="truncate text-sm text-slate-500">{selectedProfile?.email}</p>
                </div>
              </div>

              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between gap-3 rounded-2xl bg-slate-50 px-3.5 py-3 dark:bg-muted">
                  <dt className="text-slate-500">Membership</dt>
                  <dd className="font-semibold text-slate-900 dark:text-foreground">
                    {selectedMember.plan ? getPlanLabel(selectedMember.plan) : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 rounded-2xl bg-slate-50 px-3.5 py-3 dark:bg-muted">
                  <dt className="text-slate-500">Expires</dt>
                  <dd className="text-right font-semibold text-slate-900 dark:text-foreground">
                    <div>{formatYmd(selectedMember.ends_at)}</div>
                    <div className="text-xs font-normal text-slate-400">
                      {selectedMember.ends_at
                        ? getMembershipExpiryLine(selectedMember.ends_at, today)
                        : '—'}
                    </div>
                  </dd>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3.5 py-3 dark:bg-muted">
                  <div className="mb-1.5 flex justify-between text-slate-500">
                    <span>Attendance (30d)</span>
                    <span className="font-semibold text-slate-900 dark:text-foreground">
                      {attendancePct(recordUserId, selectedMember)}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-background">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{
                        width: `${attendancePct(recordUserId, selectedMember)}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="flex justify-between gap-3 rounded-2xl bg-slate-50 px-3.5 py-3 dark:bg-muted">
                  <dt className="text-slate-500">Outstanding</dt>
                  <dd className="font-semibold text-slate-900 dark:text-foreground">
                    {formatMoney(outstandingBalance(selectedMember))}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </CardShell>
      </div>

      {/* Revenue chart */}
      <CardShell className="p-5 sm:p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-foreground">
              Recent revenue
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-muted-foreground">
              Paid amount · last 14 days
            </p>
          </div>
          <p className="text-lg font-semibold tabular-nums text-slate-900 dark:text-foreground">
            {formatMoney(chartData.reduce((s, d) => s + d.value, 0))}
          </p>
        </div>
        <div className="mt-4 h-56 w-full sm:h-64">
          {chartData.every((d) => d.value === 0) ? (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-500 dark:border-border">
              No paid revenue in the last 14 days
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="payRevenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`
                  }
                />
                <Tooltip
                  formatter={(value) => [formatMoney(Number(value ?? 0)), 'Revenue']}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 8px 20px rgba(15,23,42,0.08)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#059669"
                  strokeWidth={2}
                  fill="url(#payRevenueFill)"
                  name="Revenue"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardShell>

      {/* Filters */}
      <CardShell className="p-4 sm:p-5">
        <form
          onSubmit={applyFilters}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
        >
          <Field className="xl:col-span-2">
            <FieldLabel>Search</FieldLabel>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <Input
                placeholder="Name, email, mode, plan…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-h-11 rounded-2xl pl-10"
              />
            </div>
          </Field>
          <Field>
            <FieldLabel>From</FieldLabel>
            <Input
              type="date"
              className="min-h-11 rounded-2xl"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>To</FieldLabel>
            <Input
              type="date"
              className="min-h-11 rounded-2xl"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>Method</FieldLabel>
            <select
              className={cn(selectClass, 'min-h-11')}
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
            >
              <option value="all">All methods</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel>Plan</FieldLabel>
            <select
              className={cn(selectClass, 'min-h-11')}
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value as MembershipPlan | 'all')}
            >
              <option value="all">All plans</option>
              {MEMBERSHIP_PLANS.map((plan) => (
                <option key={plan} value={plan}>
                  {MEMBERSHIP_PLAN_LABELS[plan]}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel>Status</FieldLabel>
            <select
              className={cn(selectClass, 'min-h-11')}
              value={status}
              onChange={(e) => setStatus(e.target.value as PaymentStatus | 'all')}
            >
              <option value="all">All statuses</option>
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PAYMENT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end sm:col-span-2 xl:col-span-6">
            <Button
              type="submit"
              variant="outline"
              className="min-h-11 rounded-2xl"
            >
              Apply filters
            </Button>
            <p className="ml-3 text-sm text-slate-500">
              {formatMoney(sumPaidAmount(filteredPayments))} paid in results
            </p>
          </div>
        </form>
      </CardShell>

      {/* History */}
      <section aria-label="Payment history" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-foreground">
              Payment history
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-muted-foreground">
              {filteredPayments.length} payment{filteredPayments.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {paymentsQuery.isLoading ? (
          <div className="h-40 animate-pulse rounded-[20px] bg-slate-100 dark:bg-muted" />
        ) : filteredPayments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-slate-200 bg-slate-50/60 px-6 py-14 text-center dark:border-border dark:bg-muted/20">
            <Banknote className="size-8 text-slate-300" aria-hidden />
            <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-foreground">
              No payments match these filters
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Adjust filters or record a new payment above.
            </p>
          </div>
        ) : (
          <>
            <CardShell className="hidden overflow-hidden lg:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:border-border dark:bg-muted/40">
                      <th className="px-5 py-3.5">Member</th>
                      <th className="px-3 py-3.5">Date</th>
                      <th className="px-3 py-3.5">Plan</th>
                      <th className="px-3 py-3.5">Method</th>
                      <th className="px-3 py-3.5">Status</th>
                      <th className="px-3 py-3.5 text-right">Amount</th>
                      <th className="px-5 py-3.5 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((row) => {
                      const profile = profiles[row.user_id];
                      return (
                        <tr
                          key={row.id}
                          className="border-b border-slate-100 last:border-0 hover:bg-emerald-50/40 dark:border-border dark:hover:bg-emerald-950/20"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <MemberAvatar profile={profile} userId={row.user_id} size="sm" />
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-900 dark:text-foreground">
                                  {memberLabel(profile, row.user_id)}
                                </p>
                                <p className="truncate text-xs text-slate-400">{profile?.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3.5 text-slate-600 dark:text-muted-foreground">
                            {formatDate(row.paid_at)}
                          </td>
                          <td className="px-3 py-3.5">
                            {row.plan ? getPlanLabel(row.plan) : '—'}
                          </td>
                          <td className="px-3 py-3.5 text-slate-600 dark:text-muted-foreground">
                            {row.payment_mode || '—'}
                          </td>
                          <td className="px-3 py-3.5">
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-slate-900 dark:text-foreground">
                            {formatMoney(Number(row.amount || 0))}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="min-h-9 rounded-xl"
                                onClick={() =>
                                  openReceiptWindow(
                                    receiptHtml(row),
                                    'view',
                                    `receipt-${row.id}.html`,
                                  )
                                }
                              >
                                <Eye className="size-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="min-h-9 rounded-xl"
                                onClick={() =>
                                  openReceiptWindow(
                                    receiptHtml(row),
                                    'print',
                                    `receipt-${row.id}.html`,
                                  )
                                }
                              >
                                <Printer className="size-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="min-h-9 rounded-xl"
                                onClick={() =>
                                  openReceiptWindow(
                                    receiptHtml(row),
                                    'download',
                                    `receipt-${row.id}.html`,
                                  )
                                }
                              >
                                <Download className="size-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardShell>

            <div className="grid gap-3 lg:hidden">
              {filteredPayments.map((row) => {
                const profile = profiles[row.user_id];
                return (
                  <CardShell key={row.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <MemberAvatar profile={profile} userId={row.user_id} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-slate-900 dark:text-foreground">
                            {memberLabel(profile, row.user_id)}
                          </p>
                          <p className="font-semibold tabular-nums text-slate-900 dark:text-foreground">
                            {formatMoney(Number(row.amount || 0))}
                          </p>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">{formatDate(row.paid_at)}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <StatusBadge status={row.status} />
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-muted dark:text-foreground">
                            {row.plan ? getPlanLabel(row.plan) : '—'}
                          </span>
                          <span className="text-xs text-slate-400">{row.payment_mode || '—'}</span>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-9 flex-1 rounded-xl"
                            onClick={() =>
                              openReceiptWindow(receiptHtml(row), 'view', `receipt-${row.id}.html`)
                            }
                          >
                            <Eye className="size-3.5" />
                            View
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-9 flex-1 rounded-xl"
                            onClick={() =>
                              openReceiptWindow(receiptHtml(row), 'print', `receipt-${row.id}.html`)
                            }
                          >
                            <Printer className="size-3.5" />
                            Print
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-9 flex-1 rounded-xl"
                            onClick={() =>
                              openReceiptWindow(
                                receiptHtml(row),
                                'download',
                                `receipt-${row.id}.html`,
                              )
                            }
                          >
                            <Download className="size-3.5" />
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardShell>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
