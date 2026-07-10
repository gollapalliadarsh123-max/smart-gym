'use client';

import { useMemo, useState } from 'react';
import {
  addDaysToYmd,
  attendanceCodeSchema,
  calculateCrowdLevel,
  countLiveMembers,
  getTodayYmd,
} from '@smart-gym/shared';
import {
  useGymAttendanceHistory,
  useGymAttendanceToday,
  useGymMembers,
  useMarkAttendanceByCode,
  useProfilesMap,
} from '@smart-gym/supabase';
import { useOwnerContext } from '@/features/owner/components/owner-provider';
import { CrowdMeter } from '@/features/attendance/components/crowd-meter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';

function profileLabel(
  profile: { full_name?: string; first_name?: string; last_name?: string; email?: string } | undefined,
  userId: string,
) {
  if (!profile) return userId.slice(0, 8) + '…';
  if (profile.full_name?.trim()) return profile.full_name.trim();
  const name = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
  return name || profile.email || userId.slice(0, 8) + '…';
}

export function OwnerAttendancePanel() {
  const { client, gym } = useOwnerContext();
  const gymId = gym?.id;
  const today = getTodayYmd();
  const from30 = addDaysToYmd(today, -29);

  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchToday, setSearchToday] = useState('');
  const [searchHistory, setSearchHistory] = useState('');

  const todayQuery = useGymAttendanceToday(client, gymId, today);
  const historyQuery = useGymAttendanceHistory(client, gymId, from30, today);
  const membersQuery = useGymMembers(client, gymId, 'active');
  const mark = useMarkAttendanceByCode(client);

  const checkInPath = gymId ? `/check-in?gym=${gymId}` : '';

  const todayRows = todayQuery.data ?? [];
  const historyRows = historyQuery.data ?? [];
  const activeMembers = membersQuery.data ?? [];

  const profileIds = useMemo(() => {
    const ids = new Set<string>();
    (todayQuery.data ?? []).forEach((r) => ids.add(r.user_id));
    (historyQuery.data ?? []).forEach((r) => ids.add(r.user_id));
    return [...ids];
  }, [todayQuery.data, historyQuery.data]);

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

  const filteredToday = todayRows.filter((row) => {
    if (!searchToday.trim()) return true;
    const q = searchToday.trim().toLowerCase();
    const name = profileLabel(profiles[row.user_id], row.user_id).toLowerCase();
    return name.includes(q) || row.check_in_code.includes(q) || row.check_in_method.includes(q);
  });

  const filteredHistory = historyRows.filter((row) => {
    if (!searchHistory.trim()) return true;
    const q = searchHistory.trim().toLowerCase();
    const name = profileLabel(profiles[row.user_id], row.user_id).toLowerCase();
    return (
      name.includes(q) ||
      row.attendance_date.includes(q) ||
      row.check_in_code.includes(q) ||
      row.check_in_method.includes(q)
    );
  });

  async function handleMark(e: React.FormEvent) {
    e.preventDefault();
    if (!gymId) return;
    setMessage(null);
    setError(null);

    const parsed = attendanceCodeSchema.safeParse(code.trim());
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid 4-digit code.');
      return;
    }

    try {
      const result = await mark.mutateAsync({ gymId, code: parsed.data });
      setCode('');
      if (result.already_marked) {
        setMessage(`${result.member_name ?? 'Member'} was already checked in today.`);
      } else {
        setMessage(`Checked in ${result.member_name ?? 'member'}.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark attendance.');
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Attendance</h1>
        <p className="text-muted-foreground">
          Mark check-ins with a member&apos;s daily 4-digit code for {gym?.name}.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <form onSubmit={(e) => void handleMark(e)} className="space-y-4 rounded-xl border border-border/70 p-5">
          <Field>
            <FieldLabel htmlFor="attendanceCode">Member attendance code</FieldLabel>
            <Input
              id="attendanceCode"
              inputMode="numeric"
              maxLength={4}
              placeholder="1234"
              className="font-mono text-lg tracking-[0.35em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              autoComplete="off"
            />
            <FieldDescription>Ask the member for today&apos;s code from their app.</FieldDescription>
          </Field>
          <Button type="submit" disabled={mark.isPending || code.length !== 4}>
            {mark.isPending ? 'Checking in…' : 'Mark attendance'}
          </Button>
          {message ? (
            <p className="text-sm text-foreground" role="status">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </form>

        <div className="space-y-4">
          <CrowdMeter level={crowdLevel} liveCount={liveCount} activeCount={activeMembers.length} />
          <div className="rounded-xl border border-border/70 p-5">
            <p className="text-sm font-medium">QR / link self check-in</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Members with an active membership can open this link to check themselves in.
            </p>
            <Input className="mt-3 font-mono text-xs" readOnly value={checkInPath} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                if (!checkInPath) return;
                const absolute = `${window.location.origin}${checkInPath}`;
                void navigator.clipboard.writeText(absolute);
                setMessage('Self check-in link copied.');
              }}
            >
              Copy link
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Today ({todayRows.length})</TabsTrigger>
          <TabsTrigger value="history">Last 30 days ({historyRows.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4 space-y-3">
          <Input
            placeholder="Search today's attendance…"
            value={searchToday}
            onChange={(e) => setSearchToday(e.target.value)}
          />
          {todayQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : filteredToday.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-8 text-sm text-muted-foreground">
              No check-ins yet today.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Live</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredToday.map((row) => {
                    const live =
                      countLiveMembers([
                        {
                          user_id: row.user_id,
                          expires_at: row.expires_at,
                          check_in_timestamp: row.checked_in_at,
                        },
                      ]) > 0;
                    return (
                      <TableRow key={row.id}>
                        <TableCell>{profileLabel(profiles[row.user_id], row.user_id)}</TableCell>
                        <TableCell>{new Date(row.checked_in_at).toLocaleTimeString()}</TableCell>
                        <TableCell>{row.check_in_method}</TableCell>
                        <TableCell className="font-mono">{row.check_in_code || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={live ? 'default' : 'secondary'}>
                            {live ? 'In gym' : 'Ended'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-3">
          <Input
            placeholder="Search 30-day attendance…"
            value={searchHistory}
            onChange={(e) => setSearchHistory(e.target.value)}
          />
          {historyQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : filteredHistory.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-8 text-sm text-muted-foreground">
              No attendance in the last 30 days.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.attendance_date}</TableCell>
                      <TableCell>{profileLabel(profiles[row.user_id], row.user_id)}</TableCell>
                      <TableCell>{new Date(row.checked_in_at).toLocaleTimeString()}</TableCell>
                      <TableCell>{row.check_in_method}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
