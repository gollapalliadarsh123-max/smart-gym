'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useSpring, useTransform } from 'framer-motion';
import {
  Award,
  Crown,
  Flame,
  Lock,
  Medal,
  Rocket,
  Search,
  Shield,
  Sparkles,
  Trophy,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Zap,
} from 'lucide-react';
import {
  LEAGUE_TIERS,
  LEAGUE_TIER_LABELS,
  addDaysToYmd,
  calculateDaysLeft,
  computeMealLogStreak,
  getLeagueSeasonDateRange,
  getLeagueSeasonId,
  getLeagueSeasonLabel,
  getLeagueSeasonShortTag,
  getLeagueTierName,
  getLeagueTierThresholds,
  getTodayYmd,
  type LeagueTier,
} from '@smart-gym/shared';
import {
  useDietLog,
  useDietLogDates,
  useLeagueLeaderboard,
  useLeagueSeason,
  useMemberAttendanceHistory,
  useProfilesMap,
  useSendFriendRequest,
  type Tables,
} from '@smart-gym/supabase';
import { useMemberContext } from '@/features/member/components/member-provider';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Profile = Tables<'profiles'>;

const TIER_COLORS: Record<LeagueTier, string> = {
  bronze: 'from-amber-700 to-orange-800',
  silver: 'from-slate-400 to-slate-600',
  gold: 'from-amber-400 to-yellow-600',
  platinum: 'from-cyan-300 to-slate-500',
  diamond: 'from-sky-400 to-indigo-600',
  crown: 'from-fuchsia-400 to-violet-700',
  conqueror: 'from-rose-500 to-red-800',
};

const TIER_RING: Record<LeagueTier, string> = {
  bronze: 'ring-amber-600/50',
  silver: 'ring-slate-400/50',
  gold: 'ring-amber-400/60',
  platinum: 'ring-cyan-400/50',
  diamond: 'ring-sky-400/60',
  crown: 'ring-fuchsia-400/60',
  conqueror: 'ring-rose-500/70',
};

const TIER_REWARDS: Record<LeagueTier, string> = {
  bronze: 'Season badge',
  silver: '500 bonus recognition',
  gold: 'Premium badge',
  platinum: 'Elite border',
  diamond: 'Exclusive frame',
  crown: 'Royal crest',
  conqueror: 'Champion trophy',
};

const ROMAN = ['III', 'II', 'I'] as const;

function GlassCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
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

