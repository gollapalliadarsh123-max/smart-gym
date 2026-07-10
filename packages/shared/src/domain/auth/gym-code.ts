import { GYM_CODE_PREFIX } from '../../constants/app';

/** Generates a unique gym code matching legacy format: GYM + last 6 digits of timestamp */
export function generateGymCode(now: Date = new Date()): string {
  return `${GYM_CODE_PREFIX}${now.getTime().toString().slice(-6)}`;
}

export function normalizeGymCode(code: string): string {
  return code.trim().toUpperCase();
}

export function isValidGymCodeFormat(code: string): boolean {
  return /^[A-Z0-9]{3,12}$/.test(normalizeGymCode(code));
}
