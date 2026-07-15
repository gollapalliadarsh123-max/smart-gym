'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Search,
  Share2,
  UserRoundSearch,
  Users,
  X,
} from 'lucide-react';
import {
  attendanceCodeSchema,
  calculateCrowdLevel,
  countLiveMembers,
  getMonthStartYmd,
  getPlanLabel,
  getTodayYmd,
  getWeekStartYmd,
  getYesterdayYmd,
  isMembershipExpired,
  type CrowdLevel,
  type MembershipPlan,
} from '@smart-gym/shared';
import {
  useGymAttendanceHistory,
  useGymAttendanceToday,
  useGymMembers,
  useMarkAttendanceByCode,
  useProfilesMap,
  type Tables,
} from '@smart-gym/supabase';
import { useOwnerContext } from '@/features/owner/components/owner-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type AttendanceRow = Tables<'attendance'>;
type Membership = Tables<'gym_memberships'>;
type Profile = Tables<'profiles'>;

type HistoryFilter = 'today' | 'yesterday' | 'week' | 'month';

const CROWD_LABELS = ['Empty', 'Low', 'Medium', 'Busy', 'Very Busy'] as const;

function crowdLabel(level: CrowdLevel): (typeof CROWD_LABELS)[number] {
  if (level <= 0) return 'Empty';
  if (level === 1) return 'Low';
  if (level === 2) return 'Medium';
  if (level === 3 || level === 4) return 'Busy';
  return 'Very Busy';
}

function profileLabel(profile: Profile | undefined, userId: string) {
  if (!profile) return userId.slice(0, 8) + '…';
  if (profile.full_name?.trim()) return profile.full_name.trim();
  const name = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
  return name || profile.email || userId.slice(0, 8) + '…';
}

function initials(profile: Profile | undefined, userId: string) {
  const name = profileLabel(profile, userId).replace(/…$/, '');
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  return (parts[0]?.slice(0, 2) || userId.slice(0, 2)).toUpperCase();
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

function CardShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-[20px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] dark:border-border dark:bg-card dark:shadow-none',
        className,
      )}
    >
      {children}
    </div>
  );
}

function MemberAvatar({
  profile,
  userId,
  size = 'md',
}: {
  profile: Profile | undefined;
  userId: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClass =
    size === 'lg' ? 'size-14 text-base' : size === 'sm' ? 'size-9 text-xs' : 'size-10 text-sm';
  if (profile?.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatar_url}
        alt=""
        className={cn('shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-card', sizeClass)}
      />
    );
  }
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-800 ring-2 ring-white dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-card',
        sizeClass,
      )}
      aria-hidden
    >
      {initials(profile, userId)}
    </span>
  );
}

function StatusPill({ live }: { live: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        live
          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
          : 'bg-slate-100 text-slate-600 dark:bg-muted dark:text-muted-foreground',
      )}
    >
      {live ? 'In gym' : 'Checked out'}
    </span>
  );
}

function PlanPill({ plan }: { plan: MembershipPlan | null | undefined }) {
  if (!plan) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-muted dark:text-foreground">
      {getPlanLabel(plan)}
    </span>
  );
}