function displayName(
  profile: { full_name?: string | null; first_name?: string | null; last_name?: string | null; email?: string | null } | undefined,
  userId: string,
) {
  if (!profile) return `${userId.slice(0, 8)}…`;
  if (profile.full_name?.trim()) return profile.full_name.trim();
  const name = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
  return name || profile.email || `${userId.slice(0, 8)}…`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

function parseDayPoints(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = Number(v);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

function weekStartYmd(today: string) {
  const [y, m, d] = today.split('-').map(Number);
  if (!y || !m || !d) return today;
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - date.getDay());
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function sumPointsInRange(dayPoints: Record<string, number>, from: string, to: string) {
  let total = 0;
  for (const [date, pts] of Object.entries(dayPoints)) {
    if (date >= from && date <= to) total += Number(pts) || 0;
  }
  return total;
}

function getTierFloorCeil(tier: LeagueTier, thresholds: ReturnType<typeof getLeagueTierThresholds>) {
  const floors: Record<LeagueTier, number> = {
    bronze: 0,
    silver: thresholds.silver,
    gold: thresholds.gold,
    platinum: thresholds.platinum,
    diamond: thresholds.diamond,
    crown: thresholds.crown,
    conqueror: thresholds.conqueror,
  };
  const ceils: Record<LeagueTier, number> = {
    bronze: thresholds.silver,
    silver: thresholds.gold,
    gold: thresholds.platinum,
    platinum: thresholds.diamond,
    diamond: thresholds.crown,
    crown: thresholds.conqueror,
    conqueror: thresholds.conqueror + Math.max(400, Math.round(thresholds.conqueror * 0.15)),
  };
  return { floor: floors[tier], ceil: ceils[tier] };
}

function getTierDivisionLabel(points: number, seasonId: string): string {
  const tier = getLeagueTierName(points, seasonId);
  const thresholds = getLeagueTierThresholds(seasonId);
  const { floor, ceil } = getTierFloorCeil(tier, thresholds);
  const span = Math.max(1, ceil - floor);
  const pct = Math.min(0.999, Math.max(0, (points - floor) / span));
  const index = Math.min(2, Math.floor(pct * 3));
  // Higher within tier → I
  const roman = ROMAN[2 - index]!;
  return `${LEAGUE_TIER_LABELS[tier]} ${roman}`;
}

function getNextTierProgress(points: number, seasonId: string) {
  const tier = getLeagueTierName(points, seasonId);
  const thresholds = getLeagueTierThresholds(seasonId);
  if (tier === 'conqueror') {
    return {
      current: LEAGUE_TIER_LABELS.conqueror,
      next: null as string | null,
      remaining: 0,
      progress: 100,
      floor: thresholds.conqueror,
      target: thresholds.conqueror,
    };
  }
  const order = LEAGUE_TIERS;
  const idx = order.indexOf(tier);
  const next = order[idx + 1]!;
  const { floor, ceil } = getTierFloorCeil(tier, thresholds);
  const remaining = Math.max(0, ceil - points);
  const progress = Math.min(100, Math.max(0, Math.round(((points - floor) / Math.max(1, ceil - floor)) * 100)));
  return {
    current: LEAGUE_TIER_LABELS[tier],
    next: LEAGUE_TIER_LABELS[next],
    remaining,
    progress,
    floor,
    target: ceil,
  };
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

function Avatar({
  profile,
  userId,
  size = 'md',
  ring,
}: {
  profile?: Profile;
  userId: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  ring?: string;
}) {
  const name = displayName(profile, userId);
  const sizeClass =
    size === 'xl'
      ? 'size-20 text-xl'
      : size === 'lg'
        ? 'size-14 text-lg'
        : size === 'sm'
          ? 'size-9 text-xs'
          : 'size-11 text-sm';
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-700/40 ring-2 ring-offset-2 ring-offset-background',
        sizeClass,
        ring ?? 'ring-emerald-500/30',
      )}
    >
      {profile?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatar_url} alt="" className="size-full object-cover" />
      ) : (
        <span className="flex size-full items-center justify-center font-semibold text-foreground">
          {initials(name)}
        </span>
      )}
    </div>
  );
}

function TierBadge({ tier, className }: { tier: LeagueTier; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-gradient-to-r px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm',
        TIER_COLORS[tier],
        className,
      )}
    >
      {tier === 'conqueror' || tier === 'crown' ? (
        <Crown className="size-3" aria-hidden />
      ) : (
        <Medal className="size-3" aria-hidden />
      )}
      {LEAGUE_TIER_LABELS[tier]}
    </span>
  );
}

