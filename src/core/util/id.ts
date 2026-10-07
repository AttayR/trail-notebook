// Sortable id: base36 epoch ms + random suffix. No native UUID module needed.
export function makeId(now: number = Date.now(), rand: () => number = Math.random): string {
  const time = now.toString(36).padStart(9, '0');
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += Math.floor(rand() * 36).toString(36);
  }
  return `${time}-${suffix}`;
}
