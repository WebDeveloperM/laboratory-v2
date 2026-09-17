import type { BenzinTableRow, JetA1TableRow } from './rowTypes';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any;

export const spanMarginTop = (span: number) => [0, Math.round((span - 1) * 9), 0, 0];

/**
 * pdfmake table cells have no native vertical-centering: a row's height is set by its tallest
 * cell (almost always "Наименование показателей", since it holds full sentences), and every
 * other cell in that row still sits at the top of it. This estimates how many lines `text` wraps
 * to in a column of `colWidthPt` points, so the shorter cells next to it can be pushed down to
 * look centered. It's a heuristic (average glyph width, no real text-shaping) — good enough for
 * these short technical labels, not a substitute for real layout measurement.
 */
function estimateLineCount(text: string, colWidthPt: number, fontSize = 8): number {
  if (!text) return 1;
  const avgCharWidth = fontSize * 0.5;
  const usableWidth = Math.max(colWidthPt - 6, avgCharWidth);
  const charsPerLine = Math.max(1, Math.floor(usableWidth / avgCharWidth));
  return text.split('\n').reduce((total, para) => total + Math.max(1, Math.ceil(para.length / charsPerLine)), 0);
}

/** Top margin that centers a 1-line cell inside a row whose height is set by `lines` lines of text elsewhere in the row — same ~9pt/line assumption spanMarginTop already uses for rowSpan cells. */
function centeringMargin(lines: number): [number, number, number, number] {
  return [0, Math.max(0, Math.round(((lines - 1) * 9) / 2)), 0, 0];
}

/**
 * Rows whose actual value is entered as a signed number ("-5" / "+5") via a минус/плюс dropdown
 * in the passport form (see SIGNED_ACTUAL_VALUE_ROW_KEYS in PassportTemplateDetailPage.tsx) —
 * the PDF spells the sign out ("минус 5" / "плюс 5") instead of printing the raw "-5"/"+5".
 */
const SIGNED_VALUE_ROW_KEYS = new Set(['dlc4_6_filter', 'dlb4_6_filter', 'ecoL62r5', 'ecoL62r19', 'ecoL62r20', 'ecoL40r5', 'ecoL40r19', 'ecoL40r20']);

/** ЭКО-Л-0,100-62 item 9 (sulphur by fuel type) is only tested for вида I — вида II/III always print "-". */
const FIXED_DASH_ROW_KEYS = new Set(['ecoL62r9_ii', 'ecoL62r9_iii']);

function formatActualValue(key: string, av: Record<string, string>): string {
  if (FIXED_DASH_ROW_KEYS.has(key)) return '-';
  const raw = av[key] || '';
  if (!SIGNED_VALUE_ROW_KEYS.has(key) || !raw) return raw;
  if (raw.startsWith('-')) return `минус ${raw.slice(1)}`;
  if (raw.startsWith('+')) return `плюс ${raw.slice(1)}`;
  return raw;
}

// Points remaining for the '*' Наименование column once the fixed-width columns are subtracted
// from the usable A4 page width (595.28pt - 20pt - 18pt margins = 557.28pt). Recomputed here
// per table layout rather than passed in from the caller — every caller already ends up wiring
// the exact same `widths` array into the pdfmake `table` definition further down.
const DEFAULT_NAME_COL_WIDTH = 557.28 - (24 + 58 + 58 + 52 + 60);
const AI92P_NAME_COL_WIDTH = 557.28 - (24 + 58 + 105 + 52 + 60);
const KEROSINE_NAME_COL_WIDTH = 557.28 - (80 + 70 + 60);
const MAZUT_NAME_COL_WIDTH = 557.28 - (24 + 70 + 60);
const ECO3_WAGON_NAME_COL_WIDTH = 557.28 - (24 + 68 + 68 + 60);
const JET_A1_NAME_COL_WIDTH = 557.28 - (20 + 72 + 50 + 48 + 72);