export function MemberLeaguePanel() {
  const { client, userId, profile } = useMemberContext();
  const seasonId = getLeagueSeasonId();
  const today = getTodayYmd();
  const seasonRange = getLeagueSeasonDateRange(seasonId);
  const daysLeft = calculateDaysLeft(seasonRange.end, today) ?? 0;

  const [search, setSearch] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const mySeasonQuery = useLeagueSeason(client, userId, seasonId);
  const boardQuery = useLeagueLeaderboard(client, seasonId, 50);
  const sendFriend = useSendFriendRequest(client);
  const dietToday = useDietLog(client, userId, today);
  const dietDates = useDietLogDates(client, userId);
  const attendanceHistory = useMemberAttendanceHistory(client, userId, 14);

  const rows = useMemo(() => boardQuery.data ?? [], [boardQuery.data]);
  const profileIds = useMemo(() => rows.map((r) => r.user_id), [rows]);
  const profilesQuery = useProfilesMap(client, profileIds);
  const profiles = profilesQuery.data ?? {};

  const mySeason = mySeasonQuery.data;
  const myPoints = mySeason?.total_points ?? 0;
  const myDayPoints = useMemo(() => parseDayPoints(mySeason?.day_points), [mySeason?.day_points]);
  const myTier = getLeagueTierName(myPoints, seasonId);
  const nextProgress = getNextTierProgress(myPoints, seasonId);
  const thresholds = getLeagueTierThresholds(seasonId);
  const divisionLabel = getTierDivisionLabel(myPoints, seasonId);

  const myRank =
    rows.findIndex((r) => r.user_id === userId) >= 0
      ? rows.findIndex((r) => r.user_id === userId) + 1
      : null;

  const weekStart = weekStartYmd(today);
  const prevWeekStart = addDaysToYmd(weekStart, -7);
  const prevWeekEnd = addDaysToYmd(weekStart, -1);
  const weeklyXp = sumPointsInRange(myDayPoints, weekStart, today);
  const prevWeeklyXp = sumPointsInRange(myDayPoints, prevWeekStart, prevWeekEnd);
  const weeklyDelta = weeklyXp - prevWeeklyXp;

  const seasonWins = useMemo(
    () => Object.values(myDayPoints).filter((p) => p >= 70).length,
    [myDayPoints],
  );

  const foods = (dietToday.data?.foods as unknown[]) ?? [];
  const totals = (dietToday.data?.totals ?? {}) as {
    waterLiters?: number;
    protein?: number;
  };
  const hasEntriesToday = foods.length > 0 || Number(totals.waterLiters ?? 0) > 0;
  const mealStreak = computeMealLogStreak(
    new Set(dietDates.data ?? []),
    today,
    hasEntriesToday,
  );

  const attendedThisWeek = useMemo(() => {
    const start = weekStart;
    return (attendanceHistory.data ?? []).filter((a) => {
      const d = (a.attendance_date || a.checked_in_at || '').slice(0, 10);
      return d >= start && d <= today;
    }).length;
  }, [attendanceHistory.data, weekStart, today]);

  const waterLiters = Number(totals.waterLiters ?? 0);
  const protein = Number(totals.protein ?? 0);
  const fitnessScore = Math.round(
    Number(dietToday.data?.fitness_score ?? dietToday.data?.diet_score ?? 0),
  );

  const filtered = rows.filter((row) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    const name = displayName(profiles[row.user_id], row.user_id).toLowerCase();
    const email = profiles[row.user_id]?.email?.toLowerCase() ?? '';
    return name.includes(q) || email.includes(q);
  });

  const podium = rows.slice(0, 3);

  const achievements = useMemo(() => {
    const top10 = myRank != null && myRank <= 10;
    const first = myRank === 1;
    return [
      {
        id: 'first',
        label: 'First Win',
        icon: '🥇',
        unlocked: first || seasonWins >= 1,
        hint: 'Score 70+ on a day or reach #1',
      },
      {
        id: 'streak7',
        label: '7-Day Streak',
        icon: '🔥',
        unlocked: mealStreak >= 7,
        hint: 'Log meals 7 days in a row',
      },
      {
        id: 'protein',
        label: 'Protein Master',
        icon: '💪',
        unlocked: protein >= 120 || fitnessScore >= 80,
        hint: 'Hit a strong protein / diet day',
      },
      {
        id: 'top10',
        label: 'Top 10',
        icon: '🏆',
        unlocked: top10,
        hint: 'Finish in the season top 10',
      },
      {
        id: 'silver',
        label: 'Silver Climb',
        icon: '🥈',
        unlocked: LEAGUE_TIERS.indexOf(myTier) >= LEAGUE_TIERS.indexOf('silver'),
        hint: 'Reach Silver tier',
      },
      {
        id: 'active',
        label: 'Season Grinder',
        icon: '⚡',
        unlocked: Object.keys(myDayPoints).length >= 10,
        hint: 'Log points on 10+ days',
      },
    ];
  }, [myRank, seasonWins, mealStreak, protein, fitnessScore, myTier, myDayPoints]);

  const activityFeed = useMemo(() => {
    const feed: { id: string; text: string; tone: 'up' | 'goal' | 'tier' }[] = [];
    const sortedDays = Object.entries(myDayPoints).sort((a, b) => b[0].localeCompare(a[0]));
    for (const [date, pts] of sortedDays.slice(0, 3)) {
      if (pts <= 0) continue;
      feed.push({
        id: `me-${date}`,
        text: `You gained ${pts} points on ${new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}.`,
        tone: 'up',
      });
    }
    for (const row of rows.slice(0, 8)) {
      if (row.user_id === userId) continue;
      const tier = getLeagueTierName(row.total_points, seasonId);
      if (tier === 'bronze') continue;
      const name = displayName(profiles[row.user_id], row.user_id).split(' ')[0] ?? 'Member';
      feed.push({
        id: `tier-${row.user_id}`,
        text: `${name} reached ${LEAGUE_TIER_LABELS[tier]} league.`,
        tone: 'tier',
      });
      if (feed.length >= 8) break;
    }
    if (fitnessScore >= 70) {
      feed.unshift({
        id: 'diet-today',
        text: 'You are on track for today’s nutrition score.',
        tone: 'goal',
      });
    }
    return feed.slice(0, 8);
  }, [myDayPoints, rows, userId, seasonId, profiles, fitnessScore]);

  const challenges = [
    {
      id: 'attend',
      title: 'Attend Gym 5 Days',
      progress: Math.min(5, attendedThisWeek),
      target: 5,
      reward: '+20 per check-in*',
      href: '/member/attendance',
    },
    {
      id: 'water',
      title: 'Drink 3L Water Daily',
      progress: Math.min(3, Math.round(waterLiters * 10) / 10),
      target: 3,
      reward: '+10 toward daily score',
      href: '/member/diet',
    },
    {
      id: 'protein',
      title: 'Reach Protein Goal',
      progress: Math.min(120, Math.round(protein)),
      target: 120,
      reward: '+15 toward daily score',
      href: '/member/diet',
    },
    {
      id: 'workouts',
      title: 'Complete 7 Score Days',
      progress: Math.min(7, Object.keys(myDayPoints).length),
      target: 7,
      reward: 'Season XP boost',
      href: '/member/diet',
    },
  ];

  async function addFriend(targetUserId: string) {
    if (!userId) return;
    const email = profiles[targetUserId]?.email;
    if (!email) {
      setActionError('That member has no email on file.');
      return;
    }
    setActionError(null);
    setActionMessage(null);
    try {
      await sendFriend.mutateAsync({ fromUserId: userId, email });
      setActionMessage(`Friend request sent to ${displayName(profiles[targetUserId], targetUserId)}.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not send request.');
    }
  }

  const seasonProgressPct =
    daysLeft == null
      ? 0
      : (() => {
          const total =
            Math.round(
              (new Date(`${seasonRange.end}T00:00:00`).getTime() -
                new Date(`${seasonRange.start}T00:00:00`).getTime()) /
                (1000 * 60 * 60 * 24),
            ) + 1;
          const elapsed = Math.max(0, total - Math.max(0, daysLeft));
          return Math.min(100, Math.round((elapsed / Math.max(1, total)) * 100));
        })();

  return (
    <motion.div
      className="mx-auto w-full max-w-6xl space-y-6 pb-8 sm:space-y-8"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">League</h1>
        <p className="text-sm text-muted-foreground">{getLeagueSeasonLabel(seasonId)}</p>
      </header>

      <AnimatePresence>
        {actionMessage ? (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-[20px] border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200"
            role="status"
          >
            {actionMessage}
          </motion.p>
        ) : null}
      </AnimatePresence>
      {actionError ? (
        <p className="rounded-[20px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      {/* Hero */}
      <GlassCard className="relative overflow-hidden p-0">
        <div
          className={cn('absolute inset-0 bg-gradient-to-br opacity-95', TIER_COLORS[myTier])}
          aria-hidden
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_45%)]" aria-hidden />
        <div className="relative grid gap-6 p-6 text-white sm:p-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-white/85">
              <Trophy className="size-4" aria-hidden />
              League Season · {getLeagueSeasonShortTag(seasonId)}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {divisionLabel}
            </h2>
            <p className="mt-2 text-sm text-white/80">
              {Math.max(0, daysLeft)} day{daysLeft === 1 ? '' : 's'} remaining · Season {seasonProgressPct}% complete
            </p>

            <div className="mt-6 max-w-md">
              <div className="mb-1.5 flex justify-between text-xs text-white/85">
                <span>
                  <AnimatedNumber value={myPoints} /> / {nextProgress.target.toLocaleString()} XP
                </span>
                <span>
                  {nextProgress.next
                    ? `${nextProgress.remaining.toLocaleString()} XP until ${nextProgress.next}`
                    : 'Max tier reached'}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/20">
                <motion.div
                  className="h-full rounded-full bg-white"
                  initial={{ width: 0 }}
                  animate={{ width: `${nextProgress.progress}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start justify-end gap-3 sm:items-end">
            <div className="rounded-2xl bg-black/20 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs tracking-wide text-white/70 uppercase">Current Points</p>
              <p className="text-4xl font-semibold tabular-nums">
                <AnimatedNumber value={myPoints} />
              </p>
            </div>
            <TierBadge tier={myTier} className="text-sm" />
          </div>
        </div>
      </GlassCard>

      {/* Tier progress track */}
      <GlassCard className="p-5 sm:p-6">
        <h2 className="text-base font-semibold tracking-tight">Tier Progress</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Climb through every league this season</p>
        <div className="mt-5 overflow-x-auto pb-1">
          <div className="relative flex min-w-[640px] items-start justify-between gap-2 px-1">
            <div className="absolute top-5 right-4 left-4 h-1.5 rounded-full bg-muted" />
            <motion.div
              className="absolute top-5 left-4 h-1.5 rounded-full bg-emerald-500"
              style={{
                width: `calc((100% - 2rem) * ${LEAGUE_TIERS.indexOf(myTier) / Math.max(1, LEAGUE_TIERS.length - 1)})`,
              }}
              initial={{ width: 0 }}
              animate={{
                width: `calc((100% - 2rem) * ${LEAGUE_TIERS.indexOf(myTier) / Math.max(1, LEAGUE_TIERS.length - 1)})`,
              }}
              transition={{ duration: 0.8 }}
            />
            {LEAGUE_TIERS.map((tier, i) => {
              const currentIdx = LEAGUE_TIERS.indexOf(myTier);
              const done = i < currentIdx;
              const current = i === currentIdx;
              const locked = i > currentIdx;
              return (
                <div key={tier} className="relative z-[1] flex w-20 flex-col items-center text-center">
                  <span
                    className={cn(
                      'flex size-10 items-center justify-center rounded-full border-4 border-background shadow transition',
                      done && 'bg-emerald-500 text-white',
                      current && `bg-gradient-to-br text-white ring-2 ring-offset-2 ring-offset-background ${TIER_COLORS[tier]} ${TIER_RING[tier]}`,
                      locked && 'bg-muted text-muted-foreground',
                    )}
                    aria-current={current ? 'step' : undefined}
                  >
                    {locked ? <Lock className="size-3.5" /> : current ? <Sparkles className="size-3.5" /> : <Shield className="size-3.5" />}
                  </span>
                  <p
                    className={cn(
                      'mt-2 text-[11px] font-semibold',
                      current ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {LEAGUE_TIER_LABELS[tier]}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </GlassCard>

      {/* Stats */}
      <section aria-label="Current statistics">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              label: 'League Points',
              value: myPoints,
              icon: Zap,
              hint: 'Season total',
            },
            {
              label: 'Current Rank',
              value: myRank ?? 0,
              display: myRank != null ? `#${myRank}` : '—',
              icon: Trophy,
              hint: rows.length ? `of ${rows.length} on board` : 'Unranked',
            },
            {
              label: 'Tier',
              value: null,
              display: LEAGUE_TIER_LABELS[myTier],
              icon: Medal,
              hint: divisionLabel,
            },
            {
              label: 'Current Streak',
              value: mealStreak,
              icon: Flame,
              hint: 'Meal log streak',
            },
            {
              label: 'Weekly XP Change',
              value: weeklyDelta,
              display: `${weeklyDelta > 0 ? '+' : ''}${weeklyDelta}`,
              icon: weeklyDelta >= 0 ? TrendingUp : TrendingDown,
              hint: `${weeklyXp} XP this week`,
            },
            {
              label: 'Season Wins',
              value: seasonWins,
              icon: Award,
              hint: 'Days scored 70+',
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <GlassCard key={stat.label} className="p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight">
                      {stat.display ?? <AnimatedNumber value={Number(stat.value) || 0} />}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
                  </div>
                  <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <Icon className="size-5" aria-hidden />
                  </span>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </section>

      {/* Podium */}
      {!boardQuery.isLoading && podium.length > 0 ? (
        <GlassCard className="overflow-hidden p-5 sm:p-6">
          <h2 className="text-base font-semibold tracking-tight">Top 3 Podium</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Season leaders right now</p>
          <div className="mt-6 flex items-end justify-center gap-2 sm:gap-4">
            {([1, 0, 2] as const).map((idx, visualOrder) => {
              const row = podium[idx];
              if (!row) return <div key={visualOrder} className="hidden w-24 sm:block" />;
              const place = idx + 1;
              const height = place === 1 ? 'h-28 sm:h-36' : place === 2 ? 'h-24 sm:h-28' : 'h-20 sm:h-24';
              const medal = place === 1 ? '🥇' : place === 2 ? '🥈' : '🥉';
              const tier = getLeagueTierName(row.total_points, seasonId);
              return (
                <motion.div
                  key={row.user_id}
                  className="flex w-[30%] max-w-[140px] flex-col items-center sm:w-36"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: visualOrder * 0.12, duration: 0.45 }}
                >
                  <Avatar
                    profile={profiles[row.user_id]}
                    userId={row.user_id}
                    size={place === 1 ? 'xl' : 'lg'}
                    ring={TIER_RING[tier]}
                  />
                  <p className="mt-2 line-clamp-1 text-center text-sm font-semibold">
                    {displayName(profiles[row.user_id], row.user_id)}
                  </p>
                  <TierBadge tier={tier} className="mt-1" />
                  <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                    {row.total_points.toLocaleString()} XP
                  </p>
                  <div
                    className={cn(
                      'mt-3 flex w-full flex-col items-center justify-end rounded-t-2xl bg-gradient-to-t from-emerald-600/80 to-emerald-500/40 px-2 pt-3 pb-2 text-white',
                      height,
                      place === 1 && 'from-amber-600/90 to-amber-400/50',
                      place === 2 && 'from-slate-500/80 to-slate-300/40',
                      place === 3 && 'from-orange-700/80 to-orange-500/40',
                    )}
                  >
                    <span className="text-2xl" aria-hidden>
                      {medal}
                    </span>
                    <span className="text-xs font-semibold">#{place}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </GlassCard>
      ) : null}

      {/* Next tier + Rewards */}
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-5 sm:p-6">
          <h2 className="text-base font-semibold tracking-tight">Progress To Next Tier</h2>
          <p className="mt-3 text-sm text-muted-foreground">Next Tier</p>
          <p className="text-3xl font-semibold tracking-tight">
            {nextProgress.next ?? 'Conqueror'}
          </p>
          <div className="mt-4 h-4 overflow-hidden rounded-full bg-muted">
            <motion.div
              className={cn('h-full rounded-full bg-gradient-to-r', TIER_COLORS[myTier])}
              initial={{ width: 0 }}
              animate={{ width: `${nextProgress.progress}%` }}
              transition={{ duration: 0.85 }}
            />
          </div>
          <p className="mt-3 text-sm font-medium">
            {nextProgress.next
              ? `${nextProgress.remaining.toLocaleString()} XP Remaining`
              : 'You are at the top tier — keep stacking season XP.'}
          </p>
        </GlassCard>

        <GlassCard className="p-5 sm:p-6">
          <h2 className="text-base font-semibold tracking-tight">Season Rewards</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Unlock recognition as you climb</p>
          <ul className="mt-4 space-y-2">
            {LEAGUE_TIERS.map((tier) => {
              const unlocked = LEAGUE_TIERS.indexOf(myTier) >= LEAGUE_TIERS.indexOf(tier);
              return (
                <li
                  key={tier}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-sm',
                    unlocked
                      ? 'border-emerald-500/30 bg-emerald-500/10'
                      : 'border-border/60 bg-muted/30 text-muted-foreground',
                  )}
                >
                  <span className="flex items-center gap-2 font-medium">
                    {unlocked ? (
                      <Sparkles className="size-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Lock className="size-4" />
                    )}
                    {LEAGUE_TIER_LABELS[tier]}
                  </span>
                  <span>{TIER_REWARDS[tier]}</span>
                </li>
              );
            })}
          </ul>
        </GlassCard>
      </div>

      {/* Challenges */}
      <section aria-label="Weekly challenges">
        <div className="mb-3">
          <h2 className="text-base font-semibold tracking-tight">Weekly Challenges</h2>
          <p className="text-sm text-muted-foreground">
            Track healthy habits that feed your daily league score
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {challenges.map((c) => {
            const pct = Math.min(100, Math.round((Number(c.progress) / c.target) * 100));
            return (
              <GlassCard key={c.id} className="p-5 transition hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{c.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{c.reward}</p>
                  </div>
                  <Link
                    href={c.href}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'min-h-10 rounded-xl')}
                  >
                    Go
                  </Link>
                </div>
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
                <p className="mt-2 text-xs tabular-nums text-muted-foreground">
                  {c.progress} / {c.target}
                </p>
              </GlassCard>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          *Daily league XP is computed from your diet / fitness score (max {100}). Check-ins and
          workouts help you stay consistent — scoring logic is unchanged.
        </p>
      </section>

      {/* Achievements */}
      <section aria-label="Achievement badges">
        <h2 className="mb-3 text-base font-semibold tracking-tight">Achievement Badges</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {achievements.map((a) => (
            <GlassCard
              key={a.id}
              className={cn(
                'flex flex-col items-center px-3 py-4 text-center transition',
                a.unlocked ? 'hover:-translate-y-0.5' : 'opacity-45 grayscale',
              )}
            >
              <span className="text-2xl" aria-hidden>
                {a.icon}
              </span>
              <p className="mt-2 text-sm font-semibold">{a.label}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{a.hint}</p>
              <span className="sr-only">{a.unlocked ? 'Unlocked' : 'Locked'}</span>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Activity feed */}
      <GlassCard className="p-5 sm:p-6">
        <h2 className="text-base font-semibold tracking-tight">Activity Feed</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Recent league moments</p>
        {activityFeed.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No activity yet this season.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {activityFeed.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-3 rounded-2xl border border-border/50 bg-muted/20 px-3 py-3 text-sm"
              >
                <span
                  className={cn(
                    'mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-xl',
                    item.tone === 'up' && 'bg-emerald-500/15 text-emerald-600',
                    item.tone === 'tier' && 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
                    item.tone === 'goal' && 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
                  )}
                >
                  {item.tone === 'up' ? (
                    <TrendingUp className="size-4" />
                  ) : item.tone === 'tier' ? (
                    <Crown className="size-4" />
                  ) : (
                    <Flame className="size-4" />
                  )}
                </span>
                <p>{item.text}</p>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      {/* Leaderboard */}
      <section aria-label="Leaderboard" id="leaderboard" className="scroll-mt-24">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Leaderboard</h2>
            <p className="text-sm text-muted-foreground">
              {rows.length} competitor{rows.length === 1 ? '' : 's'} this season
            </p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              placeholder="Search leaderboard…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-h-11 rounded-2xl pl-10"
              aria-label="Search leaderboard"
            />
          </div>
        </div>

        {boardQuery.isLoading ? (
          <div className="h-40 animate-pulse rounded-[20px] bg-muted" />
        ) : filtered.length === 0 ? (
          <GlassCard className="flex flex-col items-center px-6 py-14 text-center">
            <Rocket className="size-10 text-muted-foreground/50" aria-hidden />
            <p className="mt-4 text-lg font-semibold">The season has just begun.</p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Complete workouts, log meals, drink water, and maintain your streak to earn league
              points.
            </p>
            <Link
              href="/member/diet"
              className={cn(
                buttonVariants(),
                'mt-6 min-h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700',
              )}
            >
              Start Earning Points
            </Link>
          </GlassCard>
        ) : (
          <>
            {/* Mobile swipe cards */}
            <div
              className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 lg:hidden"
              aria-label="Swipeable leaderboard"
            >
              {filtered.map((row) => {
                const rank = rows.findIndex((r) => r.user_id === row.user_id) + 1;
                const isYou = row.user_id === userId;
                const tier = getLeagueTierName(row.total_points, seasonId);
                const dayPts = parseDayPoints(row.day_points);
                const streakDays = Object.keys(dayPts).length;
                return (
                  <motion.div
                    key={row.id}
                    layout
                    className={cn(
                      'w-[85%] max-w-sm shrink-0 snap-center',
                      isYou && 'drop-shadow-[0_0_18px_rgba(16,185,129,0.35)]',
                    )}
                  >
                    <GlassCard
                      className={cn(
                        'p-5',
                        isYou && 'border-emerald-500/60 ring-2 ring-emerald-500/40',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 text-lg font-semibold tabular-nums">#{rank}</span>
                        <Avatar profile={profiles[row.user_id]} userId={row.user_id} ring={TIER_RING[tier]} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">
                            {displayName(profiles[row.user_id], row.user_id)}
                            {isYou ? ' · You' : ''}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <TierBadge tier={tier} />
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Flame className="size-3.5 text-orange-500" />
                              {streakDays}d
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="mt-4 text-2xl font-semibold tabular-nums">
                        {row.total_points.toLocaleString()} XP
                      </p>
                      {!isYou ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-4 min-h-11 w-full rounded-2xl"
                          disabled={sendFriend.isPending}
                          onClick={() => void addFriend(row.user_id)}
                        >
                          <UserPlus className="size-4" />
                          Add friend
                        </Button>
                      ) : null}
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>

            {/* Desktop cards */}
            <div className="hidden space-y-2 lg:block">
              {filtered.map((row, i) => {
                const rank = rows.findIndex((r) => r.user_id === row.user_id) + 1;
                const isYou = row.user_id === userId;
                const tier = getLeagueTierName(row.total_points, seasonId);
                const dayPts = parseDayPoints(row.day_points);
                const streakDays = Object.keys(dayPts).length;
                const weekPts = sumPointsInRange(dayPts, weekStart, today);
                return (
                  <motion.div
                    key={row.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    className={cn(isYou && 'drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]')}
                  >
                    <GlassCard
                      className={cn(
                        'px-4 py-3.5 transition hover:-translate-y-0.5 hover:shadow-lg',
                        isYou && 'border-emerald-500/60 ring-2 ring-emerald-500/40',
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <span className="w-10 text-center text-lg font-semibold tabular-nums text-muted-foreground">
                          #{rank}
                        </span>
                        <Avatar
                          profile={profiles[row.user_id]}
                          userId={row.user_id}
                          ring={TIER_RING[tier]}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">
                            {displayName(profiles[row.user_id], row.user_id)}
                            {isYou ? (
                              <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                You
                              </span>
                            ) : null}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <TierBadge tier={tier} />
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Flame className="size-3.5 text-orange-500" aria-hidden />
                              {streakDays} active days
                            </span>
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 text-xs font-medium',
                                weekPts > 0
                                  ? 'text-emerald-700 dark:text-emerald-300'
                                  : 'text-muted-foreground',
                              )}
                            >
                              {weekPts > 0 ? (
                                <TrendingUp className="size-3.5" />
                              ) : (
                                <TrendingDown className="size-3.5" />
                              )}
                              {weekPts > 0 ? `+${weekPts}` : '0'} this week
                            </span>
                          </div>
                        </div>
                        <p className="text-xl font-semibold tabular-nums">
                          {row.total_points.toLocaleString()}
                          <span className="ml-1 text-sm font-medium text-muted-foreground">XP</span>
                        </p>
                        {!isYou ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-10 rounded-xl"
                            disabled={sendFriend.isPending}
                            onClick={() => void addFriend(row.user_id)}
                          >
                            <UserPlus className="size-3.5" />
                            Add friend
                          </Button>
                        ) : (
                          <span className="w-[108px]" aria-hidden />
                        )}
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* How points work — educational only, no scoring changes */}
      <GlassCard className="p-5 sm:p-6">
        <h2 className="text-base font-semibold tracking-tight">How You Earn Points</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Your daily league XP comes from your fitness score (currently diet-driven, max 100/day).
          Stay consistent across habits for bigger seasons.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Activity</th>
                <th className="py-2 font-medium">Impact</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Gym check-in', 'Builds consistency for attendance streaks'],
                ['Complete / log training day', 'Pairs with nutrition logging'],
                ['Meet protein goal', 'Boosts daily fitness score'],
                ['Drink daily water target', 'Boosts daily fitness score'],
                ['Log all meals', 'Boosts daily fitness score'],
                ['7-day meal log streak', 'Shown as achievement progress'],
              ].map(([activity, impact]) => (
                <tr key={activity} className="border-b border-border/40 last:border-0">
                  <td className="py-2.5 pr-3 font-medium">{activity}</td>
                  <td className="py-2.5 text-muted-foreground">{impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/member/diet"
            className={cn(buttonVariants(), 'min-h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700')}
          >
            Log today&apos;s nutrition
          </Link>
          <Link
            href="/member/attendance"
            className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11 rounded-2xl')}
          >
            Open attendance
          </Link>
        </div>
      </GlassCard>
    </motion.div>
  );
}
