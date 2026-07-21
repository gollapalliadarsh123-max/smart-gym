/** Pure helpers for multi-gym partner visit allowance (client display only). */

export function partnerVisitsRemaining(used: number, monthlyLimit = 3): number {
  return Math.max(monthlyLimit - Math.max(used, 0), 0);
}

export function canApprovePartnerVisit(used: number, monthlyLimit = 3): boolean {
  return partnerVisitsRemaining(used, monthlyLimit) > 0;
}

export function partnerAllowanceProgress(used: number, monthlyLimit = 3): number {
  if (monthlyLimit <= 0) return 100;
  return Math.min(100, (Math.max(used, 0) / monthlyLimit) * 100);
}