export function buildTableRows(rows: BenzinTableRow[], av: Record<string, string>, nameColWidthPt = DEFAULT_NAME_COL_WIDTH): AnyObj[][] {
  let noSpanLeft = 0;
  let gostSpanLeft = 0;

  return rows.map((row) => {
    const cells: AnyObj[] = [];
    const pb = row.pageBreakBefore ? ({ pageBreak: 'before' } as const) : {};
    const centerMargin = centeringMargin(estimateLineCount(row.name, nameColWidthPt));

    if (noSpanLeft > 0) {
      cells.push({ ...pb });
      noSpanLeft--;
    } else if ((row.noRowSpan ?? 1) > 1) {
      cells.push({ text: row.no, rowSpan: row.noRowSpan, alignment: 'center', fontSize: 8, margin: spanMarginTop(row.noRowSpan!), ...pb });
      noSpanLeft = row.noRowSpan! - 1;
    } else {
      cells.push({ text: row.no, alignment: 'center', fontSize: 8, margin: centerMargin, ...pb });
    }

    cells.push({ text: row.name, fontSize: 8, ...pb });

    if (gostSpanLeft > 0) {
      cells.push({ ...pb });
      gostSpanLeft--;
    } else if ((row.gostRowSpan ?? 1) > 1) {
      const gostMargin = row.gostMarginTopOverride !== undefined
        ? [0, row.gostMarginTopOverride, 0, 0] as [number, number, number, number]
        : spanMarginTop(row.gostRowSpan!);
      cells.push({ text: row.gost, rowSpan: row.gostRowSpan, alignment: 'center', fontSize: 8, margin: gostMargin, ...pb });
      gostSpanLeft = row.gostRowSpan! - 1;
    } else {
      cells.push({ text: row.gost, alignment: 'center', fontSize: 8, margin: centerMargin, ...pb });
    }

    cells.push({ text: row.norm, alignment: 'center', fontSize: 8, margin: centerMargin, ...pb });
    cells.push({ text: row.normOtr, alignment: 'center', fontSize: 8, margin: centerMargin, ...pb });
    cells.push({ text: formatActualValue(row.key, av), alignment: 'center', fontSize: 8, bold: true, margin: centerMargin, ...pb });

    return cells;
  });
}

/** Widths used by the isAI92P table variant ([24, '*', 58, 105, 52, 60]) — narrower remaining space for the name column than the default legacy layout. */
export function buildTableRowsAI92P(rows: BenzinTableRow[], av: Record<string, string>): AnyObj[][] {
  return buildTableRows(rows, av, AI92P_NAME_COL_WIDTH);
}

export function buildKerosineTableRows(rows: BenzinTableRow[], av: Record<string, string>): AnyObj[][] {
  return rows.map((row) => {
    const centerMargin = centeringMargin(estimateLineCount(row.name, KEROSINE_NAME_COL_WIDTH));
    return [
      { text: row.name, fontSize: 8, alignment: 'left' },
      { text: row.gost, fontSize: 8, alignment: 'center', margin: centerMargin },
      { text: row.norm, fontSize: 8, alignment: 'center', margin: centerMargin },
      { text: av[row.key] || '', fontSize: 8, alignment: 'center', bold: true, margin: centerMargin },
    ];
  });
}

export function buildMazutTableRows(rows: BenzinTableRow[], av: Record<string, string>): AnyObj[][] {
  return rows.map((row) => {
    const centerMargin = centeringMargin(estimateLineCount(row.name, MAZUT_NAME_COL_WIDTH));
    return [
      { text: row.no, fontSize: 8, alignment: 'center', margin: centerMargin },
      { text: row.name, fontSize: 8, alignment: 'left' },
      { text: row.norm, fontSize: 8, alignment: 'center', margin: centerMargin },
      { text: av[row.key] || '', fontSize: 8, alignment: 'center', bold: true, margin: centerMargin },
    ];
  });
}

