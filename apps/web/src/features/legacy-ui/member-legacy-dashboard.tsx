'use client';

import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  DIET_SCORE_PART_MAX,
  NUTRITION_DB,
  buildDietTargetsFromProfile,
  calculateCrowdLevel,
  calculateDaysLeft,
  computeDietScoreV2,
  computeMealLogStreak,
  countLiveMembers,
  getCrowdLabel,
  getDietConsistencyBonus,
  getLeagueSeasonId,
  getLeagueSeasonLabel,
  getLeagueTierLabel,
  getMembershipExpiryLine,
  getPlanLabel,
  getTodayYmd,
  MEMBERSHIP_PLAN_LABELS,
  PAYMENT_STATUS_LABELS,
  resolveFoodKey,
  scaleNutritionEntry,
  searchNutritionCatalog,
  type DietFood,
  type MealSlot,
  type MembershipPlan,
  type PaymentStatus,
} from '@smart-gym/shared';
import {
  profileToDietInput,
  signOut,
  totalsFromFoods,
  useChatMessages,
  useDailyAttendanceCode,
  useDietLog,
  useDietLogDates,
  useDietLogs,
  useFriendRequests,
  useFriendships,
  useGymAttendanceToday,
  useGymMembers,
  useGymNotifications,
  useLeagueLeaderboard,
  useLeagueSeason,
  useMemberAttendanceHistory,
  useMemberAttendanceToday,
  useMemberPayments,
  useProfilesMap,
  useRespondToFriendRequest,
  useSaveDietDay,
  useSelfCheckIn,
  useSendChatMessage,
  useSendFriendRequest,
} from '@smart-gym/supabase';
import { useMemberContext } from '@/features/member/components/member-provider';
import { createClient } from '@/lib/supabase/client';
import { useLegacySidebar } from '@/features/legacy-ui/use-legacy-sidebar';

type SectionId =
  | 'dashboardSection'
  | 'exploreSection'
  | 'notificationsSection'
  | 'myGymSection'
  | 'attendanceSection'
  | 'paymentsSection'
  | 'dietSection'
  | 'memberLeaderboardSection'
  | 'friendsSection'
  | 'profileSection';

const NAV_ITEMS: { id: SectionId; label: ReactNode; navId?: string }[] = [
  { id: 'dashboardSection', label: 'Dashboard' },
  { id: 'notificationsSection', label: 'Notifications', navId: 'sidebarNotificationsNav' },
  { id: 'myGymSection', label: 'My Gym' },
  { id: 'attendanceSection', label: 'Attendance' },
  { id: 'paymentsSection', label: 'Payments' },
  {
    id: 'exploreSection',
    navId: 'sidebarFriendsNav',
    label: (
      <span className="sidebar-item-label">
        <span className="sidebar-item-icon">✦</span>
        <span>Explore</span>
      </span>
    ),
  },
  { id: 'profileSection', label: 'Profile' },
];

function displayName(
  profile:
    | { full_name?: string; first_name?: string; last_name?: string; email?: string }
    | undefined,
  userId: string,
) {
  if (!profile) return `${userId.slice(0, 8)}…`;
  if (profile.full_name?.trim()) return profile.full_name.trim();
  const name = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
  return name || profile.email || `${userId.slice(0, 8)}…`;
}

function planLabel(plan: string | null | undefined) {
  if (!plan) return '—';
  if (plan in MEMBERSHIP_PLAN_LABELS) {
    return MEMBERSHIP_PLAN_LABELS[plan as MembershipPlan];
  }
  return getPlanLabel(plan as MembershipPlan) || plan.replace(/_/g, ' ');
}

