import type { TypedSupabaseClient } from '../client/browser';
import type { Tables, TablesInsert } from '../types/database';
import { assertData } from '../lib/errors';

export async function createJoinRequest(
  client: TypedSupabaseClient,
  input: Pick<TablesInsert<'join_requests'>, 'user_id' | 'gym_id' | 'message'>,
): Promise<Tables<'join_requests'>> {
  const { data, error } = await client
    .from('join_requests')
    .insert({
      user_id: input.user_id,
      gym_id: input.gym_id,
      message: input.message ?? '',
      status: 'pending',
    })
    .select('*')
    .single();

  return assertData(data, error, 'Failed to create join request');
}

export async function listPendingJoinRequests(
  client: TypedSupabaseClient,
  gymId: string,
): Promise<Tables<'join_requests'>[]> {
  const { data, error } = await client
    .from('join_requests')
    .select('*')
    .eq('gym_id', gymId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getMemberJoinRequest(
  client: TypedSupabaseClient,
  userId: string,
  gymId: string,
): Promise<Tables<'join_requests'> | null> {
  const { data, error } = await client
    .from('join_requests')
    .select('*')
    .eq('user_id', userId)
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function listMemberJoinRequests(
  client: TypedSupabaseClient,
  userId: string,
): Promise<Tables<'join_requests'>[]> {
  const { data, error } = await client
    .from('join_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}
