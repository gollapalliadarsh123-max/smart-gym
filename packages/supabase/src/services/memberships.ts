import {
  computeMembershipEndDate,
  getPlanDays,
  type MembershipPlan,
} from '@smart-gym/shared';
import type { TypedSupabaseClient } from '../client/browser';
import type { Tables, TablesInsert } from '../types/database';
import { assertData, assertOk } from '../lib/errors';

export async function getActiveMembership(
  client: TypedSupabaseClient,
  userId: string,
): Promise<Tables<'gym_memberships'> | null> {
  const { data, error } = await client
    .from('gym_memberships')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function listGymMembers(
  client: TypedSupabaseClient,
  gymId: string,
  status?: Tables<'gym_memberships'>['status'],
): Promise<Tables<'gym_memberships'>[]> {
  let query = client.from('gym_memberships').select('*').eq('gym_id', gymId);
  if (status) query = query.eq('status', status);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface ApproveMemberInput {
  userId: string;
  gymId: string;
  plan: MembershipPlan;
  amount: number;
  paymentMode: string;
  startDateYmd: string;
  reviewedBy: string;
}

export async function approveMemberMembership(
  client: TypedSupabaseClient,
  input: ApproveMemberInput,
): Promise<{ membership: Tables<'gym_memberships'>; payment: Tables<'payments'> }> {
  const endsAt = computeMembershipEndDate(input.startDateYmd, input.plan);

  const membershipPayload: TablesInsert<'gym_memberships'> = {
    user_id: input.userId,
    gym_id: input.gymId,
    plan: input.plan,
    status: 'active',
    payment_status: 'paid',
    amount: input.amount,
    payment_mode: input.paymentMode,
    starts_at: input.startDateYmd,
    ends_at: endsAt,
  };

  const { data: existing } = await client
    .from('gym_memberships')
    .select('id')
    .eq('user_id', input.userId)
    .eq('gym_id', input.gymId)
    .maybeSingle();

  let savedMembership: Tables<'gym_memberships'>;

  if (existing?.id) {
    const { data: membership, error: membershipError } = await client
      .from('gym_memberships')
      .update(membershipPayload)
      .eq('id', existing.id)
      .select('*')
      .single();
    savedMembership = assertData(membership, membershipError, 'Failed to update membership');
  } else {
    const { data: membership, error: membershipError } = await client
      .from('gym_memberships')
      .insert(membershipPayload)
      .select('*')
      .single();
    savedMembership = assertData(membership, membershipError, 'Failed to create membership');
  }

  const { error: joinError } = await client
    .from('join_requests')
    .update({
      status: 'approved',
      reviewed_by: input.reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq('user_id', input.userId)
    .eq('gym_id', input.gymId)
    .eq('status', 'pending');

  assertOk(joinError);

  const { data: payment, error: paymentError } = await client
    .from('payments')
    .insert({
      gym_id: input.gymId,
      user_id: input.userId,
      membership_id: savedMembership.id,
      amount: input.amount,
      payment_mode: input.paymentMode,
      status: 'paid',
      plan: input.plan,
      paid_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  return {
    membership: savedMembership,
    payment: assertData(payment, paymentError, 'Failed to record payment'),
  };
}

export async function rejectJoinRequest(
  client: TypedSupabaseClient,
  userId: string,
  gymId: string,
  reviewedBy: string,
): Promise<void> {
  const { error } = await client
    .from('join_requests')
    .update({
      status: 'rejected',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('gym_id', gymId)
    .eq('status', 'pending');

  assertOk(error);
}

export { getPlanDays };
