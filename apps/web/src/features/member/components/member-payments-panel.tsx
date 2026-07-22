'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Download,
  Dumbbell,
  Eye,
  Mail,
  Phone,
  Printer,
  QrCode,
  RefreshCw,
  Wallet,
  X,
} from 'lucide-react';
import {
  MEMBERSHIP_PLAN_DAYS,
  PAYMENT_STATUS_LABELS,
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
import { cn } from '@/lib/utils';

type Payment = Tables<'payments'>;

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

}

export function MemberPaymentsPanel() {
  const { client, userId, profile, gym, membership } = useMemberContext();
  const today = getTodayYmd();

  const [qrOpen, setQrOpen] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const paymentsQuery = useMemberPayments(client, userId, {
    gymId: gym?.id,
    limit: 200,
  });

  const payments = paymentsQuery.data ?? [];
  const totalPaidAll = sumPaidAmount(payments);
  const endsYmd = toYmd(membership?.ends_at);
  const startsYmd = toYmd(membership?.starts_at);
  const daysLeft = endsYmd ? calculateDaysLeft(endsYmd, today) : null;
  const planDays =
    membership?.plan && membership.plan in MEMBERSHIP_PLAN_DAYS
      ? MEMBERSHIP_PLAN_DAYS[membership.plan as MembershipPlan]
      : 30;
  const cycleDays = useMemo(() => {
    if (!startsYmd || !endsYmd) return planDays;
    const span = calculateDaysLeft(endsYmd, startsYmd);
    return span != null && span > 0 ? span : planDays;
  }, [startsYmd, endsYmd, planDays]);
  // Remaining share of this cycle (full when just starting, empties near expiry)
  const renewalProgress =
    daysLeft == null
      ? 0
      : daysLeft < 0
        ? 0
        : Math.min(100, Math.max(0, Math.round((daysLeft / Math.max(1, cycleDays)) * 100)));

  const membershipDurationDays = useMemo(() => {
    if (!startsYmd) return null;
    const daysFromStart = calculateDaysLeft(today, startsYmd);
    // Only count duration once membership has started
    if (daysFromStart == null || daysFromStart < 0) return null;
    return daysFromStart + 1;
  }, [startsYmd, today]);

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

  const timeline = useMemo(() => {
    if (!startsYmd || !endsYmd) {
      return {
        progress: 50,
        showToday: true,
        todayLeftPct: 50,
        startedLabel: startsYmd ? formatYmd(startsYmd) : '—',
        mergeTodayWithStart: false,
        mergeTodayWithEnd: false,
        beforeStart: false,
      };
    }
    const start = new Date(`${startsYmd}T00:00:00`).getTime();
    const end = new Date(`${endsYmd}T00:00:00`).getTime();
    const now = new Date(`${today}T00:00:00`).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return {
        progress: 50,
        showToday: true,
        todayLeftPct: 50,
        startedLabel: formatYmd(startsYmd),
        mergeTodayWithStart: false,
        mergeTodayWithEnd: false,
        beforeStart: false,
      };
    }

    const beforeStart = now < start;
    const afterEnd = now > end;
    const rawPct = ((now - start) / (end - start)) * 100;
    // Keep markers away from the ends so labels never stack
    const todayLeftPct = beforeStart
      ? 0
      : afterEnd
        ? 100
        : Math.min(88, Math.max(12, rawPct));

    const mergeTodayWithStart = beforeStart || (!beforeStart && !afterEnd && rawPct < 8);
    const mergeTodayWithEnd = afterEnd || (!beforeStart && !afterEnd && rawPct > 92);

    return {
      progress: Math.min(100, Math.max(0, beforeStart ? 0 : afterEnd ? 100 : rawPct)),
      showToday: !mergeTodayWithStart && !mergeTodayWithEnd,
      todayLeftPct,
      startedLabel: mergeTodayWithStart
        ? beforeStart
          ? `Starts ${formatYmd(startsYmd)}`
          : `${formatYmd(startsYmd)} · Today`
        : formatYmd(startsYmd),
      mergeTodayWithStart,
      mergeTodayWithEnd,
      beforeStart,
    };
  }, [startsYmd, endsYmd, today]);

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

  return (
    <motion.div
      className="mx-auto w-full max-w-6xl space-y-6 pb-8 sm:space-y-8"
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
                membershipDurationDays != null
                  ? `${membershipDurationDays} days`
                  : startsYmd && (calculateDaysLeft(today, startsYmd) ?? 0) < 0
                    ? 'Not started'
                    : '—',
              icon: CalendarDays,
              hint: startsYmd
                ? membershipDurationDays != null
                  ? `Since ${formatYmd(startsYmd)}`
                  : `Starts ${formatYmd(startsYmd)}`
                : '—',
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

      {/* Timeline */}
      <GlassCard className="p-5 sm:p-6">
        <h2 className="text-base font-semibold tracking-tight">Membership Timeline</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Where you are in this cycle</p>

        <div className="relative mt-10 px-2 pb-2">
          <div className="absolute top-3 right-4 left-4 h-1.5 rounded-full bg-muted" />
          <motion.div
            className="absolute top-3 left-4 h-1.5 rounded-full bg-emerald-500"
            initial={{ width: 0 }}
            animate={{
              width: `calc((100% - 2rem) * ${timeline.progress / 100})`,
            }}
            transition={{ duration: 0.8 }}
          />
          <div className="relative h-24">
            <div className="absolute top-0 left-0 flex max-w-[34%] flex-col items-start">
              <span
                className={cn(
                  'size-7 rounded-full border-4 border-background shadow',
                  timeline.mergeTodayWithStart
                    ? 'bg-emerald-500'
                    : 'bg-slate-300 dark:bg-slate-600',
                )}
              />
              <p className="mt-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {timeline.mergeTodayWithStart
                  ? timeline.beforeStart
                    ? 'Starts'
                    : 'Started · Today'
                  : 'Started'}
              </p>
              <p className="mt-1 text-sm font-medium leading-snug">{timeline.startedLabel}</p>
            </div>

            {timeline.showToday ? (
              <div
                className="absolute top-0 flex w-[28%] max-w-[7.5rem] -translate-x-1/2 flex-col items-center text-center"
                style={{ left: `calc(1rem + (100% - 2rem) * ${timeline.todayLeftPct / 100})` }}
              >
                <span className="size-7 rounded-full border-4 border-background bg-emerald-500 shadow" />
                <p className="mt-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Today
                </p>
                <p className="mt-1 text-sm font-medium leading-snug">{formatYmd(today)}</p>
              </div>
            ) : null}

            <div className="absolute top-0 right-0 flex max-w-[34%] flex-col items-end text-right">
              <span
                className={cn(
                  'size-7 rounded-full border-4 border-background shadow',
                  timeline.mergeTodayWithEnd
                    ? 'bg-emerald-500'
                    : 'bg-slate-300 dark:bg-slate-600',
                )}
              />
              <p className="mt-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {timeline.mergeTodayWithEnd ? 'Ends · Today' : 'Ends'}
              </p>
              <p className="mt-1 text-sm font-medium leading-snug">{formatYmd(endsYmd)}</p>
            </div>
          </div>
        </div>
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
              No payment history
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              When you pay at the desk, receipts will appear here.
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
    </motion.div>
  );
}
