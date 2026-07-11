'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  MEMBERSHIP_PLANS,
  MEMBERSHIP_PLAN_LABELS,
  PAYMENT_MODES,
  addDaysToYmd,
  attendanceCodeSchema,
  calculateCrowdLevel,
  calculateDaysLeft,
  countLiveMembers,
  getCrowdLabel,
  getLeagueSeasonId,
  getLeagueSeasonLabel,
  getLeagueTierLabel,
  getPlanLabel,
  getTodayYmd,
  type MembershipPlan,
} from '@smart-gym/shared';
import {
  queryKeys,
  signOut,
  sumPaidInMonth,
  updateProfile,
  useApproveMember,
  useBroadcastNotification,
  useGymAttendanceHistory,
  useGymAttendanceToday,
  useGymMembers,
  useGymNotifications,
  useGymPayments,
  useLeagueLeaderboard,
  useMarkAttendanceByCode,
  usePendingJoinRequests,
  useProfilesMap,
  useRecordPayment,
  useRejectJoinRequest,
  useUpdateGym,
} from '@smart-gym/supabase';
import { useOwnerContext } from '@/features/owner/components/owner-provider';
import { createClient } from '@/lib/supabase/client';

type SectionId =
  | 'dashboardSection'
  | 'membersSection'
  | 'attendanceSection'
  | 'reportsSection'
  | 'paymentsSection'
  | 'settingsSection'
  | 'exploreSection'
  | 'leaderboardSection'
  | 'profileSection';

type ReportPeriod = 'weekly' | 'monthly' | 'yearly';

type ApproveDraft = {
  plan: MembershipPlan;
  amount: string;
  paymentMode: string;
};

function displayName(
  profile: { full_name?: string; first_name?: string; last_name?: string; email?: string } | undefined,
  userId: string,
) {
  if (!profile) return userId.slice(0, 8) + '…';
  if (profile.full_name?.trim()) return profile.full_name.trim();
  const combined = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
  return combined || profile.email || userId.slice(0, 8) + '…';
}

function defaultPriceForPlan(
  gym: {
    price_1_month: number;
    price_3_month: number;
    price_6_month: number;
    price_12_month: number;
  } | null,
  plan: MembershipPlan,
): number {
  if (!gym) return 0;
  switch (plan) {
    case '1_month':
      return Number(gym.price_1_month) || 0;
    case '3_month':
      return Number(gym.price_3_month) || 0;
    case '6_month':
      return Number(gym.price_6_month) || 0;
    case '12_month':
      return Number(gym.price_12_month) || 0;
  }
}

function parsePrice(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function matchesQuery(haystack: string, query: string) {
  if (!query.trim()) return true;
  return haystack.toLowerCase().includes(query.trim().toLowerCase());
}

function ymdFromIso(iso: string | null | undefined) {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function CrowdMeterDots({ level }: { level: number }) {
  return (
    <div
      className="crowd-meter"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={5}
      aria-valuenow={level}
      aria-label="Gym crowd level from 0 to 5"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`crowd-meter-seg ${n <= level ? 'crowd-meter-seg--on' : 'crowd-meter-seg--off'}`}
        />
      ))}
    </div>
  );
}

