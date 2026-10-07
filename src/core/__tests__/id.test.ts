import { makeId } from '../util/id';

describe('makeId', () => {
  it('is sortable by time', () => {
    const a = makeId(1_000);
    const b = makeId(2_000_000_000_000);
    expect(a < b).toBe(true);
  });

  it('is unique across calls', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => makeId()));
    expect(ids.size).toBe(1000);
  });

  it('has the expected shape', () => {
    expect(makeId(0, () => 0)).toBe('000000000-000000');
  });
});
