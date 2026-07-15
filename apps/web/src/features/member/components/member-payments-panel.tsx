'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
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
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Download,
  Dumbbell,
  Eye,
  HelpCircle,
  Mail,
  Phone,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Wallet,
  X,
} from 'lucide-react';
import {
  MEMBERSHIP_PLANS,
  MEMBERSHIP_PLAN_DAYS,
  MEMBERSHIP_PLAN_LABELS,
  PAYMENT_MODES,
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
import { sumPaidAmount, useMemberPayments, type Tables } from '@smart-gym/supabase';
import { useMemberContext } from '@/features/member/components/member-provider';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { cn } from '@/lib/utils';

type Payment = Tables<'payments'>;
type ChartRange = 'day' | 'month' | 'year';

const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Online', ...PAYMENT_MODES] as const;

function GlassCard({
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
        'rounded-[20px] border border-border/60 bg-card/80 shadow-[0_8px_28px_rgba(15,23,42,0.06)] backdrop-blur-md',
        'dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_8px_32px_rgba(0,0,0,0.25)]',
        className,
      )}
    >
      {children}
    </div>
  );
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

function toYmd(value: string | null | undefined): string | null {
  if (!value) return null;
  const ymd = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : null;
}

function formatYmd(value: string | null | undefined) {
  const ymd = toYmd(value);
  if (!ymd) return value ? formatDate(value) : '—';
  try {
    const [y, m, d] = ymd.split('-').map(Number);
    if (!y || !m || !d) return ymd;
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return ymd;
  }
}

