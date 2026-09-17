import type { BenzinTableRow, JetA1TableRow } from './rowTypes';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any;

export type PdfType = 'reservoir' | 'wagon';

/** The closures currently declared inline at the top of buildDocDefinition —
 *  hoisted here so per-template `buildFormFields` functions receive them as
 *  params instead of each redefining/closing over them. */
export interface PdfFieldHelpers {
  v: (key: string) => string;
  fmtDate: (raw: string) => string;
  ul: (key: string, minLen?: number) => AnyObj;
  uld: (key: string, minLen?: number) => AnyObj;
  ulName: (key: string, minLen?: number) => AnyObj;
  toTitleCase: (value: string) => string;
  toAbbreviatedName: (value: string) => string;
  nb: string;
}

export interface HeaderCfg {
  certNo: string;
  certDates: string;
  rightWidth: number;
  rightStack: AnyObj[];
}

export interface TemplateFieldsProps {
  type: PdfType;
  reservoirValues: Record<string, string>;
  renderReservoirInput: (key: string, placeholder?: string, req?: boolean) => JSX.Element;
  renderReservoirTextarea: (key: string, req?: boolean) => JSX.Element;
  renderEmployeeSelect: (key: string, req?: boolean) => JSX.Element;
}

export interface TemplateTableProps {
  type: PdfType;
  actualRowValues: Record<string, string>;
  setActualRowValue: (key: string, value: string) => void;
  renderActualValueCell: (row: { key: string; name: string; norm: string }) => JSX.Element;
  trackedKey: (key: string) => string;
  renderEmployeeSelect: (key: string, req?: boolean) => JSX.Element;
  renderReservoirInput: (key: string, placeholder?: string, req?: boolean) => JSX.Element;
}

/**
 * One object per template variant — carries everything that today's
 * buildDocDefinition (row-array pick, table-builder pick, header config,
 * column labels, form-fields JSX, title/footnote text) plus the detail
 * page's header-fields/results-table JSX chains and required-fields
 * ternary compute ad hoc via free-text string matching. See
 * C:\Users\shabonov.m\.claude\plans\stateful-dancing-nebula.md for the
 * full migration plan and rollout order.
 */
export interface PassportTemplateDescriptor {
  templateKey: string;

  rows: (type: PdfType) => BenzinTableRow[] | JetA1TableRow[];
  tableBuilder: 'default' | 'kerosine' | 'mazut' | 'gaz' | 'eco3Wagon' | 'jetA1';
  columnLabels: string[];

  headerCfg: HeaderCfg | ((ctx: { stzLogoBase64: string | null }) => HeaderCfg);

  documentTitleLabel?: string; // default 'ПАСПОРТ №'; jet-notice uses 'ИЗВЕЩЕНИЕ №'
  productNameLine: string | ((ctx: { type: PdfType; tplStandard: string }) => string);
  addressFootnote: string | ((ctx: { type: PdfType }) => string);

  buildFormFields: (ctx: {
    type: PdfType;
    rv: Record<string, string>;
    av: Record<string, string>;
    helpers: PdfFieldHelpers;
    jetNoticeVariant?: 'primary' | 'secondary';
    tplName: string;
    tplStandard: string;
  }) => AnyObj[];

  extras?: {
    showStzLogoStamp?: boolean;
    isJetNotice?: boolean;
  };

  requiredFieldKeys: string[] | ((type: PdfType) => string[]);

  HeaderFields: React.ComponentType<TemplateFieldsProps>;
  ResultsTable: React.ComponentType<TemplateTableProps>;

  wagonVariant: 'standard' | 'none' | 'jetNoticeSecondary';

  displayName: string;
  category: string;
  productStandard: string;
}
