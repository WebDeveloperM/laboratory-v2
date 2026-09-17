import { fetchBnpzUzLogoBase64, generateQrCodeWithLogoBase64 } from '../../../../utils/passportPdf';
import type { AV, SpravkaVerificationInfo } from './types';

export async function loadPdfMake() {
  const pdfMakeModule = await import('pdfmake/build/pdfmake');
  const pdfFontsModule = await import('pdfmake/build/vfs_fonts');
  const pdfMake = ((pdfMakeModule as any).default ?? pdfMakeModule) as any;
  const pdfFonts = ((pdfFontsModule as any).default ?? pdfFontsModule) as any;
  pdfMake.vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs ?? pdfFonts;
  return pdfMake;
}

export function blank(val: string, chars = 20) {
  if (val) return val;
  return '_'.repeat(chars);
}

// A4 usable height: 841.89 - 25*2 = 791.89pt, half ≈ 395, minus cell padding (6*2) = 383
export const HALF_ROW_HEIGHT = 383;

function formatQrDateTime(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildSpravkaVerificationQrText(info: SpravkaVerificationInfo): string {
  const lines = [`СПРАВКА № ${info.spravkaNumber || '-'}`];
  for (const step of info.steps) {
    lines.push(`${step.role}: ${step.fullName || '-'} — Подписано (${formatQrDateTime(step.approvedAt)})`);
  }
  return lines.join('\n');
}

/**
 * Extra lines appended after each copy's own content: STTL boshlig'i / SZL boshlig'i / Dispetcher
 * (all three optional — a line is only printed when its value was actually filled in, rather than
 * showing the label with a blank underline), then "Ma'lumotnoma berilgan sana" — kept last so the
 * issue date always sits below every signatory name regardless of which ones are filled — and
 * finally the verification QR.
 */
function buildSpravkaSignatureExtras(form: AV, verifyQrBase64: string | null) {
  const ul = (val: string) => ({ text: val, decoration: 'underline', fontSize: 9 });
  return [
    ...(form.sttl_head ? [{ text: ["STTL boshlig'i: ", ul(form.sttl_head)], fontSize: 9, margin: [0, 3, 0, 0] }] : []),
    ...(form.czl_head ? [{ text: ["SZL boshlig'i: ", ul(form.czl_head)], fontSize: 9, margin: [0, 2, 0, 0] }] : []),
    ...(form.dispatcher_head ? [{ text: ['Dispetcher: ', ul(form.dispatcher_head)], fontSize: 9, margin: [0, 2, 0, 0] }] : []),
    { text: ["Ma'lumotnoma berilgan sana: ", { text: blank(form.berilgan_sana, 20), decoration: 'underline', fontSize: 9 }], fontSize: 9, margin: [0, 2, 0, 0] },
    ...(verifyQrBase64 ? [{ image: verifyQrBase64, width: 60, height: 60, alignment: 'right' as const, margin: [0, -50, 0, 0] as [number, number, number, number] }] : []),
  ];
}

/** Wraps a template's pdfmake content (header + table + footer) twice on one A4 page — two identical copies stacked, separated by a dashed line. */
export function buildDuplicateDocDef(buildContent: (form: AV) => any[], form: AV, verifyQrBase64: string | null = null) {
  const copy = () => [...buildContent(form), ...buildSpravkaSignatureExtras(form, verifyQrBase64)];
  return {
    pageSize: 'A4',
    pageMargins: [40, 25, 40, 25],
    content: [
      {
        table: {
          widths: ['*'],
          heights: [HALF_ROW_HEIGHT, HALF_ROW_HEIGHT],
          body: [
            [{ stack: copy() }],
            [{ stack: copy() }],
          ],
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? 0 : 1,
          vLineWidth: () => 0,
          hLineColor: () => '#444444',
          hLineStyle: () => ({ dash: { length: 6, space: 4 } }),
          paddingLeft: () => 0, paddingRight: () => 0,
          paddingTop: () => 6, paddingBottom: () => 6,
        },
      },
    ],
    defaultStyle: { font: 'Roboto' },
  };
}

/** Fallback for when a template's content is too tall for the fixed HALF_ROW_HEIGHT slot used by buildDuplicateDocDef — a single copy using the full page instead of two forced into half-height each. */
export function buildSingleDocDef(buildContent: (form: AV) => any[], form: AV, verifyQrBase64: string | null = null) {
  return {
    pageSize: 'A4',
    pageMargins: [40, 25, 40, 25],
    content: [...buildContent(form), ...buildSpravkaSignatureExtras(form, verifyQrBase64)],
    defaultStyle: { font: 'Roboto' },
  };
}

function getPdfBuffer(pdfMake: any, docDefinition: any): Promise<Uint8Array> {
  return new Promise((resolve) => pdfMake.createPdf(docDefinition).getBuffer((buffer: Uint8Array) => resolve(buffer)));
}

/**
 * pdfmake/pdfkit writes the page tree as a plain, uncompressed object (it doesn't use PDF 1.5+
 * object streams for it), so the total page count can be read straight off the /Pages node's
 * /Count entry instead of parsing the whole document.
 */
function countPdfPages(buffer: Uint8Array): number {
  const raw = new TextDecoder('latin1').decode(buffer);
  const match = raw.match(/\/Type\s*\/Pages[\s\S]{0,300}?\/Count\s+(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

/**
 * Two copies are meant to share one A4 page. When a template's content is dense enough that the
 * second copy would spill onto a second page — splitting the table awkwardly mid-row — printing
 * two half-height copies stops making sense, so this renders a trial copy, checks whether it
 * actually fit on one page, and falls back to a single full-page copy if it didn't.
 */
async function resolveSpravkaDocDef(pdfMake: any, buildContent: (form: AV) => any[], form: AV, verifyQrBase64: string | null) {
  const doubleDocDef = buildDuplicateDocDef(buildContent, form, verifyQrBase64);
  const buffer = await getPdfBuffer(pdfMake, doubleDocDef);
  return countPdfPages(buffer) <= 1 ? doubleDocDef : buildSingleDocDef(buildContent, form, verifyQrBase64);
}

async function resolveVerifyQrBase64(verificationInfo?: SpravkaVerificationInfo | null): Promise<string | null> {
  if (!verificationInfo || !verificationInfo.steps.length) return null;
  const logoBase64 = await fetchBnpzUzLogoBase64();
  return generateQrCodeWithLogoBase64(buildSpravkaVerificationQrText(verificationInfo), logoBase64);
}

export function makePdfGenerator(buildContent: (form: AV) => any[], filenamePrefix: string) {
  return async (
    form: AV,
    mode: 'open' | 'download' | 'blob' = 'download',
    verificationInfo?: SpravkaVerificationInfo | null,
  ): Promise<void | string> => {
    const [pdfMake, verifyQrBase64] = await Promise.all([loadPdfMake(), resolveVerifyQrBase64(verificationInfo)]);
    const docDefinition = await resolveSpravkaDocDef(pdfMake, buildContent, form, verifyQrBase64);
    const doc = pdfMake.createPdf(docDefinition);
    if (mode === 'open') {
      doc.open();
      return;
    }
    if (mode === 'blob') {
      return new Promise<string>((resolve, reject) => {
        try {
          doc.getBlob((blob: Blob) => resolve(URL.createObjectURL(blob)));
        } catch (e) {
          reject(e);
        }
      });
    }
    doc.download(`malumotnoma_${filenamePrefix}_${form.malumotnoma_no || 'new'}.pdf`);
  };
}
