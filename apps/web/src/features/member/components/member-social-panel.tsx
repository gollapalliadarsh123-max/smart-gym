'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Flame,
  ImagePlus,
  Medal,
  MessageCircle,
  Plus,
  Search,
  Send,
  Share2,
  Smile,
  Swords,
  Trophy,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  getLeagueSeasonId,
  getLeagueTierName,
  getTodayYmd,
  LEAGUE_TIER_LABELS,
  type LeagueTier,
} from '@smart-gym/shared';
import {
  useChatMessages,
  useDietLog,
  useFriendRequests,
  useFriendships,
  useGymMembers,
  useLeagueLeaderboard,
  useLeagueSeason,
  useMarkMessagesRead,
  useProfilesMap,
  useRespondToFriendRequest,
  useSendChatMessage,
  useSendFriendRequest,
  type Tables,
} from '@smart-gym/supabase';
import { useMemberContext } from '@/features/member/components/member-provider';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Profile = Tables<'profiles'>;
type ChatMessage = Tables<'chat_messages'>;
type MobilePane = 'friends' | 'chat' | 'profile';

const EMOJIS = ['😀', '😂', '🔥', '💪', '👏', '❤️', '🙌', '🏋️', '💧', '🍗', '🏆', '⚡', '✅', '🎯'];
const REACTIONS = ['❤️', '💪', '🔥', '👏'] as const;

const TIER_COLORS: Record<LeagueTier, string> = {
  bronze: 'from-amber-700 to-orange-800',
  silver: 'from-slate-400 to-slate-600',
  gold: 'from-amber-400 to-yellow-600',
  platinum: 'from-cyan-300 to-slate-500',
  diamond: 'from-sky-400 to-indigo-600',
  crown: 'from-fuchsia-400 to-violet-700',
  conqueror: 'from-rose-500 to-red-800',
};

const CHALLENGE_TEMPLATES = [
  {
    id: 'workout7',
    title: '7-Day Workout Challenge',
    body: '🏋️ Challenge: 7-Day Workout — let’s both train 7 days this week. Who shows up?',
  },
  {
    id: 'water',
    title: 'Drink Water Challenge',
    body: '💧 Challenge: Drink Water — hit 3L daily for 5 days. Game on!',
  },
  {
    id: 'protein',
    title: 'Protein Goal Challenge',
    body: '🍗 Challenge: Protein Goal — hit your protein target 5 days. Let’s go!',
  },
  {
    id: 'cardio',
    title: 'Cardio Challenge',
                body: '🏃 Challenge: Cardio — log cardio sessions this week and compare notes.',
  },
  {
    id: 'attendance',
    title: 'Attendance Challenge',
    body: '📅 Challenge: Attendance — check in at the gym 5 days this week!',
  },
] as const;

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
  profile:
    | {
        full_name?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        email?: string | null;
      }
    | undefined,
  userId: string,
) {
  if (!profile) return `${userId.slice(0, 8)}…`;
  if (profile.full_name?.trim()) return profile.full_name.trim();
  const name = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
  return name || profile.email || `${userId.slice(0, 8)}…`;
}

