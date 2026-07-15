'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useSpring, useTransform } from 'framer-motion';
import {
  Bell,
  BellRing,
  CheckCheck,
  Droplets,
  Dumbbell,
  Flame,
  Settings2,
  Trash2,
  Trophy,
  Users,
  Utensils,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  calculateDaysLeft,
  getLeagueSeasonDateRange,
  getLeagueSeasonId,
  getLeagueTierName,
  getTodayYmd,
  LEAGUE_TIER_LABELS,
  addDaysToYmd,
} from '@smart-gym/shared';
import {
  useDietLog,
  useFriendRequests,
  useGymNotifications,
  useLeagueSeason,
  useMemberAttendanceToday,
  useMemberPayments,
  type Tables,
} from '@smart-gym/supabase';
import { useMemberContext } from '@/features/member/components/member-provider';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type NotifCategory =
  | 'gym'
  | 'friends'
  | 'league'
  | 'payments'
  | 'attendance'
  | 'diet'
  | 'challenges'
  | 'streak'
  | 'water';

type FilterTab =
  | 'all'
  | 'unread'
  | 'gym'
  | 'friends'
  | 'league'
  | 'payments'
  | 'attendance'
  | 'diet'
  | 'challenges';

type FeedItem = {
  id: string;
  source: 'gym' | 'smart';
  category: NotifCategory;
  title: string;
  description: string;
  createdAt: string;
  priority?: boolean;
  href?: string;
  actionLabel?: string;
};

type PrefKey =
  | 'gym'
  | 'attendance'
  | 'diet'
  | 'water'
  | 'league'
  | 'friends'
  | 'payments'
  | 'challenges';

const PREF_LABELS: Record<PrefKey, string> = {
  gym: 'Gym Announcements',
  attendance: 'Attendance Reminders',
  diet: 'Diet Reminders',
  water: 'Water Reminders',
  league: 'League Updates',
  friends: 'Friend Activity',
  payments: 'Payment Reminders',
  challenges: 'Challenge Invitations',
};

const DEFAULT_PREFS: Record<PrefKey, boolean> = {
  gym: true,
  attendance: true,
  diet: true,
  water: true,
  league: true,
  friends: true,
  payments: true,
  challenges: true,
};

const FILTERS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'gym', label: 'Gym' },
  { id: 'friends', label: 'Friends' },
  { id: 'league', label: 'League' },
  { id: 'payments', label: 'Payments' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'diet', label: 'Diet' },
  { id: 'challenges', label: 'Challenges' },
];

const CATEGORY_META: Record<
  NotifCategory,
  { label: string; icon: LucideIcon; tone: string; iconClass: string }
> = {
  gym: {
    label: 'Gym',
    icon: Dumbbell,
    tone: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
    iconClass: 'text-teal-600 dark:text-teal-400',
  },
  friends: {
    label: 'Friends',
    icon: Users,
    tone: 'bg-sky-500/15 text-sky-800 dark:text-sky-300',
    iconClass: 'text-sky-600 dark:text-sky-400',
  },
  league: {
    label: 'League',
    icon: Trophy,
    tone: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
  payments: {
    label: 'Payments',
    icon: Wallet,
    tone: 'bg-violet-500/15 text-violet-800 dark:text-violet-300',
    iconClass: 'text-violet-600 dark:text-violet-400',
  },
  attendance: {
    label: 'Attendance',
    icon: Flame,
    tone: 'bg-orange-500/15 text-orange-800 dark:text-orange-300',
    iconClass: 'text-orange-600 dark:text-orange-400',
  },
  diet: {
    label: 'Diet',
    icon: Utensils,
    tone: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
  },
  challenges: {
    label: 'Challenges',
    icon: Flame,
    tone: 'bg-rose-500/15 text-rose-800 dark:text-rose-300',
    iconClass: 'text-rose-600 dark:text-rose-400',
  },
  streak: {
    label: 'Streak',
    icon: Flame,
    tone: 'bg-orange-500/15 text-orange-800 dark:text-orange-300',
    iconClass: 'text-orange-600 dark:text-orange-400',
  },
  water: {
    label: 'Water',
    icon: Droplets,
    tone: 'bg-cyan-500/15 text-cyan-800 dark:text-cyan-300',
    iconClass: 'text-cyan-600 dark:text-cyan-400',
  },
};

function GlassCard({
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
        'rounded-[20px] border border-border/60 bg-card/80 shadow-[0_8px_28px_rgba(15,23,42,0.06)] backdrop-blur-md',
        'dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_8px_32px_rgba(0,0,0,0.25)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 90, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString());
  const [text, setText] = useState('0');

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    const unsub = display.on('change', (v) => setText(v));
    return () => unsub();
  }, [display]);

  return <span className="tabular-nums">{text}</span>;
}

