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
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/layout/section-card';
import { StatCard } from '@/components/layout/stat-card';
import { StatusBadge, statusToneFromLabel } from '@/components/layout/status-badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function planLabel(plan: string | null | undefined) {
  if (!plan) return '—';
  if (plan in MEMBERSHIP_PLAN_LABELS) return MEMBERSHIP_PLAN_LABELS[plan as MembershipPlan];
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
    ? latestPayment.status.replace(/_/g, ' ')
    : membership?.status === 'active'
      ? 'active'
      : '—';
  const membershipStatus = membership?.status ?? '—';

  const liveCount = countLiveMembers(
    (gymTodayQuery.data ?? []).map((row) => ({
      user_id: row.user_id,
      expires_at: row.expires_at,
      check_in_timestamp: row.checked_in_at,
    })),
  );
  const crowdLevel = calculateCrowdLevel(liveCount, (activeMembersQuery.data ?? []).length);

  return (
    <PageContainer>
      <PageHeader
        title={`Hi${profile?.first_name ? `, ${profile.first_name}` : ''}`}
        description={`${gym?.name ?? 'Your gym'}${membership?.ends_at ? ` · ${getMembershipExpiryLine(membership.ends_at)}` : ''}`}
        actions={
          <>
            <Link href="/member/attendance" className={cn(buttonVariants({ size: 'lg' }), 'min-h-11')}>
              Attendance
            </Link>
            <Link
              href="/member/diet"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'min-h-11')}
            >
              Log diet
            </Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Membership"
          value={
            <StatusBadge tone={statusToneFromLabel(String(membershipStatus))}>
              {String(membershipStatus)}
            </StatusBadge>
          }
          hint={membership?.ends_at ? getMembershipExpiryLine(membership.ends_at) : undefined}
        />
        <StatCard
          label="Payment"
          value={
            <StatusBadge tone={statusToneFromLabel(paymentStatus)}>{paymentStatus}</StatusBadge>
          }
        />
        <StatCard label="Plan" value={planLabel(membership?.plan)} />
        <StatCard label="Fitness score" value={fitnessScore} hint={`Streak ${streakCurrent} · best ${streakBest}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Today’s attendance code" description="Show this at the desk">
          <p className="rounded-lg border border-border bg-muted/40 py-6 text-center font-mono text-3xl font-semibold tracking-[0.35em] text-primary sm:text-4xl">
            {codeQuery.isLoading ? '····' : codeQuery.data || '————'}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {codeQuery.data
              ? 'Valid for today only.'
              : 'Code will appear when your gym is available.'}
          </p>
        </SectionCard>

        <SectionCard title="Gym crowd" description={`${gym?.name ?? 'Gym'} right now`}>
          <CrowdMeter
            compact
            level={crowdLevel}
            liveCount={liveCount}
            activeCount={(activeMembersQuery.data ?? []).length}
          />
        </SectionCard>
      </div>

      <SectionCard title="Quick links">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: '/member/payments', label: 'Payments' },
            { href: '/member/league', label: 'League' },
            { href: '/member/friends', label: 'Friends' },
            { href: '/member/notifications', label: 'Alerts' },
            { href: '/member/settings', label: 'Profile settings' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'min-h-11 justify-start')}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </SectionCard>
    </PageContainer>
  );
}
