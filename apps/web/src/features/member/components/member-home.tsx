'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  calculateCrowdLevel,
  computeMealLogStreak,
  countLiveMembers,
  getMembershipExpiryLine,
  getTodayYmd,
  MEMBERSHIP_PLAN_LABELS,
  type MembershipPlan,
} from '@smart-gym/shared';
import {
  useDailyAttendanceCode,
  useDietLog,
  useDietLogDates,
  useGymAttendanceToday,
  useGymMembers,
  useMemberPayments,
} from '@smart-gym/supabase';
import { useMemberContext } from '@/features/member/components/member-provider';
import { CrowdMeter } from '@/features/attendance/components/crowd-meter';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function InfoCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="sg-info-card">
      <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight">{value}</h2>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function planLabel(plan: string | null | undefined) {
  if (!plan) return '—';
  if (plan in MEMBERSHIP_PLAN_LABELS) {
    return MEMBERSHIP_PLAN_LABELS[plan as MembershipPlan];
  }
  return plan.replace(/_/g, ' ');
}

export function MemberHome() {
  const { client, userId, profile, gym, membership } = useMemberContext();
  const gymId = gym?.id ?? membership?.gym_id;
  const today = getTodayYmd();

  const codeQuery = useDailyAttendanceCode(client, gymId, Boolean(gymId));
  const dietQuery = useDietLog(client, userId, today);
  const dietDatesQuery = useDietLogDates(client, userId);
  const paymentsQuery = useMemberPayments(client, userId);
  const gymTodayQuery = useGymAttendanceToday(client, gymId, today);
  const activeMembersQuery = useGymMembers(client, gymId, 'active');

  const streakQuery = useQuery({
    queryKey: ['user-streak', userId ?? ''],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await client
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: Boolean(userId),
  });

  const fitnessScore = Math.round(
    Number(dietQuery.data?.fitness_score ?? dietQuery.data?.diet_score ?? 0),
  );
  const foods = (dietQuery.data?.foods as unknown[]) ?? [];
  const totals = (dietQuery.data?.totals ?? {}) as { waterLiters?: number };
  const hasEntriesToday = foods.length > 0 || Number(totals.waterLiters ?? 0) > 0;
  const streakCurrent = computeMealLogStreak(
    new Set(dietDatesQuery.data ?? []),
    today,
    hasEntriesToday,
  );
  const streakBest = Math.max(streakQuery.data?.best_meal_log_streak ?? 0, streakCurrent);
  const latestPayment = (paymentsQuery.data ?? [])[0];
  const paymentStatus = latestPayment?.status
    ? latestPayment.status.charAt(0).toUpperCase() + latestPayment.status.slice(1)
    : membership?.status === 'active'
      ? 'Active'
      : '—';
  const membershipStatus =
    membership?.status === 'active'
      ? 'Active'
      : membership?.status
        ? membership.status.charAt(0).toUpperCase() + membership.status.slice(1)
        : '—';

  const liveCount = countLiveMembers(
    (gymTodayQuery.data ?? []).map((row) => ({
      user_id: row.user_id,
      expires_at: row.expires_at,
      check_in_timestamp: row.checked_in_at,
    })),
  );
  const crowdLevel = calculateCrowdLevel(liveCount, (activeMembersQuery.data ?? []).length);

  return (
    <div className="space-y-6">
      <div className="sg-panel">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-extrabold">What should I do next?</h3>
          <span className="sg-tag">Quick start</span>
        </div>
        <p className="text-sm text-muted-foreground">
          1) Mark attendance with today&apos;s code. 2) Log your meals in Diet. 3) Check your
          position on the Leaderboard.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/member/attendance" className={cn(buttonVariants({ variant: 'outline' }))}>
            Go to Attendance
          </Link>
          <Link href="/member/diet" className={cn(buttonVariants({ variant: 'outline' }))}>
            Go to Diet
          </Link>
          <Link href="/member/league" className={cn(buttonVariants())}>
            Open Leaderboard
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <InfoCard
            label="Membership Status"
            value={membershipStatus}
            hint={
              membership?.ends_at ? getMembershipExpiryLine(membership.ends_at) : undefined
            }
          />
          <InfoCard label="Payment Status" value={paymentStatus} />
          <InfoCard label="Plan" value={planLabel(membership?.plan)} />
          <InfoCard
            label="Your gym"
            value={gym?.name ?? '—'}
            hint={gym?.code ? `Code ${gym.code}` : undefined}
          />
        </div>

        <div className="sg-panel flex shrink-0 flex-col items-center justify-center px-6 py-5 lg:w-[160px]">
          <span className="mb-3 text-xs font-bold tracking-wide text-muted-foreground uppercase">
            Fitness Score
          </span>
          <div
            className="sg-fitness-ring"
            style={{ ['--score-deg' as string]: `${Math.min(100, fitnessScore) * 3.6}deg` }}
          >
            <div className="sg-fitness-core">{fitnessScore}</div>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Hi{profile?.first_name ? `, ${profile.first_name}` : ''}
          </p>
        </div>
      </div>

      <div className="sg-panel">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-extrabold">Diet streak</h3>
          <span className="sg-tag">
            {streakCurrent > 0 ? `${streakCurrent} day streak` : 'Start today'}
          </span>
        </div>
        <p className="text-2xl font-extrabold">
          {streakCurrent} day{streakCurrent === 1 ? '' : 's'} in a row
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Best: {streakBest > 0 ? `${streakBest} days` : '—'}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Log meals every day to build a streak.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="sg-panel">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-extrabold">Today&apos;s Attendance Code</h3>
            <span className="sg-tag">Daily Code</span>
          </div>
          <div className="sg-code-box">
            <div className="sg-code-value">
              {codeQuery.isLoading ? '····' : codeQuery.data || '————'}
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {codeQuery.data
              ? 'Show this code at the desk to mark attendance.'
              : 'Loading attendance code…'}
          </p>
        </div>

        <div className="sg-panel">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-extrabold">Current Crowd</h3>
            <span className="sg-tag">Live</span>
          </div>
          <CrowdMeter
            compact
            level={crowdLevel}
            liveCount={liveCount}
            activeCount={(activeMembersQuery.data ?? []).length}
          />
        </div>
      </div>
    </div>
  );
}
