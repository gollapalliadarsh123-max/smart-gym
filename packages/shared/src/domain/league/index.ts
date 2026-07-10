import { MAX_DAILY_LEAGUE_POINTS } from '../../constants/app';
import { getLeagueSeasonDateRange } from '../../constants/league';

export function clampLeagueDayPoints(value: number): number {
  const n = Number(value) || 0;
  return Math.max(0, Math.min(MAX_DAILY_LEAGUE_POINTS, Math.round(n)));
}

export function computeCombinedFitnessScore(_attendedToday: boolean, dietScore0to100: number): number {
  return clampLeagueDayPoints(dietScore0to100);
}

export function applyLeagueDayPoints(
  existingDayPoints: Record<string, number>,
  seasonId: string,
  dateYmd: string,
  dayPointsValue: number,
): { dayPoints: Record<string, number>; totalPoints: number } {
  const { start, end } = getLeagueSeasonDateRange(seasonId);
  if (dateYmd < start || dateYmd > end) {
    return {
      dayPoints: { ...existingDayPoints },
      totalPoints: sumSeasonPoints(existingDayPoints, start, end),
    };
  }

  const dayPoints = { ...existingDayPoints, [dateYmd]: clampLeagueDayPoints(dayPointsValue) };
  return {
    dayPoints,
    totalPoints: sumSeasonPoints(dayPoints, start, end),
  };
}

export function sumSeasonPoints(
  dayPoints: Record<string, number>,
  seasonStart: string,
  seasonEnd: string,
): number {
  let total = 0;
  for (const [date, points] of Object.entries(dayPoints)) {
    if (date >= seasonStart && date <= seasonEnd) {
      total += clampLeagueDayPoints(points);
    }
  }
  return total;
}

export {
  getLeagueSeasonId,
  getLeagueSeasonDateRange,
  getLeagueSeasonDayCount,
  getLeagueTierThresholds,
  getLeagueTierName,
  getLeagueTierLabel,
  LEAGUE_TIER_LABELS,
} from '../../constants/league';

const QUARTER_RANGES: Record<string, string> = {
  '1': 'Jan – Mar',
  '2': 'Apr – Jun',
  '3': 'Jul – Sep',
  '4': 'Oct – Dec',
};

export function getLeagueSeasonLabel(seasonId: string): string {
  const parts = (seasonId || '').split('-Q');
  if (parts.length !== 2) return seasonId || '—';
  const y = parts[0];
  const q = parts[1] ?? '';
  return `${y} · Q${q} (${QUARTER_RANGES[q] ?? ''})`;
}

export function getLeagueSeasonShortTag(seasonId: string): string {
  const parts = (seasonId || '').split('-Q');
  return parts.length === 2 ? `${parts[0]} Q${parts[1]}` : 'Season';
}
