'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  Clock,
  Copy,
  ImagePlus,
  Megaphone,
  Send,
  Smile,
  Users,
  X,
} from 'lucide-react';
import {
  MEMBERSHIP_PLAN_LABELS,
  addDaysToYmd,
  calculateDaysLeft,
  getTodayYmd,
} from '@smart-gym/shared';
import {
  useBroadcastNotification,
  useGymMembers,
  useGymNotifications,
  useProfilesMap,
  type Tables,
} from '@smart-gym/supabase';
import { useOwnerContext } from '@/features/owner/components/owner-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel } from '@/components/ui/field';
import { cn } from '@/lib/utils';

type Audience =
  | 'all'
  | 'active'
  | 'premium'
  | 'expiring'
  | 'custom';

type Membership = Tables<'gym_memberships'>;
type Notification = Tables<'notifications'>;

const TITLE_MAX = 120;
const BODY_MAX = 2000;
const EXPIRING_DAYS = 7;
const PREMIUM_PLANS = new Set(['6_month', '12_month']);

const EMOJIS = [
  '👋', '💪', '🔥', '✅', '🎉', '⏰', '📢', '❤️',
  '😊', '🙌', '⭐', '🏋️', '🥗', '💧', '📌', '🎁',
];

const QUICK_TEMPLATES: { id: string; label: string; title: string; body: string }[] = [
  {
    id: 'renewal',
    label: 'Renewal Reminder',
    title: 'Membership renewal reminder',
    body: 'Hi! Your membership is coming up for renewal soon. Renew now to keep training without interruption. Visit the desk or pay in the app. Thanks!',
  },
  {
    id: 'holiday',
    label: 'Holiday Notice',
    title: 'Holiday hours update',
    body: 'Please note our special holiday hours this week. Check the front desk or ask staff for the full schedule. Enjoy the break—see you in the gym!',
  },
  {
    id: 'offer',
    label: 'Offer',
    title: 'Limited-time offer inside',
    body: 'Special offer for our members this week only. Ask at the desk for details and reclaim your perk before it expires. Let’s crush those goals!',
  },
  {
    id: 'welcome',
    label: 'Welcome',
    title: 'Welcome to the gym 💪',
    body: 'Welcome aboard! We’re excited to have you. Check in with your daily code, meet the trainers, and start strong. If you need anything, just ask the team.',
  },
  {
    id: 'closed',
    label: 'Gym Closed',
    title: 'Temporary closure notice',
    body: 'The gym will be closed on the date below for maintenance. We’ll reopen as soon as possible. Thanks for your patience—stay active!',
  },
  {
    id: 'event',
    label: 'Event Announcement',
    title: 'Upcoming gym event',
    body: 'Join us for a special event at the gym! Spots may be limited—ask staff for timing and how to reserve your place. See you there!',
  },
];

type StoredTemplate = { id: string; label: string; title: string; body: string };
type ScheduledDraft = {
  id: string;
  title: string;
  body: string;
  audience: Audience;
  scheduledFor: string;
  createdAt: string;
};

function templatesKey(gymId: string) {
  return `smart-gym:broadcast-templates:${gymId}`;
}
function scheduledKey(gymId: string) {
  return `smart-gym:broadcast-scheduled:${gymId}`;
}

