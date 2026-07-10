export const APP_NAME = 'Smart Gym' as const;

export const APP_DESCRIPTION =
  'A complete gym platform for attendance, member management, diet tracking, payments, analytics, and communication.';

export const PASSWORD_SPECIAL_CHARS = '!@#$%^&*' as const;

export const PASSWORD_MIN_LENGTH = 8;

export const ATTENDANCE_CODE_LENGTH = 4;

/** Check-in remains active for crowd meter calculations */
export const ATTENDANCE_LIVE_WINDOW_MS = 60 * 60 * 1000;

export const MAX_DAILY_LEAGUE_POINTS = 100;

export const MAX_DIET_SCORE = 100;

export const GYM_CODE_PREFIX = 'GYM' as const;
