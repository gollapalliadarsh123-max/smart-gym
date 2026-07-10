'use client';

import { useState } from 'react';
import { useBroadcastNotification, useGymNotifications } from '@smart-gym/supabase';
import { useOwnerContext } from '@/features/owner/components/owner-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel } from '@/components/ui/field';

export function OwnerBroadcastPanel() {
  const { client, userId, gym } = useOwnerContext();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const listQuery = useGymNotifications(client, gym?.id);
  const broadcast = useBroadcastNotification(client);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gym?.id || !userId) return;
    setMessage(null);
    setError(null);
    try {
      await broadcast.mutateAsync({
        gymId: gym.id,
        title: title.trim(),
        body: body.trim(),
        createdBy: userId,
      });
      setTitle('');
      setBody('');
      setMessage('Notification sent to members.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send notification.');
    }
  }

  if (!gym) {
    return (
      <p className="text-sm text-muted-foreground">Create a gym before broadcasting.</p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Broadcast</h1>
        <p className="text-muted-foreground">
          Send announcements to members of {gym.name}.
        </p>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="space-y-4 rounded-xl border border-border/70 p-5"
      >
        <Field>
          <FieldLabel htmlFor="broadcastTitle">Title</FieldLabel>
          <Input
            id="broadcastTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={120}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="broadcastBody">Message</FieldLabel>
          <Textarea
            id="broadcastBody"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={4}
            maxLength={2000}
          />
        </Field>
        <Button type="submit" disabled={broadcast.isPending || !title.trim() || !body.trim()}>
          {broadcast.isPending ? 'Sending…' : 'Send to members'}
        </Button>
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
      </form>

      <div className="space-y-3">
        <h2 className="font-medium">Recent broadcasts</h2>
        {listQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (listQuery.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No broadcasts yet.</p>
        ) : (
          <ul className="space-y-3">
            {(listQuery.data ?? []).map((n) => (
              <li key={n.id} className="rounded-xl border border-border/70 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">{n.title}</p>
                  <time className="text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleString()}
                  </time>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{n.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