function storageKey(userId: string | null | undefined, suffix: string) {
  return `sg-notif-${suffix}-${userId ?? 'anon'}`;
}

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function relativeTime(iso: string) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function dayBucket(iso: string, today: string): 'today' | 'yesterday' | 'week' | 'earlier' {
  const ymd = iso.slice(0, 10);
  if (ymd === today) return 'today';
  if (ymd === addDaysToYmd(today, -1)) return 'yesterday';
  if (ymd >= addDaysToYmd(today, -6)) return 'week';
  return 'earlier';
}

function classifyGymAnnouncement(n: Tables<'notifications'>): NotifCategory {
  const text = `${n.title} ${n.body}`.toLowerCase();
  if (/payment|renew|membership|billing|fee|expire/.test(text)) return 'payments';
  if (/league|rank|tier|season|xp|points/.test(text)) return 'league';
  if (/friend|challenge|social/.test(text)) return 'friends';
  if (/diet|protein|meal|nutrition|calorie/.test(text)) return 'diet';
  if (/water|hydrat/.test(text)) return 'water';
  if (/attend|check[- ]?in|open|close|hours|holiday/.test(text)) return 'attendance';
  if (/challenge/.test(text)) return 'challenges';
  return 'gym';
}

function isPriorityText(title: string, body: string) {
  const text = `${title} ${body}`.toLowerCase();
  return /urgent|closed|expire|tomorrow|today|emergency|important|ending soon|last day/.test(
    text,
  );
}

function categoryMatchesFilter(category: NotifCategory, filter: FilterTab) {
  if (filter === 'all' || filter === 'unread') return true;
  if (filter === 'attendance') return category === 'attendance' || category === 'streak';
  if (filter === 'diet') return category === 'diet' || category === 'water';
  return category === filter;
}

function prefAllows(category: NotifCategory, prefs: Record<PrefKey, boolean>) {
  switch (category) {
    case 'gym':
      return prefs.gym;
    case 'attendance':
    case 'streak':
      return prefs.attendance;
    case 'diet':
      return prefs.diet;
    case 'water':
      return prefs.water;
    case 'league':
      return prefs.league;
    case 'friends':
      return prefs.friends;
    case 'payments':
      return prefs.payments;
    case 'challenges':
      return prefs.challenges;
    default:
      return true;
  }
}

