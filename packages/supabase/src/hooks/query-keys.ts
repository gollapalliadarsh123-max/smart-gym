export const queryKeys = {
  session: ['session'] as const,
  profile: (userId: string) => ['profile', userId] as const,
  gym: (gymId: string) => ['gym', gymId] as const,
  gymByCode: (code: string) => ['gym', 'code', code] as const,
  activeMembership: (userId: string) => ['membership', 'active', userId] as const,
  activeMemberships: (userId: string) => ['memberships', 'active', userId] as const,
  gymMembers: (gymId: string, status?: string) => ['gym-members', gymId, status ?? 'all'] as const,
  joinRequests: (gymId: string) => ['join-requests', gymId] as const,
  payments: (filters: Record<string, unknown>) => ['payments', filters] as const,
  dietLog: (userId: string, date: string) => ['diet-log', userId, date] as const,
  dietLogs: (userId: string) => ['diet-logs', userId] as const,
  leagueSeason: (userId: string, seasonId: string) => ['league-season', userId, seasonId] as const,
  leagueLeaderboard: (seasonId: string) => ['league-leaderboard', seasonId] as const,
  notifications: (gymId: string) => ['notifications', gymId] as const,
  friendRequests: (userId: string) => ['friend-requests', userId] as const,
  chat: (userId: string, otherUserId: string) => ['chat', userId, otherUserId] as const,
  attendanceToday: (gymId: string, date: string) => ['attendance-today', gymId, date] as const,
  attendanceHistory: (gymId: string, from: string, to: string) =>
    ['attendance-history', gymId, from, to] as const,
  dailyAttendanceCode: (gymId: string) => ['daily-attendance-code', gymId] as const,
  gymPartnerships: (gymId: string) => ['gym-partnerships', gymId] as const,
  activePartnerGyms: (gymId: string) => ['active-partner-gyms', gymId] as const,
  partnerAllowance: (userId: string) => ['partner-allowance', userId] as const,
  memberPartnerVisits: (userId: string, fromYmd: string) =>
    ['member-partner-visits', userId, fromYmd] as const,
  incomingPartnerVisits: (gymId: string, fromYmd: string) =>
    ['incoming-partner-visits', gymId, fromYmd] as const,
  outgoingPartnerVisits: (gymId: string, fromYmd: string) =>
    ['outgoing-partner-visits', gymId, fromYmd] as const,
  partnerVisitsForDate: (gymId: string, dateYmd: string) =>
    ['partner-visits-date', gymId, dateYmd] as const,
  gymQr: (gymId: string) => ['gym-qr', gymId] as const,
  gymQrHistory: (gymId: string) => ['gym-qr-history', gymId] as const,
  qrScanLogs: (gymId: string) => ['qr-scan-logs', gymId] as const,
};
