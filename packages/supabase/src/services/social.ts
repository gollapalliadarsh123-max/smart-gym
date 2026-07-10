import type { TypedSupabaseClient } from '../client/browser';
import type { Tables, TablesInsert } from '../types/database';
import { assertData, assertOk } from '../lib/errors';

function orderedFriendshipPair(userIdA: string, userIdB: string): {
  user_a_id: string;
  user_b_id: string;
} {
  return userIdA < userIdB
    ? { user_a_id: userIdA, user_b_id: userIdB }
    : { user_a_id: userIdB, user_b_id: userIdA };
}

export async function listFriendRequests(
  client: TypedSupabaseClient,
  userId: string,
): Promise<Tables<'friend_requests'>[]> {
  const { data, error } = await client
    .from('friend_requests')
    .select('*')
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function lookupProfileByEmail(
  client: TypedSupabaseClient,
  email: string,
): Promise<{
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
} | null> {
  const { data, error } = await client.rpc('lookup_profile_by_email', {
    p_email: email.trim(),
  });
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

export async function sendFriendRequest(
  client: TypedSupabaseClient,
  fromUserId: string,
  toUserId: string,
): Promise<Tables<'friend_requests'>> {
  if (fromUserId === toUserId) {
    throw new Error('You cannot send a friend request to yourself.');
  }

  const { data, error } = await client
    .from('friend_requests')
    .insert({ from_user_id: fromUserId, to_user_id: toUserId, status: 'pending' })
    .select('*')
    .single();

  return assertData(data, error, 'Failed to send friend request');
}

export async function sendFriendRequestByEmail(
  client: TypedSupabaseClient,
  fromUserId: string,
  email: string,
): Promise<Tables<'friend_requests'>> {
  const profile = await lookupProfileByEmail(client, email);
  if (!profile) {
    throw new Error('No member found with that email.');
  }
  return sendFriendRequest(client, fromUserId, profile.user_id);
}

export async function respondToFriendRequest(
  client: TypedSupabaseClient,
  requestId: string,
  status: 'accepted' | 'rejected',
): Promise<void> {
  const { data: request, error: fetchError } = await client
    .from('friend_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  const row = assertData(request, fetchError, 'Friend request not found');

  const { error } = await client.from('friend_requests').update({ status }).eq('id', requestId);
  assertOk(error);

  if (status === 'accepted') {
    const pair = orderedFriendshipPair(row.from_user_id, row.to_user_id);
    const { error: friendshipError } = await client.from('friendships').insert(pair);
    // Ignore duplicate friendship if it already exists
    if (friendshipError && !friendshipError.message.toLowerCase().includes('duplicate')) {
      throw new Error(friendshipError.message);
    }
  }
}

export async function listFriendships(
  client: TypedSupabaseClient,
  userId: string,
): Promise<Tables<'friendships'>[]> {
  const { data, error } = await client
    .from('friendships')
    .select('*')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export function friendIdsFromRows(
  rows: Tables<'friendships'>[],
  userId: string,
): string[] {
  return rows.map((row) => (row.user_a_id === userId ? row.user_b_id : row.user_a_id));
}

export async function listChatMessages(
  client: TypedSupabaseClient,
  userId: string,
  otherUserId: string,
  limit = 100,
): Promise<Tables<'chat_messages'>[]> {
  const { data, error } = await client
    .from('chat_messages')
    .select('*')
    .or(
      `and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`,
    )
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function sendChatMessage(
  client: TypedSupabaseClient,
  input: Pick<TablesInsert<'chat_messages'>, 'sender_id' | 'recipient_id' | 'body'>,
): Promise<Tables<'chat_messages'>> {
  const { data, error } = await client.from('chat_messages').insert(input).select('*').single();
  return assertData(data, error, 'Failed to send message');
}

export async function markMessagesRead(
  client: TypedSupabaseClient,
  recipientId: string,
  senderId: string,
): Promise<void> {
  const { error } = await client
    .from('chat_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', recipientId)
    .eq('sender_id', senderId)
    .is('read_at', null);

  assertOk(error);
}