function usernameOf(profile: Profile | undefined, userId: string) {
  const email = profile?.email?.split('@')[0];
  if (email) return email;
  const first = profile?.first_name?.trim().toLowerCase();
  if (first) return first;
  return userId.slice(0, 8);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

function tierIndex(tier: LeagueTier) {
  const order: LeagueTier[] = [
    'bronze',
    'silver',
    'gold',
    'platinum',
    'diamond',
    'crown',
    'conqueror',
  ];
  return order.indexOf(tier);
}

function Avatar({
  profile,
  userId,
  size = 'md',
  online,
}: {
  profile?: Profile;
  userId: string;
  size?: 'sm' | 'md' | 'lg';
  online?: boolean;
}) {
  const name = displayName(profile, userId);
  const sizeClass = size === 'lg' ? 'size-16 text-lg' : size === 'sm' ? 'size-9 text-xs' : 'size-11 text-sm';
  return (
    <div className={cn('relative shrink-0', sizeClass)}>
      <div className="size-full overflow-hidden rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-700/40 ring-2 ring-emerald-500/20 ring-offset-2 ring-offset-background">
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center font-semibold">
            {initials(name)}
          </span>
        )}
      </div>
      {online != null ? (
        <span
          className={cn(
            'absolute right-0 bottom-0 size-3 rounded-full border-2 border-background',
            online ? 'bg-emerald-500' : 'bg-muted-foreground/40',
          )}
          aria-hidden
        >
          {online ? (
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70" />
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

function TierBadge({ points, seasonId }: { points: number; seasonId: string }) {
  const tier = getLeagueTierName(points, seasonId);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-gradient-to-r px-2 py-0.5 text-[11px] font-semibold text-white',
        TIER_COLORS[tier],
      )}
    >
      <Medal className="size-3" aria-hidden />
      {LEAGUE_TIER_LABELS[tier]}
    </span>
  );
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

function looksLikeEmail(value: string) {
  return value.includes('@') && value.includes('.');
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatDayLabel(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function messageKind(body: string): 'text' | 'share' | 'challenge' {
  if (/challenge:/i.test(body) || body.includes('Challenge:')) return 'challenge';
  if (
    body.startsWith('🏆') ||
    body.startsWith('🔥') ||
    body.startsWith('🍗') ||
    body.startsWith('💧') ||
    body.startsWith('🏋️') ||
    body.startsWith('📷') ||
    body.startsWith('🥗') ||
    body.startsWith('🏅')
  ) {
    return 'share';
  }
  return 'text';
}

function loadReactions(key: string): Record<string, string[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function MemberSocialPanel() {
  const { client, userId, profile, gym, membership } = useMemberContext();
  const seasonId = getLeagueSeasonId();
  const today = getTodayYmd();
  const gymId = gym?.id ?? membership?.gym_id ?? null;

  const [friendFilter, setFriendFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'name' | 'username' | 'gym' | 'email'>('name');
  const [addOpen, setAddOpen] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<MobilePane>('friends');
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, string[]>>({});
  const [typingLocal, setTypingLocal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);

  const requestsQuery = useFriendRequests(client, userId);
  const friendshipsQuery = useFriendships(client, userId);
  const sendRequest = useSendFriendRequest(client);
  const respond = useRespondToFriendRequest(client);
  const sendMessage = useSendChatMessage(client);
  const markRead = useMarkMessagesRead(client);
  const gymMembersQuery = useGymMembers(client, gymId, 'active');
  const boardQuery = useLeagueLeaderboard(client, seasonId, 100);
  const myDiet = useDietLog(client, userId, today);
  const myLeague = useLeagueSeason(client, userId, seasonId);

  const friendIds = useMemo(
    () => friendshipsQuery.data?.friendIds ?? [],
    [friendshipsQuery.data?.friendIds],
  );
  const incoming = (requestsQuery.data ?? []).filter((r) => r.to_user_id === userId);
  const outgoing = (requestsQuery.data ?? []).filter((r) => r.from_user_id === userId);

  const activeFriendId =
    selectedFriendId && friendIds.includes(selectedFriendId)
      ? selectedFriendId
      : friendIds[0] ?? null;

  const viewProfileId = profileUserId ?? activeFriendId;

  const gymMemberIds = useMemo(
    () => (gymMembersQuery.data ?? []).map((m) => m.user_id).filter((id) => id !== userId),
    [gymMembersQuery.data, userId],
  );

  const profileIds = useMemo(() => {
    const ids = new Set<string>([...friendIds, ...gymMemberIds]);
    (requestsQuery.data ?? []).forEach((r) => {
      ids.add(r.from_user_id);
      ids.add(r.to_user_id);
    });
    if (activeFriendId) ids.add(activeFriendId);
    if (viewProfileId) ids.add(viewProfileId);
    return [...ids];
  }, [friendIds, gymMemberIds, requestsQuery.data, activeFriendId, viewProfileId]);

  const profilesQuery = useProfilesMap(client, profileIds);
  const profiles = profilesQuery.data ?? {};

  const chatQuery = useChatMessages(client, userId, activeFriendId);
  const friendLeague = useLeagueSeason(client, viewProfileId, seasonId);

  const pointsByUser = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of boardQuery.data ?? []) {
      map.set(row.user_id, row.total_points);
    }
    if (myLeague.data) map.set(myLeague.data.user_id, myLeague.data.total_points);
    if (friendLeague.data) map.set(friendLeague.data.user_id, friendLeague.data.total_points);
    return map;
  }, [boardQuery.data, myLeague.data, friendLeague.data]);

  const membershipByUser = useMemo(() => {
    const map = new Map<string, Tables<'gym_memberships'>>();
    for (const m of gymMembersQuery.data ?? []) map.set(m.user_id, m);
    return map;
  }, [gymMembersQuery.data]);

  const rankByUser = useMemo(() => {
    const map = new Map<string, number>();
    (boardQuery.data ?? []).forEach((row, i) => map.set(row.user_id, i + 1));
    return map;
  }, [boardQuery.data]);

  const isOnline = useCallback(
    (id: string) => {
      const season = (boardQuery.data ?? []).find((r) => r.user_id === id);
      const days = parseDayPoints(season?.day_points);
      if (days[today] && days[today]! > 0) return true;
      const msgs = chatQuery.data ?? [];
      if (id === activeFriendId) {
        const lastFromThem = [...msgs].reverse().find((m) => m.sender_id === id);
        if (lastFromThem) {
          const age = Date.now() - new Date(lastFromThem.created_at).getTime();
          if (age < 1000 * 60 * 60 * 12) return true;
        }
      }
      return false;
    },
    [boardQuery.data, today, chatQuery.data, activeFriendId],
  );

  const onlineCount = useMemo(
    () => friendIds.filter((id) => isOnline(id)).length,
    [friendIds, isOnline],
  );

  const filteredFriends = useMemo(() => {
    const q = friendFilter.trim().toLowerCase();
    if (!q) return friendIds;
    return friendIds.filter((id) => {
      const p = profiles[id];
      const name = displayName(p, id).toLowerCase();
      const email = p?.email?.toLowerCase() ?? '';
      const uname = usernameOf(p, id).toLowerCase();
      return name.includes(q) || email.includes(q) || uname.includes(q);
    });
  }, [friendFilter, friendIds, profiles]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [] as string[];

    if (searchMode === 'email' || looksLikeEmail(q)) {
      return gymMemberIds.filter((id) => profiles[id]?.email?.toLowerCase().includes(q));
    }

    if (searchMode === 'gym') {
      const code = (gym?.code ?? '').toLowerCase();
      if (code && (q === code || code.includes(q) || q.includes(code))) {
        return gymMemberIds.filter((id) => !friendIds.includes(id));
      }
      return [];
    }

    return gymMemberIds.filter((id) => {
      if (friendIds.includes(id)) return false;
      const p = profiles[id];
      const name = displayName(p, id).toLowerCase();
      const uname = usernameOf(p, id).toLowerCase();
      const email = p?.email?.toLowerCase() ?? '';
      if (searchMode === 'username') return uname.includes(q);
      return name.includes(q) || uname.includes(q) || email.includes(q);
    });
  }, [searchQuery, searchMode, gymMemberIds, profiles, friendIds, gym?.code]);

  const pendingOutgoing = useMemo(() => {
    const set = new Set(outgoing.map((r) => r.to_user_id));
    return set;
  }, [outgoing]);

  useEffect(() => {
    if (!userId) return;
    setReactions(loadReactions(`sg-feed-reactions-${userId}`));
  }, [userId]);

  useEffect(() => {
    if (!userId || !activeFriendId) return;
    void markRead.mutateAsync({ recipientId: userId, senderId: activeFriendId }).catch(() => {
      /* ignore */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, activeFriendId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatQuery.data, activeFriendId]);

  useEffect(() => {
    if (!draft.trim()) {
      setTypingLocal(false);
      return;
    }
    setTypingLocal(true);
    const t = window.setTimeout(() => setTypingLocal(false), 1200);
    return () => window.clearTimeout(t);
  }, [draft]);

  function persistReactions(next: Record<string, string[]>) {
    setReactions(next);
    if (userId) {
      try {
        localStorage.setItem(`sg-feed-reactions-${userId}`, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    }
  }

  function toggleReaction(feedId: string, emoji: string) {
    const current = reactions[feedId] ?? [];
    const nextList = current.includes(emoji)
      ? current.filter((e) => e !== emoji)
      : [...current.filter((e) => e !== emoji), emoji];
    persistReactions({ ...reactions, [feedId]: nextList });
  }

  async function handleSendRequestByEmail(email: string) {
    if (!userId || !email.trim()) return;
    setStatusMessage(null);
    setError(null);
    try {
      await sendRequest.mutateAsync({ fromUserId: userId, email: email.trim() });
      setStatusMessage('Friend request sent.');
      setSearchQuery('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send request.');
    }
  }

  async function handleAddMember(targetId: string) {
    const email = profiles[targetId]?.email;
    if (!email) {
      setError('That member has no email on file.');
      return;
    }
    await handleSendRequestByEmail(email);
  }

  async function handleRespond(requestId: string, status: 'accepted' | 'rejected') {
    if (!userId) return;
    setError(null);
    try {
      await respond.mutateAsync({ requestId, status, userId });
      setStatusMessage(status === 'accepted' ? 'Friend added.' : 'Request declined.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update request.');
    }
  }

  async function sendBody(body: string) {
    if (!userId || !activeFriendId || !body.trim()) return;
    setError(null);
    try {
      await sendMessage.mutateAsync({
        senderId: userId,
        recipientId: activeFriendId,
        body: body.trim(),
      });
      setDraft('');
      setEmojiOpen(false);
      setShareOpen(false);
      setChallengeOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    await sendBody(draft);
  }

  function openChat(friendId: string) {
    setSelectedFriendId(friendId);
    setProfileUserId(friendId);
    setMobilePane('chat');
  }

  function openProfile(friendId: string) {
    setProfileUserId(friendId);
    setSelectedFriendId(friendId);
    setMobilePane('profile');
  }

  function inviteFriends() {
    const subject = encodeURIComponent(`Join me at ${gym?.name ?? 'the gym'}`);
    const body = encodeURIComponent(
      `Let's train together${gym?.code ? ` — gym code: ${gym.code}` : ''}. Add me on Smart Gym!`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  const myTotals = (myDiet.data?.totals ?? {}) as {
    protein?: number;
    waterLiters?: number;
  };
  const myFitness = Math.round(
    Number(myDiet.data?.fitness_score ?? myDiet.data?.diet_score ?? 0),
  );
  const myPoints = myLeague.data?.total_points ?? pointsByUser.get(userId ?? '') ?? 0;
  const friendPoints = viewProfileId
    ? pointsByUser.get(viewProfileId) ?? friendLeague.data?.total_points ?? 0
    : 0;
  const friendDayPoints = parseDayPoints(friendLeague.data?.day_points);
  const friendStreak = Object.keys(friendDayPoints).length;
  const friendTodayPts = viewProfileId ? friendDayPoints[today] ?? 0 : 0;

  const activityFeed = useMemo(() => {
    const items: { id: string; text: string; userId: string }[] = [];
    for (const row of boardQuery.data ?? []) {
      if (!friendIds.includes(row.user_id) && row.user_id !== userId) continue;
      const days = parseDayPoints(row.day_points);
      const pts = days[today] ?? 0;
      const name = displayName(profiles[row.user_id], row.user_id).split(' ')[0] ?? 'Member';
      const tier = getLeagueTierName(row.total_points, seasonId);
      if (pts >= 70) {
        items.push({
          id: `${row.user_id}-score`,
          userId: row.user_id,
          text: `🏆 ${name} crushed today’s fitness score (${pts} XP).`,
        });
      }
      if (tier !== 'bronze' && tierIndex(tier) >= 1) {
        items.push({
          id: `${row.user_id}-tier`,
          userId: row.user_id,
          text: `🥇 ${name} is in ${LEAGUE_TIER_LABELS[tier]} League.`,
        });
      }
      if (Object.keys(days).length >= 7) {
        items.push({
          id: `${row.user_id}-streak`,
          userId: row.user_id,
          text: `🔥 ${name} is on a ${Object.keys(days).length}-day scoring streak.`,
        });
      }
    }
    if (myFitness >= 80) {
      items.unshift({
        id: 'me-diet',
        userId: userId ?? 'me',
        text: `🥗 You logged a strong diet day (${myFitness} score).`,
      });
    }
    if ((myTotals.protein ?? 0) >= 120) {
      items.unshift({
        id: 'me-protein',
        userId: userId ?? 'me',
        text: `🍗 You hit ${Math.round(myTotals.protein ?? 0)}g protein today.`,
      });
    }
    if ((myTotals.waterLiters ?? 0) >= 3) {
      items.unshift({
        id: 'me-water',
        userId: userId ?? 'me',
        text: `💧 You drank ${(myTotals.waterLiters ?? 0).toFixed(1)}L water today.`,
      });
    }
    return items.slice(0, 10);
  }, [
    boardQuery.data,
    friendIds,
    userId,
    profiles,
    seasonId,
    myFitness,
    myTotals.protein,
    myTotals.waterLiters,
    today,
  ]);

  const messages = chatQuery.data ?? [];
  const groupedMessages = useMemo(() => {
    const groups: { day: string; items: ChatMessage[] }[] = [];
    for (const msg of messages) {
      const day = msg.created_at.slice(0, 10);
      const last = groups[groups.length - 1];
      if (!last || last.day !== day) groups.push({ day, items: [msg] });
      else last.items.push(msg);
    }
    return groups;
  }, [messages]);

  const sharedChallenges = useMemo(() => {
    return messages
      .filter((m) => messageKind(m.body) === 'challenge')
      .slice(-5)
      .reverse();
  }, [messages]);

  const myWeekDays = useMemo(() => {
    const days = parseDayPoints(myLeague.data?.day_points);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);
    const start = weekAgo.toISOString().slice(0, 10);
    return Object.keys(days).filter((d) => d >= start && d <= today).length;
  }, [myLeague.data?.day_points, today]);

  const weeklyBars = [
    {
      label: 'Workouts This Week',
      value: Math.min(7, myWeekDays),
      max: 7,
    },
    {
      label: 'Active Days',
      value: Math.min(7, myWeekDays),
      max: 7,
    },
    {
      label: 'Protein Goal',
      value: Math.min(120, Math.round(myTotals.protein ?? 0)),
      max: 120,
    },
    {
      label: 'Water Goal',
      value: Math.min(3, Number(myTotals.waterLiters ?? 0)),
      max: 3,
    },
    {
      label: 'League Points',
      value: Math.min(100, Math.round((myPoints / Math.max(1, 2000)) * 100)),
      max: 100,
      display: myPoints,
    },
  ];

  return (
    <motion.div
      className="relative mx-auto w-full max-w-[1400px] space-y-4 pb-24 lg:pb-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            <Users className="size-7 text-emerald-600 dark:text-emerald-400" aria-hidden />
            Friends & Community
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Stay motivated together.</p>
          <p className="mt-2 text-sm font-medium">
            Online Friends:{' '}
            <span className="tabular-nums text-emerald-700 dark:text-emerald-300">
              {onlineCount}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 rounded-2xl"
            onClick={() => {
              setAddOpen(true);
              setMobilePane('friends');
            }}
          >
            <Search className="size-4" />
            Search
          </Button>
          <Button
            type="button"
            className="min-h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700"
            onClick={() => setAddOpen(true)}
          >
            <UserPlus className="size-4" />
            Add Friend
          </Button>
          <Button type="button" variant="outline" className="min-h-11 rounded-2xl" onClick={inviteFriends}>
            <Share2 className="size-4" />
            Invite
          </Button>
        </div>
      </header>

      <AnimatePresence>
        {statusMessage ? (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-[20px] border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200"
            role="status"
          >
            {statusMessage}
          </motion.p>
        ) : null}
      </AnimatePresence>
      {error ? (
        <p
          className="rounded-[20px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {/* Three-panel desktop / stacked mobile */}
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_300px] xl:grid-cols-[300px_minmax(0,1fr)_320px]">
        {/* LEFT */}
        <aside
          className={cn(
            'space-y-4',
            mobilePane !== 'friends' && 'hidden lg:block',
          )}
        >
          {incoming.length > 0 ? (
            <GlassCard className="p-4">
              <h2 className="text-sm font-semibold">Friend Requests</h2>
              <ul className="mt-3 space-y-3">
                {incoming.map((req) => {
                  const from = req.from_user_id;
                  const pts = pointsByUser.get(from) ?? 0;
                  return (
                    <motion.li
                      key={req.id}
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-2xl border border-border/50 bg-muted/20 p-3"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar profile={profiles[from]} userId={from} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">
                            {displayName(profiles[from], from)}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            <TierBadge points={pts} seasonId={seasonId} />
                            <span className="text-[11px] text-muted-foreground">
                              {gym?.name ?? 'Gym mate'}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Mutual: same gym community
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          className="min-h-10 flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => void handleRespond(req.id, 'accepted')}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="min-h-10 flex-1 rounded-xl"
                          onClick={() => void handleRespond(req.id, 'rejected')}
                        >
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="min-h-10 rounded-xl"
                          onClick={() => openProfile(from)}
                        >
                          View Profile
                        </Button>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            </GlassCard>
          ) : null}

          <GlassCard className="flex max-h-[70vh] flex-col p-4 lg:max-h-[calc(100vh-12rem)]">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={friendFilter}
                onChange={(e) => setFriendFilter(e.target.value)}
                placeholder="Search friends…"
                className="min-h-11 rounded-2xl pl-10"
                aria-label="Search friends"
              />
            </div>

            {onlineCount > 0 ? (
              <div className="mt-4">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Online · {onlineCount}
                </p>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1 lg:flex-wrap">
                  {friendIds.filter(isOnline).map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => openChat(id)}
                      className="flex shrink-0 flex-col items-center gap-1 rounded-xl p-1 hover:bg-muted/40"
                    >
                      <Avatar profile={profiles[id]} userId={id} size="sm" online />
                      <span className="max-w-14 truncate text-[10px]">
                        {displayName(profiles[id], id).split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <p className="mt-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Friends · {friendIds.length}
            </p>

            {friendIds.length === 0 ? (
              <div className="mt-6 flex flex-1 flex-col items-center justify-center px-2 text-center">
                <Users className="size-10 text-muted-foreground/40" aria-hidden />
                <p className="mt-3 font-semibold">Fitness is more fun with friends.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Invite your gym buddies and compete together.
                </p>
                <Button
                  type="button"
                  className="mt-4 min-h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setAddOpen(true)}
                >
                  Find Friends
                </Button>
              </div>
            ) : (
              <ul className="mt-2 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 lg:flex-1 lg:snap-none lg:flex-col lg:gap-1 lg:overflow-y-auto">
                {filteredFriends.map((id) => {
                  const pts = pointsByUser.get(id) ?? 0;
                  const season = (boardQuery.data ?? []).find((r) => r.user_id === id);
                  const days = parseDayPoints(season?.day_points);
                  const streak = Object.keys(days).length;
                  const lastDay = Object.keys(days).sort().at(-1);
                  const online = isOnline(id);
                  return (
                    <li
                      key={id}
                      className="w-[78%] shrink-0 snap-center lg:w-auto lg:shrink"
                    >
                      <div
                        className={cn(
                          'w-full rounded-2xl border border-transparent p-3 text-left transition hover:bg-muted/40',
                          activeFriendId === id &&
                            'border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)]',
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => openChat(id)}
                          className="flex w-full items-start gap-3 text-left"
                        >
                          <Avatar profile={profiles[id]} userId={id} online={online} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">
                              {displayName(profiles[id], id)}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <TierBadge points={pts} seasonId={seasonId} />
                              <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                                <Flame className="size-3 text-orange-500" />
                                {streak}d
                              </span>
                            </div>
                            <p className="mt-1 truncate text-[11px] text-muted-foreground">
                              {lastDay
                                ? `Last score · ${lastDay}`
                                : 'No workouts logged yet'}
                              {days[today] != null ? ` · ${days[today]} XP today` : ''}
                            </p>
                          </div>
                        </button>
                        <div className="mt-3 flex gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="min-h-9 flex-1 rounded-xl"
                            onClick={() => openChat(id)}
                          >
                            <MessageCircle className="size-3.5" /> Chat
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="min-h-9 flex-1 rounded-xl"
                            onClick={() => {
                              openChat(id);
                              setChallengeOpen(true);
                            }}
                          >
                            <Swords className="size-3.5" /> Challenge
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="min-h-9 rounded-xl px-2"
                            onClick={() => openProfile(id)}
                          >
                            Profile
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {outgoing.length > 0 ? (
              <div className="mt-3 border-t border-border/50 pt-3">
                <p className="text-xs font-semibold text-muted-foreground">Outgoing</p>
                <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                  {outgoing.map((req) => (
                    <li key={req.id}>
                      {displayName(profiles[req.to_user_id], req.to_user_id)} · Pending
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </GlassCard>
        </aside>

        {/* CENTER chat */}
        <section
          className={cn(
            'min-h-[70vh]',
            mobilePane !== 'chat' && 'hidden lg:block',
          )}
          aria-label="Chat"
        >
          <GlassCard className="flex h-[min(78vh,820px)] flex-col overflow-hidden p-0">
            {!activeFriendId ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <MessageCircle className="size-10 text-muted-foreground/40" />
                <p className="mt-3 font-semibold">Select a friend to start chatting</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Share workouts, meals, and achievements as you go.
                </p>
                <Button
                  type="button"
                  className="mt-4 min-h-11 rounded-2xl lg:hidden"
                  variant="outline"
                  onClick={() => setMobilePane('friends')}
                >
                  <ArrowLeft className="size-4" /> Back to friends
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    className="min-h-11 min-w-11 lg:hidden"
                    aria-label="Back"
                    onClick={() => setMobilePane('friends')}
                  >
                    <ArrowLeft className="size-5" />
                  </Button>
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    onClick={() => openProfile(activeFriendId)}
                  >
                    <Avatar
                      profile={profiles[activeFriendId]}
                      userId={activeFriendId}
                      online={isOnline(activeFriendId)}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {displayName(profiles[activeFriendId], activeFriendId)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isOnline(activeFriendId) ? 'Online' : 'Offline'} ·{' '}
                        @{usernameOf(profiles[activeFriendId], activeFriendId)}
                      </p>
                    </div>
                  </button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-10 rounded-xl"
                    onClick={() => setChallengeOpen((v) => !v)}
                  >
                    <Swords className="size-3.5" />
                    Challenge
                  </Button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-5">
                  {chatQuery.isLoading ? (
                    <div className="h-24 animate-pulse rounded-2xl bg-muted" />
                  ) : messages.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground">
                      No messages yet — say hi or share a workout.
                    </p>
                  ) : (
                    groupedMessages.map((group) => (
                      <div key={group.day} className="space-y-2">
                        <p className="sticky top-0 z-[1] mx-auto w-fit rounded-full bg-muted/80 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur">
                          {formatDayLabel(`${group.day}T12:00:00`)}
                        </p>
                        {group.items.map((msg) => {
                          const mine = msg.sender_id === userId;
                          const kind = messageKind(msg.body);
                          return (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={cn('flex', mine ? 'justify-end' : 'justify-start')}
                            >
                              <div
                                className={cn(
                                  'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm sm:max-w-[75%]',
                                  mine
                                    ? 'rounded-br-md bg-emerald-600 text-white'
                                    : 'rounded-bl-md bg-muted',
                                  kind !== 'text' &&
                                    (mine
                                      ? 'border border-white/20 bg-emerald-700'
                                      : 'border border-emerald-500/20 bg-emerald-500/10'),
                                )}
                              >
                                <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                                <div
                                  className={cn(
                                    'mt-1 flex items-center justify-end gap-1 text-[10px]',
                                    mine ? 'text-white/80' : 'text-muted-foreground',
                                  )}
                                >
                                  <span>{formatTime(msg.created_at)}</span>
                                  {mine ? (
                                    msg.read_at ? (
                                      <CheckCheck className="size-3.5" aria-label="Read" />
                                    ) : (
                                      <Check className="size-3.5" aria-label="Sent" />
                                    )
                                  ) : null}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    ))
                  )}
                  {typingLocal && draft.trim() ? (
                    <p className="text-xs text-muted-foreground" aria-live="polite">
                      <span className="inline-flex gap-1">
                        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                      </span>{' '}
                      Typing…
                    </p>
                  ) : null}
                  <div ref={messagesEndRef} />
                </div>

                <AnimatePresence>
                  {challengeOpen ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border/60 bg-muted/20 px-3 py-2"
                    >
                      <p className="mb-2 text-xs font-semibold text-muted-foreground">
                        Send a challenge
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {CHALLENGE_TEMPLATES.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="min-h-10 shrink-0 rounded-xl border border-border/60 bg-background px-3 text-xs font-medium hover:border-emerald-500/40"
                            onClick={() => void sendBody(c.body)}
                          >
                            {c.title}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <AnimatePresence>
                  {shareOpen ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border/60 bg-muted/20 px-3 py-2"
                    >
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="min-h-10 rounded-xl"
                          onClick={() =>
                            void sendBody(
                              `🏋️ Shared workout: scored ${myFitness || '—'} fitness points today at ${gym?.name ?? 'the gym'}.`,
                            )
                          }
                        >
                          Workout
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="min-h-10 rounded-xl"
                          onClick={() =>
                            void sendBody(
                              `🥗 Shared meal: ${Math.round(myTotals.protein ?? 0)}g protein · ${(myTotals.waterLiters ?? 0).toFixed(1)}L water today.`,
                            )
                          }
                        >
                          Meal
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="min-h-10 rounded-xl"
                          onClick={() =>
                            void sendBody(
                              `🏆 Achievement: ${LEAGUE_TIER_LABELS[getLeagueTierName(myPoints, seasonId)]} League · ${myPoints.toLocaleString()} XP.`,
                            )
                          }
                        >
                          Achievement
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="min-h-10 rounded-xl"
                          onClick={() => {
                            const url = window.prompt('Paste an image URL to share');
                            if (url?.trim()) void sendBody(`📷 Shared a photo: ${url.trim()}`);
                          }}
                        >
                          <ImagePlus className="size-3.5" />
                          Image URL
                        </Button>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <AnimatePresence>
                  {emojiOpen ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="flex flex-wrap gap-1 border-t border-border/60 px-3 py-2"
                    >
                      {EMOJIS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          className="min-h-10 min-w-10 rounded-xl text-lg hover:bg-muted"
                          onClick={() => {
                            setDraft((d) => d + e);
                            draftRef.current?.focus();
                          }}
                        >
                          {e}
                        </button>
                      ))}
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <form
                  onSubmit={(e) => void handleSendMessage(e)}
                  className="flex items-end gap-2 border-t border-border/60 p-3"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    className="min-h-11 min-w-11"
                    aria-label="Emoji"
                    onClick={() => setEmojiOpen((v) => !v)}
                  >
                    <Smile className="size-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    className="min-h-11 min-w-11"
                    aria-label="Share"
                    onClick={() => setShareOpen((v) => !v)}
                  >
                    <Share2 className="size-5" />
                  </Button>
                  <textarea
                    ref={draftRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void sendBody(draft);
                      }
                    }}
                    rows={1}
                    placeholder="Message…"
                    className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30"
                    aria-label="Message"
                  />
                  <Button
                    type="submit"
                    className="min-h-11 min-w-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700"
                    disabled={sendMessage.isPending || !draft.trim()}
                    aria-label="Send"
                  >
                    <Send className="size-4" />
                  </Button>
                </form>
              </>
            )}
          </GlassCard>
        </section>

        {/* RIGHT profile / community */}
        <aside
          className={cn(
            'space-y-4',
            mobilePane !== 'profile' && 'hidden lg:block',
          )}
        >
          <div className="lg:hidden">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 rounded-2xl"
              onClick={() => setMobilePane('chat')}
            >
              <ArrowLeft className="size-4" /> Back to chat
            </Button>
          </div>

          {viewProfileId ? (
            <GlassCard className="p-5">
              <div className="flex flex-col items-center text-center">
                <Avatar
                  profile={profiles[viewProfileId]}
                  userId={viewProfileId}
                  size="lg"
                  online={isOnline(viewProfileId)}
                />
                <p className="mt-3 text-lg font-semibold">
                  {displayName(profiles[viewProfileId], viewProfileId)}
                </p>
                <p className="text-xs text-muted-foreground">
                  @{usernameOf(profiles[viewProfileId], viewProfileId)}
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  <TierBadge points={friendPoints} seasonId={seasonId} />
                  {rankByUser.get(viewProfileId) ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">
                      Rank #{rankByUser.get(viewProfileId)}
                    </span>
                  ) : null}
                </div>
              </div>
              <dl className="mt-5 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Gym</dt>
                  <dd className="font-medium">{gym?.name ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Streak</dt>
                  <dd className="font-medium">{friendStreak} days</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Today XP</dt>
                  <dd className="font-medium">{friendTodayPts}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Membership</dt>
                  <dd className="capitalize font-medium">
                    {membershipByUser.get(viewProfileId)?.status ??
                      (friendIds.includes(viewProfileId) ? 'friend' : '—')}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">League Points</dt>
                  <dd className="font-medium">{friendPoints.toLocaleString()}</dd>
                </div>
              </dl>
              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  className="min-h-11 flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => openChat(viewProfileId)}
                >
                  <MessageCircle className="size-4" /> Chat
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 rounded-2xl"
                  onClick={() => {
                    openChat(viewProfileId);
                    setChallengeOpen(true);
                  }}
                >
                  <Swords className="size-4" />
                </Button>
              </div>
            </GlassCard>
          ) : (
            <GlassCard className="p-5 text-center text-sm text-muted-foreground">
              Select a friend to view their profile.
            </GlassCard>
          )}

          <GlassCard className="p-5">
            <h2 className="text-sm font-semibold">Weekly Activity</h2>
            <p className="text-xs text-muted-foreground">Your community stats this week</p>
            <ul className="mt-4 space-y-3">
              {weeklyBars.map((bar) => {
                const pct = Math.min(100, Math.round((Number(bar.value) / bar.max) * 100));
                return (
                  <li key={bar.label}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span>{bar.label}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {'display' in bar && bar.display != null
                          ? bar.display.toLocaleString()
                          : `${bar.value}/${bar.max}`}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        className="h-full rounded-full bg-emerald-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </GlassCard>

          {sharedChallenges.length > 0 ? (
            <GlassCard className="p-5">
              <h2 className="text-sm font-semibold">Shared Challenges</h2>
              <ul className="mt-3 space-y-2">
                {sharedChallenges.map((msg) => (
                  <li
                    key={msg.id}
                    className="rounded-2xl border border-border/50 bg-muted/20 px-3 py-2 text-xs"
                  >
                    <p className="line-clamp-3">{msg.body}</p>
                    <p className="mt-1 text-muted-foreground">{formatTime(msg.created_at)}</p>
                  </li>
                ))}
              </ul>
            </GlassCard>
          ) : null}

          <GlassCard className="p-5">
            <h2 className="text-sm font-semibold">Activity Feed</h2>
            <p className="text-xs text-muted-foreground">Friend wins you can react to</p>
            {activityFeed.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No recent friend activity — keep logging to spark the feed.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {activityFeed.map((item) => (
                  <li key={item.id} className="rounded-2xl border border-border/50 bg-muted/15 p-3">
                    <p className="text-sm">{item.text}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {REACTIONS.map((emoji) => {
                        const active = (reactions[item.id] ?? []).includes(emoji);
                        return (
                          <button
                            key={emoji}
                            type="button"
                            className={cn(
                              'min-h-9 min-w-9 rounded-xl text-sm transition',
                              active ? 'bg-emerald-500/20 ring-1 ring-emerald-500/40' : 'hover:bg-muted',
                            )}
                            aria-pressed={active}
                            onClick={() => toggleReaction(item.id, emoji)}
                          >
                            {emoji}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/member/league"
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'mt-4 min-h-11 w-full rounded-2xl',
              )}
            >
              <Trophy className="size-4" /> Open League
            </Link>
          </GlassCard>
        </aside>
      </div>

      {/* Mobile tabs */}
      <nav
        className="fixed inset-x-0 bottom-16 z-20 border-t border-border/80 bg-background/90 p-2 backdrop-blur lg:hidden"
        aria-label="Friends sections"
      >
        <div className="mx-auto grid max-w-lg grid-cols-3 gap-1">
          {(
            [
              ['friends', 'Friends', Users],
              ['chat', 'Chat', MessageCircle],
              ['profile', 'Profile', Medal],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMobilePane(id)}
              className={cn(
                'flex min-h-11 flex-col items-center justify-center rounded-2xl text-xs font-semibold',
                mobilePane === id
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'text-muted-foreground',
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* FAB */}
      <button
        type="button"
        className="fixed right-4 bottom-32 z-20 inline-flex size-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 lg:hidden"
        aria-label="Add friend"
        onClick={() => setAddOpen(true)}
      >
        <Plus className="size-6" />
      </button>

      {/* Add / Search modal */}
      {addOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/50"
            aria-label="Close"
            onClick={() => setAddOpen(false)}
          />
          <GlassCard className="relative z-10 m-4 max-h-[85vh] w-full max-w-lg overflow-y-auto p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Find Friends</h2>
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                className="min-h-11 min-w-11"
                aria-label="Close"
                onClick={() => setAddOpen(false)}
              >
                <X className="size-5" />
              </Button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Search by name, username, gym code, or email
              {gym?.code ? ` · your gym code is ${gym.code}` : ''}.
            </p>

            <div className="mt-4 flex flex-wrap gap-1 rounded-full bg-muted p-1">
              {(
                [
                  ['name', 'Name'],
                  ['username', 'Username'],
                  ['gym', 'Gym Code'],
                  ['email', 'Email'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSearchMode(id)}
                  className={cn(
                    'min-h-9 flex-1 rounded-full px-3 text-xs font-semibold sm:text-sm',
                    searchMode === id
                      ? 'bg-background text-emerald-700 shadow-sm dark:text-emerald-300'
                      : 'text-muted-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (searchMode === 'email' || looksLikeEmail(searchQuery)) {
                  void handleSendRequestByEmail(searchQuery);
                }
              }}
            >
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  searchMode === 'email'
                    ? 'member@example.com'
                    : searchMode === 'gym'
                      ? gym?.code ?? 'Gym code'
                      : searchMode === 'username'
                        ? 'username'
                        : 'Member name'
                }
                className="min-h-11 rounded-2xl"
                aria-label="Friend search"
              />
              {(searchMode === 'email' || looksLikeEmail(searchQuery)) && (
                <Button
                  type="submit"
                  className="min-h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700"
                  disabled={sendRequest.isPending}
                >
                  Add
                </Button>
              )}
            </form>

            <ul className="mt-4 space-y-2">
              {searchQuery.trim() && searchResults.length === 0 ? (
                <li className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
                  {searchMode === 'email'
                    ? 'Enter a full email and tap Add, or no gym match found.'
                    : searchMode === 'gym'
                      ? 'Enter your gym code to list members you can add.'
                      : 'No matching members in your gym.'}
                </li>
              ) : null}
              {searchResults.map((id) => {
                const pts = pointsByUser.get(id) ?? 0;
                const status = membershipByUser.get(id)?.status ?? 'active';
                const pending = pendingOutgoing.has(id);
                return (
                  <li
                    key={id}
                    className="flex items-center gap-3 rounded-2xl border border-border/50 bg-muted/20 p-3"
                  >
                    <Avatar profile={profiles[id]} userId={id} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{displayName(profiles[id], id)}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] capitalize">
                          {status}
                        </span>
                        <TierBadge points={pts} seasonId={seasonId} />
                        <span className="text-[11px] text-muted-foreground">
                          @{usernameOf(profiles[id], id)}
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="min-h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700"
                      disabled={pending || sendRequest.isPending || friendIds.includes(id)}
                      onClick={() => void handleAddMember(id)}
                    >
                      {friendIds.includes(id) ? 'Friends' : pending ? 'Pending' : 'Add Friend'}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </GlassCard>
        </div>
      ) : null}
    </motion.div>
  );
}
