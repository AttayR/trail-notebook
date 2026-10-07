import { formatClock, partOfDay, season, startOfLocalDay } from '../context/time';

const at = (h: number, m = 0, month = 9) => new Date(2026, month, 8, h, m);

describe('partOfDay', () => {
  it.each([
    [4, 'night'],
    [5, 'early morning'],
    [7, 'early morning'],
    [8, 'morning'],
    [11, 'midday'],
    [14, 'afternoon'],
    [17, 'evening'],
    [20, 'evening'],
    [21, 'night'],
    [0, 'night'],
  ])('hour %i -> %s', (h, expected) => {
    expect(partOfDay(at(h))).toBe(expected);
  });
});

describe('season', () => {
  it('October is autumn in the north and spring in the south', () => {
    expect(season(at(9), 31.5)).toBe('autumn');
    expect(season(at(9), -33.9)).toBe('spring');
  });
  it('defaults to north when lat unknown', () => {
    expect(season(at(9, 0, 0))).toBe('winter');
    expect(season(at(9, 0, 0), null)).toBe('winter');
  });
  it('flips at month boundaries', () => {
    expect(season(at(9, 0, 1), 10)).toBe('winter');
    expect(season(at(9, 0, 2), 10)).toBe('spring');
    expect(season(at(9, 0, 5), -10)).toBe('winter');
  });
});

describe('formatClock / startOfLocalDay', () => {
  it('pads hours and minutes', () => {
    expect(formatClock(at(7, 5))).toBe('07:05');
  });
  it('returns local midnight', () => {
    const d = at(15, 30);
    expect(new Date(startOfLocalDay(d)).getHours()).toBe(0);
    expect(new Date(startOfLocalDay(d)).getDate()).toBe(8);
  });
});
