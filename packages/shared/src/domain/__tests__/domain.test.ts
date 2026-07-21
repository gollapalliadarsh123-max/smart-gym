import { describe, expect, it } from 'vitest';
import { validatePassword } from '../auth/password';
import { generateGymCode, isValidGymCodeFormat } from '../auth/gym-code';
import { addDaysToYmd, calculateDaysLeft } from '../dates';
import {
  canMemberGetAttendanceCode,
  computeMembershipEndDate,
  legacyPlanToDays,
} from '../membership/plans';
import { generate4DigitCode, isValidAttendanceCode } from '../attendance/codes';
import { countLiveMembers } from '../attendance/live';
import { computeDietScoreV2 } from '../diet/compute';
import { buildDietTargetsFromProfile } from '../diet/targets';
import {
  applyLeagueDayPoints,
  getLeagueTierName,
  sumSeasonPoints,
} from '../league';
import { getDietConsistencyBonus, computeMealLogStreak } from '../streak';
import {
  canApprovePartnerVisit,
  partnerAllowanceProgress,
  partnerVisitsRemaining,
} from '../partnerships';
import { buildGymCheckInPath, extractQrToken } from '../partnerships/qr-token';

describe('validatePassword', () => {
  it('accepts a strong password', () => {
    expect(validatePassword('Test1234!')).toBe(true);
  });

  it('rejects weak passwords', () => {
    expect(validatePassword('short')).toBe(false);
    expect(validatePassword('nouppercase1!')).toBe(false);
  });
});

describe('membership plans', () => {
  it('maps legacy plan labels to days', () => {
    expect(legacyPlanToDays('3 Months')).toBe(90);
    expect(legacyPlanToDays('1_month')).toBe(30);
  });

  it('computes end date from start and plan', () => {
    expect(computeMembershipEndDate('2026-01-01', '1_month')).toBe('2026-01-31');
  });

  it('checks attendance code eligibility', () => {
    expect(
      canMemberGetAttendanceCode(
        {
          joinedGym: true,
          requestStatus: 'approved',
          membershipStatus: 'Active',
          endDateYmd: '2026-12-31',
        },
        '2026-07-10',
      ),
    ).toBe(true);
    expect(
      canMemberGetAttendanceCode(
        {
          joinedGym: true,
          requestStatus: 'approved',
          membershipStatus: 'Active',
          endDateYmd: '2026-01-01',
        },
        '2026-07-10',
      ),
    ).toBe(false);
  });
});

describe('attendance', () => {
  it('generates valid 4-digit codes', () => {
    const code = generate4DigitCode(() => 0.5);
    expect(isValidAttendanceCode(code)).toBe(true);
    expect(code).toHaveLength(4);
  });

  it('counts live members within expiry window', () => {
    const now = 1_700_000_000_000;
    const rows = [
      { user_id: 'a', checkInTimestamp: now - 1000, expiresAt: now + 5000 },
      { user_id: 'b', checkInTimestamp: now - 1000, expiresAt: now - 1 },
    ];
    expect(countLiveMembers(rows, now)).toBe(1);
  });

  it('counts live members from ISO expires_at timestamps', () => {
    const now = Date.parse('2026-07-10T12:00:00.000Z');
    const rows = [
      {
        user_id: 'a',
        checked_in_at: '2026-07-10T11:30:00.000Z',
        expires_at: '2026-07-10T12:30:00.000Z',
      },
      {
        user_id: 'b',
        checked_in_at: '2026-07-10T10:00:00.000Z',
        expires_at: '2026-07-10T11:00:00.000Z',
      },
    ];
    expect(countLiveMembers(rows, now)).toBe(1);
  });
});

describe('diet scoring', () => {
  const profile = {
    dob: '1995-06-15',
    gender: 'Male',
    weightKg: 75,
    heightCm: 175,
    activityLevel: 'moderate' as const,
    bodyGoal: 'maintain' as const,
  };

  it('builds personal diet targets', () => {
    const targets = buildDietTargetsFromProfile(profile);
    expect(targets).not.toBeNull();
    expect(targets!.calorieCenter).toBeGreaterThan(1500);
    expect(targets!.proteinMaxGrams).toBeGreaterThan(80);
  });

  it('scores a balanced day highly', () => {
    const targets = buildDietTargetsFromProfile(profile)!;
    const result = computeDietScoreV2({
      totals: {
        calories: targets.calorieCenter,
        protein: targets.proteinMaxGrams,
        waterLiters: targets.waterGoalLiters,
      },
      targets,
      foods: [
        { mealSlot: 'morning', calories: 400, protein: 30, loggedAt: '2026-07-10T08:30:00' },
        { mealSlot: 'afternoon', calories: 500, protein: 35, loggedAt: '2026-07-10T13:30:00' },
        { mealSlot: 'evening', calories: 600, protein: 40, loggedAt: '2026-07-10T19:30:00' },
      ],
      attendedToday: true,
      consistencyMeta: { bonus: 5, daysHit: 3 },
      userData: profile,
    });
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.label).toBe('Excellent');
    expect(result.parts.gym).toBe(5);
  });
});