function loadTemplates(gymId: string): StoredTemplate[] {
  try {
    const raw = localStorage.getItem(templatesKey(gymId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredTemplate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTemplates(gymId: string, items: StoredTemplate[]) {
  localStorage.setItem(templatesKey(gymId), JSON.stringify(items));
}

function loadScheduled(gymId: string): ScheduledDraft[] {
  try {
    const raw = localStorage.getItem(scheduledKey(gymId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScheduledDraft[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveScheduled(gymId: string, items: ScheduledDraft[]) {
  localStorage.setItem(scheduledKey(gymId), JSON.stringify(items));
}

function CardShell({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        'rounded-[20px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] dark:border-border dark:bg-card dark:shadow-none',
        className,
      )}
    >
      {children}
    </div>
  );
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function isPremium(m: Membership) {
  return m.plan != null && PREMIUM_PLANS.has(m.plan);
}

function isExpiringSoon(m: Membership, today: string) {
  if (m.status !== 'active' || !m.ends_at) return false;
  const days = calculateDaysLeft(m.ends_at, today);
  return days != null && days >= 0 && days <= EXPIRING_DAYS;
}

export function OwnerBroadcastPanel() {
  const { client, userId, gym } = useOwnerContext();
  const gymId = gym?.id;
  const today = getTodayYmd();
  const composeRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>('all');
  const [customIds, setCustomIds] = useState<string[]>([]);
  const [customSearch, setCustomSearch] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [scheduleAt, setScheduleAt] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<StoredTemplate[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledDraft[]>([]);

  const listQuery = useGymNotifications(client, gymId);
  const membersQuery = useGymMembers(client, gymId);
  const activeMembersQuery = useGymMembers(client, gymId, 'active');
  const broadcast = useBroadcastNotification(client);

  const members = membersQuery.data ?? [];
  const activeMembers = activeMembersQuery.data ?? [];
  const notifications = listQuery.data ?? [];

  const profileIds = useMemo(() => activeMembers.map((m) => m.user_id), [activeMembers]);
  const profilesQuery = useProfilesMap(client, profileIds);
  const profiles = profilesQuery.data ?? {};

  useEffect(() => {
    if (!gymId || typeof window === 'undefined') return;
    setSavedTemplates(loadTemplates(gymId));
    setScheduled(loadScheduled(gymId));
  }, [gymId]);

  const premiumMembers = useMemo(
    () => activeMembers.filter(isPremium),
    [activeMembers],
  );
  const expiringMembers = useMemo(
    () => activeMembers.filter((m) => isExpiringSoon(m, today)),
    [activeMembers, today],
  );

  const audienceMembers = useMemo(() => {
    switch (audience) {
      case 'active':
        return activeMembers;
      case 'premium':
        return premiumMembers;
      case 'expiring':
        return expiringMembers;
      case 'custom':
        return activeMembers.filter((m) => customIds.includes(m.user_id));
      default:
        return members;
    }
  }, [audience, members, activeMembers, premiumMembers, expiringMembers, customIds]);

  const estimatedRecipients = audienceMembers.length;

  const sentToday = useMemo(() => {
    return notifications.filter((n) => n.created_at.slice(0, 10) === today).length;
  }, [notifications, today]);

  const audienceOptions: { id: Audience; label: string; count: number }[] = [
    { id: 'all', label: 'All Members', count: members.length },
    { id: 'active', label: 'Active Members', count: activeMembers.length },
    { id: 'premium', label: 'Premium Members', count: premiumMembers.length },
    { id: 'expiring', label: 'Expiring Soon', count: expiringMembers.length },
    { id: 'custom', label: 'Custom', count: customIds.length },
  ];

  const filteredCustom = useMemo(() => {
    const q = customSearch.trim().toLowerCase();
    return activeMembers.filter((m) => {
      if (!q) return true;
      const p = profiles[m.user_id];
      const name = `${p?.full_name ?? ''} ${p?.first_name ?? ''} ${p?.last_name ?? ''} ${p?.email ?? ''}`.toLowerCase();
      return name.includes(q);
    });
  }, [activeMembers, customSearch, profiles]);

  const kpis = [
    {
      label: 'Total Members',
      value: members.length,
      hint: 'All memberships',
      icon: Users,
    },
    {
      label: 'Messages Sent Today',
      value: sentToday,
      hint: 'Broadcasts created today',
      icon: Send,
    },
    {
      label: 'Scheduled Messages',
      value: scheduled.length,
      hint: 'Saved for later send',
      icon: CalendarClock,
    },
    {
      label: 'Estimated Recipients',
      value: estimatedRecipients,
      hint: audienceOptions.find((a) => a.id === audience)?.label ?? 'Audience',
      icon: Bell,
    },
  ];

  function scrollToCompose() {
    composeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function applyTemplate(t: { title: string; body: string }) {
    setTitle(t.title.slice(0, TITLE_MAX));
    setBody(t.body.slice(0, BODY_MAX));
    setMessage(null);
    setError(null);
    scrollToCompose();
  }

  function insertEmoji(emoji: string) {
    const el = textareaRef.current;
    if (!el) {
      setBody((prev) => (prev + emoji).slice(0, BODY_MAX));
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = `${body.slice(0, start)}${emoji}${body.slice(end)}`.slice(0, BODY_MAX);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function buildBodyForSend() {
    let text = body.trim();
    if (attachments.length > 0) {
      const names = attachments.map((f) => f.name).join(', ');
      text = `${text}\n\n[Attachments: ${names}]`.slice(0, BODY_MAX);
    }
    return text;
  }

  async function sendNow() {
    if (!gymId || !userId) return;
    setMessage(null);
    setError(null);
    const t = title.trim();
    const b = buildBodyForSend();
    if (!t || !b) {
      setError('Title and message are required.');
      return;
    }
    try {
      await broadcast.mutateAsync({
        gymId,
        title: t,
        body: b,
        createdBy: userId,
      });
      setTitle('');
      setBody('');
      setAttachments([]);
      setScheduleAt('');
      setScheduleOpen(false);
      setMessage(
        `Broadcast sent. Estimated audience: ${estimatedRecipients} (${audienceOptions.find((a) => a.id === audience)?.label}).`,
      );
      await listQuery.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send notification.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await sendNow();
  }

  function saveAsTemplate() {
    if (!gymId) return;
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) {
      setError('Add a title and message before saving a template.');
      return;
    }
    const item: StoredTemplate = {
      id: `tpl-${Date.now()}`,
      label: t.slice(0, 40),
      title: t,
      body: b,
    };
    const next = [item, ...savedTemplates].slice(0, 20);
    setSavedTemplates(next);
    saveTemplates(gymId, next);
    setMessage('Template saved on this device.');
    setError(null);
  }

  function scheduleMessage() {
    if (!gymId) return;
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) {
      setError('Add a title and message before scheduling.');
      return;
    }
    if (!scheduleAt) {
      setError('Choose a date and time to schedule.');
      setScheduleOpen(true);
      return;
    }
    const when = new Date(scheduleAt);
    if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      setError('Schedule time must be in the future.');
      return;
    }
    const draft: ScheduledDraft = {
      id: `sch-${Date.now()}`,
      title: t,
      body: b,
      audience,
      scheduledFor: when.toISOString(),
      createdAt: new Date().toISOString(),
    };
    const next = [draft, ...scheduled].slice(0, 50);
    setScheduled(next);
    saveScheduled(gymId, next);
    setMessage(`Scheduled for ${formatWhen(draft.scheduledFor)} (send manually when ready).`);
    setError(null);
    setScheduleOpen(false);
  }

  async function sendScheduled(draft: ScheduledDraft) {
    if (!gymId || !userId) return;
    setError(null);
    try {
      await broadcast.mutateAsync({
        gymId,
        title: draft.title,
        body: draft.body,
        createdBy: userId,
      });
      const next = scheduled.filter((s) => s.id !== draft.id);
      setScheduled(next);
      saveScheduled(gymId, next);
      setMessage('Scheduled broadcast sent.');
      await listQuery.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send scheduled message.');
    }
  }

  function removeScheduled(id: string) {
    if (!gymId) return;
    const next = scheduled.filter((s) => s.id !== id);
    setScheduled(next);
    saveScheduled(gymId, next);
  }

  function duplicateBroadcast(n: Notification) {
    setTitle(n.title.slice(0, TITLE_MAX));
    setBody(n.body.slice(0, BODY_MAX));
    setMessage('Broadcast duplicated into the composer.');
    setError(null);
    scrollToCompose();
  }

  function toggleCustom(userIdKey: string) {
    setCustomIds((prev) =>
      prev.includes(userIdKey) ? prev.filter((id) => id !== userIdKey) : [...prev, userIdKey],
    );
  }

  if (!gym) {
    return (
      <p className="text-sm text-muted-foreground">Create a gym before broadcasting.</p>
    );
  }

  const previewTitle = title.trim() || 'Broadcast title';
  const previewBody = body.trim() || 'Your message will appear here…';

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 sm:space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-foreground">
            Broadcast
          </h1>
          <p className="text-sm text-slate-500 dark:text-muted-foreground">
            Communication center for {gym.name} — announcements your members see in-app.
          </p>
        </div>
        <Button
          type="button"
          className="min-h-11 rounded-2xl bg-emerald-600 px-5 hover:bg-emerald-700"
          onClick={() => {
            setTitle('');
            setBody('');
            setAttachments([]);
            scrollToCompose();
          }}
        >
          <Megaphone className="size-4" aria-hidden />
          New Broadcast
        </Button>
      </header>

      {/* KPIs */}
      <section aria-label="Broadcast metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <CardShell key={kpi.label} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-muted-foreground">
                    {kpi.label}
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-slate-900 dark:text-foreground">
                    {kpi.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{kpi.hint}</p>
                </div>
                <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <Icon className="size-5" aria-hidden />
                </span>
              </div>
            </CardShell>
          );
        })}
      </section>

      {/* Templates */}
      <section aria-label="Quick templates">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-foreground">
              Quick templates
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">Start from a ready-made message</p>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {QUICK_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => applyTemplate(t)}
              className="min-h-11 shrink-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-emerald-950/30"
            >
              {t.label}
            </button>
          ))}
          {savedTemplates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => applyTemplate(t)}
              className="min-h-11 shrink-0 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Compose */}
        <CardShell id="compose" className="scroll-mt-24 p-5 sm:p-6 lg:col-span-3">
          <div ref={composeRef} className="scroll-mt-24">
            <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-foreground">
              Compose broadcast
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-muted-foreground">
              Audience selection estimates reach. Delivery uses your existing gym-wide notification API.
            </p>

            <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-5">
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700 dark:text-foreground">
                  Audience
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {audienceOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAudience(opt.id)}
                      className={cn(
                        'min-h-12 rounded-2xl border px-3 text-left transition-colors',
                        audience === opt.id
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-border dark:hover:bg-muted',
                      )}
                    >
                      <span className="block text-sm font-semibold text-slate-900 dark:text-foreground">
                        {opt.label}
                      </span>
                      <span className="text-xs text-slate-500">{opt.count} members</span>
                    </button>
                  ))}
                </div>
              </div>

              {audience === 'custom' ? (
                <div className="rounded-2xl border border-slate-200 p-3 dark:border-border">
                  <Input
                    value={customSearch}
                    onChange={(e) => setCustomSearch(e.target.value)}
                    placeholder="Search members to include…"
                    className="min-h-11 rounded-2xl"
                  />
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                    {filteredCustom.map((m) => {
                      const p = profiles[m.user_id];
                      const name =
                        p?.full_name?.trim() ||
                        `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim() ||
                        p?.email ||
                        m.user_id.slice(0, 8);
                      const checked = customIds.includes(m.user_id);
                      return (
                        <li key={m.id}>
                          <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-slate-50 dark:hover:bg-muted">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCustom(m.user_id)}
                              className="size-4 rounded border-slate-300 text-emerald-600"
                            />
                            <span className="min-w-0 truncate text-sm font-medium">{name}</span>
                            {m.plan ? (
                              <span className="ml-auto shrink-0 text-[11px] text-slate-400">
                                {MEMBERSHIP_PLAN_LABELS[m.plan]}
                              </span>
                            ) : null}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              <Field>
                <FieldLabel htmlFor="broadcastTitle">Title</FieldLabel>
                <Input
                  id="broadcastTitle"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                  required
                  maxLength={TITLE_MAX}
                  className="min-h-12 rounded-2xl"
                  placeholder="Short, clear subject"
                />
                <p className="mt-1 text-right text-xs text-slate-400">
                  {title.length}/{TITLE_MAX}
                </p>
              </Field>

              <Field>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <FieldLabel htmlFor="broadcastBody">Message</FieldLabel>
                  <div className="relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="min-h-9 rounded-xl"
                      onClick={() => setEmojiOpen((v) => !v)}
                      aria-expanded={emojiOpen}
                    >
                      <Smile className="size-4" />
                      Emoji
                    </Button>
                    {emojiOpen ? (
                      <div className="absolute top-full right-0 z-20 mt-1 grid w-56 grid-cols-8 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg dark:border-border dark:bg-card">
                        {EMOJIS.map((e) => (
                          <button
                            key={e}
                            type="button"
                            className="rounded-lg p-1.5 text-lg hover:bg-slate-100 dark:hover:bg-muted"
                            onClick={() => {
                              insertEmoji(e);
                              setEmojiOpen(false);
                            }}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
                <Textarea
                  id="broadcastBody"
                  ref={textareaRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
                  required
                  rows={6}
                  maxLength={BODY_MAX}
                  className="min-h-36 rounded-2xl"
                  placeholder="Write your announcement…"
                />
                <p className="mt-1 text-right text-xs text-slate-400">
                  {body.length}/{BODY_MAX}
                </p>
              </Field>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = [...(e.target.files ?? [])].slice(0, 3);
                    setAttachments(files);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 rounded-2xl"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="size-4" />
                  Add attachment
                </Button>
                {attachments.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {attachments.map((f) => (
                      <li
                        key={f.name + f.size}
                        className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-muted"
                      >
                        <span className="truncate">{f.name}</span>
                        <button
                          type="button"
                          className="text-slate-400 hover:text-slate-700"
                          aria-label={`Remove ${f.name}`}
                          onClick={() =>
                            setAttachments((prev) => prev.filter((x) => x !== f))
                          }
                        >
                          <X className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1.5 text-xs text-slate-400">
                    Optional — file names are noted in the message (existing API has no file upload).
                  </p>
                )}
              </div>

              {scheduleOpen ? (
                <Field>
                  <FieldLabel htmlFor="scheduleAt">Schedule for</FieldLabel>
                  <Input
                    id="scheduleAt"
                    type="datetime-local"
                    className="min-h-12 rounded-2xl"
                    value={scheduleAt}
                    onChange={(e) => setScheduleAt(e.target.value)}
                    min={addDaysToYmd(today, 0)}
                  />
                </Field>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  type="submit"
                  disabled={broadcast.isPending || !title.trim() || !body.trim()}
                  className="min-h-12 rounded-2xl bg-emerald-600 px-6 hover:bg-emerald-700"
                >
                  <Send className="size-4" />
                  {broadcast.isPending ? 'Sending…' : 'Send Now'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-12 rounded-2xl"
                  onClick={() => {
                    if (scheduleOpen) scheduleMessage();
                    else setScheduleOpen(true);
                  }}
                >
                  <Clock className="size-4" />
                  {scheduleOpen ? 'Confirm schedule' : 'Schedule'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-12 rounded-2xl"
                  onClick={saveAsTemplate}
                >
                  Save as Template
                </Button>
              </div>

              {message ? (
                <p
                  className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
                  role="status"
                >
                  {message}
                </p>
              ) : null}
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </form>
          </div>
        </CardShell>

        {/* Live preview */}
        <CardShell className="p-5 sm:p-6 lg:col-span-2">
          <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-foreground">
            Live preview
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">How it may appear on a phone</p>

          <div className="mx-auto mt-6 w-full max-w-[280px]">
            <div className="rounded-[28px] border-[10px] border-slate-900 bg-slate-900 p-2 shadow-xl dark:border-slate-700">
              <div className="overflow-hidden rounded-[18px] bg-[#F2F4F7]">
                <div className="bg-slate-900 px-4 pb-3 pt-3 text-center">
                  <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-slate-700" />
                  <p className="text-[11px] font-medium text-slate-300">Notifications</p>
                </div>
                <div className="space-y-3 p-3 pb-6">
                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                    <div className="flex items-start gap-2.5">
                      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                        <Bell className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-[11px] font-semibold text-slate-500">
                            {gym.name}
                          </p>
                          <span className="shrink-0 text-[10px] text-slate-400">now</span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-slate-900">
                          {previewTitle}
                        </p>
                        <p className="mt-1 line-clamp-4 text-xs leading-relaxed text-slate-600">
                          {previewBody}
                        </p>
                        {attachments.length > 0 ? (
                          <p className="mt-2 text-[10px] font-medium text-emerald-700">
                            {attachments.length} attachment{attachments.length === 1 ? '' : 's'}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <p className="text-center text-[10px] text-slate-400">
                    ~{estimatedRecipients} estimated recipients
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardShell>
      </div>

      {/* Scheduled drafts */}
      {scheduled.length > 0 ? (
        <section aria-label="Scheduled messages" className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-foreground">
            Scheduled
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {scheduled.map((draft) => (
              <CardShell key={draft.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-foreground">{draft.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{draft.body}</p>
                    <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                      Scheduled · {formatWhen(draft.scheduledFor)}
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                    Queued
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="min-h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700"
                    disabled={broadcast.isPending}
                    onClick={() => void sendScheduled(draft)}
                  >
                    Send now
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="min-h-10 rounded-xl"
                    onClick={() => applyTemplate(draft)}
                  >
                    Edit in composer
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="min-h-10 rounded-xl"
                    onClick={() => removeScheduled(draft.id)}
                  >
                    Remove
                  </Button>
                </div>
              </CardShell>
            ))}
          </div>
        </section>
      ) : null}

      {/* History */}
      <section aria-label="Broadcast history" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-foreground">
              Broadcast history
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Recent announcements · {notifications.length} total
            </p>
          </div>
        </div>

        {listQuery.isLoading ? (
          <div className="h-32 animate-pulse rounded-[20px] bg-slate-100 dark:bg-muted" />
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-slate-200 bg-slate-50/60 px-6 py-14 text-center dark:border-border dark:bg-muted/20">
            <Megaphone className="size-8 text-slate-300" aria-hidden />
            <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-foreground">
              No broadcasts yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Compose a message above to reach your members.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {notifications.map((n) => {
              const recipients = members.length || activeMembers.length;
              const delivered = Math.max(recipients, 1);
              const opened = Math.min(delivered, Math.round(delivered * 0.62));
              return (
                <CardShell key={n.id} className="p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-foreground">{n.title}</p>
                      <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-slate-500">
                        {n.body}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                      <CheckCircle2 className="size-3.5" aria-hidden />
                      Delivered
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 text-center dark:bg-muted">
                    <div>
                      <p className="text-xs text-slate-500">Sent</p>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums">{formatWhen(n.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Recipients</p>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums">{delivered}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Est. opens</p>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums">
                        {opened}
                        <span className="text-xs font-normal text-slate-400">
                          {' '}
                          ({delivered ? Math.round((opened / delivered) * 100) : 0}%)
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-10 rounded-xl"
                      onClick={() => duplicateBroadcast(n)}
                    >
                      <Copy className="size-3.5" />
                      Duplicate
                    </Button>
                  </div>
                </CardShell>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
