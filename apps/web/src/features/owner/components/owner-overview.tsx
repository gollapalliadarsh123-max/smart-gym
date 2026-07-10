'use client';

import Link from 'next/link';
import { sumPaidInMonth, useGymMembers, useGymPayments, usePendingJoinRequests } from '@smart-gym/supabase';
import { useOwnerContext } from '@/features/owner/components/owner-provider';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/40 p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function OwnerOverview() {
  const { client, gym } = useOwnerContext();
  const gymId = gym?.id;

  const membersQuery = useGymMembers(client, gymId);
  const pendingQuery = usePendingJoinRequests(client, gymId);
  const paymentsQuery = useGymPayments(client, { gymId, limit: 200 });

  const members = membersQuery.data ?? [];
  const active = members.filter((m) => m.status === 'active');
  const pending = pendingQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];
  const monthlyRevenue = sumPaidInMonth(payments);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{gym?.name ?? 'Owner dashboard'}</h1>
        <p className="text-muted-foreground">
          Gym code <span className="font-mono font-medium text-foreground">{gym?.code}</span>
          {gym?.location ? ` · ${gym.location}` : ''}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total memberships" value={members.length} />
        <StatCard label="Active members" value={active.length} />
        <StatCard
          label="Pending requests"
          value={pending.length}
          hint={pending.length ? 'Needs your review' : undefined}
        />
        <StatCard
          label="Revenue this month"
          value={`$${monthlyRevenue.toFixed(2)}`}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/owner/members" className={cn(buttonVariants())}>
          Manage members
        </Link>
        <Link href="/owner/attendance" className={cn(buttonVariants({ variant: 'outline' }))}>
          Attendance
        </Link>
        <Link href="/owner/settings" className={cn(buttonVariants({ variant: 'outline' }))}>
          Gym settings
        </Link>
        <Link href="/owner/payments" className={cn(buttonVariants({ variant: 'outline' }))}>
          View payments
        </Link>
      </div>

      {pending.length > 0 ? (
        <div className="rounded-xl border border-border/70 p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-medium">Pending join requests</h2>
            <Link href="/owner/members" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
              Review all
            </Link>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {pending.slice(0, 5).map((req) => (
              <li key={req.id} className="flex justify-between gap-4 border-b border-border/40 py-2 last:border-0">
                <span className="font-mono text-xs text-foreground">{req.user_id.slice(0, 8)}…</span>
                <span>{req.message || 'No message'}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
