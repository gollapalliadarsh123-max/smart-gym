export const CROWD_LEVELS = [
  { level: 0, label: 'Empty' },
  { level: 1, label: 'Quiet' },
  { level: 2, label: 'Light' },
  { level: 3, label: 'Moderate' },
  { level: 4, label: 'Busy' },
  { level: 5, label: 'Packed' },
] as const;

export type CrowdLevel = (typeof CROWD_LEVELS)[number]['level'];

export function getCrowdLabel(level: number): string {
  const entry = CROWD_LEVELS.find((c) => c.level === level);
  return entry?.label ?? 'Unknown';
}

/**
 * Maps live member ratio to a 0–5 crowd level.
 * Preserves original business logic from the legacy app.
 */
export function calculateCrowdLevel(liveMembers: number, totalActiveMembers: number): CrowdLevel {
  if (totalActiveMembers <= 0 || liveMembers <= 0) return 0;
  const ratio = liveMembers / totalActiveMembers;
  if (ratio < 0.1) return 1;
  if (ratio < 0.25) return 2;
  if (ratio < 0.45) return 3;
  if (ratio < 0.7) return 4;
  return 5;
}
