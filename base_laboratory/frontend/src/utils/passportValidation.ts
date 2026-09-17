// Shared "Фактическое значение" vs "Норма" validation used across passport pages.

export const ACTUAL_VALUE_INVALID_CLS = 'text-red-600 font-semibold dark:text-red-500';
export const ACTUAL_VALUE_INVALID_CSS = 'color:#dc2626;font-weight:600;';

export const getNormComparison = (name: string): 'min' | 'max' | null => {
  const lower = name.toLowerCase();
  if (lower.includes('не менее') || lower.includes('не ниже')) return 'min';
  if (lower.includes('не более') || lower.includes('не выше')) return 'max';
  // Some rows drop the "не" and just end in "выше" — "Температура вспышки … °C, выше" with
  // norm 55 means the value must sit above it, i.e. a minimum. Only a *trailing* "выше"
  // counts: "- эфиров (C5 и выше)" names a carbon range, and its norm is an upper limit, so
  // matching the word anywhere would invert that row's check.
  if (lower.trim().endsWith('выше')) return 'min';
  // Mirror case: a trailing bare "менее" reads as "below X", i.e. an upper limit — as in
  // "при температуре 250 °C перегоняется, % (по объему), менее" (65). Reached only when no
  // "не менее" matched above, so the two spellings cannot be confused.
  if (lower.trim().endsWith('менее')) return 'max';
  return null;
};

export const parseNormNumber = (raw: string): number | null => {
  if (!raw) return null;
  const match = raw.replace(',', '.').match(/-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : null;
};

// "в пределах" rows state both bounds inside the norm itself rather than via a
// не менее/не более keyword. Separators seen in the templates are the hyphen and the
// en dash, with or without spaces, and decimals use a comma: "820,0 - 845,0",
// "775 – 840", "2,0-4,5". Returns null for any norm that is not such a pair, which is
// what keeps single-value norms ("725,0", "Класс 1", "-") out of range checking.
export const parseNormRange = (raw: string): { min: number; max: number } | null => {
  if (!raw) return null;
  const normalized = raw.replace(/,/g, '.').replace(/[–—]/g, '-');
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const first = parseFloat(match[1]);
  const second = parseFloat(match[2]);
  return first <= second ? { min: first, max: second } : { min: second, max: first };
};

export const isActualValueInvalid = (row: { name: string; norm: string }, actualValue: string): boolean => {
  if (!actualValue.trim()) return false;
  const actualNum = parseNormNumber(actualValue);
  if (row.norm.trim().toLowerCase().includes('отсутств')) {
    return actualNum !== null && actualNum !== 0;
  }
  const comparison = getNormComparison(row.name);
  if (comparison) {
    const normNum = parseNormNumber(row.norm);
    if (normNum === null || actualNum === null) return false;
    return comparison === 'min' ? actualNum < normNum : actualNum > normNum;
  }
  // No не менее/не более keyword — the norm may still carry a range ("в пределах").
  // Checked only in this branch so rows that already validate keep their exact behaviour;
  // rows whose norm is not a range fall through to "no validation", as before.
  const range = parseNormRange(row.norm);
  if (range === null || actualNum === null) return false;
  return actualNum < range.min || actualNum > range.max;
};
