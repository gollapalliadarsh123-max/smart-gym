'use client';

import { useMemo, useState } from 'react';
import {
  MEMBERSHIP_PLANS,
  MEMBERSHIP_PLAN_LABELS,
  PAYMENT_MODES,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  getPlanLabel,
  type MembershipPlan,
  type PaymentStatus,
} from '@smart-gym/shared';
import {
  sumPaidAmount,
  sumPaidInMonth,
  useGymMembers,
  useGymPayments,
  useProfilesMap,
  useRecordPayment,
} from '@smart-gym/supabase';
import { useOwnerContext } from '@/features/owner/components/owner-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

function memberLabel(
  profile: { full_name?: string; first_name?: string; last_name?: string; email?: string } | undefined,
  userId: string,
) {
  if (!profile) return userId.slice(0, 8) + '…';
  if (profile.full_name?.trim()) return profile.full_name.trim();
  const name = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
  return name || profile.email || userId.slice(0, 8) + '…';
}

export function OwnerPaymentsPanel() {
  const { client, gym } = useOwnerContext();
  const gymId = gym?.id;

  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [status, setStatus] = useState<PaymentStatus | 'all'>('all');
  const [applied, setApplied] = useState({
    search: '',
    fromDate: '',
    toDate: '',
    status: 'all' as PaymentStatus | 'all',
  });

  const [recordUserId, setRecordUserId] = useState('');
  const [recordPlan, setRecordPlan] = useState<MembershipPlan>('1_month');
  const [recordAmount, setRecordAmount] = useState('');
  const [recordMode, setRecordMode] = useState<string>(PAYMENT_MODES[0]);
  const [recordExtend, setRecordExtend] = useState(true);
  const [recordMessage, setRecordMessage] = useState<string | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);

  const paymentsQuery = useGymPayments(client, {
    gymId,
    limit: 300,
    search: applied.search || undefined,
    fromDate: applied.fromDate || undefined,
    toDate: applied.toDate || undefined,
    status: applied.status,
  });
  const membersQuery = useGymMembers(client, gymId, 'active');
  const recordPayment = useRecordPayment(client);

  const payments = paymentsQuery.data ?? [];
  const activeMembers = membersQuery.data ?? [];

  const profileIds = useMemo(() => {
    const ids = new Set<string>();
    (paymentsQuery.data ?? []).forEach((p) => ids.add(p.user_id));
    (membersQuery.data ?? []).forEach((m) => ids.add(m.user_id));
    return [...ids];
  }, [paymentsQuery.data, membersQuery.data]);

  const profilesQuery = useProfilesMap(client, profileIds);
  const profiles = profilesQuery.data ?? {};

  const filteredTotal = sumPaidAmount(payments);
  const monthTotal = sumPaidInMonth(payments);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    setApplied({ search, fromDate, toDate, status });
  }

  function onPlanChange(plan: MembershipPlan) {
    setRecordPlan(plan);
    setRecordAmount(String(defaultPriceForPlan(gym, plan)));
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
    setRecordMessage(null);
    try {
      await recordPayment.mutateAsync({
        gymId,
        userId: recordUserId,
        plan: recordPlan,
        amount,
        paymentMode: recordMode,
        extendMembership: recordExtend,
      });
      setRecordMessage(
        recordExtend ? 'Payment recorded and membership renewed.' : 'Payment recorded.',
      );
      setRecordAmount(String(defaultPriceForPlan(gym, recordPlan)));
    } catch (error) {
      setRecordError(error instanceof Error ? error.message : 'Failed to record payment.');
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Payments</h1>
        <p className="text-muted-foreground">
          Revenue, history, and renewals for {gym?.name}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-card/40 p-5">
          <p className="text-sm text-muted-foreground">Filtered total (paid)</p>
          <p className="mt-1 text-3xl font-semibold">${filteredTotal.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-card/40 p-5">
          <p className="text-sm text-muted-foreground">This month (in results)</p>
          <p className="mt-1 text-3xl font-semibold">${monthTotal.toFixed(2)}</p>
        </div>
      </div>

      <form
        onSubmit={handleRecord}
        className="space-y-4 rounded-xl border border-border/70 p-5"
      >
        <div>
          <h2 className="font-medium">Record payment / renew</h2>
          <p className="text-sm text-muted-foreground">
            Log a payment for an active member. Optionally extend their membership end date.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field>
            <FieldLabel>Member</FieldLabel>
            <select
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={recordUserId}
              onChange={(e) => {
                setRecordUserId(e.target.value);
                if (!recordAmount) {
                  setRecordAmount(String(defaultPriceForPlan(gym, recordPlan)));
                }
              }}
            >
              <option value="">Select member…</option>
              {activeMembers.map((m) => (
                <option key={m.id} value={m.user_id}>
                  {memberLabel(profiles[m.user_id], m.user_id)}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel>Plan</FieldLabel>
            <select
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
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
            <FieldLabel>Amount</FieldLabel>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={recordAmount}
              onChange={(e) => setRecordAmount(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>Payment mode</FieldLabel>
            <select
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={recordMode}
              onChange={(e) => setRecordMode(e.target.value)}
            >
              {PAYMENT_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={recordExtend}
            onChange={(e) => setRecordExtend(e.target.checked)}
          />
          Extend / renew membership with this payment
        </label>
        <Button type="submit" disabled={recordPayment.isPending}>
          {recordPayment.isPending ? 'Saving…' : 'Record payment'}
        </Button>
        {recordMessage ? (
          <p className="text-sm" role="status">
            {recordMessage}
          </p>
        ) : null}
        {recordError ? (
          <p className="text-sm text-destructive" role="alert">
            {recordError}
          </p>
        ) : null}
      </form>

      <form onSubmit={applyFilters} className="grid gap-3 rounded-xl border border-border/70 p-5 sm:grid-cols-2 lg:grid-cols-5">
        <Field className="lg:col-span-2">
          <FieldLabel>Search</FieldLabel>
          <Input
            placeholder="Name, email, mode, plan…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel>From</FieldLabel>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel>To</FieldLabel>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel>Status</FieldLabel>
          <select
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as PaymentStatus | 'all')}
          >
            <option value="all">All</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PAYMENT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex items-end sm:col-span-2 lg:col-span-5">
          <Button type="submit" variant="outline">
            Apply filters
          </Button>
        </div>
      </form>

      {paymentsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading payments…</p>
      ) : payments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-8 text-sm text-muted-foreground">
          No payments match these filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/70">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    {row.paid_at ? new Date(row.paid_at).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell>{memberLabel(profiles[row.user_id], row.user_id)}</TableCell>
                  <TableCell>{row.plan ? getPlanLabel(row.plan) : '—'}</TableCell>
                  <TableCell>{row.payment_mode || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === 'paid' ? 'default' : 'secondary'}>
                      {PAYMENT_STATUS_LABELS[row.status] ?? row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    ${Number(row.amount || 0).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