export function OwnerLegacyDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { client, gym, userId, profile } = useOwnerContext();
  const gymId = gym?.id;
  const today = getTodayYmd();
  const from30 = addDaysToYmd(today, -29);
  const seasonId = getLeagueSeasonId();

  const [activeSection, setActiveSection] = useState<SectionId>('dashboardSection');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [origin, setOrigin] = useState('');

  const [attendanceCode, setAttendanceCode] = useState('');
  const [attendanceResult, setAttendanceResult] = useState('');
  const [checkinToast, setCheckinToast] = useState<{ title: string; body: string } | null>(null);

  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifStatus, setNotifStatus] = useState('');

  const [recentSearch, setRecentSearch] = useState('');
  const [pendingSearch, setPendingSearch] = useState('');
  const [allMembersSearch, setAllMembersSearch] = useState('');
  const [todayAttSearch, setTodayAttSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTo, setHistoryTo] = useState('');
  const [paymentsSearch, setPaymentsSearch] = useState('');
  const [paymentsFrom, setPaymentsFrom] = useState('');
  const [paymentsTo, setPaymentsTo] = useState('');
  const [leaderboardSearch, setLeaderboardSearch] = useState('');

  const [approveDrafts, setApproveDrafts] = useState<Record<string, ApproveDraft>>({});
  const [membersActionMsg, setMembersActionMsg] = useState('');

  const [attPeriod, setAttPeriod] = useState<ReportPeriod>('weekly');
  const [incPeriod, setIncPeriod] = useState<ReportPeriod>('weekly');

  const [recordUserId, setRecordUserId] = useState('');
  const [recordPlan, setRecordPlan] = useState<MembershipPlan>('1_month');
  const [recordAmount, setRecordAmount] = useState('');
  const [recordMode, setRecordMode] = useState<string>(PAYMENT_MODES[0]);
  const [recordMsg, setRecordMsg] = useState('');

  const [settingsForm, setSettingsForm] = useState({
    name: '',
    phone: '',
    address: '',
    openingTime: '',
    closingTime: '',
    price1Month: '',
    price3Month: '',
    price6Month: '',
    price12Month: '',
  });
  const [settingsMessage, setSettingsMessage] = useState('');

  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
  });
  const [profileMessage, setProfileMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  const membersQuery = useGymMembers(client, gymId);
  const activeMembersQuery = useGymMembers(client, gymId, 'active');
  const pendingQuery = usePendingJoinRequests(client, gymId);
  const paymentsQuery = useGymPayments(client, { gymId, limit: 300 });
  const todayQuery = useGymAttendanceToday(client, gymId, today);
  const historyQuery = useGymAttendanceHistory(client, gymId, from30, today);
  const notificationsQuery = useGymNotifications(client, gymId);
  const leaderboardQuery = useLeagueLeaderboard(client, seasonId, 100);

  const mark = useMarkAttendanceByCode(client);
  const approve = useApproveMember(client);
  const reject = useRejectJoinRequest(client);
  const broadcast = useBroadcastNotification(client);
  const updateGym = useUpdateGym(client);
  const recordPayment = useRecordPayment(client);

  const members = membersQuery.data ?? [];
  const activeMembers = activeMembersQuery.data ?? [];
  const pending = pendingQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];
  const todayRows = todayQuery.data ?? [];
  const historyRows = historyQuery.data ?? [];
  const leaderboardRows = leaderboardQuery.data ?? [];
  const monthlyRevenue = sumPaidInMonth(payments);

  const profileIds = useMemo(() => {
    const ids = new Set<string>();
    members.forEach((m) => ids.add(m.user_id));
    pending.forEach((p) => ids.add(p.user_id));
    todayRows.forEach((r) => ids.add(r.user_id));
    historyRows.forEach((r) => ids.add(r.user_id));
    payments.forEach((p) => ids.add(p.user_id));
    leaderboardRows.forEach((r) => ids.add(r.user_id));
    return [...ids];
  }, [members, pending, todayRows, historyRows, payments, leaderboardRows]);

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
  const crowdLabel = getCrowdLabel(crowdLevel);

  const checkInUrl = gymId && origin ? `${origin}/check-in?gym=${gymId}` : gymId ? `/check-in?gym=${gymId}` : '';

  const weekStart = addDaysToYmd(today, -6);
  const monthStart = `${today.slice(0, 7)}-01`;
  const reportTodayCount = todayRows.length;
  const reportWeekCount = historyRows.filter((r) => r.attendance_date >= weekStart).length;
  const reportMonthCount = historyRows.filter((r) => r.attendance_date >= monthStart).length;

  useEffect(() => {
    setOrigin(window.location.origin);
    try {
      if (localStorage.getItem('sidebarCollapsed') === '1') {
        setSidebarCollapsed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!gym) return;
    setSettingsForm({
      name: gym.name ?? '',
      phone: gym.phone ?? '',
      address: gym.location ?? '',
      openingTime: gym.opening_time ?? '',
      closingTime: gym.closing_time ?? '',
      price1Month: String(gym.price_1_month ?? ''),
      price3Month: String(gym.price_3_month ?? ''),
      price6Month: String(gym.price_6_month ?? ''),
      price12Month: String(gym.price_12_month ?? ''),
    });
    setRecordAmount(String(defaultPriceForPlan(gym, '1_month')));
  }, [gym]);

  useEffect(() => {
    if (!profile) return;
    setProfileForm({
      firstName: profile.first_name ?? '',
      lastName: profile.last_name ?? '',
      email: profile.email ?? '',
      phone: profile.phone ?? '',
      address: profile.address_line1 ?? '',
      city: profile.city ?? '',
      state: profile.state ?? '',
      zip: profile.postal_code ?? '',
    });
  }, [profile]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileSidebarOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('mobile-sidebar-drawer-open', mobileSidebarOpen);
    return () => document.body.classList.remove('mobile-sidebar-drawer-open');
  }, [mobileSidebarOpen]);

  useEffect(() => {
    if (!checkinToast) return;
    const t = window.setTimeout(() => setCheckinToast(null), 4500);
    return () => window.clearTimeout(t);
  }, [checkinToast]);

  const showSection = useCallback((section: SectionId) => {
    setActiveSection(section);
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches) {
      setMobileSidebarOpen(false);
    } else {
      setSidebarCollapsed(true);
      try {
        localStorage.setItem('sidebarCollapsed', '1');
      } catch {
        /* ignore */
      }
    }
  }, []);

  function getApproveDraft(uid: string): ApproveDraft {
    return (
      approveDrafts[uid] ?? {
        plan: '1_month',
        amount: String(defaultPriceForPlan(gym, '1_month')),
        paymentMode: 'Cash',
      }
    );
  }

  function updateApproveDraft(uid: string, patch: Partial<ApproveDraft>) {
    setApproveDrafts((prev) => {
      const current = getApproveDraft(uid);
      const next = { ...current, ...patch };
      if (patch.plan && patch.amount === undefined) {
        next.amount = String(defaultPriceForPlan(gym, patch.plan));
      }
      return { ...prev, [uid]: next };
    });
  }

  async function handleLogout() {
    const supabase = createClient();
    await signOut(supabase);
    router.replace('/login');
    router.refresh();
  }

  async function handleMarkAttendance() {
    if (!gymId) return;
    setAttendanceResult('');
    const parsed = attendanceCodeSchema.safeParse(attendanceCode.trim());
    if (!parsed.success) {
      setAttendanceResult(parsed.error.issues[0]?.message ?? 'Enter a valid 4-digit code.');
      return;
    }
    try {
      const result = await mark.mutateAsync({ gymId, code: parsed.data });
      setAttendanceCode('');
      const name = result.member_name ?? 'Member';
      const body = result.already_marked
        ? `${name} was already marked today.`
        : `${name} checked in successfully.`;
      setAttendanceResult(body);
      setCheckinToast({ title: 'Member checked in', body });
      await todayQuery.refetch();
    } catch (err) {
      setAttendanceResult(err instanceof Error ? err.message : 'Failed to mark attendance.');
    }
  }

  async function handleSendNotification() {
    if (!gymId || !userId) return;
    setNotifStatus('');
    if (!notifTitle.trim() || !notifMessage.trim()) {
      setNotifStatus('Title and message are required.');
      return;
    }
    try {
      await broadcast.mutateAsync({
        gymId,
        title: notifTitle.trim(),
        body: notifMessage.trim(),
        createdBy: userId,
      });
      setNotifTitle('');
      setNotifMessage('');
      setNotifStatus('Notification sent to members.');
      await notificationsQuery.refetch();
    } catch (err) {
      setNotifStatus(err instanceof Error ? err.message : 'Failed to send notification.');
    }
  }

  async function handleApprove(requestUserId: string) {
    if (!gymId || !userId) return;
    setMembersActionMsg('');
    const draft = getApproveDraft(requestUserId);
    const amount = Number(draft.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      setMembersActionMsg('Enter a valid amount.');
      return;
    }
    try {
      await approve.mutateAsync({
        userId: requestUserId,
        gymId,
        plan: draft.plan,
        amount,
        paymentMode: draft.paymentMode,
        startDateYmd: today,
        reviewedBy: userId,
      });
      setMembersActionMsg('Member approved.');
    } catch (err) {
      setMembersActionMsg(err instanceof Error ? err.message : 'Approve failed.');
    }
  }

  async function handleReject(requestUserId: string) {
    if (!gymId || !userId) return;
    setMembersActionMsg('');
    try {
      await reject.mutateAsync({
        userId: requestUserId,
        gymId,
        reviewedBy: userId,
      });
      setMembersActionMsg('Request rejected.');
    } catch (err) {
      setMembersActionMsg(err instanceof Error ? err.message : 'Reject failed.');
    }
  }

  async function handleSaveSettings() {
    if (!gym) return;
    setSettingsMessage('');
    try {
      await updateGym.mutateAsync({
        gymId: gym.id,
        patch: {
          name: settingsForm.name.trim(),
          phone: settingsForm.phone.trim(),
          location: settingsForm.address.trim(),
          opening_time: settingsForm.openingTime || null,
          closing_time: settingsForm.closingTime || null,
          price_1_month: parsePrice(settingsForm.price1Month),
          price_3_month: parsePrice(settingsForm.price3Month),
          price_6_month: parsePrice(settingsForm.price6Month),
          price_12_month: parsePrice(settingsForm.price12Month),
        },
      });
      setSettingsMessage('Gym settings saved.');
    } catch (err) {
      setSettingsMessage(err instanceof Error ? err.message : 'Failed to save settings.');
    }
  }

  async function handleSaveProfile() {
    if (!userId) return;
    setProfileMessage('');
    try {
      const fullName = `${profileForm.firstName} ${profileForm.lastName}`.trim();
      await updateProfile(client, userId, {
        first_name: profileForm.firstName.trim(),
        last_name: profileForm.lastName.trim(),
        full_name: fullName,
        phone: profileForm.phone.trim(),
        address_line1: profileForm.address.trim(),
        city: profileForm.city.trim(),
        state: profileForm.state.trim(),
        postal_code: profileForm.zip.trim(),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) });
      setProfileMessage('Profile updated.');
    } catch (err) {
      setProfileMessage(err instanceof Error ? err.message : 'Failed to update profile.');
    }
  }

  async function handleChangePassword() {
    setPasswordMessage('');
    if (!newPassword || newPassword.length < 6) {
      setPasswordMessage('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage('Passwords do not match.');
      return;
    }
    try {
      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage('Password updated.');
    } catch (err) {
      setPasswordMessage(err instanceof Error ? err.message : 'Failed to update password.');
    }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!gymId || !recordUserId) {
      setRecordMsg('Select a member.');
      return;
    }
    const amount = Number(recordAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      setRecordMsg('Enter a valid amount.');
      return;
    }
    setRecordMsg('');
    try {
      await recordPayment.mutateAsync({
        gymId,
        userId: recordUserId,
        plan: recordPlan,
        amount,
        paymentMode: recordMode,
        extendMembership: true,
      });
      setRecordMsg('Payment recorded and membership renewed.');
      await paymentsQuery.refetch();
    } catch (err) {
      setRecordMsg(err instanceof Error ? err.message : 'Failed to record payment.');
    }
  }

  const recentMembers = useMemo(() => {
    const sorted = [...members].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    return sorted.slice(0, 8).filter((m) => {
      const name = displayName(profiles[m.user_id], m.user_id);
      return matchesQuery(
        `${name} ${m.plan ?? ''} ${m.status} ${m.payment_mode} ${m.amount ?? ''}`,
        recentSearch,
      );
    });
  }, [members, profiles, recentSearch]);

  const filteredPending = pending.filter((req) => {
    const name = displayName(profiles[req.user_id], req.user_id);
    return matchesQuery(`${name} ${gym?.code ?? ''} ${req.message}`, pendingSearch);
  });

  const filteredMembers = members.filter((m) => {
    const name = displayName(profiles[m.user_id], m.user_id);
    return matchesQuery(
      `${name} ${m.plan ?? ''} ${m.status} ${m.payment_mode} ${m.amount ?? ''} ${m.ends_at ?? ''}`,
      allMembersSearch,
    );
  });

  const filteredTodayAtt = todayRows.filter((row) => {
    const name = displayName(profiles[row.user_id], row.user_id);
    const email = profiles[row.user_id]?.email ?? '';
    return matchesQuery(`${name} ${email}`, todayAttSearch);
  });

  const filteredHistory = historyRows.filter((row) => {
    const name = displayName(profiles[row.user_id], row.user_id);
    const email = profiles[row.user_id]?.email ?? '';
    if (!matchesQuery(`${name} ${email} ${row.attendance_date}`, historySearch)) return false;
    if (historyFrom && row.attendance_date < historyFrom) return false;
    if (historyTo && row.attendance_date > historyTo) return false;
    return true;
  });

  const filteredPayments = payments.filter((row) => {
    const name = displayName(profiles[row.user_id], row.user_id);
    const paidYmd = ymdFromIso(row.paid_at);
    if (!matchesQuery(`${name} ${row.plan ?? ''} ${row.payment_mode} ${row.amount}`, paymentsSearch)) {
      return false;
    }
    if (paymentsFrom && paidYmd && paidYmd < paymentsFrom) return false;
    if (paymentsTo && paidYmd && paidYmd > paymentsTo) return false;
    return true;
  });

  const filteredLeaderboard = leaderboardRows.filter((row) => {
    const name = displayName(profiles[row.user_id], row.user_id);
    return matchesQuery(`${name} ${profiles[row.user_id]?.email ?? ''}`, leaderboardSearch);
  });

  const layoutClass = [
    'dashboard-layout',
    sidebarCollapsed ? 'sidebar-collapsed' : '',
    mobileSidebarOpen ? 'mobile-sidebar-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const navItems: { section: SectionId; label: ReactNode; id?: string }[] = [
    { section: 'dashboardSection', label: 'Dashboard' },
    {
      section: 'membersSection',
      id: 'sidebarMembersNav',
      label: (
        <>
          Members{' '}
          {pending.length > 0 ? (
            <span className="sidebar-count-badge">{pending.length}</span>
          ) : (
            <span className="sidebar-count-badge" style={{ display: 'none' }}>
              0
            </span>
          )}
        </>
      ),
    },
    { section: 'attendanceSection', label: 'Attendance' },
    { section: 'reportsSection', label: 'Reports' },
    { section: 'paymentsSection', label: 'Payments' },
    { section: 'settingsSection', label: 'Settings' },
    {
      section: 'exploreSection',
      label: (
        <span className="sidebar-item-label">
          <span className="sidebar-item-icon">✦</span>
          <span>Explore</span>
        </span>
      ),
    },
    { section: 'profileSection', label: 'Profile' },
  ];

  return (
    <>
      <div
        className="admin-checkin-toast"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        hidden={!checkinToast}
      >
        <div className="admin-checkin-toast-inner">
          <span className="admin-checkin-toast-icon" aria-hidden="true">
            ✓
          </span>
          <div className="admin-checkin-toast-text">
            <strong className="admin-checkin-toast-title">
              {checkinToast?.title ?? 'Member checked in'}
            </strong>
            <p className="admin-checkin-toast-body">{checkinToast?.body ?? '—'}</p>
          </div>
          <button
            type="button"
            className="admin-checkin-toast-close"
            aria-label="Dismiss"
            onClick={() => setCheckinToast(null)}
          >
            ×
          </button>
        </div>
      </div>

      <div className={layoutClass}>
        <aside className="sidebar">
          <button
            type="button"
            className="sidebar-toggle"
            aria-label="Toggle sidebar"
            aria-expanded={!sidebarCollapsed}
            title={sidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
            onClick={() => {
              setSidebarCollapsed((v) => {
                const next = !v;
                try {
                  localStorage.setItem('sidebarCollapsed', next ? '1' : '0');
                } catch {
                  /* ignore */
                }
                return next;
              });
            }}
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
                <h3>{gym?.name ?? 'Smart Gym'}</h3>
                <p>{gym?.code ? gym.code : 'GYM----'}</p>
              </div>
              <button
                type="button"
                className="mobile-sidebar-close-btn"
                aria-label="Close menu"
                onClick={() => setMobileSidebarOpen(false)}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <ul className="sidebar-menu">
              {navItems.map((item) => (
                <li
                  key={item.section}
                  id={item.id}
                  className={activeSection === item.section ? 'active' : undefined}
                  onClick={() => showSection(item.section)}
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
          aria-hidden={!mobileSidebarOpen}
          tabIndex={mobileSidebarOpen ? 0 : -1}
          onClick={() => setMobileSidebarOpen(false)}
        />
        <button
          type="button"
          className="mobile-menu-open-btn"
          aria-label="Open navigation menu"
          onClick={() => setMobileSidebarOpen(true)}
        >
          <span className="sidebar-toggle-bars" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>

        <main className="main-content">
          {/* Dashboard */}
          <section
            id="dashboardSection"
            className={`content-section${activeSection === 'dashboardSection' ? ' active' : ''}`}
          >
            <div className="welcome-banner">
              <h1>Admin Dashboard</h1>
              <p>Track members, payments, attendance, live crowd, and notifications.</p>
            </div>

            {pending.length > 0 ? (
              <div className="panel-card dashboard-next-step-card">
                <div className="card-header">
                  <h3>What should I do next?</h3>
                  <span className="tag">Quick start</span>
                </div>
                <p className="message-text">
                  1) Approve pending members. 2) Mark attendance. 3) Review reports and payments
                  before closing the day.
                </p>
                <div className="button-row">
                  <button
                    type="button"
                    className="outline-btn"
                    onClick={() => showSection('membersSection')}
                  >
                    Open Members
                  </button>
                  <button
                    type="button"
                    className="outline-btn"
                    onClick={() => showSection('attendanceSection')}
                  >
                    Open Attendance
                  </button>
                  <button type="button" onClick={() => showSection('reportsSection')}>
                    Open Reports
                  </button>
                </div>
              </div>
            ) : null}

            <div className="stats-grid">
              <div className="info-card">
                <span className="small-label">Total Members</span>
                <h2>{members.length}</h2>
              </div>
              <div className="info-card">
                <span className="small-label">Active Members</span>
                <h2>{activeMembers.length}</h2>
              </div>
              <div className="info-card">
                <span className="small-label">Monthly Revenue</span>
                <h2>₹{monthlyRevenue.toFixed(0)}</h2>
              </div>
              <div className="info-card">
                <span className="small-label">Pending Requests</span>
                <h2>{pending.length}</h2>
              </div>
            </div>

            <div className="main-grid" style={{ marginTop: 20 }}>
              <div className="panel-card">
                <div className="card-header">
                  <h3>Mark Attendance</h3>
                  <span className="tag">4-Digit Code</span>
                </div>
                <div className="join-gym-form">
                  <input
                    type="text"
                    placeholder="Enter 4-digit code"
                    maxLength={4}
                    value={attendanceCode}
                    onChange={(e) =>
                      setAttendanceCode(e.target.value.replace(/\D/g, '').slice(0, 4))
                    }
                    inputMode="numeric"
                  />
                  <button type="button" onClick={() => void handleMarkAttendance()} disabled={mark.isPending}>
                    {mark.isPending ? 'Marking…' : 'Mark Attendance'}
                  </button>
                </div>
                <p className="message-text">{attendanceResult}</p>
              </div>

              <div className="panel-card admin-qr-checkin-card">
                <div className="card-header">
                  <h3>QR self check-in</h3>
                  <span className="tag">Members scan</span>
                </div>
                <p className="message-text admin-qr-checkin-explainer">
                  Print or display this QR at your desk. Members scan it with their phone camera
                  while logged into the <strong>member</strong> site in the browser — they are
                  checked in for <strong>today</strong>. Share the https check-in link below.
                </p>
                <div className="admin-qr-checkin-mount" aria-hidden="true" />
                <label className="admin-qr-url-label" htmlFor="adminQrCheckinUrl">
                  Check-in link (share or shorten)
                </label>
                <input
                  type="text"
                  id="adminQrCheckinUrl"
                  className="admin-qr-checkin-url-input"
                  readOnly
                  value={checkInUrl || '—'}
                />
                <p className="message-text" role="status">
                  {checkInUrl
                    ? 'Share this link or encode it as a QR code for desk check-in.'
                    : 'Gym not loaded yet.'}
                </p>
              </div>

              <div className="panel-card">
                <div className="card-header">
                  <h3>Live Crowd Indicator</h3>
                  <span className="tag">Live</span>
                </div>
                <div
                  className="stats-grid"
                  style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginTop: 10 }}
                >
                  <div className="info-card">
                    <span className="small-label">Live Crowd</span>
                    <h2>{liveCount}</h2>
                  </div>
                  <div className="info-card">
                    <span className="small-label">Crowd Level</span>
                    <h2>
                      {crowdLevel} / 5
                    </h2>
                  </div>
                </div>
                <span className="crowd-panel-label crowd-panel-label--after-stats">
                  Live crowd level
                </span>
                <CrowdMeterDots level={crowdLevel} />
                <p style={{ marginTop: 10 }}>
                  <strong>Status:</strong> <span>{crowdLabel}</span>
                </p>
              </div>
            </div>

            <div className="panel-card" style={{ marginTop: 20 }}>
              <div className="card-header">
                <h3>Send Notification</h3>
                <span className="tag">Members</span>
              </div>
              <input
                type="text"
                placeholder="Notification Title"
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
              />
              <textarea
                placeholder="Write message here..."
                rows={4}
                style={{
                  width: '100%',
                  marginTop: 10,
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid #d1d5db',
                  resize: 'none',
                  fontFamily: 'inherit',
                }}
                value={notifMessage}
                onChange={(e) => setNotifMessage(e.target.value)}
              />
              <button
                type="button"
                style={{ marginTop: 10 }}
                onClick={() => void handleSendNotification()}
                disabled={broadcast.isPending}
              >
                {broadcast.isPending ? 'Sending…' : 'Send Notification'}
              </button>
              <p className="message-text">{notifStatus}</p>
            </div>

            <div className="panel-card" style={{ marginTop: 20 }}>
              <div className="card-header">
                <h3>Recent Members</h3>
                <span className="tag">Overview</span>
              </div>
              <input
                type="search"
                className="table-search-input"
                placeholder="Search recent members..."
                value={recentSearch}
                onChange={(e) => setRecentSearch(e.target.value)}
              />
              <div style={{ overflowX: 'auto' }}>
                <table className="mobile-table mobile-table-recent-members">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Plan</th>
                      <th>Status</th>
                      <th>Payment Mode</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {membersQuery.isLoading ? (
                      <tr>
                        <td colSpan={5}>Loading...</td>
                      </tr>
                    ) : recentMembers.length === 0 ? (
                      <tr>
                        <td colSpan={5}>No matching members found.</td>
                      </tr>
                    ) : (
                      recentMembers.map((m) => (
                        <tr key={m.id}>
                          <td data-label="Name">{displayName(profiles[m.user_id], m.user_id)}</td>
                          <td data-label="Plan">{m.plan ? getPlanLabel(m.plan) : '—'}</td>
                          <td data-label="Status">{m.status}</td>
                          <td data-label="Payment Mode">{m.payment_mode || '—'}</td>
                          <td data-label="Amount">
                            {m.amount != null ? `₹${Number(m.amount).toFixed(0)}` : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Explore */}
          <section
            id="exploreSection"
            className={`content-section${activeSection === 'exploreSection' ? ' active' : ''}`}
          >
            <div className="section-title">
              <h2>Explore Features</h2>
              <p>Open advanced admin tools</p>
            </div>
            <div className="panel-card dashboard-explore-card">
              <div className="dashboard-explore-grid">
                <div className="landing-feature-block">
                  <h3>Leaderboard</h3>
                  <p>Track global season ranking for all gyms.</p>
                  <div className="button-row">
                    <button
                      type="button"
                      className="outline-btn"
                      onClick={() => showSection('leaderboardSection')}
                    >
                      Open Leaderboard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Members */}
          <section
            id="membersSection"
            className={`content-section${activeSection === 'membersSection' ? ' active' : ''}`}
          >
            <div className="section-title">
              <h2>Members</h2>
              <p>Approve requests and view all gym members</p>
            </div>
            {membersActionMsg ? <p className="message-text">{membersActionMsg}</p> : null}
            <div className="main-grid">
              <div className="panel-card">
                <div className="card-header">
                  <h3>Pending Requests</h3>
                  <span className="tag">Approval</span>
                </div>
                <input
                  type="search"
                  className="table-search-input"
                  placeholder="Search pending requests..."
                  value={pendingSearch}
                  onChange={(e) => setPendingSearch(e.target.value)}
                />
                <div className="admin-pending-requests-wrap">
                  <table className="mobile-table mobile-table-pending-requests">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Gym Code</th>
                        <th>Plan</th>
                        <th>Amount</th>
                        <th>Payment</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingQuery.isLoading ? (
                        <tr>
                          <td colSpan={6}>Loading...</td>
                        </tr>
                      ) : filteredPending.length === 0 ? (
                        <tr>
                          <td colSpan={6}>No pending requests</td>
                        </tr>
                      ) : (
                        filteredPending.map((req) => {
                          const draft = getApproveDraft(req.user_id);
                          return (
                            <tr key={req.id} className="pending-request-row">
                              <td data-label="Name">
                                {displayName(profiles[req.user_id], req.user_id)}
                              </td>
                              <td data-label="Gym code">{gym?.code ?? 'N/A'}</td>
                              <td data-label="Plan">
                                <select
                                  className="pending-request-select"
                                  value={draft.plan}
                                  onChange={(e) =>
                                    updateApproveDraft(req.user_id, {
                                      plan: e.target.value as MembershipPlan,
                                    })
                                  }
                                >
                                  {MEMBERSHIP_PLANS.map((plan) => (
                                    <option key={plan} value={plan}>
                                      {MEMBERSHIP_PLAN_LABELS[plan]}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td data-label="Amount (₹)">
                                <input
                                  type="text"
                                  className="pending-request-input"
                                  placeholder="Amount"
                                  inputMode="decimal"
                                  autoComplete="off"
                                  value={draft.amount}
                                  onChange={(e) =>
                                    updateApproveDraft(req.user_id, { amount: e.target.value })
                                  }
                                />
                              </td>
                              <td data-label="Payment mode">
                                <select
                                  className="pending-request-select"
                                  value={draft.paymentMode}
                                  onChange={(e) =>
                                    updateApproveDraft(req.user_id, {
                                      paymentMode: e.target.value,
                                    })
                                  }
                                >
                                  {PAYMENT_MODES.map((mode) => (
                                    <option key={mode} value={mode}>
                                      {mode}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="pending-request-actions" data-label="Actions">
                                <button
                                  type="button"
                                  className="pending-request-btn pending-request-btn-accept"
                                  onClick={() => void handleApprove(req.user_id)}
                                  disabled={approve.isPending}
                                >
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  className="pending-request-btn pending-request-btn-reject"
                                  onClick={() => void handleReject(req.user_id)}
                                  disabled={reject.isPending}
                                >
                                  Reject
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="panel-card">
                <div className="card-header">
                  <h3>All Members</h3>
                  <span className="tag">Records</span>
                </div>
                <input
                  type="search"
                  className="table-search-input"
                  placeholder="Search all members..."
                  value={allMembersSearch}
                  onChange={(e) => setAllMembersSearch(e.target.value)}
                />
                <div style={{ overflowX: 'auto' }}>
                  <table className="mobile-table mobile-table-all-members">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Plan</th>
                        <th>Status</th>
                        <th>Payment Mode</th>
                        <th>Amount</th>
                        <th>End Date</th>
                        <th>Days Left</th>
                      </tr>
                    </thead>
                    <tbody>
                      {membersQuery.isLoading ? (
                        <tr>
                          <td colSpan={7}>Loading...</td>
                        </tr>
                      ) : filteredMembers.length === 0 ? (
                        <tr>
                          <td colSpan={7}>No matching members found.</td>
                        </tr>
                      ) : (
                        filteredMembers.map((m) => {
                          const daysLeft = m.ends_at ? calculateDaysLeft(m.ends_at) : null;
                          return (
                            <tr key={m.id}>
                              <td data-label="Name">
                                {displayName(profiles[m.user_id], m.user_id)}
                              </td>
                              <td data-label="Plan">{m.plan ? getPlanLabel(m.plan) : '—'}</td>
                              <td data-label="Status">{m.status}</td>
                              <td data-label="Payment Mode">{m.payment_mode || '—'}</td>
                              <td data-label="Amount">
                                {m.amount != null ? `₹${Number(m.amount).toFixed(0)}` : '—'}
                              </td>
                              <td data-label="End Date">{m.ends_at ?? '—'}</td>
                              <td data-label="Days Left">
                                {daysLeft == null ? '—' : daysLeft}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          {/* Attendance */}
          <section
            id="attendanceSection"
            className={`content-section${activeSection === 'attendanceSection' ? ' active' : ''}`}
          >
            <div className="section-title">
              <h2>Attendance</h2>
              <p>Today’s check-ins plus each member’s visits over the last 30 days</p>
            </div>
            <div className="stats-grid">
              <div className="info-card">
                <span className="small-label">Today&apos;s Attendance</span>
                <h2>{todayRows.length}</h2>
              </div>
            </div>
            <div className="panel-card" style={{ marginTop: 20 }}>
              <div className="card-header">
                <h3>Today&apos;s Present Members</h3>
                <span className="tag">Live List</span>
              </div>
              <input
                type="search"
                className="table-search-input"
                placeholder="Search today's attendance..."
                value={todayAttSearch}
                onChange={(e) => setTodayAttSearch(e.target.value)}
              />
              <div style={{ overflowX: 'auto' }}>
                <table className="mobile-table mobile-table-today-attendance">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayQuery.isLoading ? (
                      <tr>
                        <td colSpan={3}>Loading...</td>
                      </tr>
                    ) : filteredTodayAtt.length === 0 ? (
                      <tr>
                        <td colSpan={3}>No matching attendance entries found.</td>
                      </tr>
                    ) : (
                      filteredTodayAtt.map((row) => (
                        <tr key={row.id}>
                          <td data-label="Name">
                            {displayName(profiles[row.user_id], row.user_id)}
                          </td>
                          <td data-label="Email">{profiles[row.user_id]?.email ?? '—'}</td>
                          <td data-label="Time">
                            {new Date(row.checked_in_at).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <details className="panel-card section-collapsible" style={{ marginTop: 20 }}>
              <summary className="section-collapsible-summary">
                <span className="section-collapsible-summary-text">
                  <h3>Attendance history (last 30 days)</h3>
                  <span className="tag">By member</span>
                </span>
                <span className="section-collapsible-chevron" aria-hidden="true" />
              </summary>
              <div className="section-collapsible-body">
                <p className="admin-att-month-hint">
                  Every check-in for your gym in the rolling last month (newest first).
                </p>
                <div className="table-filter-row">
                  <input
                    type="search"
                    className="table-search-input"
                    placeholder="Search 30-day attendance..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                  />
                  <input
                    type="date"
                    className="table-search-input"
                    title="From date"
                    value={historyFrom}
                    onChange={(e) => setHistoryFrom(e.target.value)}
                  />
                  <input
                    type="date"
                    className="table-search-input"
                    title="To date"
                    value={historyTo}
                    onChange={(e) => setHistoryTo(e.target.value)}
                  />
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="mobile-table mobile-table-attendance-month">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Date</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyQuery.isLoading ? (
                        <tr>
                          <td colSpan={4}>Loading...</td>
                        </tr>
                      ) : filteredHistory.length === 0 ? (
                        <tr>
                          <td colSpan={4}>No matching history records found.</td>
                        </tr>
                      ) : (
                        filteredHistory.map((row) => (
                          <tr key={row.id}>
                            <td data-label="Name">
                              {displayName(profiles[row.user_id], row.user_id)}
                            </td>
                            <td data-label="Email">{profiles[row.user_id]?.email ?? '—'}</td>
                            <td data-label="Date">{row.attendance_date}</td>
                            <td data-label="Time">
                              {new Date(row.checked_in_at).toLocaleTimeString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          </section>

          {/* Reports — summary + chart stubs */}
          <section
            id="reportsSection"
            className={`content-section${activeSection === 'reportsSection' ? ' active' : ''}`}
          >
            <div className="section-title">
              <h2>Reports</h2>
              <p>
                Attendance and income summaries with charts — detailed visit history is on the
                Attendance page
              </p>
            </div>
            <div className="stats-grid">
              <div className="info-card">
                <span className="small-label">Today</span>
                <h2>{reportTodayCount}</h2>
              </div>
              <div className="info-card">
                <span className="small-label">This Week</span>
                <h2>{reportWeekCount}</h2>
              </div>
              <div className="info-card">
                <span className="small-label">This Month</span>
                <h2>{reportMonthCount}</h2>
              </div>
              <div className="info-card">
                <span className="small-label">Crowd</span>
                <h2>{crowdLabel}</h2>
              </div>
            </div>

            <div className="panel-card" style={{ marginTop: 20 }}>
              <div
                className="card-header"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <h3>Attendance Analytics</h3>
                <div className="filter-group">
                  <button
                    type="button"
                    className={attPeriod === 'weekly' ? 'active' : undefined}
                    onClick={() => setAttPeriod('weekly')}
                  >
                    Weekly
                  </button>
                  <button
                    type="button"
                    className={attPeriod === 'monthly' ? 'active' : undefined}
                    onClick={() => setAttPeriod('monthly')}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    className={attPeriod === 'yearly' ? 'active' : undefined}
                    onClick={() => setAttPeriod('yearly')}
                  >
                    Yearly
                  </button>
                </div>
              </div>
              <div style={{ height: 320, position: 'relative' }}>
                <canvas id="attendanceChart" aria-hidden="true" />
                <p className="message-text" style={{ position: 'absolute', inset: 0, margin: 'auto', height: 'fit-content', textAlign: 'center', padding: 24 }}>
                  {attPeriod === 'weekly'
                    ? `Weekly check-ins (last 7 days): ${reportWeekCount}`
                    : attPeriod === 'monthly'
                      ? `Monthly check-ins: ${reportMonthCount}`
                      : `Year-to-date check-ins (30-day window loaded): ${historyRows.length}`}
                  <br />
                  <span style={{ opacity: 0.7 }}>Chart canvas stub — summary stats above.</span>
                </p>
              </div>
            </div>

            <div className="panel-card" style={{ marginTop: 20 }}>
              <div
                className="card-header"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <h3>Income Analytics</h3>
                <div className="filter-group">
                  <button
                    type="button"
                    className={incPeriod === 'weekly' ? 'active' : undefined}
                    onClick={() => setIncPeriod('weekly')}
                  >
                    Weekly
                  </button>
                  <button
                    type="button"
                    className={incPeriod === 'monthly' ? 'active' : undefined}
                    onClick={() => setIncPeriod('monthly')}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    className={incPeriod === 'yearly' ? 'active' : undefined}
                    onClick={() => setIncPeriod('yearly')}
                  >
                    Yearly
                  </button>
                </div>
              </div>
              <div style={{ height: 320, position: 'relative' }}>
                <canvas id="incomeChart" aria-hidden="true" />
                <p className="message-text" style={{ position: 'absolute', inset: 0, margin: 'auto', height: 'fit-content', textAlign: 'center', padding: 24 }}>
                  {incPeriod === 'monthly'
                    ? `This month revenue: ₹${monthlyRevenue.toFixed(0)}`
                    : `Paid total in loaded records: ₹${payments
                        .filter((p) => p.status === 'paid')
                        .reduce((s, p) => s + Number(p.amount || 0), 0)
                        .toFixed(0)} (${incPeriod})`}
                  <br />
                  <span style={{ opacity: 0.7 }}>Chart canvas stub — use Payments for detail.</span>
                </p>
              </div>
            </div>
          </section>

          {/* Leaderboard */}
          <section
            id="leaderboardSection"
            className={`content-section${activeSection === 'leaderboardSection' ? ' active' : ''}`}
          >
            <div className="section-title">
              <h2>Leaderboard</h2>
              <p>Global season ranking across all gyms</p>
            </div>
            <div className="panel-card">
              <div className="card-header">
                <h3>Leadership Board</h3>
                <span className="tag">{getLeagueSeasonLabel(seasonId)}</span>
              </div>
              <p className="leaderboard-global-note">Global ranking (all gyms)</p>
              <p className="message-text admin-att-month-hint">
                Ranked by season league points for all members.
              </p>
              <input
                type="search"
                className="table-search-input"
                placeholder="Search leaderboard..."
                value={leaderboardSearch}
                onChange={(e) => setLeaderboardSearch(e.target.value)}
              />
              <div style={{ overflowX: 'auto' }}>
                <table className="mobile-table mobile-table-admin-leaderboard">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Member</th>
                      <th>League</th>
                      <th>Tier</th>
                      <th>Today</th>
                      <th>Diet</th>
                      <th>Gym</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardQuery.isLoading ? (
                      <tr>
                        <td colSpan={7}>Loading rankings...</td>
                      </tr>
                    ) : filteredLeaderboard.length === 0 ? (
                      <tr>
                        <td colSpan={7}>No matching leaderboard members found.</td>
                      </tr>
                    ) : (
                      filteredLeaderboard.map((row) => {
                        const rank = leaderboardRows.findIndex((r) => r.user_id === row.user_id) + 1;
                        return (
                          <tr key={row.id}>
                            <td data-label="Rank">{rank}</td>
                            <td data-label="Member">
                              {displayName(profiles[row.user_id], row.user_id)}
                            </td>
                            <td data-label="League">{row.total_points}</td>
                            <td data-label="Tier">
                              {getLeagueTierLabel(row.total_points, seasonId)}
                            </td>
                            <td data-label="Today">—</td>
                            <td data-label="Diet">—</td>
                            <td data-label="Gym">{row.gym_id ? 'Linked' : '—'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Payments */}
          <section
            id="paymentsSection"
            className={`content-section${activeSection === 'paymentsSection' ? ' active' : ''}`}
          >
            <div className="section-title">
              <h2>Payments</h2>
              <p>Revenue and payment-related information</p>
            </div>
            <div className="stats-grid">
              <div className="info-card">
                <span className="small-label">Total Revenue</span>
                <h2>₹{monthlyRevenue.toFixed(0)}</h2>
              </div>
            </div>

            <div className="panel-card" style={{ marginTop: 20 }}>
              <div className="card-header">
                <h3>Record payment</h3>
                <span className="tag">Renew</span>
              </div>
              <form className="join-gym-form" onSubmit={(e) => void handleRecordPayment(e)}>
                <select
                  value={recordUserId}
                  onChange={(e) => setRecordUserId(e.target.value)}
                  aria-label="Member"
                >
                  <option value="">Select member…</option>
                  {activeMembers.map((m) => (
                    <option key={m.id} value={m.user_id}>
                      {displayName(profiles[m.user_id], m.user_id)}
                    </option>
                  ))}
                </select>
                <select
                  value={recordPlan}
                  onChange={(e) => {
                    const plan = e.target.value as MembershipPlan;
                    setRecordPlan(plan);
                    setRecordAmount(String(defaultPriceForPlan(gym, plan)));
                  }}
                  aria-label="Plan"
                >
                  {MEMBERSHIP_PLANS.map((plan) => (
                    <option key={plan} value={plan}>
                      {MEMBERSHIP_PLAN_LABELS[plan]}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  step="1"
                  placeholder="Amount"
                  value={recordAmount}
                  onChange={(e) => setRecordAmount(e.target.value)}
                />
                <select
                  value={recordMode}
                  onChange={(e) => setRecordMode(e.target.value)}
                  aria-label="Payment mode"
                >
                  {PAYMENT_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
                <button type="submit" disabled={recordPayment.isPending}>
                  {recordPayment.isPending ? 'Saving…' : 'Record payment'}
                </button>
              </form>
              <p className="message-text">{recordMsg}</p>
            </div>

            <details className="panel-card section-collapsible" style={{ marginTop: 20 }}>
              <summary className="section-collapsible-summary">
                <span className="section-collapsible-summary-text">
                  <h3>Payment Records</h3>
                  <span className="tag">History</span>
                </span>
                <span className="section-collapsible-chevron" aria-hidden="true" />
              </summary>
              <div className="section-collapsible-body">
                <div className="table-filter-row table-filter-row--payments">
                  <input
                    type="search"
                    className="table-search-input"
                    placeholder="Search payment records..."
                    value={paymentsSearch}
                    onChange={(e) => setPaymentsSearch(e.target.value)}
                  />
                  <div className="table-filter-dates">
                    <input
                      type="date"
                      className="table-search-input table-filter-date"
                      title="From date"
                      aria-label="From date"
                      value={paymentsFrom}
                      onChange={(e) => setPaymentsFrom(e.target.value)}
                    />
                    <input
                      type="date"
                      className="table-search-input table-filter-date"
                      title="To date"
                      aria-label="To date"
                      value={paymentsTo}
                      onChange={(e) => setPaymentsTo(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="mobile-table mobile-table-payments-history">
                    <thead>
                      <tr>
                        <th>Member Name</th>
                        <th>Plan</th>
                        <th>Amount</th>
                        <th>Payment Type</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentsQuery.isLoading ? (
                        <tr>
                          <td colSpan={5}>Loading...</td>
                        </tr>
                      ) : filteredPayments.length === 0 ? (
                        <tr>
                          <td colSpan={5}>No matching payment records found.</td>
                        </tr>
                      ) : (
                        filteredPayments.map((row) => (
                          <tr key={row.id}>
                            <td data-label="Member Name">
                              {displayName(profiles[row.user_id], row.user_id)}
                            </td>
                            <td data-label="Plan">{row.plan ? getPlanLabel(row.plan) : '—'}</td>
                            <td data-label="Amount">₹{Number(row.amount || 0).toFixed(0)}</td>
                            <td data-label="Payment Type">{row.payment_mode || '—'}</td>
                            <td data-label="Date">
                              {row.paid_at ? new Date(row.paid_at).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          </section>

          {/* Settings */}
          <section
            id="settingsSection"
            className={`content-section${activeSection === 'settingsSection' ? ' active' : ''}`}
          >
            <div className="section-title">
              <h2>Gym settings</h2>
              <p>Update your gym profile, hours, and membership prices</p>
            </div>
            <div className="profile-card admin-settings-wrap">
              <div className="profile-layout">
                <div className="profile-section">
                  <h3 className="profile-section-heading">Gym details</h3>
                  <div className="profile-grid">
                    <div className="form-group full-width">
                      <label htmlFor="gymName">Gym name</label>
                      <input
                        type="text"
                        id="gymName"
                        placeholder="Gym name"
                        value={settingsForm.name}
                        onChange={(e) =>
                          setSettingsForm((s) => ({ ...s, name: e.target.value }))
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="gymPhone">Phone</label>
                      <input
                        type="text"
                        id="gymPhone"
                        placeholder="Phone number"
                        value={settingsForm.phone}
                        onChange={(e) =>
                          setSettingsForm((s) => ({ ...s, phone: e.target.value }))
                        }
                      />
                    </div>
                    <div className="form-group full-width">
                      <label htmlFor="gymAddress">Address</label>
                      <input
                        type="text"
                        id="gymAddress"
                        placeholder="Street address"
                        value={settingsForm.address}
                        onChange={(e) =>
                          setSettingsForm((s) => ({ ...s, address: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="profile-section">
                  <h3 className="profile-section-heading">Hours</h3>
                  <div className="profile-grid">
                    <div className="form-group">
                      <label htmlFor="openingTime">Opening time</label>
                      <input
                        type="time"
                        id="openingTime"
                        value={settingsForm.openingTime}
                        onChange={(e) =>
                          setSettingsForm((s) => ({ ...s, openingTime: e.target.value }))
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="closingTime">Closing time</label>
                      <input
                        type="time"
                        id="closingTime"
                        value={settingsForm.closingTime}
                        onChange={(e) =>
                          setSettingsForm((s) => ({ ...s, closingTime: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="profile-section">
                  <h3 className="profile-section-heading">Membership pricing (₹)</h3>
                  <div className="profile-grid">
                    <div className="form-group">
                      <label htmlFor="price1Month">1 month</label>
                      <input
                        type="number"
                        id="price1Month"
                        placeholder="Price"
                        min={0}
                        step={1}
                        value={settingsForm.price1Month}
                        onChange={(e) =>
                          setSettingsForm((s) => ({ ...s, price1Month: e.target.value }))
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="price3Month">3 months</label>
                      <input
                        type="number"
                        id="price3Month"
                        placeholder="Price"
                        min={0}
                        step={1}
                        value={settingsForm.price3Month}
                        onChange={(e) =>
                          setSettingsForm((s) => ({ ...s, price3Month: e.target.value }))
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="price6Month">6 months</label>
                      <input
                        type="number"
                        id="price6Month"
                        placeholder="Price"
                        min={0}
                        step={1}
                        value={settingsForm.price6Month}
                        onChange={(e) =>
                          setSettingsForm((s) => ({ ...s, price6Month: e.target.value }))
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="price12Month">12 months</label>
                      <input
                        type="number"
                        id="price12Month"
                        placeholder="Price"
                        min={0}
                        step={1}
                        value={settingsForm.price12Month}
                        onChange={(e) =>
                          setSettingsForm((s) => ({ ...s, price12Month: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="profile-actions">
                <button
                  type="button"
                  onClick={() => void handleSaveSettings()}
                  disabled={updateGym.isPending}
                >
                  {updateGym.isPending ? 'Saving…' : 'Save settings'}
                </button>
              </div>
              <p className="message-text">{settingsMessage}</p>
              <p className="settings-gym-code-line">
                <strong>Gym code</strong> <span>{gym?.code ?? '--'}</span>
              </p>
            </div>
          </section>

          {/* Profile */}
          <section
            id="profileSection"
            className={`content-section${activeSection === 'profileSection' ? ' active' : ''}`}
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
                        placeholder="Enter first name"
                        value={profileForm.firstName}
                        onChange={(e) =>
                          setProfileForm((s) => ({ ...s, firstName: e.target.value }))
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="profileLastName">Last name</label>
                      <input
                        type="text"
                        id="profileLastName"
                        placeholder="Enter last name"
                        value={profileForm.lastName}
                        onChange={(e) =>
                          setProfileForm((s) => ({ ...s, lastName: e.target.value }))
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="profileEmail">Email</label>
                      <input type="email" id="profileEmail" disabled value={profileForm.email} />
                    </div>
                    <div className="form-group">
                      <label htmlFor="profilePhone">Phone</label>
                      <input
                        type="text"
                        id="profilePhone"
                        placeholder="Enter phone number"
                        value={profileForm.phone}
                        onChange={(e) =>
                          setProfileForm((s) => ({ ...s, phone: e.target.value }))
                        }
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
                        placeholder="Enter address"
                        value={profileForm.address}
                        onChange={(e) =>
                          setProfileForm((s) => ({ ...s, address: e.target.value }))
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="profileCity">City</label>
                      <input
                        type="text"
                        id="profileCity"
                        placeholder="Enter city"
                        value={profileForm.city}
                        onChange={(e) =>
                          setProfileForm((s) => ({ ...s, city: e.target.value }))
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="profileState">State</label>
                      <input
                        type="text"
                        id="profileState"
                        placeholder="Enter state"
                        value={profileForm.state}
                        onChange={(e) =>
                          setProfileForm((s) => ({ ...s, state: e.target.value }))
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="profileZip">Zip code</label>
                      <input
                        type="text"
                        id="profileZip"
                        placeholder="Enter zip code"
                        value={profileForm.zip}
                        onChange={(e) =>
                          setProfileForm((s) => ({ ...s, zip: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="profile-actions">
                <button type="button" onClick={() => void handleSaveProfile()}>
                  Save Changes
                </button>
              </div>
              <p className="message-text">{profileMessage}</p>

              <hr className="profile-divider" />

              <div className="password-card">
                <h3>Change Password</h3>
                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    type="password"
                    id="newPassword"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <button type="button" onClick={() => void handleChangePassword()}>
                  Update Password
                </button>
                <p className="message-text">{passwordMessage}</p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