function displayName(profile: {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
} | null | undefined) {
  if (!profile) return 'Member';
  if (profile.full_name?.trim()) return profile.full_name.trim().toUpperCase();
  const combined = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
  return (combined || 'Member').toUpperCase();
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  const styles: Record<PaymentStatus, string> = {
    paid: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    not_paid: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
    refunded: 'bg-muted text-muted-foreground',
    failed: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
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

function MembershipStatusBadge({
  status,
  daysLeft,
}: {
  status: string | null | undefined;
  daysLeft: number | null;
}) {
  let label = 'Active';
  let className = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
  if (status === 'expired' || (daysLeft != null && daysLeft < 0)) {
    label = 'Expired';
    className = 'bg-rose-500/15 text-rose-700 dark:text-rose-300';
  } else if (daysLeft != null && daysLeft <= 30) {
    label = 'Expiring Soon';
    className = 'bg-amber-500/15 text-amber-800 dark:text-amber-300';
  } else if (status === 'active') {
    label = 'Active';
  } else if (status) {
    label = status;
    className = 'bg-muted text-muted-foreground capitalize';
  }
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', className)}>
      {label === 'Active' ? <CheckCircle2 className="size-3.5" aria-hidden /> : null}
      {label}
    </span>
  );
}

function buildReceiptHtml(opts: {
  gymName: string;
  memberName: string;
  payment: Payment;
}) {
  const { gymName, memberName, payment } = opts;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Receipt ${payment.id.slice(0, 8)}</title>
<style>
  body{font-family:system-ui,sans-serif;padding:32px;color:#0f172a;max-width:420px;margin:0 auto}
  h1{font-size:18px;margin:0 0 4px}.muted{color:#64748b;font-size:13px}
  .box{border:1px solid #e2e8f0;border-radius:16px;padding:16px;margin-top:20px}
  .row{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px}
  .row:last-child{border:0}.amt{font-size:28px;font-weight:700;margin-top:16px}
  @media print{body{padding:0}}
</style></head><body>
  <h1>${gymName}</h1>
  <p class="muted">Payment receipt</p>
  <div class="amt">${formatMoney(Number(payment.amount || 0))}</div>
  <p class="muted">${PAYMENT_STATUS_LABELS[payment.status] ?? payment.status} · ${formatDate(payment.paid_at)}</p>
  <div class="box">
    <div class="row"><span class="muted">Member</span><span>${memberName}</span></div>
    <div class="row"><span class="muted">Plan</span><span>${payment.plan ? getPlanLabel(payment.plan) : '—'}</span></div>
    <div class="row"><span class="muted">Method</span><span>${payment.payment_mode || '—'}</span></div>
    <div class="row"><span class="muted">Receipt ID</span><span>${payment.id}</span></div>
  </div>
</body></html>`;
}

function openReceipt(html: string, action: 'view' | 'print' | 'download', filename: string) {
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

function gymPriceForPlan(
  gym: {
    price_1_month: number;
    price_3_month: number;
    price_6_month: number;
    price_12_month: number;
  } | null,
  plan: MembershipPlan | null | undefined,
): number {
  if (!gym || !plan) return 0;
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

const selectClass =
  'min-h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30';

export function MemberPaymentsPanel() {
  const { client, userId, profile, gym, membership } = useMemberContext();
  const today = getTodayYmd();

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
  const [chartRange, setChartRange] = useState<ChartRange>('month');
  const [qrOpen, setQrOpen] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const kpiPaymentsQuery = useMemberPayments(client, userId, {
    gymId: gym?.id,
    limit: 200,
  });
  const paymentsQuery = useMemberPayments(client, userId, {
    gymId: gym?.id,
    limit: 100,
    search: applied.search || undefined,
    fromDate: applied.fromDate || undefined,
    toDate: applied.toDate || undefined,
    status: applied.status,
  });

  const allPayments = kpiPaymentsQuery.data ?? [];
  const payments = useMemo(() => {
    return (paymentsQuery.data ?? []).filter((p) => {
      if (applied.method !== 'all' && p.payment_mode !== applied.method) return false;
      if (applied.plan !== 'all' && p.plan !== applied.plan) return false;
      return true;
    });
  }, [paymentsQuery.data, applied.method, applied.plan]);

  const totalPaidAll = sumPaidAmount(allPayments);
  const endsYmd = toYmd(membership?.ends_at);
  const startsYmd = toYmd(membership?.starts_at);
  const daysLeft = endsYmd ? calculateDaysLeft(endsYmd, today) : null;
  const planDays =
    membership?.plan && membership.plan in MEMBERSHIP_PLAN_DAYS
      ? MEMBERSHIP_PLAN_DAYS[membership.plan as MembershipPlan]
      : 30;
  const renewalProgress =
    daysLeft == null
      ? 0
      : daysLeft < 0
        ? 0
        : Math.min(100, Math.max(0, Math.round((daysLeft / planDays) * 100)));

  const membershipDurationDays = useMemo(() => {
    if (!startsYmd) return null;
    const daysFromStart = calculateDaysLeft(today, startsYmd);
    return daysFromStart != null && daysFromStart >= 0 ? daysFromStart + 1 : null;
  }, [startsYmd, today]);

  const estimatedRenewal = gymPriceForPlan(gym, membership?.plan as MembershipPlan | undefined);
  const showRenewalCard = membership != null && daysLeft != null && daysLeft >= 0 && daysLeft < 30;

  const memberLabel = displayName(profile);
  const membershipId = membership?.id
    ? `${(gym?.code || 'GYM').slice(0, 3).toUpperCase()}-${membership.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`
    : '—';

  const qrPayload = useMemo(() => {
    return JSON.stringify({
      gym: gym?.name ?? '',
      code: gym?.code ?? '',
      member: memberLabel,
      membershipId,
      ends: endsYmd ?? '',
    });
  }, [gym?.name, gym?.code, memberLabel, membershipId, endsYmd]);

  const timelineProgress = useMemo(() => {
    if (!startsYmd || !endsYmd) return 50;
    const start = new Date(`${startsYmd}T00:00:00`).getTime();
    const end = new Date(`${endsYmd}T00:00:00`).getTime();
    const now = new Date(`${today}T00:00:00`).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 50;
    return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  }, [startsYmd, endsYmd, today]);

  const chartData = useMemo(() => {
    if (chartRange === 'day') {
      const days: { key: string; label: string; amount: number }[] = [];
      for (let i = 13; i >= 0; i--) {
        const ymd = addDaysToYmd(today, -i);
        const [y, m, d] = ymd.split('-').map(Number);
        const label =
          y && m && d
            ? new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            : ymd;
        days.push({ key: ymd, label, amount: 0 });
      }
      const index = new Map(days.map((d, i) => [d.key, i]));
      for (const p of allPayments) {
        if (p.status !== 'paid' || !p.paid_at) continue;
        const ymd = p.paid_at.slice(0, 10);
        const i = index.get(ymd);
        if (i === undefined) continue;
        days[i]!.amount += Number(p.amount || 0);
      }
      return days;
    }

    if (chartRange === 'year') {
      const year = new Date().getFullYear();
      const months = Array.from({ length: 12 }, (_, month) => ({
        key: `${year}-${month}`,
        label: new Date(year, month, 1).toLocaleDateString(undefined, { month: 'short' }),
        amount: 0,
      }));
      for (const p of allPayments) {
        if (p.status !== 'paid' || !p.paid_at) continue;
        const at = new Date(p.paid_at);
        if (at.getFullYear() !== year) continue;
        months[at.getMonth()]!.amount += Number(p.amount || 0);
      }
      return months;
    }

    // month view: last 6 months
    const points: { key: string; label: string; amount: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      points.push({
        key,
        label: d.toLocaleDateString(undefined, { month: 'short' }),
        amount: 0,
      });
    }
    const index = new Map(points.map((p, i) => [p.key, i]));
    for (const p of allPayments) {
      if (p.status !== 'paid' || !p.paid_at) continue;
      const at = new Date(p.paid_at);
      const key = `${at.getFullYear()}-${at.getMonth()}`;
      const i = index.get(key);
      if (i === undefined) continue;
      points[i]!.amount += Number(p.amount || 0);
    }
    return points;
  }, [allPayments, chartRange, today]);

  function receiptHtml(payment: Payment) {
    return buildReceiptHtml({
      gymName: gym?.name ?? 'Smart Gym',
      memberName: displayName(profile),
      payment,
    });
  }

  function handleReceipt(payment: Payment, action: 'view' | 'print' | 'download') {
    openReceipt(receiptHtml(payment), action, `receipt-${payment.id}.html`);
    if (action === 'download') {
      setBanner('Receipt downloaded successfully.');
      window.setTimeout(() => setBanner(null), 3500);
    }
  }

  const latestPaid = allPayments.find((p) => p.status === 'paid') ?? allPayments[0];

  const uniqueMethods = useMemo(() => {
    const set = new Set<string>([...PAYMENT_METHODS]);
    for (const p of allPayments) {
      if (p.payment_mode) set.add(p.payment_mode);
    }
    return [...set];
  }, [allPayments]);

  return (
    <motion.div
      className="mx-auto w-full max-w-6xl space-y-6 pb-24 sm:space-y-8 lg:pb-8"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Payments</h1>
        <p className="text-sm text-muted-foreground">
          Membership & billing{gym?.name ? ` at ${gym.name}` : ''}
        </p>
      </header>

      <AnimatePresence>
        {banner ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 rounded-[20px] border border-emerald-500/30 bg-emerald-500/10 px-4 py-3"
            role="status"
          >
            <CheckCircle2 className="mt-0.5 size-5 text-emerald-600 dark:text-emerald-400" />
            <p className="flex-1 text-sm font-medium text-emerald-800 dark:text-emerald-200">
              {banner}
            </p>
            <button type="button" aria-label="Dismiss" onClick={() => setBanner(null)}>
              <X className="size-4" />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!membership ? (
        <GlassCard className="flex flex-col items-center px-6 py-14 text-center">
          <Wallet className="size-10 text-muted-foreground/40" aria-hidden />
          <p className="mt-4 text-base font-semibold">No active membership</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Contact your gym to activate or renew membership, then your billing details will appear
            here.
          </p>
          {gym?.phone || gym?.contact_email ? (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {gym.phone ? (
                <a
                  href={`tel:${gym.phone}`}
                  className={cn(buttonVariants(), 'min-h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700')}
                >
                  <Phone className="size-4" /> Call gym
                </a>
              ) : null}
              {gym.contact_email ? (
                <a
                  href={`mailto:${gym.contact_email}`}
                  className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11 rounded-2xl')}
                >
                  <Mail className="size-4" /> Email gym
                </a>
              ) : null}
            </div>
          ) : null}
        </GlassCard>
      ) : null}

      {/* Hero: digital card + KPIs */}
      <div className="grid gap-4 lg:grid-cols-5">
        <GlassCard className="relative overflow-hidden p-0 lg:col-span-3">
          <div
            className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900"
            aria-hidden
          />
          <div className="relative p-6 text-white sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-emerald-100">
                  <Dumbbell className="size-4" aria-hidden />
                  {gym?.name ?? 'Smart Gym'}
                </p>
                <p className="mt-4 text-2xl font-semibold tracking-wide sm:text-3xl">
                  {memberLabel}
                </p>
                <p className="mt-1 text-sm text-emerald-100/90">
                  {membership?.plan ? getPlanLabel(membership.plan) : 'Member'} · Premium Member
                </p>
              </div>
              <MembershipStatusBadge status={membership?.status} daysLeft={daysLeft} />
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs tracking-wide text-emerald-100/70 uppercase">Expires</p>
                <p className="mt-1 text-lg font-semibold">{formatYmd(endsYmd)}</p>
                <p className="mt-1 text-sm text-emerald-100/80">
                  {endsYmd ? getMembershipExpiryLine(endsYmd, today) : 'No end date set'}
                </p>
              </div>
              <div>
                <p className="text-xs tracking-wide text-emerald-100/70 uppercase">Membership ID</p>
                <p className="mt-1 font-mono text-lg font-semibold tracking-wider">{membershipId}</p>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-1.5 flex justify-between text-xs text-emerald-100/80">
                <span>Days remaining</span>
                <span className="font-semibold tabular-nums">
                  {daysLeft == null ? '—' : Math.max(0, daysLeft)} d · {renewalProgress}%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/20">
                <motion.div
                  className="h-full rounded-full bg-white"
                  initial={{ width: 0 }}
                  animate={{ width: `${renewalProgress}%` }}
                  transition={{ duration: 0.7 }}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 rounded-2xl bg-white/15 text-white hover:bg-white/25"
                onClick={() => setQrOpen(true)}
              >
                <QrCode className="size-4" />
                Show QR Code
              </Button>
            </div>
          </div>
        </GlassCard>

        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-1">
          {[
            {
              label: 'Total Paid',
              value: formatMoney(totalPaidAll),
              icon: Banknote,
              hint: 'All paid receipts',
            },
            {
              label: 'Current Plan',
              value: membership?.plan ? getPlanLabel(membership.plan) : '—',
              icon: CreditCard,
              hint: membership?.status ?? 'No plan',
            },
            {
              label: 'Membership Duration',
              value:
                membershipDurationDays != null ? `${membershipDurationDays} days` : '—',
              icon: CalendarDays,
              hint: startsYmd ? `Since ${formatYmd(startsYmd)}` : '—',
            },
            {
              label: 'Next Renewal',
              value: formatYmd(endsYmd),
              icon: RefreshCw,
              hint: daysLeft != null && daysLeft >= 0 ? `${daysLeft} days left` : '—',
            },
          ].map((kpi) => {
            const Icon = kpi.icon;
            return (
              <GlassCard key={kpi.label} className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground sm:text-sm">
                      {kpi.label}
                    </p>
                    <p className="mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">
                      {kpi.value}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{kpi.hint}</p>
                  </div>
                  <span className="inline-flex size-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <Icon className="size-4" aria-hidden />
                  </span>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>

      {/* Timeline + renewal */}
      <div className="grid gap-4 lg:grid-cols-5">
        <GlassCard className="p-5 sm:p-6 lg:col-span-3">
          <h2 className="text-base font-semibold tracking-tight">Membership Timeline</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Where you are in this cycle</p>

          <div className="relative mt-10 px-1 pb-2">
            <div className="absolute top-3 right-3 left-3 h-1.5 rounded-full bg-muted" />
            <motion.div
              className="absolute top-3 left-3 h-1.5 rounded-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `calc(${timelineProgress}% * 0.01 * (100% - 1.5rem))` }}
              style={{ width: `calc((100% - 1.5rem) * ${timelineProgress / 100})` }}
              transition={{ duration: 0.8 }}
            />
            <div className="relative h-20">
              <div className="absolute top-0 left-0 flex w-16 -translate-x-0 flex-col items-start">
                <span className="size-7 rounded-full border-4 border-background bg-slate-300 shadow dark:bg-slate-600" />
                <p className="mt-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Started
                </p>
                <p className="mt-1 text-sm font-medium">{formatYmd(startsYmd)}</p>
              </div>
              <div
                className="absolute top-0 flex w-20 -translate-x-1/2 flex-col items-center text-center"
                style={{ left: `calc(0.75rem + (100% - 1.5rem) * ${timelineProgress / 100})` }}
              >
                <span className="size-7 rounded-full border-4 border-background bg-emerald-500 shadow" />
                <p className="mt-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Today
                </p>
                <p className="mt-1 text-sm font-medium">{formatYmd(today)}</p>
              </div>
              <div className="absolute top-0 right-0 flex w-16 flex-col items-end text-right">
                <span className="size-7 rounded-full border-4 border-background bg-slate-300 shadow dark:bg-slate-600" />
                <p className="mt-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Renewal
                </p>
                <p className="mt-1 text-sm font-medium">{formatYmd(endsYmd)}</p>
              </div>
            </div>
          </div>
        </GlassCard>

        {showRenewalCard ? (
          <GlassCard className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent p-5 sm:p-6 lg:col-span-2">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Renewal reminder</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              {daysLeft} <span className="text-lg font-medium">days left</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Renew before {formatYmd(endsYmd)} to keep uninterrupted access.
            </p>
            <p className="mt-3 text-sm">
              Estimated renewal:{' '}
              <span className="font-semibold">{formatMoney(estimatedRenewal)}</span>
              {membership?.plan ? ` · ${getPlanLabel(membership.plan)}` : ''}
            </p>
            <Button
              type="button"
              className="mt-5 min-h-12 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                if (gym?.contact_email) {
                  window.location.href = `mailto:${gym.contact_email}?subject=${encodeURIComponent('Membership renewal')}`;
                } else if (gym?.phone) {
                  window.location.href = `tel:${gym.phone}`;
                } else {
                  setBanner('Contact reception to renew your membership.');
                }
              }}
            >
              <RefreshCw className="size-4" />
              Renew Membership
            </Button>
          </GlassCard>
        ) : (
          <GlassCard className="flex flex-col justify-center p-5 sm:p-6 lg:col-span-2">
            <p className="text-sm font-medium text-muted-foreground">Renewal status</p>
            <p className="mt-2 text-lg font-semibold">
              {daysLeft == null
                ? 'No renewal date set'
                : daysLeft < 0
                  ? 'Membership expired — renew to continue'
                  : 'You’re in good standing'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Renewal reminders appear when fewer than 30 days remain.
            </p>
          </GlassCard>
        )}
      </div>

      {/* Chart */}
      <GlassCard className="p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Payment Statistics</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Spending over time · total {formatMoney(totalPaidAll)}
            </p>
          </div>
          <div className="inline-flex rounded-full bg-muted p-1" role="tablist">
            {(['day', 'month', 'year'] as ChartRange[]).map((r) => (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={chartRange === r}
                onClick={() => setChartRange(r)}
                className={cn(
                  'min-h-9 rounded-full px-3.5 text-sm font-semibold capitalize',
                  chartRange === r
                    ? 'bg-background text-emerald-700 shadow-sm dark:text-emerald-300'
                    : 'text-muted-foreground',
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 h-56 w-full sm:h-64">
          {chartData.every((d) => d.amount === 0) ? (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
              No payment activity in this range yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="memberPayFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#33415533" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`)}
                />
                <Tooltip
                  formatter={(value) => [formatMoney(Number(value ?? 0)), 'Spent']}
                  contentStyle={{ borderRadius: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#059669"
                  fill="url(#memberPayFill)"
                  strokeWidth={2}
                  name="Spent"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </GlassCard>

      {/* Filters */}
      <GlassCard className="p-4 sm:p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setApplied({
              search,
              fromDate,
              toDate,
              status,
              method: methodFilter,
              plan: planFilter,
            });
          }}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
        >
          <Field className="xl:col-span-2">
            <FieldLabel>Search</FieldLabel>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                placeholder="Mode, plan, amount…"
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
              className={selectClass}
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
            >
              <option value="all">All methods</option>
              {uniqueMethods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel>Status</FieldLabel>
            <select
              className={selectClass}
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
          <Field>
            <FieldLabel>Plan</FieldLabel>
            <select
              className={selectClass}
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
          <div className="flex items-end sm:col-span-2 xl:col-span-6">
            <Button type="submit" variant="outline" className="min-h-11 rounded-2xl">
              Apply filters
            </Button>
            <p className="ml-3 text-sm text-muted-foreground">
              {formatMoney(sumPaidAmount(payments))} in results
            </p>
          </div>
        </form>
      </GlassCard>

      {/* History */}
      <section id="history" aria-label="Payment history" className="scroll-mt-24">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Payment History</h2>
            <p className="text-sm text-muted-foreground">
              {payments.length} payment{payments.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {paymentsQuery.isLoading ? (
          <div className="h-32 animate-pulse rounded-[20px] bg-muted" />
        ) : payments.length === 0 ? (
          <GlassCard className="flex flex-col items-center px-6 py-14 text-center">
            <Banknote className="size-10 text-muted-foreground/40" aria-hidden />
            <p className="mt-4 text-base font-semibold">
              {allPayments.length === 0 ? 'No payment history' : 'No search results'}
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {allPayments.length === 0
                ? 'When you pay at the desk, receipts will appear here.'
                : 'Try adjusting filters or clearing the date range.'}
            </p>
          </GlassCard>
        ) : (
          <div className="grid gap-3">
            {payments.map((row) => (
              <GlassCard key={row.id} className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <CreditCard className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{formatDate(row.paid_at)}</p>
                        <StatusBadge status={row.status} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {row.plan ? getPlanLabel(row.plan) : '—'} · {row.payment_mode || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <p className="mr-2 text-xl font-semibold tabular-nums">
                      {formatMoney(Number(row.amount || 0))}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-10 rounded-xl"
                      onClick={() => handleReceipt(row, 'view')}
                    >
                      <Eye className="size-3.5" />
                      View
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-10 rounded-xl"
                      onClick={() => handleReceipt(row, 'download')}
                    >
                      <Download className="size-3.5" />
                      PDF
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-10 rounded-xl"
                      onClick={() => handleReceipt(row, 'print')}
                    >
                      <Printer className="size-3.5" />
                      Print
                    </Button>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </section>

      {/* Quick actions */}
      <section aria-label="Quick actions">
        <h2 className="mb-3 text-base font-semibold tracking-tight">Quick Actions</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Button
            type="button"
            variant="outline"
            className="min-h-12 justify-start rounded-2xl"
            onClick={() => {
              if (gym?.contact_email) {
                window.location.href = `mailto:${gym.contact_email}?subject=${encodeURIComponent('Membership renewal')}`;
              } else if (gym?.phone) {
                window.location.href = `tel:${gym.phone}`;
              } else {
                setBanner('Contact reception to renew your membership.');
              }
            }}
          >
            <RefreshCw className="size-4" />
            Renew Membership
          </Button>
          {gym?.phone ? (
            <a
              href={`tel:${gym.phone}`}
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'min-h-12 justify-start rounded-2xl',
              )}
            >
              <Phone className="size-4" />
              Contact Gym
            </a>
          ) : gym?.contact_email ? (
            <a
              href={`mailto:${gym.contact_email}`}
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'min-h-12 justify-start rounded-2xl',
              )}
            >
              <Mail className="size-4" />
              Contact Gym
            </a>
          ) : (
            <Link
              href="/member"
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'min-h-12 justify-start rounded-2xl',
              )}
            >
              <Phone className="size-4" />
              Contact Gym
            </Link>
          )}
          <Button
            type="button"
            variant="outline"
            className="min-h-12 justify-start rounded-2xl"
            disabled={!latestPaid}
            onClick={() => latestPaid && handleReceipt(latestPaid, 'download')}
          >
            <Download className="size-4" />
            Download Latest Receipt
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-12 justify-start rounded-2xl"
            onClick={() => setHelpOpen(true)}
          >
            <HelpCircle className="size-4" />
            Payment Help
          </Button>
        </div>
      </section>

      {/* Sticky renew on mobile when expiring */}
      {showRenewalCard ? (
        <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border/80 bg-background/90 p-3 backdrop-blur lg:hidden">
          <Button
            className="min-h-12 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700"
            onClick={() => {
              if (gym?.contact_email) {
                window.location.href = `mailto:${gym.contact_email}?subject=${encodeURIComponent('Membership renewal')}`;
              } else if (gym?.phone) {
                window.location.href = `tel:${gym.phone}`;
              }
            }}
          >
            <RefreshCw className="size-4" />
            Renew Membership · {daysLeft}d left
          </Button>
        </div>
      ) : null}

      {/* QR modal */}
      {qrOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/50"
            aria-label="Close"
            onClick={() => setQrOpen(false)}
          />
          <GlassCard className="relative z-10 m-4 w-full max-w-sm p-6 text-center">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Membership QR</h2>
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                className="min-h-11 min-w-11"
                aria-label="Close"
                onClick={() => setQrOpen(false)}
              >
                <X className="size-5" />
              </Button>
            </div>
            <div className="mx-auto mt-5 inline-flex rounded-2xl border border-border bg-white p-4">
              <QRCodeSVG value={qrPayload} size={180} level="M" includeMargin={false} />
            </div>
            <p className="mt-4 text-sm font-medium">{memberLabel}</p>
            <p className="text-xs text-muted-foreground">{membershipId}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Show this at reception for membership verification.
            </p>
          </GlassCard>
        </div>
      ) : null}

      {/* Help modal */}
      {helpOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/50"
            aria-label="Close"
            onClick={() => setHelpOpen(false)}
          />
          <GlassCard className="relative z-10 m-4 max-h-[80vh] w-full max-w-md overflow-y-auto p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Payment Help</h2>
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                className="min-h-11 min-w-11"
                aria-label="Close"
                onClick={() => setHelpOpen(false)}
              >
                <X className="size-5" />
              </Button>
            </div>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Payments are recorded by gym staff at reception.</li>
              <li>Use filters to find past receipts by date, method, or plan.</li>
              <li>Download or print any receipt for your records.</li>
              <li>For renewals or billing questions, contact the gym directly.</li>
            </ul>
          </GlassCard>
        </div>
      ) : null}
    </motion.div>
  );
}
