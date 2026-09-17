// Public API of the passport-PDF system. External code should only ever
// import from this barrel (`from '.../utils/passportPdf'`), never reach
// into individual files inside this folder.
//
// During the batch-by-batch template-registry migration (see
// C:\Users\shabonov.m\.claude\plans\stateful-dancing-nebula.md),
// buildDocDefinition.ts still contains the full legacy row-array constants,
// detection logic and public functions (getPdfBlobUrl, downloadPdf,
// getEtiketkaBlobUrl, QR helpers, etc.) — re-exported here unchanged.
export * from './buildDocDefinition';
export * from './rowTypes';
export * from './registry/benzin/rows';
export { resolveTemplateKey } from './resolveTemplateKey';
export type { TemplateKey } from './resolveTemplateKey';
export { TEMPLATE_REGISTRY } from './registry';
export type { PassportTemplateDescriptor, PdfType } from './types';