export function MemberNotificationsPanel() {
  const { client, userId, gym, membership } = useMemberContext();
  const today = getTodayYmd();
  const seasonId = getLeagueSeasonId();
  const seasonRange = getLeagueSeasonDateRange(seasonId);

  const [filter, setFilter] = useState<FilterTab>('all');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean>>(DEFAULT_PREFS);
  const [swipe, setSwipe] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<string | null>(null);

  const notificationsQuery = useGymNotifications(client, gym?.id);
  const leagueQuery = useLeagueSeason(client, userId, seasonId);
  const dietQuery = useDietLog(client, userId, today);
  const paymentsQuery = useMemberPayments(client, userId, { gymId: gym?.id, limit: 20 });
  const requestsQuery = useFriendRequests(client, userId);
  const attendanceToday = useMemberAttendanceToday(client, userId, today);

  useEffect(() => {
    if (!userId) return;
    setReadIds(loadJson<string[]>(storageKey(userId, 'read'), []));
    setDismissedIds(loadJson<string[]>(storageKey(userId, 'dismissed'), []));
    setPrefs(loadJson(storageKey(userId, 'prefs'), DEFAULT_PREFS));
  }, [userId]);

  const persistRead = useCallback(
    (ids: string[]) => {
      setReadIds(ids);
      saveJson(storageKey(userId, 'read'), ids);
    },
    [userId],
  );

  const persistDismissed = useCallback(
    (ids: string[]) => {
      setDismissedIds(ids);
      saveJson(storageKey(userId, 'dismissed'), ids);
    },
    [userId],
  );

  const persistPrefs = useCallback(
    (next: Record<PrefKey, boolean>) => {
      setPrefs(next);
      saveJson(storageKey(userId, 'prefs'), next);
    },
    [userId],
  );

  const gymItems: FeedItem[] = useMemo(() => {
    return (notificationsQuery.data ?? []).map((n) => {
      const category = classifyGymAnnouncement(n);
      return {
        id: `gym-${n.id}`,
        source: 'gym' as const,
        category,
        title: n.title,
        description: n.body || 'Gym announcement',
        createdAt: n.created_at,
        priority: isPriorityText(n.title, n.body ?? ''),
        href: '/member',
        actionLabel: 'Open Gym',
      };
    });
  }, [notificationsQuery.data]);

  const smartItems: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = [];
    const endsYmd = membership?.ends_at?.slice(0, 10) ?? null;
    const daysLeft = endsYmd ? calculateDaysLeft(endsYmd, today) : null;

    if (daysLeft != null && daysLeft >= 0 && daysLeft <= 7) {
      items.push({
        id: `smart-membership-${endsYmd}`,
        source: 'smart',
        category: 'payments',
        title:
          daysLeft <= 1
            ? 'Membership expires tomorrow'
            : `Membership expires in ${daysLeft} days`,
        description: `Renew to keep training at ${gym?.name ?? 'your gym'} without interruption.`,
        createdAt: new Date().toISOString(),
        priority: daysLeft <= 3,
        href: '/member/payments',
        actionLabel: 'Renew Now',
      });
    }

    const seasonDaysLeft = calculateDaysLeft(seasonRange.end, today);
    if (seasonDaysLeft != null && seasonDaysLeft >= 0 && seasonDaysLeft <= 14) {
      items.push({
        id: `smart-season-${seasonId}`,
        source: 'smart',
        category: 'league',
        title: 'League season ending soon',
        description: `${Math.max(0, seasonDaysLeft)} day${seasonDaysLeft === 1 ? '' : 's'} left in ${seasonId}. Push for a higher tier!`,
        createdAt: new Date().toISOString(),
        priority: seasonDaysLeft <= 5,
        href: '/member/league',
        actionLabel: 'View Ranking',
      });
    }

    const myPoints = leagueQuery.data?.total_points ?? 0;
    const tier = getLeagueTierName(myPoints, seasonId);
    if (myPoints > 0 && tier !== 'bronze') {
      items.push({
        id: `smart-tier-${seasonId}-${tier}`,
        source: 'smart',
        category: 'league',
        title: `You reached ${LEAGUE_TIER_LABELS[tier]} League`,
        description: `Congratulations — you're sitting on ${myPoints.toLocaleString()} XP this season.`,
        createdAt: leagueQuery.data?.updated_at ?? new Date().toISOString(),
        href: '/member/league',
        actionLabel: 'View Ranking',
      });
    }

    const dayPoints = (leagueQuery.data?.day_points ?? {}) as Record<string, number>;
    const scoredDays = Object.keys(dayPoints).filter((k) => Number(dayPoints[k]) > 0).length;
    if (scoredDays >= 7) {
      items.push({
        id: `smart-streak-${scoredDays}`,
        source: 'smart',
        category: 'streak',
        title: `You're on a ${scoredDays}-day scoring streak`,
        description: 'Keep logging training and nutrition to protect your streak.',
        createdAt: new Date().toISOString(),
        href: '/member/attendance',
        actionLabel: 'Keep going',
      });
    }

    const totals = (dietQuery.data?.totals ?? {}) as {
      protein?: number;
      waterLiters?: number;
    };
    const protein = Number(totals.protein ?? 0);
    const water = Number(totals.waterLiters ?? 0);
    const fitness = Math.round(
      Number(dietQuery.data?.fitness_score ?? dietQuery.data?.diet_score ?? 0),
    );

    if (protein >= 120) {
      items.push({
        id: `smart-protein-${today}`,
        source: 'smart',
        category: 'diet',
        title: 'Great job!',
        description: `You reached today's protein goal (${Math.round(protein)}g).`,
        createdAt: dietQuery.data?.updated_at ?? new Date().toISOString(),
        href: '/member/diet',
        actionLabel: 'Open Diet',
      });
    } else if (protein > 0 && protein < 120) {
      items.push({
        id: `smart-protein-nudge-${today}`,
        source: 'smart',
        category: 'diet',
        title: 'Protein progress',
        description: `${Math.round(protein)}g logged — ${Math.max(0, Math.round(120 - protein))}g left to hit a strong day.`,
        createdAt: new Date().toISOString(),
        href: '/member/diet',
        actionLabel: 'Open Diet',
      });
    }

    if (water > 0 && water < 3) {
      const remaining = Math.max(0, 3 - water);
      items.push({
        id: `smart-water-${today}`,
        source: 'smart',
        category: 'water',
        title: 'Hydration check',
        description: `Only ${remaining >= 1 ? `${remaining.toFixed(1)}L` : `${Math.round(remaining * 1000)} ml`} left to reach today's goal.`,
        createdAt: new Date().toISOString(),
        href: '/member/diet',
        actionLabel: 'Log Water',
      });
    } else if (water >= 3) {
      items.push({
        id: `smart-water-done-${today}`,
        source: 'smart',
        category: 'water',
        title: 'Water goal complete',
        description: `You drank ${water.toFixed(1)}L today. Stay consistent.`,
        createdAt: new Date().toISOString(),
        href: '/member/diet',
        actionLabel: 'Open Diet',
      });
    }

    if (fitness >= 80) {
      items.push({
        id: `smart-fitness-${today}`,
        source: 'smart',
        category: 'diet',
        title: 'Strong fitness score today',
        description: `Your daily score is ${fitness}. Share the win with friends!`,
        createdAt: new Date().toISOString(),
        href: '/member/friends',
        actionLabel: 'Share',
      });
    }

    if (!attendanceToday.data) {
      const hour = new Date().getHours();
      if (hour >= 8 && hour <= 20) {
        items.push({
          id: `smart-attendance-${today}`,
          source: 'smart',
          category: 'attendance',
          title: 'Attendance reminder',
          description: `You haven't checked in yet today at ${gym?.name ?? 'the gym'}.`,
          createdAt: new Date().toISOString(),
          href: '/member/attendance',
          actionLabel: 'Open Attendance',
        });
      }
    }

    const paid = (paymentsQuery.data ?? []).find((p) => p.status === 'paid');
    if (paid) {
      items.push({
        id: `smart-payment-${paid.id}`,
        source: 'smart',
        category: 'payments',
        title: 'Payment confirmation',
        description: `₹${Number(paid.amount || 0).toLocaleString()} recorded${paid.plan ? ` · ${paid.plan.replace(/_/g, ' ')}` : ''}.`,
        createdAt: paid.paid_at ?? paid.created_at,
        href: '/member/payments',
        actionLabel: 'View Receipt',
      });
    }

    const incoming = (requestsQuery.data ?? []).filter((r) => r.to_user_id === userId);
    for (const req of incoming.slice(0, 5)) {
      items.push({
        id: `smart-friend-req-${req.id}`,
        source: 'smart',
        category: 'friends',
        title: 'New friend request',
        description: 'Someone wants to connect and train with you.',
        createdAt: req.created_at,
        href: '/member/friends',
        actionLabel: 'View Friend',
        priority: true,
      });
    }

    if (incoming.length === 0 && (requestsQuery.data ?? []).length === 0) {
      // gentle community nudge — low priority, only if no other friend signal
    } else {
      items.push({
        id: 'smart-challenge-nudge',
        source: 'smart',
        category: 'challenges',
        title: 'Challenge a gym buddy',
        description: 'Start a 7-day workout or water challenge from Friends chat.',
        createdAt: new Date().toISOString(),
        href: '/member/friends',
        actionLabel: 'Accept Challenge',
      });
    }

    return items;
  }, [
    membership?.ends_at,
    today,
    gym?.name,
    seasonRange.end,
    seasonId,
    leagueQuery.data,
    dietQuery.data,
    attendanceToday.data,
    paymentsQuery.data,
    requestsQuery.data,
    userId,
  ]);

  const feed = useMemo(() => {
    const merged = [...gymItems, ...smartItems]
      .filter((item) => !dismissedIds.includes(item.id))
      .filter((item) => prefAllows(item.category, prefs))
      .sort((a, b) => {
        if (a.priority && !b.priority) return -1;
        if (!a.priority && b.priority) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    return merged;
  }, [gymItems, smartItems, dismissedIds, prefs]);

  const visible = useMemo(() => {
    return feed.filter((item) => {
      if (!categoryMatchesFilter(item.category, filter)) return false;
      if (filter === 'unread' && readIds.includes(item.id)) return false;
      return true;
    });
  }, [feed, filter, readIds]);

  const grouped = useMemo(() => {
    const buckets: Record<'today' | 'yesterday' | 'week' | 'earlier', FeedItem[]> = {
      today: [],
      yesterday: [],
      week: [],
      earlier: [],
    };
    for (const item of visible) {
      buckets[dayBucket(item.createdAt, today)].push(item);
    }
    return buckets;
  }, [visible, today]);

  const unreadCount = feed.filter((i) => !readIds.includes(i.id)).length;
  const gymCount = feed.filter((i) => i.category === 'gym' || i.source === 'gym').length;
  const friendCount = feed.filter((i) => i.category === 'friends' || i.category === 'challenges').length;
  const leagueCount = feed.filter(
    (i) => i.category === 'league' || i.category === 'streak',
  ).length;

  function markRead(id: string) {
    if (readIds.includes(id)) return;
    persistRead([...readIds, id]);
  }

  function markAllRead() {
    persistRead([...new Set([...readIds, ...feed.map((i) => i.id)])]);
    setToast('All notifications marked as read.');
    window.setTimeout(() => setToast(null), 2500);
  }

  function dismiss(id: string) {
    persistDismissed([...new Set([...dismissedIds, id])]);
    setSwipe((s) => {
      const next = { ...s };
      delete next[id];
      return next;
    });
  }

  function onTouchStart(id: string, clientX: number) {
    setSwipe((s) => ({ ...s, [id]: clientX }));
  }

  function onTouchMove(id: string, clientX: number) {
    const start = swipe[id];
    if (start == null) return;
    // store delta as negative offset via a parallel map — simplify: use CSS var via state
    setSwipe((s) => ({ ...s, [`${id}-x`]: start - clientX }));
  }

  function onTouchEnd(id: string) {
    const dx = swipe[`${id}-x`] ?? 0;
    if (dx > 96) {
      dismiss(id);
    } else if (dx > 48) {
      markRead(id);
    }
    setSwipe((s) => {
      const next = { ...s };
      delete next[id];
      delete next[`${id}-x`];
      return next;
    });
  }

  function renderCard(item: FeedItem) {
    const meta = CATEGORY_META[item.category];
    const Icon = meta.icon;
    const unread = !readIds.includes(item.id);
    const offset = Math.min(120, Math.max(0, Number(swipe[`${item.id}-x`] ?? 0)));

    return (
      <motion.li
        key={item.id}
        layout
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 24 }}
        transition={{ duration: 0.25 }}
        className="relative overflow-hidden rounded-[20px]"
        onTouchStart={(e) => onTouchStart(item.id, e.touches[0]?.clientX ?? 0)}
        onTouchMove={(e) => onTouchMove(item.id, e.touches[0]?.clientX ?? 0)}
        onTouchEnd={() => onTouchEnd(item.id)}
      >
        <div
          className="pointer-events-none absolute inset-y-0 right-0 flex w-[120px] items-center justify-evenly bg-gradient-to-l from-rose-600/90 to-emerald-600/80 text-white lg:hidden"
          aria-hidden
        >
          <CheckCheck className="size-5" />
          <Trash2 className="size-5" />
        </div>
        <div
          style={{ transform: offset ? `translateX(-${offset}px)` : undefined }}
          className="transition-transform"
        >
          <div
            className={cn(
              'rounded-[20px] border border-border/60 bg-card/80 p-4 shadow-[0_8px_28px_rgba(15,23,42,0.06)] backdrop-blur-md transition hover:-translate-y-0.5 hover:shadow-lg sm:p-5',
              'dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_8px_32px_rgba(0,0,0,0.25)]',
              unread && 'border-emerald-500/30 bg-emerald-500/[0.04]',
              item.priority &&
                'border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-transparent ring-1 ring-amber-500/20',
            )}
          >
            <div className="flex gap-3">
              <span
                className={cn(
                  'inline-flex size-11 shrink-0 items-center justify-center rounded-2xl',
                  meta.tone,
                )}
              >
                <Icon className={cn('size-5', meta.iconClass)} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                      {meta.label}
                      {item.priority ? (
                        <span className="ml-2 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-800 dark:text-amber-300">
                          Priority
                        </span>
                      ) : null}
                    </p>
                    <h3 className="mt-0.5 text-base font-semibold tracking-tight">{item.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {unread ? (
                      <span
                        className="size-2.5 animate-pulse rounded-full bg-emerald-500"
                        aria-label="Unread"
                      />
                    ) : (
                      <span className="text-[10px] font-medium text-muted-foreground">Read</span>
                    )}
                    <time className="text-xs text-muted-foreground" dateTime={item.createdAt}>
                      {relativeTime(item.createdAt)}
                    </time>
                  </div>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">{item.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.href && item.actionLabel ? (
                    <Link
                      href={item.href}
                      className={cn(
                        buttonVariants({ size: 'sm' }),
                        'min-h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700',
                      )}
                      onClick={() => markRead(item.id)}
                    >
                      {item.actionLabel}
                    </Link>
                  ) : null}
                  {unread ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="min-h-10 rounded-xl"
                      onClick={() => markRead(item.id)}
                    >
                      Mark Read
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="min-h-10 rounded-xl text-muted-foreground"
                    onClick={() => dismiss(item.id)}
                    aria-label={`Delete ${item.title}`}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.li>
    );
  }

  const sections: { key: keyof typeof grouped; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'week', label: 'This Week' },
    { key: 'earlier', label: 'Earlier' },
  ];

  return (
    <motion.div
      className="mx-auto w-full max-w-4xl space-y-6 pb-24 sm:space-y-8 lg:pb-8"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            <BellRing className="size-7 text-emerald-600 dark:text-emerald-400" aria-hidden />
            Notifications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Stay updated with everything happening in your gym.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 rounded-2xl"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="size-4" />
            Mark All Read
          </Button>
          <Button
            type="button"
            className="min-h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700"
            onClick={() => {
              setSettingsOpen(true);
              document.getElementById('notif-settings')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <Settings2 className="size-4" />
            Notification Settings
          </Button>
        </div>
      </header>

      <AnimatePresence>
        {toast ? (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-[20px] border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200"
            role="status"
          >
            {toast}
          </motion.p>
        ) : null}
      </AnimatePresence>

      {/* KPIs */}
      <section aria-label="Notification summary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Unread', value: unreadCount, icon: Bell },
          { label: 'Gym Announcements', value: gymCount, icon: Dumbbell },
          { label: 'Friend Activity', value: friendCount, icon: Users },
          { label: 'League Updates', value: leagueCount, icon: Trophy },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <GlassCard key={kpi.label} className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="mt-1.5 text-3xl font-semibold tracking-tight">
                    <AnimatedNumber value={kpi.value} />
                  </p>
                </div>
                <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Icon className="size-5" aria-hidden />
                </span>
              </div>
            </GlassCard>
          );
        })}
      </section>

      {/* Sticky filters */}
      <div className="sticky top-0 z-10 -mx-1 bg-background/90 px-1 py-2 backdrop-blur">
        <div
          className="flex gap-1 overflow-x-auto rounded-[20px] border border-border/50 bg-muted/40 p-1.5"
          role="tablist"
          aria-label="Notification filters"
        >
          {FILTERS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filter === tab.id}
              onClick={() => setFilter(tab.id)}
              className={cn(
                'min-h-10 shrink-0 rounded-2xl px-3.5 text-sm font-semibold whitespace-nowrap transition',
                filter === tab.id
                  ? 'bg-background text-emerald-700 shadow-sm dark:text-emerald-300'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
              {tab.id === 'unread' && unreadCount > 0 ? (
                <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-500/20 px-1.5 text-[11px] text-emerald-700 dark:text-emerald-300">
                  {unreadCount}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <section aria-label="Fitness activity feed">
        {notificationsQuery.isLoading && gymItems.length === 0 && smartItems.length === 0 ? (
          <div className="h-40 animate-pulse rounded-[20px] bg-muted" />
        ) : visible.length === 0 ? (
          <GlassCard className="flex flex-col items-center px-6 py-16 text-center">
            <Bell className="size-12 text-muted-foreground/40" aria-hidden />
            <p className="mt-4 text-lg font-semibold">You&apos;re all caught up!</p>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              New gym announcements, achievements, friend activity and reminders will appear here.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-6 min-h-11 rounded-2xl"
              onClick={() => setFilter('all')}
            >
              Show all categories
            </Button>
          </GlassCard>
        ) : (
          <div className="space-y-6">
            {sections.map((section) => {
              const list = grouped[section.key];
              if (list.length === 0) return null;
              return (
                <div key={section.key}>
                  <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                    {section.label}
                  </h2>
                  <ul className="space-y-3">
                    <AnimatePresence initial={false}>
                      {list.map((item) => renderCard(item))}
                    </AnimatePresence>
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Settings */}
      <GlassCard id="notif-settings" className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <Settings2 className="size-4" aria-hidden />
              Notification Settings
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Choose what shows in your fitness activity feed. Preferences are saved on this device.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className="min-h-11 min-w-11 lg:hidden"
            aria-label={settingsOpen ? 'Collapse settings' : 'Expand settings'}
            onClick={() => setSettingsOpen((v) => !v)}
          >
            {settingsOpen ? <X className="size-5" /> : <Settings2 className="size-5" />}
          </Button>
        </div>
        <ul className={cn('mt-4 grid gap-2 sm:grid-cols-2', !settingsOpen && 'hidden sm:grid')}>
          {(Object.keys(PREF_LABELS) as PrefKey[]).map((key) => (
            <li key={key}>
              <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border/50 bg-muted/20 px-4 py-3 text-sm">
                <span className="font-medium">{PREF_LABELS[key]}</span>
                <input
                  type="checkbox"
                  className="size-5 accent-emerald-600"
                  checked={prefs[key]}
                  onChange={(e) => persistPrefs({ ...prefs, [key]: e.target.checked })}
                />
              </label>
            </li>
          ))}
        </ul>
      </GlassCard>
    </motion.div>
  );
}
