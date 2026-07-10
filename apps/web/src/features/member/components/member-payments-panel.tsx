'use client';

import { useState } from 'react';
import {
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  getPlanLabel,
  getMembershipExpiryLine,
  type PaymentStatus,
} from '@smart-gym/shared';
import { sumPaidAmount, useMemberPayments } from '@smart-gym/supabase';
import { useMemberContext } from '@/features/member/components/member-provider';
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

export function MemberPaymentsPanel() {
  const { client, userId, gym, membership } = useMemberContext();

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

  const paymentsQuery = useMemberPayments(client, userId, {
    gymId: gym?.id,
    limit: 100,
    search: applied.search || undefined,
    fromDate: applied.fromDate || undefined,
    toDate: applied.toDate || undefined,
    status: applied.status,
  });

  const payments = paymentsQuery.data ?? [];
  const totalPaid = sumPaidAmount(payments);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Payments</h1>
        <p className="text-muted-foreground">
          Your billing history{gym?.name ? ` at ${gym.name}` : ''}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-card/40 p-5">
          <p className="text-sm text-muted-foreground">Current plan</p>
          <p className="mt-1 text-xl font-semibold">
            {membership?.plan ? getPlanLabel(membership.plan) : '—'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {membership?.ends_at
              ? getMembershipExpiryLine(membership.ends_at)
              : 'No end date set'}
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-card/40 p-5">
          <p className="text-sm text-muted-foreground">Filtered total paid</p>
          <p className="mt-1 text-3xl font-semibold">${totalPaid.toFixed(2)}</p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setApplied({ search, fromDate, toDate, status });
        }}
        className="grid gap-3 rounded-xl border border-border/70 p-5 sm:grid-cols-2 lg:grid-cols-5"
      >
        <Field className="lg:col-span-2">
          <FieldLabel>Search</FieldLabel>
          <Input
            placeholder="Mode, plan, amount…"
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
          No payments found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/70">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
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