/** Four large OTP-style digit boxes with auto-advance and paste support. */
function OtpCodeInput({
  value,
  onChange,
  onComplete,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
}) {
  const digits = useMemo(() => {
    const chars = value.replace(/\D/g, '').slice(0, 4).split('');
    return [0, 1, 2, 3].map((i) => chars[i] ?? '');
  }, [value]);

  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function focusAt(index: number) {
    refs.current[index]?.focus();
  }

  function setDigits(next: string[]) {
    const code = next.join('').slice(0, 4);
    onChange(code);
    if (code.length === 4) onComplete?.(code);
  }

  function handleChange(index: number, raw: string) {
    const only = raw.replace(/\D/g, '');
    if (!only) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }
    if (only.length > 1) {
      const pasted = only.slice(0, 4).split('');
      const next = ['', '', '', ''];
      pasted.forEach((d, i) => {
        next[i] = d;
      });
      setDigits(next);
      focusAt(Math.min(pasted.length, 3));
      return;
    }
    const next = [...digits];
    next[index] = only;
    setDigits(next);
    if (index < 3) focusAt(index + 1);
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      e.preventDefault();
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
      focusAt(index - 1);
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      focusAt(index - 1);
    }
    if (e.key === 'ArrowRight' && index < 3) {
      e.preventDefault();
      focusAt(index + 1);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;
    const next = ['', '', '', ''];
    pasted.split('').forEach((d, i) => {
      next[i] = d;
    });
    setDigits(next);
    focusAt(Math.min(pasted.length, 3));
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={4}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of 4`}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={(e) => e.target.select()}
          className={cn(
            'size-14 rounded-2xl border border-slate-200 bg-slate-50 text-center font-mono text-2xl font-semibold text-slate-900 outline-none transition-shadow sm:size-16 sm:text-3xl',
            'focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-600/15',
            'dark:border-border dark:bg-muted dark:text-foreground dark:focus:bg-card',
            disabled && 'opacity-60',
          )}
        />
      ))}
    </div>
  );
}

export function OwnerAttendancePanel() {
  const { client, gym } = useOwnerContext();
  const gymId = gym?.id;
  const today = getTodayYmd();
  const yesterday = getYesterdayYmd();
  const weekStart = getWeekStartYmd();
  const monthStart = getMonthStartYmd();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    name: string;
    time: string;
    already: boolean;
  } | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<HistoryFilter>('today');
  const [copied, setCopied] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualSearch, setManualSearch] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualPendingId, setManualPendingId] = useState<string | null>(null);

  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittingRef = useRef(false);

  const todayQuery = useGymAttendanceToday(client, gymId, today);
  const historyQuery = useGymAttendanceHistory(client, gymId, monthStart, today);
  const membersQuery = useGymMembers(client, gymId, 'active');
  const allMembersQuery = useGymMembers(client, gymId);
  const mark = useMarkAttendanceByCode(client);

  const todayRows = todayQuery.data ?? [];
  const historyRows = historyQuery.data ?? [];
  const activeMembers = membersQuery.data ?? [];
  const allMembers = allMembersQuery.data ?? [];

  const membershipByUser = useMemo(() => {
    const map = new Map<string, Membership>();
    for (const m of allMembers) {
      const existing = map.get(m.user_id);
      if (!existing || (m.status === 'active' && existing.status !== 'active')) {
        map.set(m.user_id, m);
      }
    }
    for (const m of activeMembers) {
      map.set(m.user_id, m);
    }
    return map;
  }, [allMembers, activeMembers]);

  const profileIds = useMemo(() => {
    const ids = new Set<string>();
    todayRows.forEach((r) => ids.add(r.user_id));
    historyRows.forEach((r) => ids.add(r.user_id));
    activeMembers.forEach((m) => ids.add(m.user_id));
    return [...ids];
  }, [todayRows, historyRows, activeMembers]);

  const profilesQuery = useProfilesMap(client, profileIds);
  const profiles = profilesQuery.data ?? {};

  const liveCount = countLiveMembers(
    todayRows.map((row) => ({
      user_id: row.user_id,
      expires_at: row.expires_at,
      check_in_timestamp: row.checked_in_at,
    })),
  );
  const crowdLevel = calculateCrowdLevel(liveCount, activeMembers.length);
  const crowdStatus = crowdLabel(crowdLevel);
  const crowdProgress = Math.round((crowdLevel / 5) * 100);

  const checkInPath = gymId ? `/check-in?gym=${gymId}` : '';
  const checkInAbsolute =
    typeof window !== 'undefined' && checkInPath
      ? `${window.location.origin}${checkInPath}`
      : checkInPath;

  const filteredHistory = useMemo(() => {
    let rows: AttendanceRow[] = [];
    if (filter === 'today') rows = [...todayRows];
    else if (filter === 'yesterday') {
      rows = historyRows.filter((r) => r.attendance_date === yesterday);
    } else if (filter === 'week') {
      rows = historyRows.filter((r) => r.attendance_date >= weekStart);
    } else {
      rows = [...historyRows];
    }

    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((row) => {
        const name = profileLabel(profiles[row.user_id], row.user_id).toLowerCase();
        const plan = membershipByUser.get(row.user_id)?.plan ?? '';
        return (
          name.includes(q) ||
          row.attendance_date.includes(q) ||
          row.check_in_code.includes(q) ||
          row.check_in_method.toLowerCase().includes(q) ||
          String(plan).includes(q)
        );
      });
    }

    return rows.sort(
      (a, b) => new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime(),
    );
  }, [
    filter,
    todayRows,
    historyRows,
    yesterday,
    weekStart,
    search,
    profiles,
    membershipByUser,
  ]);

  const manualCandidates = useMemo(() => {
    const checkedIn = new Set(todayRows.map((r) => r.user_id));
    const q = manualSearch.trim().toLowerCase();
    return activeMembers
      .filter((m) => !checkedIn.has(m.user_id))
      .filter((m) => {
        if (!q) return true;
        const p = profiles[m.user_id];
        const hay = [profileLabel(p, m.user_id), p?.email, p?.phone]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) =>
        profileLabel(profiles[a.user_id], a.user_id).localeCompare(
          profileLabel(profiles[b.user_id], b.user_id),
        ),
      );
  }, [activeMembers, todayRows, manualSearch, profiles]);

  function showSuccess(name: string, already: boolean) {
    if (successTimer.current) clearTimeout(successTimer.current);
    setSuccess({
      name,
      time: new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
      already,
    });
    successTimer.current = setTimeout(() => setSuccess(null), 4500);
  }

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  const submitCode = useCallback(
    async (rawCode: string) => {
      if (!gymId || mark.isPending || submittingRef.current) return;
      setError(null);

      const parsed = attendanceCodeSchema.safeParse(rawCode.trim());
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? 'Enter a valid 4-digit code.');
        return;
      }

      submittingRef.current = true;
      try {
        const result = await mark.mutateAsync({ gymId, code: parsed.data });
        setCode('');
        showSuccess(result.member_name ?? 'Member', Boolean(result.already_marked));
        await todayQuery.refetch();
        await historyQuery.refetch();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not mark attendance.');
      } finally {
        submittingRef.current = false;
      }
    },
    [gymId, mark, todayQuery, historyQuery],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitCode(code);
  }

  async function copyLink() {
    if (!checkInAbsolute) return;
    try {
      await navigator.clipboard.writeText(checkInAbsolute);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy link.');
    }
  }

  async function shareLink() {
    if (!checkInAbsolute) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${gym?.name ?? 'Gym'} self check-in`,
          text: 'Scan or open this link to check in.',
          url: checkInAbsolute,
        });
      } else {
        await copyLink();
      }
    } catch {
      /* user cancelled share */
    }
  }

  async function manualCheckIn(member: Membership) {
    if (!gymId) return;
    setManualError(null);
    setManualPendingId(member.user_id);

    try {
      // Prefer existing daily code + validated RPC when available
      const { data: codeRow } = await client
        .from('daily_attendance_codes')
        .select('code')
        .eq('gym_id', gymId)
        .eq('user_id', member.user_id)
        .eq('code_date', today)
        .maybeSingle();

      if (codeRow?.code) {
        const result = await mark.mutateAsync({ gymId, code: codeRow.code });
        showSuccess(
          result.member_name ?? profileLabel(profiles[member.user_id], member.user_id),
          Boolean(result.already_marked),
        );
      } else {
        // Fallback: staff insert (same membership rules checked client-side)
        if (member.status !== 'active') {
          throw new Error('Member membership is not active');
        }
        if (member.ends_at && isMembershipExpired(member.ends_at, today)) {
          throw new Error('Member membership is not active');
        }

        const already = todayRows.some((r) => r.user_id === member.user_id);
        if (already) {
          showSuccess(profileLabel(profiles[member.user_id], member.user_id), true);
        } else {
          const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
          const { error: insertError } = await client.from('attendance').insert({
            user_id: member.user_id,
            gym_id: gymId,
            attendance_date: today,
            checked_in_at: new Date().toISOString(),
            expires_at: expiresAt,
            check_in_code: '',
            check_in_method: 'trainer',
          });
          if (insertError) throw new Error(insertError.message);
          showSuccess(profileLabel(profiles[member.user_id], member.user_id), false);
        }
      }

      setManualOpen(false);
      setManualSearch('');
      await todayQuery.refetch();
      await historyQuery.refetch();
    } catch (err) {
      setManualError(err instanceof Error ? err.message : 'Manual check-in failed.');
    } finally {
      setManualPendingId(null);
    }
  }

  const filters: { id: HistoryFilter; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
  ];

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 sm:space-y-8">
      {/* Header + summary */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-foreground">
            Attendance
          </h1>
          <p className="text-sm text-slate-500 dark:text-muted-foreground">
            Fast desk check-in for {gym?.name ?? 'your gym'} · {dateLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex min-h-11 items-center rounded-2xl bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            {todayRows.length} today
          </span>
          <span className="inline-flex min-h-11 items-center rounded-2xl bg-slate-100 px-4 text-sm font-semibold text-slate-700 dark:bg-muted dark:text-foreground">
            {liveCount} live now
          </span>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        {/* Primary: code entry */}
        <CardShell className="p-5 sm:p-6">
          <div className="mb-5 text-center sm:text-left">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Member code
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900 dark:text-foreground">
              Enter today’s 4-digit code
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">
              Digits advance automatically. Paste a full code if needed.
            </p>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
            <OtpCodeInput
              value={code}
              onChange={setCode}
              disabled={mark.isPending}
              onComplete={(full) => {
                void submitCode(full);
              }}
            />

            <Button
              type="submit"
              disabled={mark.isPending || code.length !== 4 || !gymId}
              className="min-h-14 w-full rounded-2xl bg-emerald-600 text-base font-semibold hover:bg-emerald-700"
            >
              <ClipboardCheck className="size-5" aria-hidden />
              {mark.isPending ? 'Checking in…' : 'Check In Member'}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="min-h-12 w-full rounded-2xl"
              onClick={() => {
                setManualOpen(true);
                setManualError(null);
              }}
            >
              <UserRoundSearch className="size-4" aria-hidden />
              Manual check-in (forgot code)
            </Button>
          </form>

          {error ? (
            <p className="mt-4 text-center text-sm text-destructive sm:text-left" role="alert">
              {error}
            </p>
          ) : null}

          {success ? (
            <div
              className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40"
              role="status"
            >
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                <CheckCircle2 className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                  {success.already ? 'Already checked in' : 'Check-in successful'}
                </p>
                <p className="mt-0.5 truncate text-sm text-emerald-800 dark:text-emerald-200">
                  {success.name} · {success.time}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-200"
                aria-label="Dismiss"
                onClick={() => setSuccess(null)}
              >
                <X className="size-4" />
              </button>
            </div>
          ) : null}
        </CardShell>

        <div className="space-y-4">
          {/* Live crowd */}
          <CardShell className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-foreground">
                  Live Crowd
                </h2>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-muted-foreground">
                  Floor occupancy right now
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                {crowdStatus}
              </span>
            </div>

            <div className="mt-5 flex items-end justify-between gap-3">
              <div>
                <p className="text-4xl font-semibold tracking-tight tabular-nums text-slate-900 dark:text-foreground">
                  {liveCount}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">
                  of {activeMembers.length} active members
                </p>
              </div>
              <Users className="size-8 text-emerald-600/70" aria-hidden />
            </div>

            <div
              className="mt-5"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={5}
              aria-valuenow={crowdLevel}
              aria-label={`Crowd ${crowdStatus}`}
            >
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-[width] duration-300"
                  style={{ width: `${crowdProgress}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between gap-1 text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:text-[11px]">
                {CROWD_LABELS.map((label) => (
                  <span
                    key={label}
                    className={cn(label === crowdStatus && 'text-emerald-700 dark:text-emerald-400')}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </CardShell>

          {/* QR / self check-in */}
          <CardShell className="p-5 sm:p-6">
            <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-foreground">
              Self check-in QR
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-muted-foreground">
              Members with an active membership can scan this link
            </p>
            <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="rounded-2xl border border-slate-100 bg-white p-3 dark:border-border dark:bg-background">
                {checkInAbsolute ? (
                  <QRCodeSVG value={checkInAbsolute} size={132} level="M" includeMargin={false} />
                ) : (
                  <div className="flex size-[132px] items-center justify-center text-xs text-slate-400">
                    No gym
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <Input
                  readOnly
                  value={checkInAbsolute || '—'}
                  className="min-h-11 rounded-2xl font-mono text-xs"
                  aria-label="Self check-in URL"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 flex-1 rounded-2xl"
                    disabled={!checkInAbsolute}
                    onClick={() => void copyLink()}
                  >
                    <Copy className="size-4" />
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <Button
                    type="button"
                    className="min-h-11 flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700"
                    disabled={!checkInAbsolute}
                    onClick={() => void shareLink()}
                  >
                    <Share2 className="size-4" />
                    Share
                  </Button>
                </div>
              </div>
            </div>
          </CardShell>
        </div>
      </div>

      {/* History */}
      <section className="space-y-4" aria-label="Attendance history">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-foreground">
              Attendance history
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-muted-foreground">
              Searchable check-ins for desk review
            </p>
          </div>
          <span className="text-sm tabular-nums text-slate-500">
            {filteredHistory.length} result{filteredHistory.length === 1 ? '' : 's'}
          </span>
        </div>

        <CardShell className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative block min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, method, code…"
                className="min-h-11 rounded-2xl border-slate-200 pl-10"
                aria-label="Search attendance"
              />
            </label>
            <div
              className="flex gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1 dark:bg-muted"
              role="tablist"
              aria-label="Date filter"
            >
              {filters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    'min-h-10 shrink-0 rounded-xl px-3.5 text-sm font-semibold transition-colors',
                    filter === f.id
                      ? 'bg-white text-emerald-800 shadow-sm dark:bg-background dark:text-emerald-300'
                      : 'text-slate-500 hover:text-slate-800 dark:text-muted-foreground',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </CardShell>

        {todayQuery.isLoading || historyQuery.isLoading ? (
          <div className="h-40 animate-pulse rounded-[20px] bg-slate-100 dark:bg-muted" />
        ) : filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-slate-200 bg-slate-50/60 px-6 py-14 text-center dark:border-border dark:bg-muted/20">
            <ClipboardCheck className="size-8 text-slate-300" aria-hidden />
            <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-foreground">
              No check-ins in this range
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Enter a member code above or try another date filter.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <CardShell className="hidden overflow-hidden lg:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:border-border dark:bg-muted/40">
                      <th className="px-5 py-3.5">Member</th>
                      <th className="px-3 py-3.5">Check-in</th>
                      <th className="px-3 py-3.5">Membership</th>
                      <th className="px-3 py-3.5">Method</th>
                      <th className="px-5 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((row) => {
                      const profile = profiles[row.user_id];
                      const membership = membershipByUser.get(row.user_id);
                      const live =
                        row.attendance_date === today &&
                        countLiveMembers([
                          {
                            user_id: row.user_id,
                            expires_at: row.expires_at,
                            check_in_timestamp: row.checked_in_at,
                          },
                        ]) > 0;
                      return (
                        <tr
                          key={row.id}
                          className="border-b border-slate-100 last:border-0 hover:bg-emerald-50/40 dark:border-border dark:hover:bg-emerald-950/20"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <MemberAvatar profile={profile} userId={row.user_id} size="sm" />
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-900 dark:text-foreground">
                                  {profileLabel(profile, row.user_id)}
                                </p>
                                <p className="truncate text-xs text-slate-400">{profile?.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3.5 text-slate-700 dark:text-foreground">
                            {filter === 'today'
                              ? formatTime(row.checked_in_at)
                              : formatDateTime(row.checked_in_at)}
                          </td>
                          <td className="px-3 py-3.5">
                            <PlanPill plan={membership?.plan} />
                          </td>
                          <td className="px-3 py-3.5 capitalize text-slate-600 dark:text-muted-foreground">
                            {row.check_in_method.replace(/_/g, ' ')}
                          </td>
                          <td className="px-5 py-3.5">
                            <StatusPill live={live} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardShell>

            {/* Mobile cards */}
            <div className="grid gap-3 lg:hidden">
              {filteredHistory.map((row) => {
                const profile = profiles[row.user_id];
                const membership = membershipByUser.get(row.user_id);
                const live =
                  row.attendance_date === today &&
                  countLiveMembers([
                    {
                      user_id: row.user_id,
                      expires_at: row.expires_at,
                      check_in_timestamp: row.checked_in_at,
                    },
                  ]) > 0;
                return (
                  <CardShell key={row.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <MemberAvatar profile={profile} userId={row.user_id} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900 dark:text-foreground">
                            {profileLabel(profile, row.user_id)}
                          </p>
                          <StatusPill live={live} />
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          {filter === 'today'
                            ? formatTime(row.checked_in_at)
                            : formatDateTime(row.checked_in_at)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <PlanPill plan={membership?.plan} />
                          <span className="text-xs capitalize text-slate-400">
                            {row.check_in_method.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardShell>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Manual check-in drawer */}
      {manualOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/40"
            aria-label="Close"
            onClick={() => setManualOpen(false)}
          />
          <aside
            className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl dark:bg-card"
            role="dialog"
            aria-modal="true"
            aria-label="Manual check-in"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-border">
              <div>
                <h2 className="text-base font-semibold">Manual check-in</h2>
                <p className="text-xs text-slate-500">For members who forgot their code</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                className="min-h-11 min-w-11"
                aria-label="Close"
                onClick={() => setManualOpen(false)}
              >
                <X className="size-5" />
              </Button>
            </div>
            <div className="border-b border-slate-100 p-4 dark:border-border">
              <label className="relative block">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <Input
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  placeholder="Search active members…"
                  className="min-h-11 rounded-2xl pl-10"
                  autoFocus
                />
              </label>
              {manualError ? (
                <p className="mt-2 text-sm text-destructive" role="alert">
                  {manualError}
                </p>
              ) : null}
            </div>
            <ul className="flex-1 overflow-y-auto p-3">
              {manualCandidates.length === 0 ? (
                <li className="px-3 py-10 text-center text-sm text-slate-500">
                  No active members left to check in.
                </li>
              ) : (
                manualCandidates.map((m) => {
                  const profile = profiles[m.user_id];
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        disabled={manualPendingId === m.user_id || mark.isPending}
                        onClick={() => void manualCheckIn(m)}
                        className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      >
                        <MemberAvatar profile={profile} userId={m.user_id} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-slate-900 dark:text-foreground">
                            {profileLabel(profile, m.user_id)}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {profile?.email}
                          </span>
                        </span>
                        <PlanPill plan={m.plan} />
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
