'use client';

import { useMemo, useState } from 'react';
import {
  getLeagueSeasonId,
  getLeagueSeasonLabel,
  getLeagueTierLabel,
  getLeagueTierThresholds,
} from '@smart-gym/shared';
import {
  useLeagueLeaderboard,
  useLeagueSeason,
  useProfilesMap,
  useSendFriendRequest,
} from '@smart-gym/supabase';
import { useMemberContext } from '@/features/member/components/member-provider';
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

function displayName(
  profile: { full_name?: string; first_name?: string; last_name?: string; email?: string } | undefined,
  userId: string,
) {
  if (!profile) return userId.slice(0, 8) + '…';
  if (profile.full_name?.trim()) return profile.full_name.trim();
  const name = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
  return name || profile.email || userId.slice(0, 8) + '…';
}

export function MemberLeaguePanel() {
  const { client, userId } = useMemberContext();
  const seasonId = getLeagueSeasonId();
  const [search, setSearch] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const mySeasonQuery = useLeagueSeason(client, userId, seasonId);
  const boardQuery = useLeagueLeaderboard(client, seasonId, 50);
  const sendFriend = useSendFriendRequest(client);

  const rows = useMemo(() => boardQuery.data ?? [], [boardQuery.data]);
  const profileIds = useMemo(() => rows.map((r) => r.user_id), [rows]);
  const profilesQuery = useProfilesMap(client, profileIds);
  const profiles = profilesQuery.data ?? {};

  const myPoints = mySeasonQuery.data?.total_points ?? 0;
  const myRank =
    rows.findIndex((r) => r.user_id === userId) >= 0
      ? rows.findIndex((r) => r.user_id === userId) + 1
      : null;
  const thresholds = getLeagueTierThresholds(seasonId);

  const filtered = rows.filter((row) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    const name = displayName(profiles[row.user_id], row.user_id).toLowerCase();
    const email = profiles[row.user_id]?.email?.toLowerCase() ?? '';
    return name.includes(q) || email.includes(q);
  });

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

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">League</h1>
        <p className="text-muted-foreground">{getLeagueSeasonLabel(seasonId)}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border/70 bg-card/40 p-5">
          <p className="text-sm text-muted-foreground">Your points</p>
          <p className="mt-1 text-3xl font-semibold">{myPoints}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-card/40 p-5">
          <p className="text-sm text-muted-foreground">Your tier</p>
          <p className="mt-1 text-3xl font-semibold">
            {getLeagueTierLabel(myPoints, seasonId)}
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-card/40 p-5">
          <p className="text-sm text-muted-foreground">Your rank</p>
          <p className="mt-1 text-3xl font-semibold">{myRank ?? '—'}</p>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
        Tier thresholds this season: Silver {thresholds.silver} · Gold {thresholds.gold} · Platinum{' '}
        {thresholds.platinum} · Diamond {thresholds.diamond} · Crown {thresholds.crown} · Conqueror{' '}
        {thresholds.conqueror}
      </div>

      <Input
        placeholder="Search leaderboard…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {actionMessage ? (
        <p className="text-sm" role="status">
          {actionMessage}
        </p>
      ) : null}
      {actionError ? (
        <p className="text-sm text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      {boardQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading leaderboard…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-8 text-sm text-muted-foreground">
          No league scores yet this season. Log diet days to earn points.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/70">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Points</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => {
                const rank = rows.findIndex((r) => r.user_id === row.user_id) + 1;
                const isYou = row.user_id === userId;
                return (
                  <TableRow key={row.id} className={isYou ? 'bg-muted/40' : undefined}>
                    <TableCell>{rank}</TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {displayName(profiles[row.user_id], row.user_id)}
                        {isYou ? (
                          <Badge className="ml-2" variant="secondary">
                            You
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{getLeagueTierLabel(row.total_points, seasonId)}</TableCell>
                    <TableCell className="text-right font-medium">{row.total_points}</TableCell>
                    <TableCell className="text-right">
                      {!isYou ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={sendFriend.isPending}
                          onClick={() => void addFriend(row.user_id)}
                        >
                          Add friend
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
