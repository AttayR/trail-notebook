// BirdNET label lines look like "Turdus merula_Eurasian Blackbird".
export const BIRDNET_V24_LABEL_COUNT = 6522;

export interface Label {
  scientific: string;
  common: string;
}

export function parseLabelLine(line: string): Label {
  const t = line.trim();
  const i = t.indexOf('_');
  if (i < 0) return { scientific: t, common: t };
  return { scientific: t.slice(0, i).trim(), common: t.slice(i + 1).trim() };
}

export function parseLabels(text: string): Label[] {
  return text
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .map(parseLabelLine);
}

export function assertLabelCount(labels: Label[], expected = BIRDNET_V24_LABEL_COUNT): void {
  if (labels.length !== expected) throw new Error(`expected ${expected} labels, got ${labels.length}`);
}
