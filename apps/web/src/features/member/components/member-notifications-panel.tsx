'use client';

import { useGymNotifications } from '@smart-gym/supabase';
import { useMemberContext } from '@/features/member/components/member-provider';

export function MemberNotificationsPanel() {
  const { client, gym } = useMemberContext();
  const notificationsQuery = useGymNotifications(client, gym?.id);

  const items = notificationsQuery.data ?? [];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">
          Announcements from {gym?.name ?? 'your gym'}.
        </p>
      </div>

      {notificationsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-8 text-sm text-muted-foreground">
          No notifications yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((n) => (
            <li key={n.id} className="rounded-xl border border-border/70 bg-card/40 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-medium">{n.title}</h2>
                <time className="text-xs text-muted-foreground">
                  {new Date(n.created_at).toLocaleString()}
                </time>
              </div>
              {n.body ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{n.body}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