describe('league', () => {
  it('clamps and sums season points', () => {
    const { dayPoints, totalPoints } = applyLeagueDayPoints({}, '2026-Q3', '2026-07-10', 150);
    expect(dayPoints['2026-07-10']).toBe(100);
    expect(totalPoints).toBe(100);
  });

  it('assigns tier names from legacy thresholds', () => {
    expect(getLeagueTierName(0, '2026-Q3')).toBe('bronze');
    expect(getLeagueTierName(2000, '2026-Q3')).toBe('silver');
    expect(getLeagueTierName(8000, '2026-Q3')).toBe('conqueror');
  });

  it('sums only in-season dates', () => {
    const total = sumSeasonPoints(
      { '2026-07-01': 50, '2026-01-01': 100, '2026-07-05': 25 },
      '2026-07-01',
      '2026-09-30',
    );
    expect(total).toBe(75);
  });
});

describe('streaks', () => {
  it('computes consistency bonus for last 3 days', () => {
    const dates = new Set(['2026-07-10', '2026-07-09', '2026-07-08']);
    expect(getDietConsistencyBonus(dates, '2026-07-10', false)).toEqual({ bonus: 5, daysHit: 3 });
    expect(getDietConsistencyBonus(new Set(['2026-07-10', '2026-07-09']), '2026-07-10', false)).toEqual({
      bonus: 3,
      daysHit: 2,
    });
  });

  it('computes meal log streak', () => {
    const dates = new Set(['2026-07-10', '2026-07-09', '2026-07-08']);
    expect(computeMealLogStreak(dates, '2026-07-10', false)).toBe(3);
  });
});

describe('gym code', () => {
  it('generates GYM prefix codes', () => {
    const code = generateGymCode(new Date('2026-07-10T12:34:56.789Z'));
    expect(code.startsWith('GYM')).toBe(true);
    expect(isValidGymCodeFormat(code)).toBe(true);
  });
});

describe('dates', () => {
  it('calculates days left', () => {
    expect(calculateDaysLeft('2026-07-15', '2026-07-10')).toBe(5);
    expect(addDaysToYmd('2026-07-10', 30)).toBe('2026-08-09');
  });
});

describe('partner visit allowance', () => {
  it('approves first three visits and rejects the fourth', () => {
    expect(canApprovePartnerVisit(0)).toBe(true);
    expect(canApprovePartnerVisit(1)).toBe(true);
    expect(canApprovePartnerVisit(2)).toBe(true);
    expect(canApprovePartnerVisit(3)).toBe(false);
  });

  it('computes remaining visits and progress', () => {
    expect(partnerVisitsRemaining(2)).toBe(1);
    expect(partnerVisitsRemaining(3)).toBe(0);
    expect(partnerAllowanceProgress(2)).toBeCloseTo(66.666, 1);
  });

  it('treats reversed usage as lower used count from caller', () => {
    // Reversed visits are excluded in SQL; UI receives the post-filter count.
    expect(canApprovePartnerVisit(2, 3)).toBe(true);
    expect(partnerVisitsRemaining(2, 3)).toBe(1);
  });
});

describe('secure gym QR tokens', () => {
  const token = 'a'.repeat(64);

  it('builds check-in path without gym ids', () => {
    expect(buildGymCheckInPath(token)).toBe(`/checkin/${token}`);
    expect(buildGymCheckInPath(token)).not.toContain('gym=');
  });

  it('extracts token from URL and rejects legacy gym-id links', () => {
    expect(extractQrToken(`https://smartgym.app/checkin/${token}`)).toBe(token);
    expect(extractQrToken('https://smartgym.app/check-in?gym=abc')).toBeNull();
  });
});