function titleCase(value: string | null | undefined) {
  if (!value) return '—';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatMoney(amount: number | null | undefined) {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

function mealKcal(foods: DietFood[], slot: MealSlot) {
  return Math.round(
    foods
      .filter((f) => (f.mealSlot ?? 'unspecified') === slot)
      .reduce((sum, f) => sum + (Number(f.calories) || 0), 0),
  );
}

function mealDetail(foods: DietFood[], slot: MealSlot) {
  const names = foods
    .filter((f) => (f.mealSlot ?? 'unspecified') === slot)
    .map((f) => f.name)
    .filter(Boolean);
  return names.length ? names.join(', ') : '—';
}

export function MemberLegacyDashboard() {
  const router = useRouter();
  const { client, userId, profile, gym, membership } = useMemberContext();
  const sidebar = useLegacySidebar();
  const [activeSection, setActiveSection] = useState<SectionId>('dashboardSection');
  const gymId = gym?.id ?? membership?.gym_id ?? null;
  const today = getTodayYmd();

  const showSection = (id: SectionId) => {
    setActiveSection(id);
    sidebar.closeMobile();
  };

  async function handleLogout() {
    const supabase = createClient();
    await signOut(supabase);
    router.replace('/login');
    router.refresh();
  }

  const memberName =
    profile?.full_name?.trim() ||
    `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() ||
    'Member';

  return (
    <div className={sidebar.layoutClassName} id="dashboardLayout">
      <aside className="sidebar" id="dashboardSidebar">
        <button
          type="button"
          className="sidebar-toggle"
          id="sidebarToggle"
          aria-label="Toggle sidebar"
          aria-expanded={!sidebar.collapsed}
          title="Collapse menu"
          onClick={sidebar.toggleCollapsed}
        >
          <span className="sidebar-toggle-bars" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
        <div className="sidebar-body">
          <div className="sidebar-top">
            <div className="sidebar-member-head">
              <h3 id="sidebarMemberName">{memberName}</h3>
              <p id="sidebarMemberGymCode">{gym?.code ?? 'GYM----'}</p>
            </div>
            <button
              type="button"
              className="mobile-sidebar-close-btn"
              id="mobileSidebarCloseBtn"
              aria-label="Close menu"
              onClick={sidebar.closeMobile}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>

          <ul className="sidebar-menu">
            {NAV_ITEMS.map((item) => (
              <li
                key={item.id}
                id={item.navId}
                className={activeSection === item.id ? 'active' : undefined}
                onClick={() => showSection(item.id)}
              >
                {item.label}
              </li>
            ))}
          </ul>

          <div className="sidebar-bottom">
            <button type="button" className="logout-btn" onClick={() => void handleLogout()}>
              Logout
            </button>
          </div>
        </div>
      </aside>

      <button
        type="button"
        className="sidebar-backdrop"
        id="sidebarBackdrop"
        aria-hidden={!sidebar.mobileOpen}
        tabIndex={-1}
        onClick={sidebar.closeMobile}
      />
      <button
        type="button"
        className="mobile-menu-open-btn"
        id="mobileMenuOpenBtn"
        aria-label="Open navigation menu"
        onClick={sidebar.openMobile}
      >
        <span className="sidebar-toggle-bars" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      <main className="main-content">
        <DashboardSection
          active={activeSection === 'dashboardSection'}
          onNavigate={showSection}
          gymId={gymId}
          today={today}
        />
        <ExploreSection active={activeSection === 'exploreSection'} onNavigate={showSection} />
        <NotificationsSection active={activeSection === 'notificationsSection'} />
        <MyGymSection active={activeSection === 'myGymSection'} />
        <AttendanceSection
          active={activeSection === 'attendanceSection'}
          gymId={gymId}
          today={today}
        />
        <PaymentsSection active={activeSection === 'paymentsSection'} />
        <DietSection
          active={activeSection === 'dietSection'}
          gymId={gymId}
          today={today}
        />
        <LeaderboardSection
          active={activeSection === 'memberLeaderboardSection'}
          onOpenFriends={() => showSection('friendsSection')}
        />
        <FriendsSection active={activeSection === 'friendsSection'} />
        <ProfileSection active={activeSection === 'profileSection'} />
      </main>
    </div>
  );
}

function DashboardSection({
  active,
  onNavigate,
  gymId,
  today,
}: {
  active: boolean;
  onNavigate: (id: SectionId) => void;
  gymId: string | null;
  today: string;
}) {
  const { client, userId, profile, gym, membership } = useMemberContext();
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
    ? titleCase(latestPayment.status)
    : membership?.status === 'active'
      ? 'Active'
      : '—';
  const membershipStatus =
    membership?.status === 'active'
      ? 'Active'
      : membership?.status
        ? titleCase(membership.status)
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
    <section
      id="dashboardSection"
      className={`content-section${active ? ' active' : ''}`}
      hidden={!active}
    >
      <div className="panel-card dashboard-next-step-card" id="memberNextStepCard">
        <div className="card-header">
          <h3>What should I do next?</h3>
          <span className="tag">Quick start</span>
        </div>
        <p className="message-text">
          1) Mark attendance with today&apos;s code. 2) Log your meals in Diet Dashboard. 3) Check
          your position in Leaderboard.
        </p>
        <div className="button-row">
          <button
            type="button"
            className="outline-btn"
            onClick={() => onNavigate('attendanceSection')}
          >
            Go to Attendance
          </button>
          <button type="button" className="outline-btn" onClick={() => onNavigate('dietSection')}>
            Go to Diet
          </button>
          <button type="button" onClick={() => onNavigate('memberLeaderboardSection')}>
            Open Leaderboard
          </button>
        </div>
      </div>

      <div className="dashboard-top-right-score">
        <div className="dashboard-fitness-widget">
          <span className="dashboard-fitness-label">Fitness Score</span>
          <div className="dashboard-fitness-ring">
            <div className="dashboard-fitness-core">
              <div id="dashboardFitnessScore">{fitnessScore}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-grid top-stats">
        <div className="info-card info-card-membership-dash">
          <span className="small-label">Membership Status</span>
          <h2 id="dashboardMembershipStatus">{membershipStatus}</h2>
          <p id="dashboardMembershipExpiry" className="dashboard-membership-expiry">
            {membership?.ends_at ? getMembershipExpiryLine(membership.ends_at) : '—'}
          </p>
        </div>
        <div className="info-card">
          <span className="small-label">Payment Status</span>
          <h2 id="dashboardPaymentStatus">{paymentStatus}</h2>
        </div>
        <div className="info-card">
          <span className="small-label">Plan</span>
          <h2 id="dashboardPlan">{planLabel(membership?.plan)}</h2>
        </div>
        <div className="info-card info-card-gym-brand-dash">
          <span className="small-label">Your gym</span>
          <h2 id="dashboardGymName" className="dashboard-gym-name-title">
            {gym?.name ?? '—'}
          </h2>
          <p id="dashboardGymCodeLine" className="dashboard-gym-code-sub">
            {gym?.code ? `Code ${gym.code}` : '—'}
          </p>
        </div>
      </div>

      <div className="panel-card member-streak-card" id="memberStreakCard">
        <div className="card-header">
          <h3>Diet streak</h3>
          <span className="tag streak-tag" id="memberStreakTag">
            {streakCurrent > 0 ? `${streakCurrent} day streak` : 'Start today'}
          </span>
        </div>
        <p className="member-streak-main">
          <span id="memberStreakCurrent">{streakCurrent}</span> day
          <span id="memberStreakPlural">{streakCurrent === 1 ? '' : 's'}</span> in a row
        </p>
        <p className="member-streak-sub muted" id="memberStreakBestLine">
          Best: {streakBest > 0 ? `${streakBest} days` : '—'}
        </p>
        <p className="member-streak-rolling" id="memberStreakRolling">
          Hi{profile?.first_name ? `, ${profile.first_name}` : ''} — keep logging meals.
        </p>
        <p className="member-streak-hint muted" id="memberStreakMilestoneHint">
          Log meals every day to build a streak.
        </p>
      </div>

      <div className="main-grid dashboard-main-panels">
        <div className="panel-card">
          <div className="card-header">
            <h3>Today&apos;s Attendance Code</h3>
            <span className="tag">Daily Code</span>
          </div>
          <div id="todayCode" className="code-box">
            {codeQuery.isLoading ? '····' : codeQuery.data || '----'}
          </div>
          <p id="codeMessage">
            {codeQuery.data
              ? 'Show this code at the desk to mark attendance.'
              : 'Loading attendance code...'}
          </p>
        </div>

        <div className="panel-card">
          <div className="card-header">
            <h3>Current Crowd</h3>
            <span className="tag">Live</span>
          </div>
          <div className="crowd-panel-body">
            <span className="crowd-panel-label">Live crowd level</span>
            <div
              id="crowdDots"
              className="crowd-meter"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={5}
              aria-valuenow={crowdLevel}
              aria-label="Gym crowd level from 0 to 5"
            >
              {[1, 2, 3, 4, 5].map((seg) => (
                <span
                  key={seg}
                  className={`crowd-meter-seg ${
                    seg <= crowdLevel ? 'crowd-meter-seg--on' : 'crowd-meter-seg--off'
                  }`}
                />
              ))}
            </div>
            <div className="crowd-panel-meta">
              <div>
                <span className="meta-k">Level</span>
                <span id="crowdLevelText" className="meta-v">
                  {crowdLevel} / 5
                </span>
              </div>
              <div>
                <span className="meta-k">Status</span>
                <span id="crowdStatusText" className="meta-v">
                  {getCrowdLabel(crowdLevel)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ExploreSection({
  active,
  onNavigate,
}: {
  active: boolean;
  onNavigate: (id: SectionId) => void;
}) {
  return (
    <section
      id="exploreSection"
      className={`content-section${active ? ' active' : ''}`}
      hidden={!active}
    >
      <div className="section-title">
        <h2>Explore Features</h2>
        <p>Open advanced member features from here</p>
      </div>
      <div className="panel-card dashboard-explore-card">
        <div className="dashboard-explore-grid">
          <div className="landing-feature-block">
            <h3>Diet</h3>
            <p>Track meals, water, and daily nutrition score.</p>
            <div className="button-row">
              <button
                type="button"
                className="outline-btn"
                onClick={() => onNavigate('dietSection')}
              >
                Open Diet
              </button>
            </div>
          </div>
          <div className="landing-feature-block">
            <h3>Leaderboard</h3>
            <p>See season rank and send friend requests.</p>
            <div className="button-row">
              <button
                type="button"
                className="outline-btn"
                onClick={() => onNavigate('memberLeaderboardSection')}
              >
                Open Leaderboard
              </button>
            </div>
          </div>
          <div className="landing-feature-block">
            <h3>Friends & Chat</h3>
            <p>Send requests, accept friends, and chat privately.</p>
            <div className="button-row">
              <button
                type="button"
                className="outline-btn"
                onClick={() => onNavigate('friendsSection')}
              >
                Open Friends & Chat
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function NotificationsSection({ active }: { active: boolean }) {
  const { client, gym } = useMemberContext();
  const notificationsQuery = useGymNotifications(client, gym?.id);
  const items = notificationsQuery.data ?? [];

  return (
    <section
      id="notificationsSection"
      className={`content-section${active ? ' active' : ''}`}
      hidden={!active}
    >
      <div className="section-title">
        <h2>Notifications</h2>
        <p>Announcements and updates from your gym</p>
      </div>
      <div className="panel-card">
        <div className="card-header">
          <h3>Gym Notifications</h3>
          <span className="tag">Updates</span>
        </div>
        <div id="memberNotifications" className="notification-timeline-host">
          {notificationsQuery.isLoading ? (
            <p className="notification-timeline-empty">Loading notifications…</p>
          ) : items.length === 0 ? (
            <p className="notification-timeline-empty">No notifications yet.</p>
          ) : (
            <ul className="notification-timeline">
              {items.map((n) => {
                const created = new Date(n.created_at);
                return (
                  <li key={n.id} className="notification-timeline-item">
                    <div className="notification-timeline-axis">
                      <span className="notification-timeline-dot" />
                      <span className="notification-timeline-connector" />
                    </div>
                    <div className="notification-timeline-card">
                      <div className="notification-timeline-chartrow">
                        <span className="notification-timeline-date">
                          {created.toLocaleDateString()}
                        </span>
                        <span className="notification-timeline-time">
                          {created.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <h4 className="notification-timeline-title">{n.title}</h4>
                      {n.body ? (
                        <p className="notification-timeline-message">{n.body}</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function MyGymSection({ active }: { active: boolean }) {
  const { profile, gym, membership } = useMemberContext();
  const daysLeft =
    membership?.ends_at != null ? calculateDaysLeft(membership.ends_at) : null;
  const [joinMessage, setJoinMessage] = useState('');

  return (
    <section
      id="myGymSection"
      className={`content-section${active ? ' active' : ''}`}
      hidden={!active}
    >
      <div className="section-title">
        <h2>My Gym</h2>
        <p>Gym information, plans, and joining</p>
      </div>

      <div className="my-gym-page-layout">
        <div className="panel-card my-gym-details-card">
          <div className="card-header">
            <h3>Gym details</h3>
            <span className="tag">Preview</span>
          </div>
          <p className="my-gym-detail-name" id="myGymDetailName">
            {gym?.name ?? '—'}
          </p>
          <p className="my-gym-detail-code-line">
            <span className="muted-label">Gym code</span>{' '}
            <strong id="myGymDetailCode">{gym?.code ?? '—'}</strong>
          </p>

          <div className="my-gym-detail-grid">
            <div className="my-gym-detail-block">
              <span className="muted-label">Phone</span>
              <p id="myGymDetailPhone">{gym?.phone || '—'}</p>
            </div>
            <div className="my-gym-detail-block">
              <span className="muted-label">Email</span>
              <p id="myGymDetailEmail">{gym?.contact_email || '—'}</p>
            </div>
            <div className="my-gym-detail-block my-gym-detail-wide">
              <span className="muted-label">Location</span>
              <p id="myGymDetailAddress">{gym?.location || '—'}</p>
            </div>
            <div className="my-gym-detail-block">
              <span className="muted-label">Opens</span>
              <p id="myGymDetailOpen">{gym?.opening_time || '—'}</p>
            </div>
            <div className="my-gym-detail-block">
              <span className="muted-label">Closes</span>
              <p id="myGymDetailClose">{gym?.closing_time || '—'}</p>
            </div>
          </div>

          <h4 className="my-gym-plans-title">Membership plans</h4>
          <ul className="my-gym-plans-list">
            <li>
              <span>1 month</span>{' '}
              <strong>
                ₹<span id="myGymDetailPrice1">{gym?.price_1_month ?? '—'}</span>
              </strong>
            </li>
            <li>
              <span>3 months</span>{' '}
              <strong>
                ₹<span id="myGymDetailPrice3">{gym?.price_3_month ?? '—'}</span>
              </strong>
            </li>
            <li>
              <span>6 months</span>{' '}
              <strong>
                ₹<span id="myGymDetailPrice6">{gym?.price_6_month ?? '—'}</span>
              </strong>
            </li>
            <li>
              <span>1 year</span>{' '}
              <strong>
                ₹<span id="myGymDetailPrice12">{gym?.price_12_month ?? '—'}</span>
              </strong>
            </li>
          </ul>
        </div>

        <div className="my-gym-right-column">
          <div className="panel-card my-gym-member-card">
            <div className="card-header">
              <h3>Your membership</h3>
              <span className="tag">Account</span>
            </div>
            <p>
              <strong>Name:</strong>{' '}
              <span id="memberName">
                {profile?.full_name ||
                  `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() ||
                  '—'}
              </span>
            </p>
            <p>
              <strong>Email:</strong> <span id="memberEmail">{profile?.email ?? '—'}</span>
            </p>
            <p>
              <strong>Gym code:</strong>{' '}
              <span id="memberGymCodeInfo">{gym?.code ?? '—'}</span>
            </p>
            <p>
              <strong>Joined:</strong>{' '}
              <span id="joinedGymText">{membership ? 'Yes' : 'No'}</span>
            </p>
            <p>
              <strong>Request:</strong>{' '}
              <span id="requestStatusText">{membership ? 'Approved' : '—'}</span>
            </p>
            <p>
              <strong>Membership:</strong>{' '}
              <span id="membershipStatusText">{titleCase(membership?.status)}</span>
            </p>
            <p>
              <strong>Payment:</strong>{' '}
              <span id="paymentStatusText">{titleCase(membership?.payment_status)}</span>
            </p>
            <p>
              <strong>Plan:</strong> <span id="memberPlan">{planLabel(membership?.plan)}</span>
            </p>
            <p>
              <strong>Amount:</strong>{' '}
              <span id="memberAmount">{formatMoney(membership?.amount)}</span>
            </p>
            <p>
              <strong>Payment mode:</strong>{' '}
              <span id="memberPaymentMode">{membership?.payment_mode || '—'}</span>
            </p>
            <p>
              <strong>Start:</strong>{' '}
              <span id="memberStartDate">{membership?.starts_at ?? '—'}</span>
            </p>
            <p>
              <strong>End:</strong> <span id="memberEndDate">{membership?.ends_at ?? '—'}</span>
            </p>
            <p>
              <strong>Days left:</strong>{' '}
              <span id="memberDaysLeft">{daysLeft == null ? '—' : String(daysLeft)}</span>
            </p>
            <p id="joinedGymStatus" className="join-message" />
          </div>

          <div id="myGymJoinCard" className="panel-card my-gym-join-card">
            <div className="card-header">
              <h3>Join this gym</h3>
              <span className="tag">New</span>
            </div>
            <p className="join-note">
              Enter the gym code, verify details on the left, then send your join request.
            </p>
            <div className="join-gym-form my-gym-join-form">
              <input
                type="text"
                id="joinGymCodeInput"
                placeholder="Gym code"
                autoComplete="off"
                disabled={Boolean(membership)}
              />
              <button
                type="button"
                className="outline-btn"
                onClick={() =>
                  setJoinMessage(
                    membership
                      ? 'You are already a member of this gym.'
                      : 'Gym lookup from this screen is coming soon — use onboarding to join.',
                  )
                }
              >
                Check gym
              </button>
            </div>
            <button
              type="button"
              id="myGymJoinGymBtn"
              className="my-gym-join-primary-btn"
              onClick={() =>
                setJoinMessage(
                  membership
                    ? 'You are already joined.'
                    : 'Join requests are handled during onboarding in this app version.',
                )
              }
            >
              Join gym
            </button>
            <p id="joinGymMessage" className="join-message">
              {joinMessage}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function AttendanceSection({
  active,
  gymId,
  today,
}: {
  active: boolean;
  gymId: string | null;
  today: string;
}) {
  const { client, userId, gym } = useMemberContext();
  const codeQuery = useDailyAttendanceCode(client, gymId, Boolean(gymId));
  const myTodayQuery = useMemberAttendanceToday(client, userId, today);
  const historyQuery = useMemberAttendanceHistory(client, userId, 30);
  const selfCheckIn = useSelfCheckIn(client);
  const [status, setStatus] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const checkedIn = Boolean(myTodayQuery.data);
  const history = (historyQuery.data ?? []).filter((row) => {
    if (fromDate && row.attendance_date < fromDate) return false;
    if (toDate && row.attendance_date > toDate) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      row.attendance_date.includes(q) ||
      new Date(row.checked_in_at).toLocaleString().toLowerCase().includes(q) ||
      (row.check_in_method ?? '').toLowerCase().includes(q)
    );
  });

  async function handleSelfCheckIn() {
    if (!gymId) return;
    setStatus(null);
    try {
      const result = await selfCheckIn.mutateAsync(gymId);
      setStatus(
        result.already_marked ? 'You were already checked in today.' : 'Checked in successfully.',
      );
      await myTodayQuery.refetch();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Self check-in failed.');
    }
  }

  return (
    <section
      id="attendanceSection"
      className={`content-section${active ? ' active' : ''}`}
      hidden={!active}
    >
      <div className="section-title">
        <h2>Attendance</h2>
        <p>Your attendance summary</p>
      </div>

      <div className="panel-card">
        <div className="card-header">
          <h3>Attendance Overview</h3>
          <span className="tag">History</span>
        </div>
        <p>
          <strong>Today&apos;s Status:</strong>{' '}
          <span id="attendanceTodayStatus">{checkedIn ? 'Present' : 'Not checked in'}</span>
        </p>
        <p>
          <strong>Today&apos;s Code:</strong>{' '}
          <span id="attendancePageCode">{codeQuery.data || '—'}</span>
        </p>
        <p>
          <strong>Gym Code:</strong>{' '}
          <span id="attendancePageGymCode">{gym?.code ?? '—'}</span>
        </p>

        <div className="member-qr-scan-option">
          <p className="message-text member-qr-scan-option-intro">
            <strong>Check in:</strong> use self check-in below, or show today&apos;s code at the
            desk. Camera QR scan is not wired in this build.
          </p>
          <button
            type="button"
            className="outline-btn member-qr-scan-open-btn"
            onClick={() => void handleSelfCheckIn()}
            disabled={selfCheckIn.isPending || checkedIn || !gymId}
          >
            {checkedIn
              ? 'Already checked in'
              : selfCheckIn.isPending
                ? 'Checking in…'
                : 'Self check-in'}
          </button>
          {status ? <p className="message-text">{status}</p> : null}
        </div>
      </div>

      <details className="panel-card member-attendance-30-panel section-collapsible">
        <summary className="section-collapsible-summary">
          <span className="section-collapsible-summary-text">
            <h3>Last 30 days</h3>
            <span className="tag">Day · Date · Time</span>
          </span>
          <span className="section-collapsible-chevron" aria-hidden="true" />
        </summary>
        <div className="section-collapsible-body">
          <p className="message-text member-attendance-30-hint">
            Shows whether you attended each day and the check-in time when recorded.
          </p>
          <div className="table-filter-row">
            <input
              type="search"
              className="table-search-input"
              id="memberAttendance30Search"
              placeholder="Search last 30 days attendance..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <input
              type="date"
              className="table-search-input"
              id="memberAttendance30DateFrom"
              title="From date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <input
              type="date"
              className="table-search-input"
              id="memberAttendance30DateTo"
              title="To date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div className="member-attendance-30-scroll">
            <table className="diet-log-table member-attendance-30-table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Attended</th>
                </tr>
              </thead>
              <tbody id="memberAttendance30Attendance">
                {historyQuery.isLoading ? (
                  <tr>
                    <td colSpan={4}>Loading history…</td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No attendance rows found.</td>
                  </tr>
                ) : (
                  history.map((row) => {
                    const d = new Date(`${row.attendance_date}T12:00:00`);
                    return (
                      <tr key={row.id}>
                        <td>{d.toLocaleDateString(undefined, { weekday: 'short' })}</td>
                        <td>{row.attendance_date}</td>
                        <td>{new Date(row.checked_in_at).toLocaleTimeString()}</td>
                        <td>Yes</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </details>
    </section>
  );
}

function PaymentsSection({ active }: { active: boolean }) {
  const { client, userId, gym, membership } = useMemberContext();
  const paymentsQuery = useMemberPayments(client, userId, { gymId: gym?.id, limit: 100 });
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const payments = (paymentsQuery.data ?? []).filter((row) => {
    const paid = row.paid_at ? row.paid_at.slice(0, 10) : '';
    if (fromDate && paid && paid < fromDate) return false;
    if (toDate && paid && paid > toDate) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      String(row.amount).includes(q) ||
      (row.payment_mode ?? '').toLowerCase().includes(q) ||
      (row.status ?? '').toLowerCase().includes(q) ||
      (row.plan ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <section
      id="paymentsSection"
      className={`content-section${active ? ' active' : ''}`}
      hidden={!active}
    >
      <div className="section-title">
        <h2>Payments</h2>
        <p>Current membership billing and your full payment history</p>
      </div>

      <div className="panel-card">
        <div className="card-header">
          <h3>Current on file</h3>
          <span className="tag">Profile</span>
        </div>
        <p>
          <strong>Amount:</strong>{' '}
          <span id="paymentPageAmount">{formatMoney(membership?.amount)}</span>
        </p>
        <p>
          <strong>Payment mode:</strong>{' '}
          <span id="paymentPageMode">{membership?.payment_mode || '—'}</span>
        </p>
        <p>
          <strong>Payment status:</strong>{' '}
          <span id="paymentPageStatus">{titleCase(membership?.payment_status)}</span>
        </p>
      </div>

      <details className="panel-card member-payments-history-card section-collapsible">
        <summary className="section-collapsible-summary">
          <span className="section-collapsible-summary-text">
            <h3>All payment records</h3>
            <span className="tag">History</span>
          </span>
          <span className="section-collapsible-chevron" aria-hidden="true" />
        </summary>
        <div className="section-collapsible-body">
          <p className="message-text member-payments-history-hint">
            Each row is a payment logged by your gym (e.g. when your membership was approved or
            renewed).
          </p>
          <div className="table-filter-row table-filter-row--payments">
            <input
              type="search"
              className="table-search-input"
              id="memberPaymentsHistorySearch"
              placeholder="Search payment history..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="table-filter-dates">
              <input
                type="date"
                className="table-search-input table-filter-date"
                id="memberPaymentsHistoryDateFrom"
                title="From date"
                aria-label="From date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <input
                type="date"
                className="table-search-input table-filter-date"
                id="memberPaymentsHistoryDateTo"
                title="To date"
                aria-label="To date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
          <div className="member-payments-table-wrap">
            <table className="diet-log-table member-payments-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Amount</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th>Plan</th>
                </tr>
              </thead>
              <tbody id="memberPaymentsHistoryBody">
                {paymentsQuery.isLoading ? (
                  <tr>
                    <td colSpan={6}>Loading payments…</td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No matching payment rows found.</td>
                  </tr>
                ) : (
                  payments.map((row) => {
                    const paidAt = row.paid_at ? new Date(row.paid_at) : null;
                    return (
                      <tr key={row.id}>
                        <td>{paidAt ? paidAt.toLocaleDateString() : '—'}</td>
                        <td>
                          {paidAt
                            ? paidAt.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td>{formatMoney(row.amount)}</td>
                        <td>{row.payment_mode || '—'}</td>
                        <td>
                          {PAYMENT_STATUS_LABELS[row.status as PaymentStatus] ?? row.status}
                        </td>
                        <td>{row.plan ? planLabel(row.plan) : '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p id="memberPaymentsHistoryMessage" className="message-text" style={{ marginTop: 10 }} />
        </div>
      </details>
    </section>
  );
}

function DietSection({
  active,
  gymId,
  today,
}: {
  active: boolean;
  gymId: string | null;
  today: string;
}) {
  const { client, userId } = useMemberContext();
  const dietLogQuery = useDietLog(client, userId, today);
  const seasonId = getLeagueSeasonId();
  const mySeasonQuery = useLeagueSeason(client, userId, seasonId);
  const dietDatesQuery = useDietLogDates(client, userId, 40);
  const historyQuery = useDietLogs(client, userId, 14);

  if (dietLogQuery.isLoading) {
    return (
      <section
        id="dietSection"
        className={`content-section diet-dashboard-v2${active ? ' active' : ''}`}
        hidden={!active}
      >
        <div className="section-title diet-dash-title">
          <h2>Diet Dashboard</h2>
          <p className="diet-dash-subtitle">Loading…</p>
        </div>
      </section>
    );
  }

  const initialFoods = (dietLogQuery.data?.foods as DietFood[] | null) ?? [];
  const initialTotals = (dietLogQuery.data?.totals ?? {}) as { waterLiters?: number };

  return (
    <DietSectionEditor
      key={dietLogQuery.data?.id ?? `new-${today}`}
      active={active}
      initialFoods={initialFoods}
      initialWaterLiters={Number(initialTotals.waterLiters) || 0}
      today={today}
      gymId={gymId}
      seasonId={seasonId}
      seasonPoints={mySeasonQuery.data?.total_points ?? 0}
      loggedDates={dietDatesQuery.data ?? []}
      history={historyQuery.data ?? []}
      onRefresh={() => void dietLogQuery.refetch()}
    />
  );
}

function DietSectionEditor({
  active,
  initialFoods,
  initialWaterLiters,
  today,
  gymId,
  seasonId,
  seasonPoints,
  loggedDates,
  history,
  onRefresh,
}: {
  active: boolean;
  initialFoods: DietFood[];
  initialWaterLiters: number;
  today: string;
  gymId: string | null;
  seasonId: string;
  seasonPoints: number;
  loggedDates: string[];
  history: Array<{
    id: string;
    log_date: string;
    diet_score: number | null;
    totals: unknown;
  }>;
  onRefresh: () => void;
}) {
  const { client, userId, profile } = useMemberContext();
  const [foods, setFoods] = useState<DietFood[]>(initialFoods);
  const [waterLiters, setWaterLiters] = useState(initialWaterLiters);
  const [mealSlot, setMealSlot] = useState<MealSlot>('morning');
  const [foodQuery, setFoodQuery] = useState('');
  const [grams, setGrams] = useState('150');
  const [waterAmount, setWaterAmount] = useState('');
  const [waterUnit, setWaterUnit] = useState<'ml' | 'l'>('ml');
  const [customMeal, setCustomMeal] = useState<MealSlot>('morning');
  const [customItem, setCustomItem] = useState('');
  const [customWeight, setCustomWeight] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [entryMessage, setEntryMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [dietTab, setDietTab] = useState<'trend' | 'league' | 'streaks'>('trend');
  const [showGoals, setShowGoals] = useState(false);

  const attendanceQuery = useMemberAttendanceToday(client, userId, today);
  const saveDiet = useSaveDietDay(client);

  const dietProfile = useMemo(
    () => (profile ? profileToDietInput(profile) : { bodyGoal: 'maintain' as const }),
    [profile],
  );
  const targets = useMemo(() => buildDietTargetsFromProfile(dietProfile), [dietProfile]);
  const totals = useMemo(() => totalsFromFoods(foods, waterLiters), [foods, waterLiters]);
  const consistencyMeta = getDietConsistencyBonus(
    new Set(loggedDates),
    today,
    foods.length > 0,
  );
  const score = computeDietScoreV2({
    totals,
    targets,
    foods,
    attendedToday: Boolean(attendanceQuery.data),
    consistencyMeta,
    userData: dietProfile,
  });
  const suggestions =
    foodQuery.trim().length >= 1 ? searchNutritionCatalog(foodQuery, 8) : [];
  const streakCurrent = computeMealLogStreak(
    new Set(loggedDates),
    today,
    foods.length > 0 || waterLiters > 0,
  );

  const calMax = targets?.calMax || targets?.calorieCenter || 2000;
  const proteinMax = targets?.proteinMaxGrams || 120;
  const waterGoal = targets?.waterGoalLiters || 3;
  const proteinPct = Math.min(100, Math.round(((Number(totals.protein) || 0) / proteinMax) * 100));
  const calPct = Math.min(100, Math.round(((Number(totals.calories) || 0) / calMax) * 100));
  const waterPct = Math.min(100, Math.round((waterLiters / waterGoal) * 100));

  function addCatalogFood() {
    const label = foodQuery.trim();
    if (!label) {
      setEntryMessage('Enter a food name.');
      return;
    }
    const match = suggestions[0] ?? searchNutritionCatalog(label, 1)[0];
    const key = match?.key ?? resolveFoodKey(label) ?? label;
    const resolvedKey = resolveFoodKey(key) ?? resolveFoodKey(label) ?? key;
    const entry = NUTRITION_DB[resolvedKey];
    if (!entry) {
      setEntryMessage('Food not found in catalog. Try Custom item.');
      return;
    }
    const g = Number(grams) || 100;
    const macros = scaleNutritionEntry(entry, g);
    setFoods((prev) => [
      ...prev,
      {
        name: match?.label ?? label,
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        junk: macros.junk,
        neutral: macros.neutral,
        mealSlot,
        loggedAt: new Date().toISOString(),
      },
    ]);
    setFoodQuery('');
    setEntryMessage('Food added.');
  }

  function addCustomFood() {
    const name = customItem.trim();
    if (!name) {
      setEntryMessage('Enter a custom item name.');
      return;
    }
    setFoods((prev) => [
      ...prev,
      {
        name,
        calories: Number(customCalories) || 0,
        protein: Number(customProtein) || 0,
        carbs: 0,
        fat: 0,
        mealSlot: customMeal,
        loggedAt: new Date().toISOString(),
      },
    ]);
    setCustomItem('');
    setCustomCalories('');
    setCustomProtein('');
    setCustomWeight('');
    setEntryMessage('Custom food added.');
  }

  function addWater() {
    const amount = Number(waterAmount) || 0;
    if (amount <= 0) return;
    const liters = waterUnit === 'l' ? amount : amount / 1000;
    setWaterLiters((prev) => Math.round((prev + liters) * 100) / 100);
    setWaterAmount('');
    setEntryMessage('Water added.');
  }

  async function handleSave() {
    if (!userId) return;
    if (foods.length === 0 && waterLiters <= 0) {
      setSaveMessage('Add at least one food or water entry before saving.');
      return;
    }
    try {
      const result = await saveDiet.mutateAsync({
        userId,
        gymId,
        logDate: today,
        foods,
        totals,
        profile: dietProfile,
        attendedToday: Boolean(attendanceQuery.data),
        loggedDatesLast21Days: loggedDates,
        hasEntriesToday: foods.length > 0,
      });
      setSaveMessage(
        `Saved · diet score ${result.score.score} · fitness ${result.fitnessScore}`,
      );
      onRefresh();
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Failed to save diet day.');
    }
  }

  return (
    <section
      id="dietSection"
      className={`content-section diet-dashboard-v2${active ? ' active' : ''}`}
      hidden={!active}
    >
      <div className="section-title diet-dash-title">
        <h2>Diet Dashboard</h2>
        <p className="diet-dash-subtitle">Track meals, water, score, and streak.</p>
      </div>

      <div className="diet-zone-nutrition-top">
        <div className="panel-card diet-panel-nutrition">
          <div className="card-header diet-panel-head">
            <h3>Nutrition summary</h3>
          </div>
          <div className="diet-nutrition-totals diet-nutrition-totals--flat">
            <div className="diet-nut-stat">
              <span className="diet-nut-label">Calories</span>
              <span className="diet-nut-num" id="dietTotalCalories">
                {Math.round(Number(totals.calories) || 0)}
              </span>
            </div>
            <div className="diet-nut-stat">
              <span className="diet-nut-label">Protein</span>
              <span className="diet-nut-num" id="dietTotalProtein">
                {Math.round(Number(totals.protein) || 0)}
              </span>
            </div>
            <div className="diet-nut-stat">
              <span className="diet-nut-label">Carbs</span>
              <span className="diet-nut-num" id="dietTotalCarbs">
                {Math.round(Number(totals.carbs) || 0)}
              </span>
            </div>
            <div className="diet-nut-stat">
              <span className="diet-nut-label">Fat</span>
              <span className="diet-nut-num" id="dietTotalFat">
                {Math.round(Number(totals.fat) || 0)}
              </span>
            </div>
          </div>
          <div className="diet-progress-stack">
            <div className="diet-progress-row diet-progress-row--tight">
              <span className="diet-progress-inline-label" id="dietProteinGoalLabel">
                Protein target {Math.round(Number(totals.protein) || 0)} / {proteinMax} g
              </span>
              <div className="diet-progress-track">
                <div
                  id="proteinProgressBar"
                  className="diet-progress-fill"
                  style={{ width: `${proteinPct}%` }}
                />
              </div>
            </div>
            <div className="diet-progress-row diet-progress-row--tight">
              <span className="diet-progress-inline-label" id="dietCalorieGoalLabel">
                Calories target {Math.round(Number(totals.calories) || 0)} / {calMax}
              </span>
              <div className="diet-progress-track">
                <div
                  id="calorieProgressBar"
                  className="diet-progress-fill"
                  style={{ width: `${calPct}%` }}
                />
              </div>
            </div>
            <div className="diet-progress-row diet-progress-row--tight">
              <span className="diet-progress-inline-label" id="dietWaterGoalLabel">
                Water goal {waterLiters.toFixed(2)} / {waterGoal} L
              </span>
              <div className="diet-progress-track">
                <div
                  id="waterProgressBar"
                  className="diet-progress-fill"
                  style={{ width: `${waterPct}%` }}
                />
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn-diet-secondary diet-nutrition-goals-btn"
            onClick={() => setShowGoals((v) => !v)}
          >
            Set my own goals
          </button>
          {showGoals ? (
            <p className="diet-details-note">
              Manual goals editing is available from Profile → Health &amp; goals in a future
              update. Targets currently come from your profile.
            </p>
          ) : null}
        </div>
      </div>

      <div className="diet-zone-work diet-zone-work--tight">
        <div className="panel-card diet-panel-log-today diet-panel--fixed-h">
          <div className="card-header diet-panel-head">
            <h3>Log today</h3>
            <button
              type="button"
              className="btn-diet-ghost"
              title="Clear today"
              onClick={() => {
                setFoods([]);
                setWaterLiters(0);
                setEntryMessage('Local log cleared.');
              }}
            >
              Clear log
            </button>
          </div>
          <div className="diet-meal-add-block">
            <div className="diet-meal-add-row diet-meal-add-row-main diet-meal-unified-row">
              <div className="diet-meal-select-wrap">
                <label htmlFor="dietAddMeal">Meal</label>
                <select
                  id="dietAddMeal"
                  value={mealSlot}
                  onChange={(e) => setMealSlot(e.target.value as MealSlot)}
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Night</option>
                </select>
              </div>
              <div className="diet-autocomplete-wrap diet-autocomplete-wrap-grow">
                <label htmlFor="dietAddItem">Food</label>
                <input
                  type="text"
                  id="dietAddItem"
                  autoComplete="off"
                  placeholder="Search food…"
                  value={foodQuery}
                  onChange={(e) => setFoodQuery(e.target.value)}
                />
                {suggestions.length > 0 ? (
                  <ul className="diet-suggest-list" role="listbox">
                    {suggestions.map((s) => (
                      <li key={s.key}>
                        <button
                          type="button"
                          onClick={() => {
                            setFoodQuery(s.label);
                          }}
                        >
                          {s.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div className="diet-grams-wrap">
                <label htmlFor="dietAddAmount">Grams</label>
                <input
                  type="text"
                  id="dietAddAmount"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="150"
                  value={grams}
                  onChange={(e) => setGrams(e.target.value)}
                />
              </div>
              <div className="diet-add-btn-wrap">
                <label className="diet-add-label-spacer">&nbsp;</label>
                <button type="button" className="btn-diet-primary" onClick={addCatalogFood}>
                  Add
                </button>
              </div>
            </div>
            <details className="diet-custom-add-wrap">
              <summary className="diet-custom-add-title">Custom item (manual macros)</summary>
              <div className="diet-meal-add-row diet-meal-add-row-custom">
                <div className="diet-meal-select-wrap">
                  <label htmlFor="dietCustomMeal">Meal</label>
                  <select
                    id="dietCustomMeal"
                    value={customMeal}
                    onChange={(e) => setCustomMeal(e.target.value as MealSlot)}
                  >
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="evening">Night</option>
                  </select>
                </div>
                <div className="diet-autocomplete-wrap">
                  <label htmlFor="dietCustomItem">Item</label>
                  <input
                    type="text"
                    id="dietCustomItem"
                    className="diet-item-input"
                    autoComplete="off"
                    placeholder="e.g. Whey shake"
                    value={customItem}
                    onChange={(e) => setCustomItem(e.target.value)}
                  />
                </div>
                <div className="diet-grams-wrap">
                  <label htmlFor="dietCustomWeight">Weight (g)</label>
                  <input
                    type="number"
                    id="dietCustomWeight"
                    min={0}
                    step="any"
                    placeholder="120"
                    value={customWeight}
                    onChange={(e) => setCustomWeight(e.target.value)}
                  />
                </div>
                <div className="diet-grams-wrap">
                  <label htmlFor="dietCustomProtein">Protein (g)</label>
                  <input
                    type="number"
                    id="dietCustomProtein"
                    min={0}
                    step="any"
                    placeholder="24"
                    value={customProtein}
                    onChange={(e) => setCustomProtein(e.target.value)}
                  />
                </div>
                <div className="diet-grams-wrap">
                  <label htmlFor="dietCustomCalories">Calories</label>
                  <input
                    type="number"
                    id="dietCustomCalories"
                    min={0}
                    step="any"
                    placeholder="180"
                    value={customCalories}
                    onChange={(e) => setCustomCalories(e.target.value)}
                  />
                </div>
                <div className="diet-add-btn-wrap">
                  <label className="diet-add-label-spacer">&nbsp;</label>
                  <button type="button" className="btn-diet-secondary" onClick={addCustomFood}>
                    Add custom
                  </button>
                </div>
              </div>
            </details>
          </div>
          <div className="diet-water-inline">
            <label htmlFor="dietWaterAmount" className="diet-water-inline-label">
              Water
            </label>
            <input
              type="number"
              id="dietWaterAmount"
              min={0}
              step="any"
              className="diet-water-inline-input"
              placeholder="Amount"
              value={waterAmount}
              onChange={(e) => setWaterAmount(e.target.value)}
            />
            <select
              id="dietWaterUnit"
              className="diet-water-inline-unit"
              value={waterUnit}
              onChange={(e) => setWaterUnit(e.target.value as 'ml' | 'l')}
            >
              <option value="ml">ml</option>
              <option value="l">L</option>
            </select>
            <button type="button" className="btn-diet-secondary" onClick={addWater}>
              Add water
            </button>
          </div>
          <p className="diet-water-total-line">
            Total:{' '}
            <strong id="dietWaterTotalDisplay">
              {Math.round(waterLiters * 1000)} ml ({waterLiters.toFixed(2)} L)
            </strong>
          </p>
          <p id="dietEntryMessage" className="message-text diet-entry-message">
            {entryMessage}
          </p>
        </div>

        <div className="panel-card diet-panel-food-log diet-panel--fixed-h">
          <div className="card-header diet-panel-head">
            <h3>Today&apos;s food log</h3>
          </div>
          <div className="diet-meal-breakdown diet-meal-breakdown--inline" id="dietMealBreakdown">
            <div className="diet-meal-card diet-meal-card--compact">
              <span className="diet-meal-card-label">Morning</span>
              <strong className="diet-meal-card-kcal">
                <span id="dietMealMorningKcal">{mealKcal(foods, 'morning')}</span> kcal
              </strong>
              <p className="diet-meal-card-detail" id="dietMealMorningDetail">
                {mealDetail(foods, 'morning')}
              </p>
            </div>
            <div className="diet-meal-card diet-meal-card--compact">
              <span className="diet-meal-card-label">Afternoon</span>
              <strong className="diet-meal-card-kcal">
                <span id="dietMealAfternoonKcal">{mealKcal(foods, 'afternoon')}</span> kcal
              </strong>
              <p className="diet-meal-card-detail" id="dietMealAfternoonDetail">
                {mealDetail(foods, 'afternoon')}
              </p>
            </div>
            <div className="diet-meal-card diet-meal-card--compact">
              <span className="diet-meal-card-label">Night</span>
              <strong className="diet-meal-card-kcal">
                <span id="dietMealEveningKcal">{mealKcal(foods, 'evening')}</span> kcal
              </strong>
              <p className="diet-meal-card-detail" id="dietMealEveningDetail">
                {mealDetail(foods, 'evening')}
              </p>
            </div>
          </div>
          <div className="diet-today-log-scroll">
            <div className="diet-today-log diet-today-log--compact" aria-label="Today's food log">
              <div id="dietFoodList" className="diet-today-log-list">
                {foods.length === 0 ? (
                  <div className="diet-log-empty">No foods added today.</div>
                ) : (
                  foods.map((food, index) => (
                    <div key={`${food.name}-${index}`} className="diet-log-row">
                      <span>
                        {food.name} · {food.mealSlot} · {Math.round(Number(food.calories) || 0)}{' '}
                        kcal
                      </span>
                      <button
                        type="button"
                        className="btn-diet-ghost"
                        onClick={() => setFoods((prev) => prev.filter((_, i) => i !== index))}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="diet-zone-score-row">
        <div className="panel-card diet-panel-score diet-panel-performance diet-panel-score--compact">
          <div className="card-header diet-panel-head diet-panel-head--score">
            <h3>Diet score</h3>
          </div>
          <div className="diet-score-hero diet-score-hero--tight">
            <div
              className="score-circle diet-score-circle-v2 diet-score-circle-v2--compact"
              id="dietScoreCircle"
            >
              <span className="diet-score-number-wrap">
                <span id="dietScoreValue">{score.score}</span>
              </span>
            </div>
            <p className="diet-score-status-line diet-score-status-line--solo">
              <span id="dietScoreLabel">{score.label}</span>
            </p>
            <p className="diet-score-sub">
              Timing, quality, consistency, gym &amp; hydration — save to persist.
            </p>
          </div>
          <div className="diet-score-cta-bar">
            <button
              type="button"
              className="btn-diet-primary btn-diet-save-cta"
              onClick={() => void handleSave()}
              disabled={saveDiet.isPending}
            >
              {saveDiet.isPending ? 'Saving…' : 'Save today'}
            </button>
            <button
              type="button"
              className="btn-diet-secondary btn-diet-refresh-inline"
              onClick={onRefresh}
            >
              Refresh
            </button>
          </div>
          <div className="diet-score-split diet-score-split--stacked">
            <details className="diet-score-metrics-details" open>
              <summary className="diet-score-metrics-summary">Score breakdown</summary>
              <div className="diet-score-metrics-inner">
                <div className="diet-score-breakdown-card" id="dietScoreBreakdownCard">
                  <p className="diet-score-split-title">Points from</p>
                  <ul className="diet-breakdown-list diet-breakdown-list--compact" id="dietScoreBreakdownList">
                    <li>
                      <span>Timing</span>
                      <span id="dietBreakdownTiming">
                        {score.parts.timing} / {DIET_SCORE_PART_MAX.timing}
                      </span>
                    </li>
                    <li>
                      <span>Quality</span>
                      <span id="dietBreakdownQuality">
                        {score.parts.quality} / {DIET_SCORE_PART_MAX.quality}
                      </span>
                    </li>
                    <li>
                      <span>Consistency</span>
                      <span id="dietBreakdownConsistency">
                        {score.parts.consistency} / {DIET_SCORE_PART_MAX.consistency}
                      </span>
                    </li>
                    <li>
                      <span>Gym</span>
                      <span id="dietBreakdownGym">
                        {score.parts.gym} / {DIET_SCORE_PART_MAX.gym}
                      </span>
                    </li>
                    <li>
                      <span>Hydration</span>
                      <span id="dietBreakdownHydration">
                        {score.parts.hydration} / {DIET_SCORE_PART_MAX.hydration}
                      </span>
                    </li>
                  </ul>
                  <p className="diet-breakdown-total" id="dietBreakdownTotal">
                    Total <strong>{score.score} / 100</strong>
                  </p>
                </div>
              </div>
            </details>
            <details className="diet-feedback-details diet-feedback-highlight-card">
              <summary className="diet-feedback-summary">
                <span className="diet-feedback-summary-icon" aria-hidden="true">
                  💡
                </span>{' '}
                Feedback
              </summary>
              <div id="dietFeedbackList" className="diet-feedback-list diet-feedback-list--tight">
                {(score.feedback ?? []).length === 0 ? (
                  <p className="message-text">No feedback yet — keep logging.</p>
                ) : (
                  (score.feedback ?? []).map((line) => <p key={line}>{line}</p>)
                )}
              </div>
            </details>
          </div>
          {score.recommendation ? (
            <div
              id="dietDailyRecommendation"
              className="diet-daily-recommendation diet-daily-recommendation--strip"
            >
              {score.recommendation}
            </div>
          ) : null}
          <p id="dietSaveMessage" className="message-text diet-save-msg">
            {saveMessage}
          </p>
        </div>
      </div>

      <div className="diet-zone-tabs">
        <div className="diet-tab-bar" role="tablist" aria-label="Diet progress">
          {(
            [
              ['trend', 'Weekly trend'],
              ['league', 'League'],
              ['streaks', 'Streaks'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`diet-tab${dietTab === id ? ' diet-tab--active' : ''}`}
              role="tab"
              aria-selected={dietTab === id}
              data-diet-tab={id}
              onClick={() => setDietTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          id="dietTabPanelTrend"
          className={`diet-tab-panel${dietTab === 'trend' ? ' diet-tab-panel--active' : ''}`}
          role="tabpanel"
          hidden={dietTab !== 'trend'}
        >
          <div className="panel-card diet-tab-card diet-tab-card--trend">
            <div className="diet-table-wrap">
              <table className="diet-mini-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Score</th>
                    <th>Cal</th>
                    <th>Protein</th>
                    <th>Water</th>
                  </tr>
                </thead>
                <tbody id="last7DietRows">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No history yet.</td>
                    </tr>
                  ) : (
                    history.slice(0, 7).map((row) => {
                      const t = (row.totals ?? {}) as {
                        calories?: number;
                        protein?: number;
                        waterLiters?: number;
                      };
                      return (
                        <tr key={row.id}>
                          <td>{row.log_date}</td>
                          <td>{row.diet_score ?? '—'}</td>
                          <td>{Math.round(Number(t.calories) || 0)}</td>
                          <td>{Math.round(Number(t.protein) || 0)}</td>
                          <td>{Number(t.waterLiters) || 0}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div
          id="dietTabPanelLeague"
          className="diet-tab-panel"
          role="tabpanel"
          hidden={dietTab !== 'league'}
        >
          <div className="panel-card diet-tab-card league-season-panel">
            <div className="card-header diet-panel-head">
              <h3>Season league</h3>
            </div>
            <p>
              <strong>Season:</strong>{' '}
              <span id="leagueSeasonLabel">{getLeagueSeasonLabel(seasonId)}</span>
            </p>
            <p>
              <strong>Your points:</strong> <span id="leagueMyPoints">{seasonPoints}</span>
            </p>
            <p>
              <strong>Tier:</strong>{' '}
              <span id="leagueMyTier">{getLeagueTierLabel(seasonPoints, seasonId)}</span>
            </p>
          </div>
        </div>

        <div
          id="dietTabPanelStreaks"
          className="diet-tab-panel"
          role="tabpanel"
          hidden={dietTab !== 'streaks'}
        >
          <div className="panel-card diet-tab-card diet-streak-tab-card">
            <div className="card-header diet-panel-head">
              <h3>Streaks &amp; badges</h3>
            </div>
            <p className="diet-streak-line">
              <strong>
                <span id="dietStreakCurrent">{streakCurrent}</span>
              </strong>{' '}
              day<span id="dietStreakPlural">{streakCurrent === 1 ? '' : 's'}</span> in a row
            </p>
            <span className="diet-streak-tag" id="dietStreakTag">
              {streakCurrent > 0 ? `${streakCurrent} day streak` : '—'}
            </span>
            <p className="message-text diet-streak-hint" id="dietStreakMilestoneHint">
              Log meals every day to build a streak.
            </p>
            <div className="badge-list" id="memberBadges" />
          </div>
        </div>
      </div>
    </section>
  );
}

function LeaderboardSection({
  active,
  onOpenFriends,
}: {
  active: boolean;
  onOpenFriends: () => void;
}) {
  const { client, userId } = useMemberContext();
  const seasonId = getLeagueSeasonId();
  const boardQuery = useLeagueLeaderboard(client, seasonId, 50);
  const sendFriend = useSendFriendRequest(client);
  const [search, setSearch] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const rows = boardQuery.data ?? [];
  const profileIds = rows.map((r) => r.user_id);
  const profilesQuery = useProfilesMap(client, profileIds);
  const profiles = profilesQuery.data ?? {};
  const myIndex = rows.findIndex((r) => r.user_id === userId);
  const myRow = myIndex >= 0 ? rows[myIndex] : null;

  const filtered = rows.filter((row) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    const name = displayName(profiles[row.user_id], row.user_id).toLowerCase();
    const tier = getLeagueTierLabel(row.total_points, seasonId).toLowerCase();
    return name.includes(q) || tier.includes(q) || String(row.total_points).includes(q);
  });

  async function addFriend(targetUserId: string) {
    if (!userId) return;
    const email = profiles[targetUserId]?.email;
    if (!email) {
      setActionMessage('That member has no email on file.');
      return;
    }
    try {
      await sendFriend.mutateAsync({ fromUserId: userId, email });
      setActionMessage(`Friend request sent to ${displayName(profiles[targetUserId], targetUserId)}.`);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Could not send request.');
    }
  }

  return (
    <section
      id="memberLeaderboardSection"
      className={`content-section${active ? ' active' : ''}`}
      hidden={!active}
    >
      <div className="section-title">
        <h2>Leaderboard</h2>
        <p>Season ranking across all gyms</p>
      </div>
      <div className="panel-card">
        <div className="card-header">
          <h3>Gym Leaderboard</h3>
          <span className="tag" id="leagueLeaderboardSeasonTag">
            {getLeagueSeasonLabel(seasonId)}
          </span>
        </div>
        <p className="leaderboard-global-note">Global ranking (all gyms)</p>
        <p className="message-text" style={{ marginBottom: 10, fontSize: 13 }}>
          Ranked by <strong>season league points</strong> (this quarter).
        </p>
        {myRow ? (
          <div id="memberLeaderboardPinned" className="leaderboard-you-row">
            Your rank: #{myIndex + 1} · {myRow.total_points} pts ·{' '}
            {getLeagueTierLabel(myRow.total_points, seasonId)}
          </div>
        ) : null}
        <input
          type="search"
          className="table-search-input"
          id="dietLeaderboardSearch"
          placeholder="Search leaderboard by member/tier/points..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {actionMessage ? <p className="message-text">{actionMessage}</p> : null}
        <div style={{ overflowX: 'auto' }}>
          <table className="mobile-table mobile-table-member-leaderboard">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Member</th>
                <th>League</th>
                <th>Tier</th>
                <th>Today</th>
                <th>Diet</th>
                <th>Gym</th>
                <th>Friend</th>
              </tr>
            </thead>
            <tbody id="dietLeaderboardTable">
              {boardQuery.isLoading ? (
                <tr>
                  <td colSpan={8}>Loading leaderboard…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>No matching leaderboard members found.</td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const rank = rows.findIndex((r) => r.user_id === row.user_id) + 1;
                  const isYou = row.user_id === userId;
                  return (
                    <tr key={row.id}>
                      <td>{rank}</td>
                      <td>
                        {displayName(profiles[row.user_id], row.user_id)}
                        {isYou ? ' (You)' : ''}
                      </td>
                      <td>{row.total_points}</td>
                      <td>{getLeagueTierLabel(row.total_points, seasonId)}</td>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                      <td>
                        {!isYou ? (
                          <button
                            type="button"
                            className="outline-btn"
                            disabled={sendFriend.isPending}
                            onClick={() => void addFriend(row.user_id)}
                          >
                            Add
                          </button>
                        ) : (
                          <button type="button" className="outline-btn" onClick={onOpenFriends}>
                            Friends
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function FriendsSection({ active }: { active: boolean }) {
  const { client, userId } = useMemberContext();
  const [email, setEmail] = useState('');
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');

  const requestsQuery = useFriendRequests(client, userId);
  const friendshipsQuery = useFriendships(client, userId);
  const sendRequest = useSendFriendRequest(client);
  const respond = useRespondToFriendRequest(client);
  const sendMessage = useSendChatMessage(client);

  const friendIds = friendshipsQuery.data?.friendIds ?? [];
  const incoming = (requestsQuery.data ?? []).filter((r) => r.to_user_id === userId);
  const profileIds = useMemo(() => {
    const ids = new Set<string>(friendIds);
    (requestsQuery.data ?? []).forEach((r) => {
      ids.add(r.from_user_id);
      ids.add(r.to_user_id);
    });
    return [...ids];
  }, [friendIds, requestsQuery.data]);
  const profilesQuery = useProfilesMap(client, profileIds);
  const profiles = profilesQuery.data ?? {};
  const activeFriendId =
    selectedFriendId && friendIds.includes(selectedFriendId)
      ? selectedFriendId
      : friendIds[0] ?? null;
  const chatQuery = useChatMessages(client, userId, activeFriendId);

  async function handleSendRequest(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;
    try {
      await sendRequest.mutateAsync({ fromUserId: userId, email });
      setEmail('');
      setMessage('Friend request sent.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to send request.');
    }
  }

  return (
    <section
      id="friendsSection"
      className={`content-section${active ? ' active' : ''}`}
      hidden={!active}
    >
      <div className="section-title">
        <h2>Friends & Chat</h2>
        <p>Send friend requests and chat privately with your gym friends</p>
      </div>

      <div className="panel-card">
        <div className="card-header">
          <h3>Add friend</h3>
          <span className="tag">Request</span>
        </div>
        <form className="friends-request-row" onSubmit={(e) => void handleSendRequest(e)}>
          <input
            type="email"
            id="friendRequestEmail"
            placeholder="Enter friend's email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={sendRequest.isPending}>
            Send request
          </button>
        </form>
        <p id="friendRequestMessage" className="message-text">
          {message}
        </p>
      </div>

      <div className="main-grid" style={{ marginTop: 16 }}>
        <div className="panel-card">
          <div className="card-header">
            <h3>Incoming requests</h3>
            <span className="tag">Pending</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>From</th>
                  <th>Email</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody id="friendRequestsTable">
                {incoming.length === 0 ? (
                  <tr>
                    <td colSpan={3}>No pending requests.</td>
                  </tr>
                ) : (
                  incoming.map((req) => (
                    <tr key={req.id}>
                      <td>{displayName(profiles[req.from_user_id], req.from_user_id)}</td>
                      <td>{profiles[req.from_user_id]?.email ?? '—'}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() =>
                            void respond.mutateAsync({
                              requestId: req.id,
                              status: 'accepted',
                              userId: userId!,
                            })
                          }
                        >
                          Accept
                        </button>{' '}
                        <button
                          type="button"
                          className="outline-btn"
                          onClick={() =>
                            void respond.mutateAsync({
                              requestId: req.id,
                              status: 'rejected',
                              userId: userId!,
                            })
                          }
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel-card">
          <div className="card-header">
            <h3>Your friends</h3>
            <span className="tag">Chat</span>
          </div>
          <div id="friendsList" className="friends-list">
            {friendIds.length === 0 ? (
              <p className="message-text">No friends yet.</p>
            ) : (
              friendIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={activeFriendId === id ? 'friend-item active' : 'friend-item'}
                  onClick={() => setSelectedFriendId(id)}
                >
                  {displayName(profiles[id], id)}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="panel-card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <h3 id="chatWithTitle">
            Chat
            {activeFriendId
              ? ` · ${displayName(profiles[activeFriendId], activeFriendId)}`
              : ''}
          </h3>
          <span className="tag">Private</span>
        </div>
        <div id="chatMessages" className="chat-messages">
          {!activeFriendId ? (
            <p className="message-text">Select a friend to start chatting.</p>
          ) : (chatQuery.data ?? []).length === 0 ? (
            <p className="message-text">No messages yet.</p>
          ) : (
            (chatQuery.data ?? []).map((msg) => (
              <div
                key={msg.id}
                className={msg.sender_id === userId ? 'chat-bubble mine' : 'chat-bubble'}
              >
                <p>{msg.body}</p>
                <small>{new Date(msg.created_at).toLocaleString()}</small>
              </div>
            ))
          )}
        </div>
        <div className="friends-request-row" style={{ marginTop: 12 }}>
          <input
            type="text"
            id="chatInput"
            placeholder="Type a message..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={!activeFriendId}
          />
          <button
            type="button"
            disabled={!activeFriendId || !draft.trim() || sendMessage.isPending}
            onClick={() => {
              if (!userId || !activeFriendId || !draft.trim()) return;
              void sendMessage
                .mutateAsync({
                  senderId: userId,
                  recipientId: activeFriendId,
                  body: draft.trim(),
                })
                .then(() => setDraft(''))
                .catch((err: unknown) =>
                  setMessage(err instanceof Error ? err.message : 'Failed to send.'),
                );
            }}
          >
            Send
          </button>
        </div>
        <p id="chatStatusMessage" className="message-text" />
      </div>
    </section>
  );
}

function ProfileSection({ active }: { active: boolean }) {
  const { profile } = useMemberContext();
  const prefs = (profile?.diet_preferences ?? {}) as Record<string, unknown>;
  const [profileMessage, setProfileMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  const heightCm = Number(prefs.heightCm) || 0;
  const totalInches = heightCm > 0 ? heightCm / 2.54 : 0;
  const feet = totalInches > 0 ? Math.floor(totalInches / 12) : '';
  const inches = totalInches > 0 ? Math.round(totalInches % 12) : '';

  return (
    <section
      id="profileSection"
      className={`content-section${active ? ' active' : ''}`}
      hidden={!active}
    >
      <div className="section-title">
        <h2>My Profile</h2>
        <p>View and update your personal details</p>
      </div>

      <div className="profile-card">
        <div className="profile-layout">
          <div className="profile-section">
            <h3 className="profile-section-heading">Contact</h3>
            <div className="profile-grid">
              <div className="form-group">
                <label htmlFor="profileFirstName">First name</label>
                <input
                  type="text"
                  id="profileFirstName"
                  defaultValue={profile?.first_name ?? ''}
                  readOnly
                />
              </div>
              <div className="form-group">
                <label htmlFor="profileLastName">Last name</label>
                <input
                  type="text"
                  id="profileLastName"
                  defaultValue={profile?.last_name ?? ''}
                  readOnly
                />
              </div>
              <div className="form-group">
                <label htmlFor="profileEmail">Email</label>
                <input type="email" id="profileEmail" value={profile?.email ?? ''} disabled />
              </div>
              <div className="form-group">
                <label htmlFor="profilePhone">Phone</label>
                <input
                  type="text"
                  id="profilePhone"
                  defaultValue={profile?.phone ?? ''}
                  readOnly
                />
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h3 className="profile-section-heading">Address</h3>
            <div className="profile-grid">
              <div className="form-group full-width">
                <label htmlFor="profileAddress">Street address</label>
                <input
                  type="text"
                  id="profileAddress"
                  defaultValue={profile?.address_line1 ?? ''}
                  readOnly
                />
              </div>
              <div className="form-group">
                <label htmlFor="profileCity">City</label>
                <input type="text" id="profileCity" defaultValue={profile?.city ?? ''} readOnly />
              </div>
              <div className="form-group">
                <label htmlFor="profileState">State</label>
                <input
                  type="text"
                  id="profileState"
                  defaultValue={profile?.state ?? ''}
                  readOnly
                />
              </div>
              <div className="form-group">
                <label htmlFor="profileZip">Zip code</label>
                <input
                  type="text"
                  id="profileZip"
                  defaultValue={profile?.postal_code ?? ''}
                  readOnly
                />
              </div>
            </div>
          </div>

          <details className="profile-section profile-section-collapsible">
            <summary className="profile-collapsible-summary">
              <h3 className="profile-section-heading">Health &amp; goals</h3>
              <span
                className="section-collapsible-chevron section-collapsible-chevron--dark"
                aria-hidden="true"
              />
            </summary>
            <div className="profile-collapsible-body">
              <p className="profile-section-hint">
                Used for calorie and nutrition targets. Display only in this build.
              </p>
              <div className="profile-grid profile-grid--health">
                <div className="form-group">
                  <label htmlFor="profileDob">Date of birth</label>
                  <input
                    type="date"
                    id="profileDob"
                    defaultValue={profile?.date_of_birth ?? ''}
                    readOnly
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="profileGender">Sex</label>
                  <input
                    type="text"
                    id="profileGender"
                    defaultValue={profile?.gender ?? ''}
                    readOnly
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="profileWeightKg">Weight (kg)</label>
                  <input
                    type="number"
                    id="profileWeightKg"
                    defaultValue={Number(prefs.weightKg) || ''}
                    readOnly
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="profileActivityLevel">Activity level</label>
                  <input
                    type="text"
                    id="profileActivityLevel"
                    defaultValue={String(prefs.activityLevel ?? '')}
                    readOnly
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="profileHeightFeet">Height — feet</label>
                  <input type="number" id="profileHeightFeet" defaultValue={feet} readOnly />
                </div>
                <div className="form-group">
                  <label htmlFor="profileHeightInches">Height — inches</label>
                  <input type="number" id="profileHeightInches" defaultValue={inches} readOnly />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="profileBodyGoal">Body goal</label>
                  <input
                    type="text"
                    id="profileBodyGoal"
                    defaultValue={profile?.body_goal ?? ''}
                    readOnly
                  />
                </div>
              </div>
            </div>
          </details>
        </div>

        <div className="profile-actions">
          <button
            type="button"
            onClick={() =>
              setProfileMessage('Profile editing is read-only in this legacy shell for now.')
            }
          >
            Save Changes
          </button>
        </div>
        <p id="profileMessage" className="message-text">
          {profileMessage}
        </p>

        <hr className="profile-divider" />

        <div className="password-card">
          <h3>Change Password</h3>
          <div className="form-group">
            <label>New Password</label>
            <input type="password" id="newPassword" placeholder="Enter new password" />
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input type="password" id="confirmPassword" placeholder="Confirm new password" />
          </div>
          <button
            type="button"
            onClick={() =>
              setPasswordMessage(
                'Password change is not available from this screen yet. Use account recovery or contact support.',
              )
            }
          >
            Update Password
          </button>
          <p id="passwordMessage" className="message-text">
            {passwordMessage}
          </p>
        </div>
      </div>
    </section>
  );
}
