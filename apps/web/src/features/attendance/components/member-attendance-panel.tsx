'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  CheckCircle2,
  ClipboardList,
  Clock,
  Copy,
  Flame,
  HelpCircle,
  Lock,
  Mail,
  Moon,
  Phone,
  Sparkles,
  Sunrise,
  Trophy,
  Users,
} from 'lucide-react';
import {
  addDaysToYmd,
  calculateCrowdLevel,
  computeMealLogStreak,
  countLiveMembers,
  getMonthStartYmd,
  getTodayYmd,
  getWeekStartYmd,
  type CrowdLevel,
} from '@smart-gym/shared';
import {
  useDailyAttendanceCode,
  useGymAttendanceToday,
  useGymMembers,
  useMemberAttendanceHistory,
  useMemberAttendanceToday,
  useSelfCheckIn,
  type Tables,
} from '@smart-gym/supabase';
import { useMemberContext } from '@/features/member/components/member-provider';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Attendance = Tables<'attendance'>;

const CROWD_UI: Record<
  CrowdLevel,
  { label: string; tone: string; bar: string; tip: string }
> = {
  0: {
    label: 'Empty',
    tone: 'text-emerald-300',
    bar: 'from-emerald-500/80 to-emerald-400/40',
    tip: 'Perfect time to train — the floor is quiet.',
  },
  1: {
    label: 'Low',
    tone: 'text-lime-300',
    bar: 'from-lime-500/70 to-emerald-400/40',
    tip: 'Great window for focused workouts.',
  },
  2: {
    label: 'Moderate',
    tone: 'text-amber-300',
    bar: 'from-amber-400/70 to-lime-400/40',
    tip: 'Steady crowd — most equipment available.',
  },
  3: {
    label: 'Busy',
    tone: 'text-orange-300',
    bar: 'from-orange-400/70 to-amber-400/40',
    tip: 'Try mid-morning or late evening for more space.',
  },
  4: {
    label: 'Busy',
    tone: 'text-orange-300',
    bar: 'from-orange-500/70 to-rose-400/40',
    tip: 'Peak hours — early or late visits feel calmer.',
  },
  5: {
    label: 'Very Busy',
    tone: 'text-rose-300',
    bar: 'from-rose-500/80 to-orange-400/50',
    tip: 'Busiest now — early morning is usually quieter.',
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
        'rounded-[20px] border border-white/10 bg-white/[0.04] shadow-[0_8px_32px_rgba(0,0,0,0.25)] backdrop-blur-xl',
        'dark:border-white/10 dark:bg-white/[0.05]',
        'border-border/60 bg-card/80 shadow-[0_8px_28px_rgba(15,23,42,0.06)] backdrop-blur-md dark:shadow-[0_8px_32px_rgba(0,0,0,0.25)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatDateLabel(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function msUntilMidnight(now = new Date()) {
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  return Math.max(0, end.getTime() - now.getTime());
}

function formatCountdown(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function longestStreak(dates: Set<string>): number {
  if (dates.size === 0) return 0;
  const sorted = [...dates].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    const prevDate = new Date(`${prev}T00:00:00`);
    const curDate = new Date(`${cur}T00:00:00`);
    const diff = (curDate.getTime() - prevDate.getTime()) / 86400000;
    if (diff === 1) {
      run += 1;
      best = Math.max(best, run);
    } else if (diff > 1) {
      run = 1;
    }
  }
  return best;
}

function motivationCopy(opts: {
  streak: number;
  monthVisits: number;
  monthGoal: number;
  checkedIn: boolean;
}) {
  const { streak, monthVisits, monthGoal, checkedIn } = opts;
  const left = Math.max(0, monthGoal - monthVisits);
  if (streak >= 7) return `🔥 You're on a ${streak}-day streak. Keep the momentum.`;
  if (left > 0 && left <= 5) {
    return `Only ${left} workout${left === 1 ? '' : 's'} away from your monthly goal.`;
  }
  if (checkedIn) return 'Nice work checking in today. Consistency builds results.';
  return 'Keep going! Consistency builds results. Your next visit starts the chain.';
}

type Achievement = {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  icon: typeof Trophy;
};

export function MemberAttendancePanel() {
  const { client, userId, gym, membership } = useMemberContext();
  const gymId = gym?.id ?? membership?.gym_id;
  const today = getTodayYmd();
  const weekStart = getWeekStartYmd();
  const monthStart = getMonthStartYmd();

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(() => formatCountdown(msUntilMidnight()));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [successPulse, setSuccessPulse] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  const codeQuery = useDailyAttendanceCode(client, gymId, Boolean(gymId));
  const myTodayQuery = useMemberAttendanceToday(client, userId, today);
  const historyQuery = useMemberAttendanceHistory(client, userId, 120);
  const gymTodayQuery = useGymAttendanceToday(client, gymId, today);
  const activeMembersQuery = useGymMembers(client, gymId, 'active');
  const selfCheckIn = useSelfCheckIn(client);

  const history = historyQuery.data ?? [];
  const checkedIn = Boolean(myTodayQuery.data);
  const checkInTime = myTodayQuery.data?.checked_in_at;

  const attendedDates = useMemo(
    () => new Set(history.map((r) => r.attendance_date)),
    [history],
  );

  const currentStreak = useMemo(
    () => computeMealLogStreak(attendedDates, today, checkedIn),
    [attendedDates, today, checkedIn],
  );

  const bestStreak = useMemo(() => {
    const fromHistory = longestStreak(attendedDates);
    return Math.max(fromHistory, currentStreak);
  }, [attendedDates, currentStreak]);

  const weekVisits = useMemo(
    () => history.filter((r) => r.attendance_date >= weekStart).length,
    [history, weekStart],
  );
  const monthVisits = useMemo(
    () => history.filter((r) => r.attendance_date >= monthStart).length,
    [history, monthStart],
  );
  const totalVisits = history.length;
  const monthGoal = 12;

  const liveCount = countLiveMembers(
    (gymTodayQuery.data ?? []).map((row) => ({
      user_id: row.user_id,
      expires_at: row.expires_at,
      check_in_timestamp: row.checked_in_at,
    })),
  );
  const activeCount = (activeMembersQuery.data ?? []).length;
  const crowdLevel = calculateCrowdLevel(liveCount, activeCount);
  const crowdUi = CROWD_UI[crowdLevel];
  const crowdProgress = Math.round((crowdLevel / 5) * 100);

  const heatmapDays = useMemo(() => {
    const days: { ymd: string; attended: boolean; row?: Attendance }[] = [];
    for (let i = 29; i >= 0; i--) {
      const ymd = addDaysToYmd(today, -i);
      const row = history.find((r) => r.attendance_date === ymd);
      days.push({ ymd, attended: Boolean(row), row });
    }
    return days;
  }, [today, history]);

  const historyByDate = useMemo(() => {
    const map = new Map<string, Attendance>();
    for (const row of history) map.set(row.attendance_date, row);
    return map;
  }, [history]);

  const selectedVisit = selectedDay ? historyByDate.get(selectedDay) : undefined;

  const achievements: Achievement[] = useMemo(
    () => [
      {
        id: 'first',
        title: 'First Check-in',
        description: 'Complete your first gym visit',
        earned: totalVisits >= 1,
        icon: Sparkles,
      },
      {
        id: 'streak7',
        title: '7-Day Streak',
        description: 'Train seven days in a row',
        earned: bestStreak >= 7 || currentStreak >= 7,
        icon: Flame,
      },
      {
        id: 'visits30',
        title: '30 Visits',
        description: 'Hit thirty total check-ins',
        earned: totalVisits >= 30,
        icon: Trophy,
      },
      {
        id: 'early',
        title: 'Early Bird',
        description: 'Check in before 8:00 AM',
        earned: history.some((r) => {
          const h = new Date(r.checked_in_at).getHours();
          return h < 8;
        }),
        icon: Sunrise,
      },
    ],
    [totalVisits, bestStreak, currentStreak, history],
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setCountdown(formatCountdown(msUntilMidnight()));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const handleCopy = useCallback(async () => {
    const code = codeQuery.data;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy code.');
    }
  }, [codeQuery.data]);

  async function handleSelfCheckIn() {
    if (!gymId) return;
    setStatus(null);
    setError(null);
    try {
      const result = await selfCheckIn.mutateAsync(gymId);
      setStatus(
        result.already_marked
          ? 'You were already checked in today.'
          : 'Checked in successfully.',
      );
      setSuccessPulse(true);
      window.setTimeout(() => setSuccessPulse(false), 1600);
      await myTodayQuery.refetch();
      await gymTodayQuery.refetch();
      await historyQuery.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Self check-in failed.');
    }
  }

  const motivation = motivationCopy({
    streak: currentStreak,
    monthVisits,
    monthGoal,
    checkedIn,
  });

  const pageVariants = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
  };

  return (
    <motion.div
      className="mx-auto w-full max-w-6xl space-y-6 px-0 sm:space-y-8"
      initial="hidden"
      animate="show"
      variants={pageVariants}
    >
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Attendance
        </h1>
        <p className="text-sm text-muted-foreground">
          Show your code at reception, or check in at {gym?.name ?? 'your gym'}.
        </p>
      </header>

      {/* Hero two-column */}
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        {/* Code hero */}
        <GlassCard className="relative overflow-hidden p-6 sm:p-8">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/15 via-transparent to-teal-500/10"
            aria-hidden
          />
          <div className="relative text-center">
            <p className="text-sm font-medium tracking-wide text-emerald-600 uppercase dark:text-emerald-400">
              Today&apos;s Attendance Code
            </p>

            {codeQuery.isLoading ? (
              <p className="mt-10 text-sm text-muted-foreground">Generating your code…</p>
            ) : codeQuery.error ? (
              <p className="mt-10 text-sm text-destructive" role="alert">
                {(codeQuery.error as Error).message}
              </p>
            ) : (
              <motion.p
                key={codeQuery.data}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="mt-6 font-mono text-[48px] leading-none font-semibold tracking-[0.28em] text-foreground sm:text-[56px]"
                aria-live="polite"
                aria-label={`Attendance code ${codeQuery.data?.split('').join(' ')}`}
              >
                {codeQuery.data}
              </motion.p>
            )}

            <div className="mt-6 space-y-1 text-sm text-muted-foreground">
              <p>Valid until midnight.</p>
              <p>Show this code at reception.</p>
            </div>

            <div className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-border/70 bg-background/50 px-4 text-sm font-medium tabular-nums backdrop-blur">
              <Clock className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
              <span>
                Expires in <span className="font-semibold text-foreground">{countdown}</span>
              </span>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                type="button"
                className="min-h-12 rounded-2xl bg-emerald-600 px-6 hover:bg-emerald-700"
                disabled={!codeQuery.data}
                onClick={() => void handleCopy()}
              >
                <Copy className="size-4" aria-hidden />
                {copied ? 'Copied!' : 'Copy Code'}
              </Button>
            </div>
            <AnimatePresence>
              {copied ? (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-3 text-sm font-medium text-emerald-600 dark:text-emerald-400"
                  role="status"
                >
                  Code copied to clipboard
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>
        </GlassCard>

        {/* Status + crowd stack */}
        <div className="flex flex-col gap-4">
          <GlassCard
            className={cn(
              'relative overflow-hidden p-5 sm:p-6 transition-shadow',
              successPulse && 'ring-2 ring-emerald-500/60',
            )}
          >
            <AnimatePresence>
              {successPulse ? (
                <motion.div
                  initial={{ opacity: 0.6, scale: 0.8 }}
                  animate={{ opacity: 0, scale: 1.4 }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-none absolute inset-0 bg-emerald-400/20"
                  aria-hidden
                />
              ) : null}
            </AnimatePresence>

            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Check-in status</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">Today at {gym?.name ?? 'the gym'}</p>
              </div>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
                  checkedIn
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {checkedIn ? 'Present' : 'Away'}
              </span>
            </div>

            <div className="mt-5 flex items-start gap-3">
              <span
                className={cn(
                  'inline-flex size-12 shrink-0 items-center justify-center rounded-2xl',
                  checkedIn
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {checkedIn ? (
                  <CheckCircle2 className="size-6" aria-hidden />
                ) : (
                  <Moon className="size-6" aria-hidden />
                )}
              </span>
              <div>
                <p className="text-lg font-semibold tracking-tight">
                  {checkedIn ? 'Checked in successfully' : 'Not Checked In Yet'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {checkedIn && checkInTime
                    ? `Checked in at ${formatTime(checkInTime)}`
                    : 'Visit the gym and use your code — or self check-in below.'}
                </p>
              </div>
            </div>

            <Button
              className="mt-5 min-h-12 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700"
              onClick={() => void handleSelfCheckIn()}
              disabled={selfCheckIn.isPending || checkedIn || !gymId}
            >
              {checkedIn
                ? 'Already checked in'
                : selfCheckIn.isPending
                  ? 'Checking in…'
                  : 'Self check-in'}
            </Button>
            {status ? (
              <p className="mt-3 text-sm font-medium text-emerald-600 dark:text-emerald-400" role="status">
                {status}
              </p>
            ) : null}
            {error ? (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </GlassCard>

          <GlassCard className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Live Gym Crowd</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">Occupancy right now</p>
              </div>
              <span className={cn('text-sm font-semibold', crowdUi.tone)}>{crowdUi.label}</span>
            </div>

            {gymTodayQuery.isError || !gymId ? (
              <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-border/70 py-8 text-center">
                <Users className="size-8 text-muted-foreground/50" aria-hidden />
                <p className="mt-2 text-sm font-medium">Crowd information unavailable</p>
                <p className="mt-1 text-xs text-muted-foreground">Try again in a moment.</p>
              </div>
            ) : (
              <>
                <div className="mt-5 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-4xl font-semibold tracking-tight tabular-nums">{liveCount}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      live · {activeCount} active members
                    </p>
                  </div>
                  <Users className="size-8 text-emerald-600/60 dark:text-emerald-400/60" aria-hidden />
                </div>
                <div
                  className="mt-5"
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={5}
                  aria-valuenow={crowdLevel}
                  aria-label={`Crowd level ${crowdUi.label}`}
                >
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className={cn('h-full rounded-full bg-gradient-to-r', crowdUi.bar)}
                      initial={{ width: 0 }}
                      animate={{ width: `${crowdProgress}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] font-medium tracking-wide text-muted-foreground uppercase sm:text-[11px]">
                    {['Empty', 'Low', 'Moderate', 'Busy', 'Very Busy'].map((label) => (
                      <span
                        key={label}
                        className={cn(label === crowdUi.label && crowdUi.tone)}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">{crowdUi.tip}</p>
              </>
            )}
          </GlassCard>
        </div>
      </div>

      {/* Stats */}
      <section aria-label="Attendance statistics">
        <h2 className="mb-3 text-base font-semibold tracking-tight">Attendance Statistics</h2>
        <div className="grid gap-3 grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'This week', value: weekVisits, icon: ClipboardList },
            { label: 'This month', value: monthVisits, icon: CalendarIcon },
            { label: 'Current streak', value: currentStreak, icon: Flame },
            { label: 'Longest streak', value: bestStreak, icon: Trophy },
            { label: 'Total visits', value: totalVisits, icon: Award },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <GlassCard key={stat.label} className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground sm:text-sm">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                      {stat.value}
                    </p>
                  </div>
                  <span className="inline-flex size-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <Icon className="size-4" aria-hidden />
                  </span>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </section>

      {/* Heatmap + motivation */}
      <div className="grid gap-4 lg:grid-cols-5">
        <GlassCard className="p-5 sm:p-6 lg:col-span-3">
          <h2 className="text-base font-semibold tracking-tight">Attendance Calendar</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Last 30 days · green = attended</p>

          <div
            className="mt-5 grid grid-cols-10 gap-1.5 sm:grid-cols-[repeat(15,minmax(0,1fr))] sm:gap-2"
            role="list"
            aria-label="Attendance heatmap"
          >
            {heatmapDays.map((day) => (
              <button
                key={day.ymd}
                type="button"
                role="listitem"
                title={`${formatDateLabel(day.ymd)}${day.attended ? ' · attended' : ' · no visit'}`}
                aria-label={`${formatDateLabel(day.ymd)}${day.attended ? ', attended' : ', no visit'}`}
                aria-pressed={selectedDay === day.ymd}
                onClick={() => setSelectedDay(day.ymd === selectedDay ? null : day.ymd)}
                className={cn(
                  'aspect-square min-h-7 rounded-md transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none sm:min-h-8',
                  day.attended
                    ? 'bg-emerald-500/90 shadow-sm shadow-emerald-500/20'
                    : 'bg-muted hover:bg-muted/80',
                  selectedDay === day.ymd && 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-background',
                )}
              />
            ))}
          </div>

          {selectedDay ? (
            <div className="mt-4 rounded-2xl border border-border/70 bg-background/40 p-4 text-sm">
              <p className="font-semibold">{formatDateLabel(selectedDay)}</p>
              {selectedVisit ? (
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>Checked in at {formatTime(selectedVisit.checked_in_at)}</li>
                  <li className="capitalize">
                    Method: {selectedVisit.check_in_method.replace(/_/g, ' ')}
                  </li>
                  <li className="font-medium text-emerald-600 dark:text-emerald-400">Present</li>
                </ul>
              ) : (
                <p className="mt-2 text-muted-foreground">No check-in recorded this day.</p>
              )}
            </div>
          ) : null}
        </GlassCard>

        <GlassCard className="flex flex-col justify-between p-5 sm:p-6 lg:col-span-2">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Motivation</h2>
            <p className="mt-4 text-lg leading-snug font-medium tracking-tight">{motivation}</p>
          </div>
          <div className="mt-6">
            <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
              <span>Monthly goal</span>
              <span className="tabular-nums font-medium text-foreground">
                {monthVisits}/{monthGoal}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(100, Math.round((monthVisits / monthGoal) * 100))}%`,
                }}
                transition={{ duration: 0.7 }}
              />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Achievements */}
      <section aria-label="Achievements">
        <h2 className="mb-3 text-base font-semibold tracking-tight">Achievements</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {achievements.map((a) => {
            const Icon = a.icon;
            return (
              <GlassCard
                key={a.id}
                className={cn(
                  'p-4 transition-colors sm:p-5',
                  !a.earned && 'opacity-60 grayscale',
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      'inline-flex size-11 items-center justify-center rounded-2xl',
                      a.earned
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {a.earned ? (
                      <Icon className="size-5" aria-hidden />
                    ) : (
                      <Lock className="size-4" aria-hidden />
                    )}
                  </span>
                  <div>
                    <p className="font-semibold">{a.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{a.description}</p>
                    <p
                      className={cn(
                        'mt-2 text-xs font-semibold',
                        a.earned
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-muted-foreground',
                      )}
                    >
                      {a.earned ? 'Earned' : 'Locked'}
                    </p>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </section>

      {/* Recent visits timeline */}
      <section id="history" aria-label="Recent visits" className="scroll-mt-24">
        <h2 className="mb-3 text-base font-semibold tracking-tight">Recent Visits</h2>
        {historyQuery.isLoading ? (
          <div className="h-32 animate-pulse rounded-[20px] bg-muted" />
        ) : history.length === 0 ? (
          <GlassCard className="flex flex-col items-center px-6 py-14 text-center">
            <ClipboardList className="size-10 text-muted-foreground/40" aria-hidden />
            <p className="mt-4 text-base font-semibold">No attendance history yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Your visits will appear here after your first check-in. Show your code at reception
              to get started.
            </p>
          </GlassCard>
        ) : (
          <div className="relative space-y-3 before:absolute before:top-3 before:bottom-3 before:left-[1.35rem] before:w-px before:bg-border/80 sm:before:left-6">
            {history.slice(0, 20).map((row) => (
              <GlassCard key={row.id} className="relative ml-0 p-4 pl-12 sm:pl-14">
                <span className="absolute top-5 left-3.5 inline-flex size-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 sm:left-4 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" aria-hidden />
                </span>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{formatDateLabel(row.attendance_date)}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {formatTime(row.checked_in_at)} ·{' '}
                      <span className="capitalize">
                        {row.check_in_method.replace(/_/g, ' ')}
                      </span>
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Present
                  </span>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </section>

      {/* Quick actions */}
      <section aria-label="Quick actions">
        <h2 className="mb-3 text-base font-semibold tracking-tight">Quick Actions</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <a
            href="#history"
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'min-h-12 justify-start rounded-2xl',
            )}
          >
            <ClipboardList className="size-4" />
            View Attendance History
          </a>
          <Button
            type="button"
            variant="outline"
            className="min-h-12 justify-start rounded-2xl"
            onClick={() => setRulesOpen(true)}
          >
            <HelpCircle className="size-4" />
            Gym Rules
          </Button>
          <a
            href={`mailto:${gym?.contact_email || ''}?subject=${encodeURIComponent('Attendance issue')}`}
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'min-h-12 justify-start rounded-2xl',
            )}
          >
            <Mail className="size-4" />
            Report an Issue
          </a>
          {gym?.phone ? (
            <a
              href={`tel:${gym.phone}`}
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'min-h-12 justify-start rounded-2xl',
              )}
            >
              <Phone className="size-4" />
              Contact Reception
            </a>
          ) : (
            <Link
              href="/member"
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'min-h-12 justify-start rounded-2xl',
              )}
            >
              <Phone className="size-4" />
              Contact Reception
            </Link>
          )}
        </div>
      </section>

      {/* Sticky mobile self check-in when not checked in */}
      {!checkedIn && gymId ? (
        <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border/80 bg-background/90 p-3 backdrop-blur lg:hidden">
          <Button
            className="min-h-12 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700"
            onClick={() => void handleSelfCheckIn()}
            disabled={selfCheckIn.isPending}
          >
            {selfCheckIn.isPending ? 'Checking in…' : 'Self check-in'}
          </Button>
        </div>
      ) : null}

      {rulesOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/50"
            aria-label="Close"
            onClick={() => setRulesOpen(false)}
          />
          <GlassCard className="relative z-10 m-4 max-h-[80vh] w-full max-w-md overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold">Gym Rules</h2>
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                className="min-h-11 min-w-11"
                aria-label="Close"
                onClick={() => setRulesOpen(false)}
              >
                ×
              </Button>
            </div>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Show your daily attendance code at reception for desk check-in.</li>
              <li>Re-rack weights and wipe equipment after use.</li>
              <li>Keep phones on silent in training areas.</li>
              <li>Follow trainer and staff safety instructions.</li>
              <li>Membership must be active to check in.</li>
            </ul>
          </GlassCard>
        </div>
      ) : null}
    </motion.div>
  );
}

function CalendarIcon(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
      aria-hidden
    >
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
