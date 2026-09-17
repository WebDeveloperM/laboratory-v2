import type { FC } from 'react';

export type AV = Record<string, string>;

/** `employee_slug` — employee_service dagi xodim bilan bog'lanish; joriy foydalanuvchini
 *  o'z yozuvi bilan solishtirish uchun ishlatiladi (localStorage.employee_slug). */
export type Person = { id: number; full_name: string; position: string; employee_slug?: string | null };

export type SpravkaVerificationStep = {
  role: string;
  fullName?: string | null;
  approvedByUsername?: string | null;
  approvedAt?: string | null;
};

export type SpravkaVerificationInfo = {
  spravkaNumber?: string | null;
  steps: SpravkaVerificationStep[];
};

export interface SpravkaTemplateProps {
  form: AV;
  set: (key: string, val: string) => void;
  /** This template's own SpravkaTemplate.requiredFields, forwarded so the Table can flag its own
   *  required cells red — most templates don't set this and it's simply undefined/empty for them. */
  requiredFields?: string[];
  /** True once the user has attempted to save with missing required fields. */
  showErrors?: boolean;
}

export interface SpravkaTemplate {
  /** Must match the entry in SpravkiSelectPage's SPRAVKA_TEMPLATES list */
  name: string;
  /** Document code shown top-right (e.g. "ZSK-5-PD 006-011-115") */
  docCode: string;
  /** Header title shown above "Ma'lumotnoma №" */
  title: string;
  /** "Manzil va sinov joyi:" text (varies slightly between templates) */
  address: string;
  /** true => 2-column "GOST 2517 bo'yicha namuna olingan sana / Sinov o'tkazilgan sana" row;
   *  false => 3-column "Namuna olingan sana / GOST 2517 bo'yicha / Sinov o'tkazilgan sana" row */
  shortDatesRow: boolean;
  /** Field keys that must be filled in before saving, in addition to "Smena boshlig'i" (always
   *  required for every template). Covers both the shared header fields (yetkazib_beruvchi,
   *  vagon_soni, vagon_nomeri, gost_namuna_sana/namuna_sana, sinov_sana, berilgan_sana) and this
   *  template's own Table fields — both live in the same flat `form` object, so one list covers
   *  both. Most templates leave this unset and require nothing beyond the shift head. */
  requiredFields?: string[];
  /** Optional extra header field(s) rendered after the address block, before "Yetkazib beruvchi tashkilot" */
  HeaderExtra?: FC<SpravkaTemplateProps>;
  Table: FC<SpravkaTemplateProps>;
  /** mode 'blob' resolves to an object-URL string (for iframe preview); 'open'/'download' resolve to undefined. */
  generatePdf: (
    form: AV,
    mode: 'open' | 'download' | 'blob',
    verificationInfo?: SpravkaVerificationInfo | null,
  ) => Promise<void | string>;
}
