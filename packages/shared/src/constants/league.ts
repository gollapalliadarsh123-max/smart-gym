export const LEAGUE_TIERS = [
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
  'crown',
  'conqueror',
] as const;

export type LeagueTier = (typeof LEAGUE_TIERS)[number];

export const LEAGUE_TIER_LABELS: Record<LeagueTier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
  crown: 'Crown',
  conqueror: 'Conqueror',
};

/** Base tier thresholds for a 90-day season (scaled per actual season length) */
export const LEAGUE_TIER_THRESHOLDS_BASE = {
  silver: 1800,
  gold: 3200,
  platinum: 4400,
  diamond: 5600,
  crown: 6800,
  conqueror: 7800,
} as const;

export const LEAGUE_SEASON_BASE_DAYS = 90;

export function getLeagueSeasonId(date: Date = new Date()): string {
  const year = date.getFullYear();
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `${year}-Q${quarter}`;
}

export function getLeagueSeasonDateRange(seasonId: string): { start: string; end: string } {
  const match = /^(\d{4})-Q([1-4])$/.exec(seasonId);
  if (!match) {
    const year = new Date().getFullYear();
    return { start: `${year}-01-01`, end: `${year}-03-31` };
  }
  const year = Number(match[1]);
  const quarter = Number(match[2]);
  const startMonth = (quarter - 1) * 3;
  const endMonth = startMonth + 2;
  const endDay = new Date(year, endMonth + 1, 0).getDate();
  const start = `${year}-${String(startMonth + 1).padStart(2, '0')}-01`;
  const end = `${year}-${String(endMonth + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
  return { start, end };
}

function scaleThreshold(base: number, seasonDays: number): number {
  return Math.round(base * (seasonDays / LEAGUE_SEASON_BASE_DAYS));
}

export function getLeagueSeasonDayCount(seasonId: string): number {
  const { start, end } = getLeagueSeasonDateRange(seasonId);
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const seasonDays =
    Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Number.isFinite(seasonDays) && seasonDays > 0 ? seasonDays : LEAGUE_SEASON_BASE_DAYS;
}

export function getLeagueTierThresholds(seasonId: string) {
  const seasonDays = getLeagueSeasonDayCount(seasonId);
  return {
    silver: scaleThreshold(LEAGUE_TIER_THRESHOLDS_BASE.silver, seasonDays),
    gold: scaleThreshold(LEAGUE_TIER_THRESHOLDS_BASE.gold, seasonDays),
    platinum: scaleThreshold(LEAGUE_TIER_THRESHOLDS_BASE.platinum, seasonDays),
    diamond: scaleThreshold(LEAGUE_TIER_THRESHOLDS_BASE.diamond, seasonDays),
    crown: scaleThreshold(LEAGUE_TIER_THRESHOLDS_BASE.crown, seasonDays),
    conqueror: scaleThreshold(LEAGUE_TIER_THRESHOLDS_BASE.conqueror, seasonDays),
  };
}

export function getLeagueTierName(totalPoints: number, seasonId: string): LeagueTier {
  const pts = Number(totalPoints) || 0;
  const t = getLeagueTierThresholds(seasonId);
  if (pts >= t.conqueror) return 'conqueror';
  if (pts >= t.crown) return 'crown';
  if (pts >= t.diamond) return 'diamond';
  if (pts >= t.platinum) return 'platinum';
  if (pts >= t.gold) return 'gold';
  if (pts >= t.silver) return 'silver';
  return 'bronze';
}

export function getLeagueTierLabel(totalPoints: number, seasonId: string): string {
  return LEAGUE_TIER_LABELS[getLeagueTierName(totalPoints, seasonId)];
}
