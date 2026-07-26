export function normalizeCell(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).normalize('NFKC').trim().replace(/\s+/g, ' ')
    : '';
}

export function normalizeRoll(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, '').toLocaleLowerCase('en-US');
}

export interface RollMatchResult {
  count: number;
  type: 'not_found' | 'found' | 'duplicate';
}

export function matchRollInRows(
  values: unknown[][],
  headerRow: number,
  rollColumn: number,
  normalizedRoll: string,
): RollMatchResult {
  const count = values
    .slice(headerRow + 1)
    .filter((row) => normalizeRoll(normalizeCell(row[rollColumn])) === normalizedRoll).length;
  if (count === 0) return { count, type: 'not_found' };
  if (count > 1) return { count, type: 'duplicate' };
  return { count, type: 'found' };
}
