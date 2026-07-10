import {
  addDaysToYmd,
  computeMembershipEndDate,
  getTodayYmd,
  type MembershipPlan,
  type PaymentStatus,
} from '@smart-gym/shared';
import type { TypedSupabaseClient } from '../client/browser';
import type { Tables, TablesInsert } from '../types/database';
import { assertData } from '../lib/errors';
import { getProfilesByIds } from './profiles';

export interface PaymentListFilters {
  gymId?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
  status?: PaymentStatus | 'all';
  search?: string;
  limit?: number;
}

function profileSearchBlob(profile: Tables<'profiles'> | undefined): string {
  if (!profile) return '';
  return [
    profile.full_name,
    profile.first_name,
    profile.last_name,
    profile.email,
    profile.phone,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export async function listPayments(
  client: TypedSupabaseClient,
  filters: PaymentListFilters = {},
): Promise<Tables<'payments'>[]> {
  let query = client.from('payments').select('*');

  if (filters.gymId) query = query.eq('gym_id', filters.gymId);
  if (filters.userId) query = query.eq('user_id', filters.userId);
  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
  if (filters.fromDate) query = query.gte('paid_at', `${filters.fromDate}T00:00:00`);
  if (filters.toDate) query = query.lte('paid_at', `${filters.toDate}T23:59:59.999`);

  query = query.order('paid_at', { ascending: false });
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const search = filters.search?.trim().toLowerCase();
  if (!search) return rows;

  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const profiles = await getProfilesByIds(client, userIds);
  const byId = Object.fromEntries(profiles.map((p) => [p.user_id, p]));

  return rows.filter((row) => {
    const haystack = [
      row.payment_mode,
      row.status,
      row.plan ?? '',
      String(row.amount ?? ''),
      profileSearchBlob(byId[row.user_id]),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(search);
  });
}

export function sumPaidAmount(payments: Tables<'payments'>[]): number {
  return payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
}

export function sumPaidInMonth(
  payments: Tables<'payments'>[],
  now: Date = new Date(),
): number {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return payments
    .filter(
      (p) =>
        p.status === 'paid' && p.paid_at && new Date(p.paid_at).getTime() >= monthStart,
    )
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
}

export interface RecordPaymentInput {
  gymId: string;
  userId: string;
  plan: MembershipPlan;
  amount: number;
  paymentMode: string;
  paidAtIso?: string;
  /** When true (default), renew/extend the member's gym membership */
  extendMembership?: boolean;
}

export async function recordPayment(
  client: TypedSupabaseClient,
  input: RecordPaymentInput,
): Promise<{ payment: Tables<'payments'>; membership: Tables<'gym_memberships'> | null }> {
  const extend = input.extendMembership !== false;
  const today = getTodayYmd();

  const { data: membership, error: membershipError } = await client
    .from('gym_memberships')
    .select('*')
    .eq('user_id', input.userId)
    .eq('gym_id', input.gymId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (membershipError) throw new Error(membershipError.message);

  let savedMembership: Tables<'gym_memberships'> | null = membership;

  if (extend) {
    const currentEnd = membership?.ends_at ?? null;
    const startDate =
      currentEnd && currentEnd >= today ? addDaysToYmd(currentEnd, 1) : today;
    const endsAt = computeMembershipEndDate(startDate, input.plan);

    const membershipPayload = {
      user_id: input.userId,
      gym_id: input.gymId,
      plan: input.plan,
      status: 'active' as const,
      payment_status: 'paid' as const,
      amount: input.amount,
      payment_mode: input.paymentMode,
      starts_at: startDate,
      ends_at: endsAt,
    };

    if (membership?.id) {
      const { data, error } = await client
        .from('gym_memberships')
        .update(membershipPayload)
        .eq('id', membership.id)
        .select('*')
        .single();
      savedMembership = assertData(data, error, 'Failed to renew membership');
    } else {
      const { data, error } = await client
        .from('gym_memberships')
        .insert(membershipPayload)
        .select('*')
        .single();
      savedMembership = assertData(data, error, 'Failed to create membership');
    }
  }

  const paymentPayload: TablesInsert<'payments'> = {
    gym_id: input.gymId,
    user_id: input.userId,
    membership_id: savedMembership?.id ?? null,
    amount: input.amount,
    payment_mode: input.paymentMode,
    status: 'paid',
    plan: input.plan,
    paid_at: input.paidAtIso ?? new Date().toISOString(),
  };

  const { data: payment, error: paymentError } = await client
    .from('payments')
    .insert(paymentPayload)
    .select('*')
    .single();

  return {
    payment: assertData(payment, paymentError, 'Failed to record payment'),
    membership: savedMembership,
  };
}
