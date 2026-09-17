import type { PdfFieldHelpers } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any;

/** Builds the field-value formatting helpers bound to one passport's `rv`
 *  (field_values) map. Hoisted out of buildDocDefinition so per-template
 *  form-field builders can receive these as params instead of each closing
 *  over its own copy. */
export function createPdfFieldHelpers(rv: Record<string, string>): PdfFieldHelpers {
  const v = (key: string) => rv[key] || '';
  const fmtDate = (raw: string) => {
    if (!raw) return '';
    const parts = raw.split('-');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return raw;
  };
  const nb = ' ';
  const ul = (key: string, minLen = 10): AnyObj => {
    const val = v(key);
    const padded = val ? val + nb.repeat(3) : nb.repeat(minLen);
    return { text: padded, decoration: 'underline' };
  };
  const toTitleCase = (value: string) => value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  const toAbbreviatedName = (value: string) => {
    const parts = toTitleCase(value).split(' ').filter(Boolean);
    if (parts.length === 0) return '';
    const [lastName, ...rest] = parts;
    const initials = rest.slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join('.');
    return initials ? `${lastName} ${initials}` : lastName;
  };
  const ulName = (key: string, minLen = 10): AnyObj => {
    const val = toAbbreviatedName(v(key));
    return { text: val || nb.repeat(minLen) };
  };
  const uld = (key: string, minLen = 12): AnyObj => {
    const val = fmtDate(v(key));
    const padded = val ? val + nb.repeat(3) : nb.repeat(minLen);
    return { text: padded, decoration: 'underline' };
  };

  return { v, fmtDate, nb, ul, toTitleCase, toAbbreviatedName, ulName, uld };
}
