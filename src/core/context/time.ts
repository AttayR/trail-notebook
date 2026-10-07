import type { PartOfDay, Season } from '../types';

/** Local-time part of day. Boundaries: [5,8) early morning, [8,11) morning,
 *  [11,14) midday, [14,17) afternoon, [17,21) evening, otherwise night. */
export function partOfDay(date: Date): PartOfDay {
  const h = date.getHours();
  if (h >= 5 && h < 8) return 'early morning';
  if (h >= 8 && h < 11) return 'morning';
  if (h >= 11 && h < 14) return 'midday';
  if (h >= 14 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

const NORTH: Season[] = [
  'winter', 'winter', 'spring', 'spring', 'spring', 'summer',
  'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter',
];
const FLIP: Record<Season, Season> = {
  spring: 'autumn',
  summer: 'winter',
  autumn: 'spring',
  winter: 'summer',
};

/** Meteorological season. Southern hemisphere (lat < 0) is flipped.
 *  Unknown latitude defaults to the northern hemisphere. */
export function season(date: Date, lat?: number | null): Season {
  const north = NORTH[date.getMonth()];
  return lat != null && lat < 0 ? FLIP[north] : north;
}

/** 24-hour local clock, e.g. "07:42". */
export function formatClock(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Start of the local day in epoch ms, for "already logged today" queries. */
export function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}
