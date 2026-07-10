import {
  MEMBERSHIP_PLAN_DAYS,
  MEMBERSHIP_PLAN_LABELS,
  MEMBERSHIP_PLANS,
  type MembershipPlan,
} from '../../constants/membership';
import { addDaysToYmd, calculateDaysLeft } from '../dates';

/** Maps legacy UI plan labels to normalized enum values */
export const LEGACY_PLAN_LABEL_TO_ENUM: Record<string, MembershipPlan> = {
  '1 Month': '1_month',
  '3 Months': '3_month',
  '6 Months': '6_month',
  '1 Year': '12_month',
};

export function legacyPlanLabelToEnum(plan: string): MembershipPlan | null {
  const trimmed = (plan || '').trim();
  const fromLegacy = LEGACY_PLAN_LABEL_TO_ENUM[trimmed];
  if (fromLegacy) return fromLegacy;
  if ((MEMBERSHIP_PLANS as readonly string[]).includes(trimmed)) {
    return trimmed as MembershipPlan;
  }
  return null;
}

export function legacyPlanToDays(plan: string): number {
  const enumPlan = legacyPlanLabelToEnum(plan);
  if (enumPlan) return MEMBERSHIP_PLAN_DAYS[enumPlan];
  return 0;
}

export function computeMembershipEndDate(startDateYmd: string, plan: MembershipPlan): string {
  return addDaysToYmd(startDateYmd, MEMBERSHIP_PLAN_DAYS[plan]);
}

export function formatMembershipExpiryLine(daysLeft: number | null): string {
  if (daysLeft === null || daysLeft === undefined) return 'End date not set';
  if (daysLeft < 0) return 'Membership expired';
  if (daysLeft === 0) return 'Expires today';
  if (daysLeft === 1) return 'Expires in 1 day';
  return `Expires in ${daysLeft} days`;
}

export function getMembershipExpiryLine(endDateYmd: string, todayYmd?: string): string {
  return formatMembershipExpiryLine(calculateDaysLeft(endDateYmd, todayYmd));
}

export interface AttendanceCodeEligibility {
  joinedGym: boolean;
  requestStatus: string;
  membershipStatus: string;
  endDateYmd: string;
}

export function canMemberGetAttendanceCode(
  input: AttendanceCodeEligibility,
  todayYmd?: string,
): boolean {
  if (!input.joinedGym) return false;
  if (input.requestStatus !== 'approved') return false;
  if (input.membershipStatus !== 'Active' && input.membershipStatus !== 'active') return false;
  const daysLeft = calculateDaysLeft(input.endDateYmd, todayYmd);
  return daysLeft !== null && daysLeft >= 0;
}

export function isMembershipExpired(endDateYmd: string, todayYmd?: string): boolean {
  const daysLeft = calculateDaysLeft(endDateYmd, todayYmd);
  return daysLeft !== null && daysLeft < 0;
}

export { MEMBERSHIP_PLAN_DAYS, MEMBERSHIP_PLAN_LABELS };
