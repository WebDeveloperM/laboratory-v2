export type JetA1TableRow = {
  key: string;
  no: string;
  name: string;
  norm: string;
  normOtr: string;
  method: string;
  noRowSpan?: number;
  methodRowSpan?: number;
};

export type BenzinTableRow = {
  key: string;
  no: string;
  name: string;
  gost: string;
  norm: string;
  normOtr: string;
  noRowSpan?: number;
  gostRowSpan?: number;
  gostMarginTopOverride?: number;
  pageBreakBefore?: boolean;
};
