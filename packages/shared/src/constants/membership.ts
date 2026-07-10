export const MEMBERSHIP_PLANS = ['1_month', '3_month', '6_month', '12_month'] as const;

export type MembershipPlan = (typeof MEMBERSHIP_PLANS)[number];

export const MEMBERSHIP_PLAN_DAYS: Record<MembershipPlan, number> = {
  '1_month': 30,
  '3_month': 90,
  '6_month': 180,
  '12_month': 360,
};

export const MEMBERSHIP_PLAN_LABELS: Record<MembershipPlan, string> = {
  '1_month': '1 Month',
  '3_month': '3 Months',
  '6_month': '6 Months',
  '12_month': '1 Year',
};

export const MEMBERSHIP_STATUSES = [
  'pending',
  'active',
  'expired',
  'rejected',
  'cancelled',
] as const;

export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const PAYMENT_STATUSES = ['not_paid', 'paid', 'refunded', 'failed'] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_MODES = ['Cash', 'Online', 'Card'] as const;

export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  not_paid: 'Not paid',
  paid: 'Paid',
  refunded: 'Refunded',
  failed: 'Failed',
};

export const JOIN_REQUEST_STATUSES = ['pending', 'approved', 'rejected'] as const;

export type JoinRequestStatus = (typeof JOIN_REQUEST_STATUSES)[number];

export function getPlanDays(plan: MembershipPlan): number {
  return MEMBERSHIP_PLAN_DAYS[plan];
}

export function getPlanLabel(plan: MembershipPlan): string {
  return MEMBERSHIP_PLAN_LABELS[plan];
}
