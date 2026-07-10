import type { TypedSupabaseClient } from '../client/browser';
import type { Tables, TablesInsert } from '../types/database';
import { assertData } from '../lib/errors';

export async function listGymNotifications(
  client: TypedSupabaseClient,
  gymId: string,
  limit = 50,
): Promise<Tables<'notifications'>[]> {
  const { data, error } = await client
    .from('notifications')
    .select('*')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function broadcastNotification(
  client: TypedSupabaseClient,
  input: Pick<TablesInsert<'notifications'>, 'gym_id' | 'title' | 'body' | 'created_by'>,
): Promise<Tables<'notifications'>> {
  const { data, error } = await client
    .from('notifications')
    .insert(input)
    .select('*')
    .single();

  return assertData(data, error, 'Failed to broadcast notification');
}
