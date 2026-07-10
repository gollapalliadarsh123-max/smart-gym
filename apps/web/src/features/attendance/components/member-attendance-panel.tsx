'use client';

import { useState } from 'react';
import {
  calculateCrowdLevel,
  countLiveMembers,
  getTodayYmd,
} from '@smart-gym/shared';
import {
  useDailyAttendanceCode,
  useGymAttendanceToday,
  useGymMembers,
  useMemberAttendanceHistory,
  useMemberAttendanceToday,
  useSelfCheckIn,
} from '@smart-gym/supabase';
import { useMemberContext } from '@/features/member/components/member-provider';
import { CrowdMeter } from '@/features/attendance/components/crowd-meter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function MemberAttendancePanel() {
  const { client, userId, gym, membership } = useMemberContext();
  const gymId = gym?.id ?? membership?.gym_id;
  const today = getTodayYmd();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const codeQuery = useDailyAttendanceCode(client, gymId, Boolean(gymId));
  const myTodayQuery = useMemberAttendanceToday(client, userId, today);
  const historyQuery = useMemberAttendanceHistory(client, userId, 30);
  const gymTodayQuery = useGymAttendanceToday(client, gymId, today);
  const activeMembersQuery = useGymMembers(client, gymId, 'active');
  const selfCheckIn = useSelfCheckIn(client);

  const checkedIn = Boolean(myTodayQuery.data);
  const liveCount = countLiveMembers(
    (gymTodayQuery.data ?? []).map((row) => ({
      user_id: row.user_id,
      expires_at: row.expires_at,
      check_in_timestamp: row.checked_in_at,
    })),
  );
  const crowdLevel = calculateCrowdLevel(liveCount, (activeMembersQuery.data ?? []).length);

  async function handleSelfCheckIn() {
    if (!gymId) return;
    setStatus(null);
    setError(null);
    try {
      const result = await selfCheckIn.mutateAsync(gymId);
      setStatus(result.already_marked ? 'You were already checked in today.' : 'Checked in successfully.');
      await myTodayQuery.refetch();
      await gymTodayQuery.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Self check-in failed.');
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Attendance</h1>
        <p className="text-muted-foreground">
          Show your code at the desk, or self check-in at {gym?.name ?? 'your gym'}.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border/70 p-6 text-center">
          <p className="text-sm text-muted-foreground">Today&apos;s attendance code</p>
          {codeQuery.isLoading ? (
            <p className="mt-6 text-sm text-muted-foreground">Generating…</p>
          ) : codeQuery.error ? (
            <p className="mt-6 text-sm text-destructive">
              {(codeQuery.error as Error).message}
            </p>
          ) : (
            <p className="mt-4 font-mono text-5xl font-semibold tracking-[0.35em]">
              {codeQuery.data}
            </p>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Valid for today only. Staff enters this code to mark you present.
          </p>
        </div>

        <div className="space-y-4">
          <CrowdMeter
            level={crowdLevel}
            liveCount={liveCount}
            activeCount={(activeMembersQuery.data ?? []).length}
          />
          <div className="rounded-xl border border-border/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">Check-in status</p>
                <p className="text-sm text-muted-foreground">
                  {checkedIn ? 'You are marked present today.' : 'Not checked in yet today.'}
                </p>
              </div>
              <Badge variant={checkedIn ? 'default' : 'secondary'}>
                {checkedIn ? 'Present' : 'Absent'}
              </Badge>
            </div>
            <Button
              className="mt-4 w-full"
              onClick={() => void handleSelfCheckIn()}
              disabled={selfCheckIn.isPending || checkedIn}
            >
              {checkedIn
                ? 'Already checked in'
                : selfCheckIn.isPending
                  ? 'Checking in…'
                  : 'Self check-in'}
            </Button>
            {status ? (
              <p className="mt-3 text-sm" role="status">
                {status}
              </p>
            ) : null}
            {error ? (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Your recent visits</h2>
        {historyQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (historyQuery.data ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-8 text-sm text-muted-foreground">
            No attendance history yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/70">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(historyQuery.data ?? []).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.attendance_date}</TableCell>
                    <TableCell>{new Date(row.checked_in_at).toLocaleTimeString()}</TableCell>
                    <TableCell>{row.check_in_method}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
