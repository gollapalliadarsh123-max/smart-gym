'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  calculateCrowdLevel,
  countLiveMembers,
  getMonthStartYmd,
  getTodayYmd,
} from '@smart-gym/shared';
import {
  getGymById,
  useActivePartnerGyms,
  useGymAttendanceToday,
  useGymMembers,
  useMemberPartnerVisits,
  usePartnerVisitAllowance,
} from '@smart-gym/supabase';
import { useMemberContext } from '@/features/member/components/member-provider';
import { SectionCard } from '@/components/layout/section-card';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { buttonVariants } from '@/components/ui/button';
import { StatusBadge, statusToneFromLabel } from '@/components/layout/status-badge';
import { cn } from '@/lib/utils';

function formatHours(open: string | null, close: string | null) {
  if (!open && !close) return 'Hours not set';
  return `${open?.slice(0, 5) ?? '—'} – ${close?.slice(0, 5) ?? '—'}`;
}

function formatDateTime(iso: string) {
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

export function MemberPartnerGymsPanel() {
  const { client, userId, gym } = useMemberContext();
  const homeGymId = gym?.id;
  const today = getTodayYmd();
  const monthStart = getMonthStartYmd();
  const partnersQuery = useActivePartnerGyms(client, homeGymId);
  const allowanceQuery = usePartnerVisitAllowance(client, userId);
  const historyQuery = useMemberPartnerVisits(client, userId, monthStart);

  const used = allowanceQuery.data?.visits_used ?? 0;
  const limit = allowanceQuery.data?.monthly_limit ?? 3;
  const remaining = allowanceQuery.data?.visits_remaining ?? Math.max(limit - used, 0);

  return (
    <PageContainer>
      <PageHeader
        title="Partner gyms"
        description="Visit partner locations using your monthly multi-gym allowance."
      />

      <SectionCard title="Multi-Gym Access" description="Shared across all partner gyms this month">
        <p className="text-sm font-medium">
          {used} of {limit} visits used this month
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {remaining} visit{remaining === 1 ? '' : 's'} remaining
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-emerald-600 transition-all"
            style={{ width: `${Math.min(100, (used / Math.max(limit, 1)) * 100)}%` }}
          />
        </div>
      </SectionCard>

      <SectionCard title="Available partners" description="Active partnerships from your home gym">
        {(partnersQuery.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No partner gyms yet. Your gym owner must approve a partnership first.
          </p>
        ) : (
          <ul className="space-y-4">
            {(partnersQuery.data ?? []).map(({ gym: partnerGym, partnership }) => (
              <PartnerGymRow
                key={partnerGym.id}
                client={client}
                gym={partnerGym}
                status={partnership.status}
                today={today}
              />
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="This month’s visits" description="Your partner check-in history">
        {(historyQuery.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No partner visits this month.</p>
        ) : (
          <ul className="space-y-3">
            {(historyQuery.data ?? []).map((visit) => (
              <PartnerVisitHistoryRow key={visit.id} client={client} visit={visit} />
            ))}
          </ul>
        )}
      </SectionCard>

      <Link href="/member" className={cn(buttonVariants({ variant: 'outline' }), 'inline-flex')}>
        Back to home
      </Link>
    </PageContainer>
  );
}

function PartnerGymRow({
  client,
  gym,
  status,
  today,
}: {
  client: ReturnType<typeof useMemberContext>['client'];
  gym: {
    id: string;
    name: string;
    location: string;
    opening_time: string | null;
    closing_time: string | null;
    logo_url?: string | null;
  };
  status: string;
  today: string;
}) {
  const todayQuery = useGymAttendanceToday(client, gym.id, today);
  const membersQuery = useGymMembers(client, gym.id, 'active');
  const liveCount = countLiveMembers(
    (todayQuery.data ?? []).map((row) => ({
      user_id: row.user_id,
      expires_at: row.expires_at,
      check_in_timestamp: row.checked_in_at,
    })),
  );
  const crowdLevel = calculateCrowdLevel(liveCount, (membersQuery.data ?? []).length);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gym.location || gym.name)}`;

  return (
    <li className="rounded-xl border border-border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          {gym.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={gym.logo_url} alt="" className="size-12 rounded-xl object-cover" />
          ) : (
            <span className="inline-flex size-12 items-center justify-center rounded-xl bg-muted text-xs font-semibold">
              {gym.name.slice(0, 2).toUpperCase()}
            </span>
          )}
          <div>
            <p className="font-medium">{gym.name}</p>
            <p className="text-sm text-muted-foreground">{gym.location || 'Location not set'}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatHours(gym.opening_time, gym.closing_time)} · Crowd level {crowdLevel}/5
            </p>
            <div className="mt-2">
              <StatusBadge tone={statusToneFromLabel(status)}>{status}</StatusBadge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'inline-flex')}
          >
            Get directions
          </a>
        </div>
      </div>
    </li>
  );
}

function PartnerVisitHistoryRow({
  client,
  visit,
}: {
  client: ReturnType<typeof useMemberContext>['client'];
  visit: {
    id: string;
    visited_gym_id: string;
    checked_in_at: string;
    check_in_method: string;
    status: string;
  };
}) {
  const gymQuery = useQuery({
    queryKey: ['visit-gym', visit.visited_gym_id],
    queryFn: () => getGymById(client, visit.visited_gym_id),
  });

  return (
    <li className="flex flex-col gap-1 rounded-lg border border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">{gymQuery.data?.name ?? 'Partner gym'}</p>
        <p className="text-xs text-muted-foreground">
          {formatDateTime(visit.checked_in_at)} · {visit.check_in_method}
        </p>
      </div>
      <StatusBadge tone={statusToneFromLabel(visit.status)}>{visit.status}</StatusBadge>
    </li>
  );
}