export function buildGazTableRows(rows: BenzinTableRow[], av: Record<string, string>): AnyObj[][] {
  let noSpanLeft = 0;
  return rows.map((row) => {
    const cells: AnyObj[] = [];
    const centerMargin = centeringMargin(estimateLineCount(row.name, MAZUT_NAME_COL_WIDTH));
    if (noSpanLeft > 0) { cells.push({}); noSpanLeft--; }
    else if ((row.noRowSpan ?? 1) > 1) {
      cells.push({ text: row.no, rowSpan: row.noRowSpan, alignment: 'center', fontSize: 8, margin: spanMarginTop(row.noRowSpan!) });
      noSpanLeft = row.noRowSpan! - 1;
    } else {
      cells.push({ text: row.no, alignment: 'center', fontSize: 8, margin: centerMargin });
    }
    cells.push({ text: row.name, fontSize: 8, alignment: 'left' });
    cells.push({ text: row.norm, fontSize: 8, alignment: 'center', margin: centerMargin });
    cells.push({ text: av[row.key] || '', fontSize: 8, alignment: 'center', bold: true, margin: centerMargin });
    return cells;
  });
}

export function buildEco3WagonTableRows(rows: BenzinTableRow[], av: Record<string, string>): AnyObj[][] {
  let noSpanLeft = 0;
  let gostSpanLeft = 0;
  return rows.map((row) => {
    const cells: AnyObj[] = [];
    const centerMargin = centeringMargin(estimateLineCount(row.name, ECO3_WAGON_NAME_COL_WIDTH));
    if (noSpanLeft > 0) { cells.push({}); noSpanLeft--; }
    else if ((row.noRowSpan ?? 1) > 1) {
      cells.push({ text: row.no, rowSpan: row.noRowSpan, alignment: 'center', fontSize: 8, margin: spanMarginTop(row.noRowSpan!) });
      noSpanLeft = row.noRowSpan! - 1;
    } else {
      cells.push({ text: row.no, alignment: 'center', fontSize: 8, margin: centerMargin });
    }
    cells.push({ text: row.name, fontSize: 8 });
    if (gostSpanLeft > 0) { cells.push({}); gostSpanLeft--; }
    else if ((row.gostRowSpan ?? 1) > 1) {
      cells.push({ text: row.gost, rowSpan: row.gostRowSpan, alignment: 'center', fontSize: 8, margin: spanMarginTop(row.gostRowSpan!) });
      gostSpanLeft = row.gostRowSpan! - 1;
    } else {
      cells.push({ text: row.gost, alignment: 'center', fontSize: 8, margin: centerMargin });
    }
    cells.push({ text: row.norm, alignment: 'center', fontSize: 8, margin: centerMargin });
    cells.push({ text: formatActualValue(row.key, av), alignment: 'center', fontSize: 8, bold: true, margin: centerMargin });
    return cells;
  });
}

export function buildJetA1TableRows(rows: JetA1TableRow[], av: Record<string, string>): AnyObj[][] {
  let noSpanLeft = 0;
  let methodSpanLeft = 0;
  return rows.map((row) => {
    const cells: AnyObj[] = [];
    const centerMargin = centeringMargin(estimateLineCount(row.name, JET_A1_NAME_COL_WIDTH));
    if (noSpanLeft > 0) { cells.push({}); noSpanLeft--; }
    else if ((row.noRowSpan ?? 1) > 1) {
      cells.push({ text: row.no, rowSpan: row.noRowSpan, alignment: 'center', fontSize: 8, margin: spanMarginTop(row.noRowSpan!) });
      noSpanLeft = row.noRowSpan! - 1;
    } else {
      cells.push({ text: row.no, alignment: 'center', fontSize: 8, margin: centerMargin });
    }
    cells.push({ text: row.name, fontSize: 8 });
    cells.push({ text: row.norm, alignment: 'center', fontSize: 8, margin: centerMargin });
    cells.push({ text: row.normOtr, alignment: 'center', fontSize: 8, margin: centerMargin });
    cells.push({ text: av[row.key] || '', alignment: 'center', fontSize: 8, bold: true, margin: centerMargin });
    if (methodSpanLeft > 0) { cells.push({}); methodSpanLeft--; }
    else if ((row.methodRowSpan ?? 1) > 1) {
      cells.push({ text: row.method, rowSpan: row.methodRowSpan, alignment: 'center', fontSize: 8, margin: spanMarginTop(row.methodRowSpan!) });
      methodSpanLeft = row.methodRowSpan! - 1;
    } else {
      cells.push({ text: row.method, alignment: 'center', fontSize: 8, margin: centerMargin });
    }
    return cells;
  });
}
