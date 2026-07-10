'use client';

import { useMemo, useState } from 'react';
import {
  MEMBERSHIP_PLANS,
  MEMBERSHIP_PLAN_LABELS,
  PAYMENT_MODES,
  calculateDaysLeft,
  getMembershipExpiryLine,
  getPlanLabel,
  getTodayYmd,
  type MembershipPlan,
} from '@smart-gym/shared';
import {
  useApproveMember,
  useGymMembers,
  usePendingJoinRequests,
  useProfilesMap,
  useRejectJoinRequest,
} from '@smart-gym/supabase';
import { useOwnerContext } from '@/features/owner/components/owner-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Field, FieldLabel } from '@/components/ui/field';

function defaultPriceForPlan(
  gym: { price_1_month: number; price_3_month: number; price_6_month: number; price_12_month: number } | null,
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

function displayName(
  profile: { full_name?: string; first_name?: string; last_name?: string; email?: string } | undefined,
  userId: string,
) {
  if (!profile) return userId.slice(0, 8) + '…';
  if (profile.full_name?.trim()) return profile.full_name.trim();
  const combined = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
  return combined || profile.email || userId.slice(0, 8) + '…';
}

export function OwnerMembersPanel() {
  const { client, gym, userId } = useOwnerContext();
  const gymId = gym?.id;

  const pendingQuery = usePendingJoinRequests(client, gymId);
  const membersQuery = useGymMembers(client, gymId);
  const approve = useApproveMember(client);
  const reject = useRejectJoinRequest(client);

  const pending = pendingQuery.data ?? [];
  const members = membersQuery.data ?? [];

  const profileIds = useMemo(() => {
    const ids = new Set<string>();
    (pendingQuery.data ?? []).forEach((r) => ids.add(r.user_id));
    (membersQuery.data ?? []).forEach((m) => ids.add(m.user_id));
    return [...ids];
  }, [pendingQuery.data, membersQuery.data]);

  const profilesQuery = useProfilesMap(client, profileIds);
  const profiles = profilesQuery.data ?? {};

  const [drafts, setDrafts] = useState<
    Record<
      string,
      { plan: MembershipPlan; amount: string; paymentMode: string; startDate: string }
    >
  >({});
  const [actionError, setActionError] = useState<string | null>(null);

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
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Reject failed.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Members</h1>
        <p className="text-muted-foreground">
          Approve join requests and review memberships for {gym?.name}.
        </p>
      </div>

      {actionError ? (
        <p className="text-sm text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="all">All memberships ({members.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-4">
          {pendingQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading requests…</p>
          ) : pending.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-8 text-sm text-muted-foreground">
              No pending join requests.
            </div>
          ) : (
            pending.map((req) => {
              const draft = getDraft(req.user_id);
              const profile = profiles[req.user_id];
              return (
                <div key={req.id} className="space-y-4 rounded-xl border border-border/70 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{displayName(profile, req.user_id)}</p>
                      <p className="text-sm text-muted-foreground">{profile?.email ?? req.user_id}</p>
                      {req.message ? (
                        <p className="mt-2 text-sm text-muted-foreground">{req.message}</p>
                      ) : null}
                    </div>
                    <Badge variant="secondary">Pending</Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field>
                      <FieldLabel>Plan</FieldLabel>
                      <select
                        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
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
                        value={draft.amount}
                        onChange={(e) => updateDraft(req.user_id, { amount: e.target.value })}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Payment mode</FieldLabel>
                      <select
                        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
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
                        value={draft.startDate}
                        onChange={(e) => updateDraft(req.user_id, { startDate: e.target.value })}
                      />
                    </Field>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => void handleApprove(req.user_id)}
                      disabled={approve.isPending}
                    >
                      {approve.isPending ? 'Approving…' : 'Approve'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => void handleReject(req.user_id)}
                      disabled={reject.isPending}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          {membersQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading members…</p>
          ) : members.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-8 text-sm text-muted-foreground">
              No memberships yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Ends</TableHead>
                    <TableHead>Days left</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((row) => {
                    const profile = profiles[row.user_id];
                    const daysLeft = row.ends_at ? calculateDaysLeft(row.ends_at) : null;
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="font-medium">{displayName(profile, row.user_id)}</div>
                          <div className="text-xs text-muted-foreground">{profile?.email}</div>
                        </TableCell>
                        <TableCell>{row.plan ? getPlanLabel(row.plan) : '—'}</TableCell>
                        <TableCell>
                          <Badge variant={row.status === 'active' ? 'default' : 'secondary'}>
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {row.payment_mode || '—'}
                          {row.amount != null ? ` · $${Number(row.amount).toFixed(2)}` : ''}
                        </TableCell>
                        <TableCell>{row.ends_at ?? '—'}</TableCell>
                        <TableCell>
                          {row.ends_at ? getMembershipExpiryLine(row.ends_at) : '—'}
                          {daysLeft != null && daysLeft < 0 ? (
                            <span className="sr-only">expired</span>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
