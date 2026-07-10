'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  useChatMessages,
  useFriendRequests,
  useFriendships,
  useMarkMessagesRead,
  useProfilesMap,
  useRespondToFriendRequest,
  useSendChatMessage,
  useSendFriendRequest,
} from '@smart-gym/supabase';
import { useMemberContext } from '@/features/member/components/member-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Field, FieldLabel } from '@/components/ui/field';
import { cn } from '@/lib/utils';

function displayName(
  profile: { full_name?: string; first_name?: string; last_name?: string; email?: string } | undefined,
  userId: string,
) {
  if (!profile) return userId.slice(0, 8) + '…';
  if (profile.full_name?.trim()) return profile.full_name.trim();
  const name = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
  return name || profile.email || userId.slice(0, 8) + '…';
}

export function MemberSocialPanel() {
  const { client, userId } = useMemberContext();
  const [email, setEmail] = useState('');
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestsQuery = useFriendRequests(client, userId);
  const friendshipsQuery = useFriendships(client, userId);
  const sendRequest = useSendFriendRequest(client);
  const respond = useRespondToFriendRequest(client);
  const sendMessage = useSendChatMessage(client);
  const markRead = useMarkMessagesRead(client);

  const friendIds = useMemo(
    () => friendshipsQuery.data?.friendIds ?? [],
    [friendshipsQuery.data?.friendIds],
  );
  const incoming = (requestsQuery.data ?? []).filter((r) => r.to_user_id === userId);
  const outgoing = (requestsQuery.data ?? []).filter((r) => r.from_user_id === userId);

  const profileIds = useMemo(() => {
    const ids = new Set<string>(friendIds);
    (requestsQuery.data ?? []).forEach((r) => {
      ids.add(r.from_user_id);
      ids.add(r.to_user_id);
    });
    return [...ids];
  }, [friendIds, requestsQuery.data]);

  const profilesQuery = useProfilesMap(client, profileIds);
  const profiles = profilesQuery.data ?? {};

  const activeFriendId = selectedFriendId && friendIds.includes(selectedFriendId)
    ? selectedFriendId
    : friendIds[0] ?? null;

  const chatQuery = useChatMessages(client, userId, activeFriendId);

  useEffect(() => {
    if (!userId || !activeFriendId) return;
    void markRead.mutateAsync({ recipientId: userId, senderId: activeFriendId }).catch(() => {
      /* ignore */
    });
    // Intentionally only when conversation changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, activeFriendId]);

  async function handleSendRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setMessage(null);
    setError(null);
    try {
      await sendRequest.mutateAsync({ fromUserId: userId, email });
      setEmail('');
      setMessage('Friend request sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send request.');
    }
  }

  async function handleRespond(requestId: string, status: 'accepted' | 'rejected') {
    if (!userId) return;
    setError(null);
    try {
      await respond.mutateAsync({ requestId, status, userId });
      setMessage(status === 'accepted' ? 'Friend added.' : 'Request rejected.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update request.');
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !activeFriendId || !draft.trim()) return;
    setError(null);
    try {
      await sendMessage.mutateAsync({
        senderId: userId,
        recipientId: activeFriendId,
        body: draft.trim(),
      });
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Friends & chat</h1>
        <p className="text-muted-foreground">Connect with other members and message them.</p>
      </div>

      {message ? (
        <p className="text-sm" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <form onSubmit={(e) => void handleSendRequest(e)} className="flex flex-wrap gap-2 rounded-xl border border-border/70 p-4">
        <Field className="min-w-[220px] flex-1">
          <FieldLabel htmlFor="friendEmail">Invite by email</FieldLabel>
          <Input
            id="friendEmail"
            type="email"
            placeholder="member@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <div className="flex items-end">
          <Button type="submit" disabled={sendRequest.isPending}>
            {sendRequest.isPending ? 'Sending…' : 'Send request'}
          </Button>
        </div>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-border/70 p-5">
          <h2 className="font-medium">Incoming requests ({incoming.length})</h2>
          {incoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending requests.</p>
          ) : (
            <ul className="space-y-3">
              {incoming.map((req) => (
                <li key={req.id} className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{displayName(profiles[req.from_user_id], req.from_user_id)}</p>
                    <p className="text-xs text-muted-foreground">{profiles[req.from_user_id]?.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => void handleRespond(req.id, 'accepted')}>
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleRespond(req.id, 'rejected')}
                    >
                      Reject
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {outgoing.length > 0 ? (
            <div className="border-t border-border/60 pt-3">
              <p className="mb-2 text-sm font-medium">Outgoing</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {outgoing.map((req) => (
                  <li key={req.id}>
                    {displayName(profiles[req.to_user_id], req.to_user_id)}{' '}
                    <Badge variant="secondary">Pending</Badge>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="space-y-3 rounded-xl border border-border/70 p-5">
          <h2 className="font-medium">Friends ({friendIds.length})</h2>
          {friendIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">No friends yet.</p>
          ) : (
            <ul className="space-y-1">
              {friendIds.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    className={cn(
                      'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                      activeFriendId === id ? 'bg-muted font-medium' : 'hover:bg-muted/60',
                    )}
                    onClick={() => setSelectedFriendId(id)}
                  >
                    {displayName(profiles[id], id)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border/70 p-5">
        <h2 className="mb-3 font-medium">
          Chat
          {activeFriendId
            ? ` · ${displayName(profiles[activeFriendId], activeFriendId)}`
            : ''}
        </h2>
        {!activeFriendId ? (
          <p className="text-sm text-muted-foreground">Select a friend to start chatting.</p>
        ) : (
          <>
            <div className="mb-4 max-h-80 space-y-2 overflow-y-auto rounded-lg border border-border/50 bg-muted/10 p-3">
              {(chatQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No messages yet.</p>
              ) : (
                (chatQuery.data ?? []).map((msg) => {
                  const mine = msg.sender_id === userId;
                  return (
                    <div
                      key={msg.id}
                      className={cn('flex', mine ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                          mine ? 'bg-primary text-primary-foreground' : 'bg-muted',
                        )}
                      >
                        <p>{msg.body}</p>
                        <p className={cn('mt-1 text-[10px]', mine ? 'opacity-80' : 'text-muted-foreground')}>
                          {new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <form onSubmit={(e) => void handleSendMessage(e)} className="flex gap-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a message…"
                rows={2}
                className="min-h-0"
              />
              <Button type="submit" disabled={sendMessage.isPending || !draft.trim()}>
                Send
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
