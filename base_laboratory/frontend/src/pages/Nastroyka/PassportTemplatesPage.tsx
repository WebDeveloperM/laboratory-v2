import { useEffect, useState, useRef } from 'react';
import { FaPlus, FaTrash, FaCheck, FaTimes, FaArrowUp, FaArrowDown, FaFileWord, FaEye, FaEyeSlash } from 'react-icons/fa';
// FaArrowUp, FaArrowDown still used in fields editor
import { toast } from 'react-toastify';
import { useLocation, useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import ExcelEditor, { type ExcelEditorHandle } from '../../components/ExcelEditor';
import axioss from '../../api/axios';

// ─── Types ────────────────────────────────────────────────────────────────────

type Template = {
  id: number;
  name: string;
  category: string;
  product_standard: string;
  reservoir_type: string;
  fields_count: number;
  rows_count: number;
  updated_at: string;
};

type TemplateDetail = Template & {
  header_html: string;
  footer_html: string;
  fields: TField[];
  rows: TRow[];
};

type TField = {
  id?: number;
  key: string;
  label: string;
  field_type: 'text' | 'date' | 'number' | 'select' | 'textarea';
  options: string[];
  order: number;
  required: boolean;
};

type TRow = {
  id?: number;
  order: number;
  name: string;
  gost: string;
  standard_value: string;
  standard_value_2: string;
  unit: string;
  is_section: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inputCls = 'w-full rounded border border-stroke bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark';
const thCls = 'px-3 py-2 text-left text-xs font-semibold text-black dark:text-white bg-gray-2 dark:bg-meta-4';
const tdCls = 'px-3 py-2 text-xs text-black dark:text-white border-b border-stroke dark:border-strokedark';

const EMPTY_FIELD: TField = { key: '', label: '', field_type: 'text', options: [], order: 0, required: false };
const EMPTY_ROW: TRow = { order: 0, name: '', gost: '', standard_value: '', standard_value_2: '', unit: '', is_section: false };

const SAMPLE_HEADER_HTML = `
<div style="font-family:'Times New Roman',serif;font-size:11pt;color:#000;line-height:1.35;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;">
    <div>
      <div style="font-size:22pt;font-weight:700;margin-top:6px;">ПАСПОРТ № {{passport_no}}</div>
      <div style="margin-top:8px;">Наименование продукции: <strong>{{product_name}}</strong></div>
      <div style="margin-top:4px;">Адрес и место осуществления испытаний: {{test_address}}</div>
      <div style="margin-top:4px;">Изготовитель и заказчик: {{producer}} &nbsp;&nbsp; Резервуар: {{reservoir}} &nbsp;&nbsp; Замер: {{measurement_no}}</div>
      <div style="margin-top:4px;">Дата изготовления: {{manufacture_date}} &nbsp;&nbsp; Дата отбора образцов: {{sampling_date}}</div>
      <div style="margin-top:4px;">Дата поступления образцов: {{receipt_date}} &nbsp;&nbsp; Дата проведения испытаний: {{test_date}}</div>
      <div style="margin-top:4px;">Партия №: {{batch_no}} &nbsp;&nbsp; Присадка: {{additive}}</div>
    </div>
    <div style="text-align:right;font-size:10pt;max-width:260px;">
      <div>№ сертификата: {{cert_number}}</div>
      <div>от {{cert_from}} до {{cert_to}}</div>
      <div style="margin-top:12px;">{{production_note}}</div>
      <div style="margin-top:16px;">Знак соответствия стандарта</div>
    </div>
  </div>
  <div style="margin-top:8px;font-weight:700;font-size:13pt;">{{standard_title}}</div>
</div>`;

const SAMPLE_FOOTER_HTML = `
<div style="font-family:'Times New Roman',serif;font-size:11pt;color:#000;line-height:1.35;margin-top:10px;">
  <div style="margin-top:8px;">Гарантийный срок хранения: {{storage_term}}</div>
  <div>Примечание: {{note_text}}</div>
  <div style="display:flex;justify-content:space-between;margin-top:18px;">
    <div>
      <div>Начальник ЦЗЛ ____________________</div>
      <div style="margin-top:4px;">Начальник смены ____________________</div>
      <div style="margin-top:4px;">Дата выдачи паспорта {{passport_issue_date}}</div>
    </div>
    <div style="text-align:right;">
      <div>Штамп соответствия НД</div>
      <div style="margin-top:26px;">Начальник СТТЛ: {{sttl_head}}</div>
    </div>
  </div>
  <div style="text-align:center;margin-top:10px;">Страница {{page_no}}</div>
</div>`;

const SAMPLE_FIELDS: TField[] = [
  { key: 'passport_no', label: 'Паспорт №', field_type: 'text', options: [], order: 0, required: true },
  { key: 'product_name', label: 'Наименование продукции', field_type: 'text', options: [], order: 1, required: true },
  { key: 'standard_title', label: 'Стандарт (заголовок)', field_type: 'text', options: [], order: 2, required: true },
  { key: 'cert_number', label: '№ сертификата', field_type: 'text', options: [], order: 3, required: false },
  { key: 'cert_from', label: 'Сертификат от', field_type: 'date', options: [], order: 4, required: false },
  { key: 'cert_to', label: 'Сертификат до', field_type: 'date', options: [], order: 5, required: false },
  { key: 'production_note', label: 'Примечание о производстве', field_type: 'text', options: [], order: 6, required: false },
  { key: 'test_address', label: 'Адрес испытаний', field_type: 'textarea', options: [], order: 7, required: true },
  { key: 'producer', label: 'Изготовитель/заказчик', field_type: 'text', options: [], order: 8, required: true },
  { key: 'reservoir', label: 'Резервуар/Вагон', field_type: 'text', options: [], order: 9, required: false },
  { key: 'measurement_no', label: 'Замер', field_type: 'text', options: [], order: 10, required: false },
  { key: 'manufacture_date', label: 'Дата изготовления', field_type: 'date', options: [], order: 11, required: false },
  { key: 'sampling_date', label: 'Дата отбора образцов', field_type: 'date', options: [], order: 12, required: false },
  { key: 'receipt_date', label: 'Дата поступления образцов', field_type: 'date', options: [], order: 13, required: false },
  { key: 'test_date', label: 'Дата проведения испытаний', field_type: 'date', options: [], order: 14, required: false },
  { key: 'batch_no', label: 'Партия №', field_type: 'text', options: [], order: 15, required: false },
  { key: 'additive', label: 'Присадка', field_type: 'text', options: [], order: 16, required: false },
  { key: 'storage_term', label: 'Гарантийный срок хранения', field_type: 'text', options: [], order: 17, required: false },
  { key: 'note_text', label: 'Примечание', field_type: 'textarea', options: [], order: 18, required: false },
  { key: 'passport_issue_date', label: 'Дата выдачи паспорта', field_type: 'date', options: [], order: 19, required: false },
  { key: 'sttl_head', label: 'Начальник СТТЛ', field_type: 'text', options: [], order: 20, required: false },
  { key: 'page_no', label: 'Номер страницы', field_type: 'text', options: [], order: 21, required: false },
];

const SAMPLE_ROWS: TRow[] = [
  { order: 0, name: 'Октановое число по исследовательскому методу, не менее', gost: 'ГОСТ 8226', standard_value: '92,0', standard_value_2: '', unit: '', is_section: false },
  { order: 1, name: 'Октановое число по моторному методу, не менее', gost: 'ГОСТ 511', standard_value: '83,0', standard_value_2: '', unit: '', is_section: false },
  { order: 2, name: 'Массовая концентрация свинца, мг/дм3, не более', gost: 'ГОСТ 28828', standard_value: '10', standard_value_2: '', unit: '', is_section: false },
  { order: 3, name: 'Фракционный состав: температура начала перегонки, C, не ниже', gost: 'ГОСТ 2177', standard_value: '35', standard_value_2: '', unit: '', is_section: false },
  { order: 4, name: 'Фракционный состав: пределы перегонки 10 %, не выше, C', gost: 'ГОСТ 2177', standard_value: '75', standard_value_2: '', unit: '', is_section: false },
  { order: 5, name: 'Фракционный состав: пределы перегонки 50 %, не выше, C', gost: 'ГОСТ 2177', standard_value: '120', standard_value_2: '', unit: '', is_section: false },
  { order: 6, name: 'Фракционный состав: пределы перегонки 90 %, не выше, C', gost: 'ГОСТ 2177', standard_value: '190', standard_value_2: '', unit: '', is_section: false },
  { order: 7, name: 'Конец кипения, C, не выше', gost: 'ГОСТ 2177', standard_value: '215', standard_value_2: '', unit: '', is_section: false },
  { order: 8, name: 'Объемная доля бензола, %, не более', gost: 'ГОСТ 31871', standard_value: '5', standard_value_2: '', unit: '', is_section: false },
  { order: 9, name: 'Массовая концентрация серы, мг/кг, не более', gost: 'ГОСТ 19121', standard_value: '500', standard_value_2: '', unit: '', is_section: false },
  { order: 10, name: 'Испытание на медной пластинке (3 ч при 50 C)', gost: 'ГОСТ 32329', standard_value: 'Класс 1', standard_value_2: '', unit: '', is_section: false },
  { order: 11, name: 'Плотность при 20 C, кг/м3', gost: 'ГОСТ 3900', standard_value: '725,0', standard_value_2: '', unit: '', is_section: false },
  { order: 12, name: 'Содержание механических примесей и воды', gost: 'Визуально', standard_value: 'Отсутствие', standard_value_2: '', unit: '', is_section: false },
  { order: 13, name: 'Внешний вид', gost: 'Визуально', standard_value: 'Чистый, прозрачный', standard_value_2: '', unit: '', is_section: false },
  { order: 14, name: 'Массовая концентрация марганца, мг/дм3, не более', gost: 'ASTM D 3831', standard_value: 'Отсутствие', standard_value_2: '', unit: '', is_section: false },
  { order: 15, name: 'Массовая концентрация железа, мг/дм3, не более', gost: 'ГОСТ 32514', standard_value: 'Отсутствие', standard_value_2: '', unit: '', is_section: false },
  { order: 16, name: 'Объемная доля монометиланилина, %, не более', gost: 'ГОСТ 32515', standard_value: '1,3', standard_value_2: '', unit: '', is_section: false },
  { order: 17, name: 'Объемная доля оксигенатов, %, не более', gost: '', standard_value: '', standard_value_2: '', unit: '', is_section: true },
  { order: 18, name: '  - метанола', gost: 'ГОСТ 32338', standard_value: '1,0', standard_value_2: '', unit: '', is_section: false },
  { order: 19, name: '  - этанола', gost: 'ГОСТ 32338', standard_value: '5,0', standard_value_2: '', unit: '', is_section: false },
  { order: 20, name: '  - изопропанола', gost: 'ГОСТ 32338', standard_value: '10,0', standard_value_2: '', unit: '', is_section: false },
  { order: 21, name: '  - третбутанола', gost: 'ГОСТ 32338', standard_value: '7,0', standard_value_2: '', unit: '', is_section: false },
  { order: 22, name: '  - изобутанола', gost: 'ГОСТ 32338', standard_value: '10,0', standard_value_2: '', unit: '', is_section: false },
  { order: 23, name: '  - эфиров (С5 и выше)', gost: 'ГОСТ 32338', standard_value: '15,0', standard_value_2: '', unit: '', is_section: false },
  { order: 24, name: '  - других оксигенатов (tкип до 210 C)', gost: 'ГОСТ 32338', standard_value: '10,0', standard_value_2: '', unit: '', is_section: false },
];

const BENZIN_HEADER_HTML = `
<div style="font-family:'Times New Roman',serif;font-size:11pt;color:#000;line-height:1.25;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;">
    <div>ООО Бухарский НПЗ</div>
    <div style="text-align:center;font-size:10.5pt;max-width:280px;">
      № сертификата на продукцию<br/>
      {{cert_number}}<br/>
      от {{cert_from}} г. до {{cert_to}} г.
    </div>
      <div style="text-align:right;font-size:10.5pt;max-width:170px;">
        O'ZBEKISTONDA ISHLAB CHIQARILGAN<br/>
      Знак соответствия стандарта
    </div>
  </div>

  <div style="text-align:center;font-weight:700;font-size:20pt;margin-top:8px;color:#c62828;">ПАСПОРТ № {{passport_no}}</div>
  <div style="margin-top:6px;font-size:13pt;font-weight:700;">
    Наименование продукции: {{product_name}}
  </div>
  <div style="margin-top:5px;">Адрес и место осуществления испытаний: {{test_address}}</div>

  <div style="margin-top:3px;">
    Изготовитель и заказчик: {{producer}}
    <span style="color:#c62828;">&nbsp;&nbsp;Резервуар: {{reservoir}}&nbsp;&nbsp;Замер: {{measurement_no}}&nbsp;&nbsp;Дата изготовления {{manufacture_date}}</span>
  </div>
  <div style="margin-top:1px;color:#c62828;">Дата отбора образцов: {{sampling_date}} &nbsp;&nbsp;&nbsp; по ГОСТ 2517 &nbsp;&nbsp;&nbsp; Дата поступления образцов: {{receipt_date}}</div>
  <div style="margin-top:1px;color:#c62828;">Дата проведения испытаний: {{test_date}} &nbsp;&nbsp;&nbsp; Партия №: {{batch_no}} &nbsp;&nbsp;&nbsp; Октаноповышающие добавка: {{additive}}</div>
  <div style="margin-top:1px;color:#c62828;font-weight:700;">СМЕСЬ АРОМАТИЧЕСКИХ УГЛЕВОДОРОДОВ - {{aromatic_hydrocarbons}} %</div>
</div>`;

const BENZIN_FOOTER_HTML = `
<div style="font-family:'Times New Roman',serif;font-size:11pt;color:#000;line-height:1.25;margin-top:8px;">
  <div>
    при 15 °C определяется для экспортируемого и импортируемого бензина, или по требованию потребителя.
    Дополнения, отклонения или исключения от метода-отсутствует.
    Перепечатка и копирование без разрешения испытательной лаборатории запрещена.
  </div>
  <div style="display:flex;justify-content:space-between;margin-top:10px;">
    <div style="width:60%;">
      <div><span style="color:#c62828;font-weight:700;">Начальник ЦЗЛ</span> ____________________ {{czl_head}}</div>
      <div style="margin-top:2px;"><span style="color:#c62828;font-weight:700;">Начальник смены</span> ____________________ {{shift_head}}</div>
      <div style="margin-top:2px;"><span style="color:#c62828;font-weight:700;">Дата выдачи паспорта</span> ____________________ {{passport_issue_date}}</div>
    </div>
    <div style="width:40%;text-align:right;">
      <div>Штамп соответствия НД</div>
      <div style="margin-top:22px;">Начальник СТТЛ: {{sttl_head}}</div>
    </div>
  </div>
  <div style="text-align:center;margin-top:8px;">Страница {{page_no}}</div>
</div>`;

const BENZIN_FIELDS: TField[] = [
  { key: 'passport_no', label: 'Паспорт №', field_type: 'text', options: [], order: 0, required: true },
  { key: 'product_name', label: 'Наименование продукции', field_type: 'text', options: [], order: 1, required: true },
  { key: 'test_address', label: 'Адрес и место испытаний', field_type: 'textarea', options: [], order: 2, required: true },
  { key: 'producer', label: 'Изготовитель и заказчик', field_type: 'text', options: [], order: 3, required: true },
  { key: 'reservoir', label: 'Резервуар', field_type: 'text', options: [], order: 4, required: false },
  { key: 'measurement_no', label: 'Замер', field_type: 'text', options: [], order: 5, required: false },
  { key: 'manufacture_date', label: 'Дата изготовления', field_type: 'date', options: [], order: 6, required: false },
  { key: 'sampling_date', label: 'Дата отбора образцов', field_type: 'date', options: [], order: 7, required: false },
  { key: 'receipt_date', label: 'Дата поступления образцов', field_type: 'date', options: [], order: 8, required: false },
  { key: 'test_date', label: 'Дата проведения испытаний', field_type: 'date', options: [], order: 9, required: false },
  { key: 'batch_no', label: 'Партия №', field_type: 'text', options: [], order: 10, required: false },
  { key: 'additive', label: 'Октаноповышающая добавка', field_type: 'text', options: [], order: 11, required: false },
  { key: 'aromatic_hydrocarbons', label: 'Смесь ароматических углеводородов, %', field_type: 'text', options: [], order: 12, required: false },
  { key: 'cert_number', label: '№ сертификата', field_type: 'text', options: [], order: 13, required: false },
  { key: 'cert_from', label: 'Сертификат от', field_type: 'date', options: [], order: 14, required: false },
  { key: 'cert_to', label: 'Сертификат до', field_type: 'date', options: [], order: 15, required: false },
  { key: 'czl_head', label: 'Начальник ЦЗЛ', field_type: 'text', options: [], order: 16, required: false },
  { key: 'shift_head', label: 'Начальник смены', field_type: 'text', options: [], order: 17, required: false },
  { key: 'passport_issue_date', label: 'Дата выдачи паспорта', field_type: 'date', options: [], order: 18, required: false },
  { key: 'sttl_head', label: 'Начальник СТТЛ', field_type: 'text', options: [], order: 19, required: false },
  { key: 'page_no', label: 'Номер страницы', field_type: 'text', options: [], order: 20, required: false },
];

type ProductPreset = {
  name: string;
  category: string;
  standard: string;
  reservoir_type: string;
  header: string;
  footer: string;
  fields: TField[];
  rows: TRow[];
};

const makeHeaderHtml = (productName: string, standardTitle: string) =>
  SAMPLE_HEADER_HTML
    .replace('{{product_name}}', productName)
    .replace('{{standard_title}}', standardTitle);

const makeRowsByOctane = (research: string, motor: string): TRow[] =>
  SAMPLE_ROWS.map((row) => {
    if (row.name.includes('исследовательскому методу')) {
      return { ...row, standard_value: research };
    }
    if (row.name.includes('моторному методу')) {
      return { ...row, standard_value: motor };
    }
    return { ...row };
  });

const PRODUCT_PRESETS: Record<string, ProductPreset> = {
  'jet-a-1-nalko': {
    name: 'Jet A-1 c NALKO',
    category: 'Jet A-1',
    standard: 'O‘z MSt 609:2025',
    reservoir_type: 'reservoir',
    header: makeHeaderHtml('Jet A-1 c NALKO', 'Jet A-1 (O‘z MSt 609:2025)'),
    footer: SAMPLE_FOOTER_HTML,
    fields: SAMPLE_FIELDS.map((f, i) => ({ ...f, order: i })),
    rows: [
      { order: 0, name: 'Плотность при 15°C', gost: 'ASTM D4052', standard_value: '775-840', standard_value_2: '', unit: 'кг/м3', is_section: false },
      { order: 1, name: 'Температура вспышки, не ниже', gost: 'ASTM D56', standard_value: '38', standard_value_2: '', unit: '°C', is_section: false },
      { order: 2, name: 'Температура замерзания, не выше', gost: 'ASTM D2386', standard_value: '-47', standard_value_2: '', unit: '°C', is_section: false },
      { order: 3, name: 'NALKO присадка', gost: 'Внутренний метод', standard_value: 'Присутствует', standard_value_2: '', unit: '', is_section: false },
    ],
  },
  'jet-a-1-ssf-nalko': {
    name: 'Jet A-1-SSF c NALKO',
    category: 'Jet A-1',
    standard: 'O‘z MSt 609:2025',
    reservoir_type: 'reservoir',
    header: makeHeaderHtml('Jet A-1-SSF c NALKO', 'Jet A-1-SSF (O‘z MSt 609:2025)'),
    footer: SAMPLE_FOOTER_HTML,
    fields: SAMPLE_FIELDS.map((f, i) => ({ ...f, order: i })),
    rows: [
      { order: 0, name: 'Плотность при 15°C', gost: 'ASTM D4052', standard_value: '775-840', standard_value_2: '', unit: 'кг/м3', is_section: false },
      { order: 1, name: 'Температура вспышки, не ниже', gost: 'ASTM D56', standard_value: '38', standard_value_2: '', unit: '°C', is_section: false },
      { order: 2, name: 'Температура замерзания, не выше', gost: 'ASTM D2386', standard_value: '-47', standard_value_2: '', unit: '°C', is_section: false },
      { order: 3, name: 'NALKO присадка', gost: 'Внутренний метод', standard_value: 'Присутствует', standard_value_2: '', unit: '', is_section: false },
      { order: 4, name: 'SSF присадка', gost: 'Внутренний метод', standard_value: 'Присутствует', standard_value_2: '', unit: '', is_section: false },
    ],
  },
  'jet-a-1-ssf': {
    name: 'Jet A-1-SSF без NALKO',
    category: 'Jet A-1',
    standard: 'O‘z MSt 609:2025',
    reservoir_type: 'reservoir',
    header: makeHeaderHtml('Jet A-1-SSF без NALKO', 'Jet A-1-SSF (O‘z MSt 609:2025)'),
    footer: SAMPLE_FOOTER_HTML,
    fields: SAMPLE_FIELDS.map((f, i) => ({ ...f, order: i })),
    rows: [
      { order: 0, name: 'Плотность при 15°C', gost: 'ASTM D4052', standard_value: '775-840', standard_value_2: '', unit: 'кг/м3', is_section: false },
      { order: 1, name: 'Температура вспышки, не ниже', gost: 'ASTM D56', standard_value: '38', standard_value_2: '', unit: '°C', is_section: false },
      { order: 2, name: 'Температура замерзания, не выше', gost: 'ASTM D2386', standard_value: '-47', standard_value_2: '', unit: '°C', is_section: false },
      { order: 3, name: 'SSF присадка', gost: 'Внутренний метод', standard_value: 'Присутствует', standard_value_2: '', unit: '', is_section: false },
    ],
  },
  'benzin-ai-91-k2-l': {
    name: 'Бензин Аи-91-К2-Л',
    category: 'Бензин',
    standard: 'O‘zDSt 3031:2015',
    reservoir_type: 'reservoir',
    header: BENZIN_HEADER_HTML,
    footer: BENZIN_FOOTER_HTML,
    fields: BENZIN_FIELDS.map((f, i) => ({ ...f, order: i })),
    rows: makeRowsByOctane('91,0', '82,5').map((r, i) => ({ ...r, order: i })),
  },
  'benzin-ai-92-k2-l': {
    name: 'Бензин Аи-92-К2-Л',
    category: 'Бензин',
    standard: 'O‘zDSt 3031:2015',
    reservoir_type: 'reservoir',
    header: BENZIN_HEADER_HTML,
    footer: BENZIN_FOOTER_HTML,
    fields: BENZIN_FIELDS.map((f, i) => ({ ...f, order: i })),
    rows: makeRowsByOctane('92,0', '83,0').map((r, i) => ({ ...r, order: i })),
  },
  'benzin-ai-95-k2-l': {
    name: 'Бензин Аи-95-К2-Л',
    category: 'Бензин',
    standard: 'O‘zDSt 3031:2015',
    reservoir_type: 'reservoir',
    header: BENZIN_HEADER_HTML,
    footer: BENZIN_FOOTER_HTML,
    fields: BENZIN_FIELDS.map((f, i) => ({ ...f, order: i })),
    rows: makeRowsByOctane('95,0', '85,0').map((r, i) => ({ ...r, order: i })),
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

type Tab = 'info' | 'fields' | 'rows';

export default function PassportTemplatesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit panel
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [detail, setDetail] = useState<TemplateDetail | null>(null);
  const [tab, setTab] = useState<Tab>('info');
  const [saving, setSaving] = useState(false);

  // Info form
  const [fname, setFname] = useState('');
  const [fcategory, setFcategory] = useState('');
  const [fstandard, setFstandard] = useState('');
  const [freservoir, setFreservoir] = useState('');
  const [fheader, setFheader] = useState('');
  const [ffooter, setFfooter] = useState('');

  // Fields editor
  const [fields, setFields] = useState<TField[]>([]);
  const [fieldSaving, setFieldSaving] = useState(false);

  // Rows editor — ExcelEditor orqali
  const [rows, setRows] = useState<TRow[]>([]);
  const [rowSaving, setRowSaving] = useState(false);
  const rowsEditorRef = useRef<ExcelEditorHandle>(null);

  // Word upload
  const docxInputRef = useRef<HTMLInputElement>(null);
  const [docxUploading, setDocxUploading] = useState(false);
  const [htmlPreviewOpen, setHtmlPreviewOpen] = useState(false);
  const [activePresetLabel, setActivePresetLabel] = useState('');

  const categories = [...new Set(templates.map(t => t.category).filter(Boolean))];
  const selectedProductItem = new URLSearchParams(location.search).get('item') || '';

  // ── Fetch list ──────────────────────────────────────────────────────────────
  const fetchList = () => {
    setLoading(true);
    axioss.get('/passport-templates/')
      .then(r => setTemplates(Array.isArray(r.data) ? r.data : r.data?.results ?? []))
      .catch(() => toast.error('Загрузка не удалась'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchList(); }, []);

  // ── Open create ─────────────────────────────────────────────────────────────
  const openCreate = () => {
    if (selectedProductItem && PRODUCT_PRESETS[selectedProductItem]) {
      applyProductPreset(selectedProductItem);
      return;
    }

    setIsCreateMode(true);
    setActivePresetLabel('');
    setEditId(null);
    setDetail(null);
    setFname(''); setFcategory(''); setFstandard(''); setFreservoir('');
    setFheader(''); setFfooter('');
    setFields([]); setRows([]);
    setTab('info');
    setTimeout(() => document.getElementById('tpl-name')?.focus(), 50);
  };

  // ── Open edit ───────────────────────────────────────────────────────────────
  const openEdit = async (id: number) => {
    setIsCreateMode(false);
    setActivePresetLabel('');
    setEditId(id);
    setTab('info');
    try {
      const r = await axioss.get(`/passport-templates/${id}/`);
      const d: TemplateDetail = r.data;
      setDetail(d);
      setFname(d.name); setFcategory(d.category); setFstandard(d.product_standard || '');
      setFreservoir(d.reservoir_type || '');
      setFheader(d.header_html || ''); setFfooter(d.footer_html || '');
      setFields(d.fields.map(f => ({ ...f })));
      setRows(d.rows.map(rw => ({ ...rw })));
    } catch { toast.error('Не удалось загрузить шаблон'); }
  };

  const closeEdit = () => {
    setIsCreateMode(false);
    setActivePresetLabel('');
    setEditId(null);
    setDetail(null);
  };

  const applyProductPreset = (itemKey: string) => {
    const preset = PRODUCT_PRESETS[itemKey];
    if (!preset) return false;

    const hasDraft = !!(fname || fheader || ffooter || fields.length > 0 || rows.length > 0 || editId !== null);
    if (hasDraft && !confirm('Текущий черновик будет заменен шаблоном выбранного продукта. Продолжить?')) {
      return false;
    }

    setIsCreateMode(true);
    setEditId(null);
    setDetail(null);
    setTab('info');

    setFname(preset.name);
    setFcategory(preset.category);
    setFstandard(preset.standard);
    setFreservoir(preset.reservoir_type);
    setFheader(preset.header.trim());
    setFfooter(preset.footer.trim());
    setFields(preset.fields.map((f, i) => ({ ...f, order: i })));
    setRows(preset.rows.map((r, i) => ({ ...r, order: i })));
    setActivePresetLabel(preset.name);

    setTimeout(() => document.getElementById('tpl-name')?.focus(), 50);
    toast.success(`Открыт отдельный шаблон: ${preset.name}`);
    return true;
  };

  const applySampleAi92Template = () => {
    if ((fheader || ffooter || fields.length > 0 || rows.length > 0) && !confirm('Текущие данные будут заменены образцом. Продолжить?')) {
      return;
    }

    setFname((prev) => prev.trim() || 'Бензин АИ-92 К2');
    setFcategory((prev) => prev.trim() || 'Бензин автомобильный');
    setFstandard((prev) => prev.trim() || "O'zDSt 3031:2015");
    setFreservoir('reservoir');
    setFheader(SAMPLE_HEADER_HTML.trim());
    setFfooter(SAMPLE_FOOTER_HTML.trim());
    setFields(SAMPLE_FIELDS.map((field, index) => ({ ...field, order: index })));
    setRows(SAMPLE_ROWS.map((row, index) => ({ ...row, order: index })));
    toast.success('Образец AI-92 загружен: заполнены HTML, поля и таблица');
  };

  // ── Save info ───────────────────────────────────────────────────────────────
  const saveInfo = async () => {
    if (!fname.trim()) { toast.warn('Введите название'); return; }
    setSaving(true);
    try {
      const payload = {
        name: fname.trim(), category: fcategory.trim(),
        product_standard: fstandard.trim(), reservoir_type: freservoir,
        header_html: fheader, footer_html: ffooter,
      };
      if (editId) {
        await axioss.patch(`/passport-templates/${editId}/`, payload);
        toast.success('Обновлено');
      } else {
        const r = await axioss.post('/passport-templates/', payload);
        setIsCreateMode(false);
        setEditId(r.data.id);
        toast.success('Создано — теперь добавьте поля и строки');
        setTab('fields');
      }
      fetchList();
    } catch { toast.error('Ошибка сохранения'); }
    finally { setSaving(false); }
  };

  // ── Word (.docx) → HTML upload ──────────────────────────────────────────────
  const handleDocxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // reset input so same file can be re-selected next time
    e.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.docx')) {
      toast.warn('Faqat .docx fayllari qabul qilinadi');
      return;
    }
    if (!editId) {
      toast.warn('Avval shablonni saqlang (Информация tabida)');
      return;
    }
    setDocxUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const r = await axioss.post(
        `/passport-templates/${editId}/upload-docx/`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      setFheader(r.data.html ?? '');
      setHtmlPreviewOpen(true);
      if (r.data.warnings?.length) {
        toast.info(`Конвертация завершена. Предупреждения: ${r.data.warnings.length}`);
      } else {
        toast.success('Word fayli HTML ga konvertatsiya qilindi va saqlandi');
      }
      fetchList();
    } catch {
      toast.error('Ошибка загрузки Word файла');
    } finally {
      setDocxUploading(false);
    }
  };

  // ── Fields CRUD ─────────────────────────────────────────────────────────────
  const addField = () =>
    setFields(prev => [...prev, { ...EMPTY_FIELD, order: prev.length }]);

  const updateField = (i: number, patch: Partial<TField>) =>
    setFields(prev => prev.map((f, idx) => idx === i ? { ...f, ...patch } : f));

  const removeField = (i: number) =>
    setFields(prev => prev.filter((_, idx) => idx !== i).map((f, idx) => ({ ...f, order: idx })));

  const moveField = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= fields.length) return;
    const arr = [...fields];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setFields(arr.map((f, idx) => ({ ...f, order: idx })));
  };

  const saveFields = async () => {
    if (!editId) { toast.warn('Сначала сохраните информацию о шаблоне'); return; }
    setFieldSaving(true);
    try {
      await axioss.put(`/passport-templates/${editId}/fields/bulk/`,
        fields.map((f, i) => ({ ...f, order: i })));
      toast.success('Поля сохранены');
      fetchList();
    } catch { toast.error('Ошибка сохранения полей'); }
    finally { setFieldSaving(false); }
  };

  // ── Rows CRUD ───────────────────────────────────────────────────────────────
  const addRow = (asSection = false) =>
    setRows(prev => [...prev, { ...EMPTY_ROW, order: prev.length, is_section: asSection }]);

  const updateRow = (i: number, patch: Partial<TRow>) =>
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));

  const removeRow = (i: number) =>
    setRows(prev => prev.filter((_, idx) => idx !== i).map((r, idx) => ({ ...r, order: idx })));

  const moveRow = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const arr = [...rows];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setRows(arr.map((r, idx) => ({ ...r, order: idx })));
  };

  const saveRows = async () => {
    if (!editId) { toast.warn('Сначала сохраните информацию о шаблоне'); return; }
    setRowSaving(true);
    try {
      // ExcelEditor dan ma'lumot olish
      const gridData = rowsEditorRef.current?.getData() ?? [];
      const payload = gridData
        .filter(row => row.some(cell => String(cell).trim()))
        .map((row, i) => ({
          order: i,
          name: String(row[0] ?? '').trim(),
          gost: String(row[1] ?? '').trim(),
          standard_value: String(row[2] ?? '').trim(),
          standard_value_2: String(row[3] ?? '').trim(),
          unit: String(row[4] ?? '').trim(),
          is_section: row[5] === true || row[5] === 'true' || row[5] === '1',
        }));

      await axioss.put(`/passport-templates/${editId}/rows/bulk/`, payload);
      toast.success('Qatorlar saqlandi');
      fetchList();
    } catch { toast.error('Ошибка сохранения строк'); }
    finally { setRowSaving(false); }
  };

  // ── Delete template ─────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    if (!confirm('Шаблонни ўчириш?')) return;
    try {
      await axioss.delete(`/passport-templates/${id}/`);
      toast.success('Удалено');
      if (editId === id) closeEdit();
      fetchList();
    } catch { toast.error('Ошибка удаления'); }
  };

  const panelOpen = isCreateMode || editId !== null;
  const isBenzinPage = location.pathname === '/nastroyka/passport-templates/benzin';
  const selectedGroup = isBenzinPage
    ? 'benzin'
    : (new URLSearchParams(location.search).get('group') || '').toLowerCase();

  const jetTemplates = templates.filter(t =>
    (t.category || '').toLowerCase().includes('jet') || (t.name || '').toLowerCase().includes('jet')
  );
  const benzinTemplates = templates.filter(t =>
    (t.category || '').toLowerCase().includes('бензин') ||
    (t.category || '').toLowerCase().includes('benzin') ||
    (t.name || '').toLowerCase().includes('бензин') ||
    (t.name || '').toLowerCase().includes('benzin')
  );

  const visibleTemplates = selectedGroup === 'jet-a-1'
    ? jetTemplates
    : selectedGroup === 'benzin'
      ? benzinTemplates
      : templates;

  const openTemplateDetail = (id: number) => {
    navigate(`/nastroyka/passport-templates/detail/${id}${selectedGroup === 'benzin' ? '?from=benzin' : ''}`);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <Breadcrumb pageName="Шаблоны паспортов" />

      {/* Cards + List */}
      <div className="mb-6 rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex items-center justify-between border-b border-stroke px-6 py-4 dark:border-strokedark">
          <span className="text-sm text-bodydark2">Всего: {visibleTemplates.length}</span>
          <button onClick={openCreate}
            className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90">
            <FaPlus size={11} /> Добавить шаблон
          </button>
        </div>
        <div className="border-b border-stroke px-6 py-5 dark:border-strokedark">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <button
              type="button"
              onClick={() => navigate('/nastroyka/passport-templates')}
              className={`rounded border p-4 text-left transition hover:shadow-md ${selectedGroup === '' ? 'border-primary bg-primary/5' : 'border-stroke bg-white dark:border-strokedark dark:bg-boxdark'}`}
            >
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-700">•</div>
              <div className="text-lg font-semibold text-black dark:text-white">Все шаблоны</div>
              <div className="text-sm text-bodydark2">Всего: {templates.length}</div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/nastroyka/passport-templates?group=jet-a-1')}
              className={`rounded border p-4 text-left transition hover:shadow-md ${selectedGroup === 'jet-a-1' ? 'border-primary bg-primary/5' : 'border-stroke bg-white dark:border-strokedark dark:bg-boxdark'}`}
            >
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700">✈</div>
              <div className="text-lg font-semibold text-black dark:text-white">Jet A-1</div>
              <div className="text-sm text-bodydark2">Всего: {jetTemplates.length}</div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/nastroyka/passport-templates/benzin/detail')}
              className={`rounded border p-4 text-left transition hover:shadow-md ${selectedGroup === 'benzin' ? 'border-primary bg-primary/5' : 'border-stroke bg-white dark:border-strokedark dark:bg-boxdark'}`}
            >
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">⛽</div>
              <div className="text-lg font-semibold text-black dark:text-white">Бензин</div>
              <div className="text-sm text-bodydark2">Всего: {benzinTemplates.length}</div>
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="py-8 text-center text-sm text-bodydark2">Загрузка...</div>
          ) : visibleTemplates.length === 0 ? (
            <div className="py-8 text-center text-sm text-bodydark2">Шаблонов нет</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleTemplates.map((t) => (
                <div key={t.id} className={`rounded border p-4 ${editId === t.id ? 'border-primary bg-primary/5' : 'border-stroke bg-white dark:border-strokedark dark:bg-boxdark'}`}>
                  <div className="mb-2 line-clamp-2 text-sm font-semibold text-black dark:text-white">{t.name}</div>
                  <div className="text-xs text-bodydark2">Категория: {t.category || '—'}</div>

                  <div className="mt-3 flex items-center gap-2">
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">Поля: {t.fields_count}</span>
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">Строки: {t.rows_count}</span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button onClick={() => openTemplateDetail(t.id)}
                      className="rounded bg-blue-500 px-2.5 py-1.5 text-xs text-white hover:bg-blue-600">
                      <FaEye size={11} />
                    </button>
                    <button onClick={() => handleDelete(t.id)}
                      className="rounded bg-red-500 px-2.5 py-1.5 text-xs text-white hover:bg-red-600">
                      <FaTrash size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit / Create panel */}
      {panelOpen && (
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          {/* Panel header */}
          <div className="flex items-center justify-between border-b border-stroke px-6 py-4 dark:border-strokedark">
            <h3 className="text-base font-semibold text-black dark:text-white">
              {editId ? `Редактировать: ${fname}` : activePresetLabel ? `Новый шаблон: ${activePresetLabel}` : 'Новый шаблон'}
            </h3>
            <button onClick={closeEdit} className="text-bodydark2 hover:text-black dark:hover:text-white">
              <FaTimes size={15} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-stroke dark:border-strokedark">
            {(['info', 'fields', 'rows'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-6 py-3 text-sm font-medium transition-colors ${tab === t
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-bodydark2 hover:text-black dark:hover:text-white'}`}>
                {t === 'info' ? 'Информация' : t === 'fields' ? `Поля (${fields.length})` : `Строки таблицы (${rows.length})`}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* ── TAB: INFO ─────────────────────────────────────────────────── */}
            {tab === 'info' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">Название *</label>
                    <input id="tpl-name" className={inputCls} value={fname}
                      onChange={e => setFname(e.target.value)} placeholder="ДТ-ЕВРО-Л(А)-К3" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">Категория</label>
                    <input className={inputCls} value={fcategory} onChange={e => setFcategory(e.target.value)}
                      list="cat-list" placeholder="Дизельное топливо" />
                    <datalist id="cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">Стандарт</label>
                    <input className={inputCls} value={fstandard} onChange={e => setFstandard(e.target.value)}
                      placeholder="O'zMSt 610:2025" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">Резервуар / Вагон</label>
                    <select className={inputCls} value={freservoir} onChange={e => setFreservoir(e.target.value)}>
                      <option value="">— Выберите —</option>
                      <option value="reservoir">Резервуар</option>
                      <option value="wagon">Вагон</option>
                    </select>
                  </div>
                </div>

                <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">Быстрый старт по образцу из вашего макета</div>
                      <div className="text-xs text-amber-700">Заполнит header/footer HTML, список input-полей и строки таблицы (AI-92).</div>
                    </div>
                    <button
                      type="button"
                      onClick={applySampleAi92Template}
                      className="rounded bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700"
                    >
                      Загрузить образец AI-92
                    </button>
                  </div>
                </div>

                {/* ── Word upload section ───────────────────────────────────── */}
                <div className="rounded border border-dashed border-primary/40 bg-primary/5 p-4 dark:border-primary/30 dark:bg-primary/10">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <FaFileWord size={18} className="text-blue-600" />
                      <span className="text-sm font-medium text-black dark:text-white">
                        Word shablon yuklash
                      </span>
                    </div>
                    <span className="text-xs text-bodydark2">
                      .docx faylni HTML ga konvertatsiya qiladi va "Шапка" maydoniga joylashtiradi
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                      {fheader && (
                        <button
                          type="button"
                          onClick={() => setHtmlPreviewOpen(p => !p)}
                          className="flex items-center gap-1.5 rounded border border-stroke px-3 py-1.5 text-xs text-bodydark2 hover:text-black dark:border-strokedark dark:hover:text-white"
                        >
                          {htmlPreviewOpen ? <FaEyeSlash size={11} /> : <FaEye size={11} />}
                          {htmlPreviewOpen ? 'Preview yopish' : 'HTML preview'}
                        </button>
                      )}
                      {/* Hidden file input */}
                      <input
                        ref={docxInputRef}
                        type="file"
                        accept=".docx"
                        className="hidden"
                        onChange={handleDocxUpload}
                      />
                      <button
                        type="button"
                        disabled={docxUploading || !editId}
                        onClick={() => docxInputRef.current?.click()}
                        title={!editId ? 'Avval shablonni saqlang' : ''}
                        className="flex items-center gap-2 rounded bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        <FaFileWord size={11} />
                        {docxUploading ? 'Yuklanmoqda...' : 'Word faylini yuklash'}
                      </button>
                    </div>
                  </div>

                  {/* HTML preview */}
                  {htmlPreviewOpen && fheader && (
                    <div className="mt-3 overflow-auto rounded border border-stroke bg-white dark:border-strokedark dark:bg-boxdark" style={{ maxHeight: 400 }}>
                      <div className="flex items-center justify-between border-b border-stroke px-3 py-1.5 dark:border-strokedark">
                        <span className="text-xs font-medium text-bodydark2">HTML natija (preview)</span>
                        <button type="button" onClick={() => setHtmlPreviewOpen(false)} className="text-bodydark2 hover:text-black dark:hover:text-white">
                          <FaTimes size={11} />
                        </button>
                      </div>
                      <div
                        className="prose prose-sm max-w-none p-4 dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: fheader }}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">
                      Шапка документа (HTML)
                      <span className="ml-2 text-xs text-bodydark2 font-normal">{'{{passport_no}}, {{date}}'} va boshqa placeholder'lar</span>
                    </label>
                    <textarea className={inputCls + ' font-mono text-xs'} rows={8} value={fheader}
                      onChange={e => setFheader(e.target.value)}
                      placeholder="<p>Паспорт № {{passport_no}}</p>" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">Подвал документа (HTML)</label>
                    <textarea className={inputCls + ' font-mono text-xs'} rows={8} value={ffooter}
                      onChange={e => setFfooter(e.target.value)}
                      placeholder="<p>Начальник ЦПЛ: {{lab_chief}}</p>" />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button onClick={saveInfo} disabled={saving}
                    className="flex items-center gap-2 rounded bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-60">
                    <FaCheck size={11} />{saving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </div>
            )}

            {/* ── TAB: FIELDS ───────────────────────────────────────────────── */}
            {tab === 'fields' && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm text-bodydark2">
                    Header/footer HTML dagi <code className="bg-gray-100 px-1 rounded text-xs">{'{{key}}'}</code> placeolder'lar uchun forma maydonlari
                  </p>
                  <button onClick={addField}
                    className="flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-opacity-90">
                    <FaPlus size={10} /> Maydon qo'shish
                  </button>
                </div>

                {fields.length === 0 ? (
                  <div className="rounded border border-dashed border-stroke py-8 text-center text-sm text-bodydark2">
                    Maydonlar yo'q. "Maydon qo'shish" tugmasini bosing.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full table-auto">
                      <thead>
                        <tr>
                          <th className={thCls} style={{width:40}}>#</th>
                          <th className={thCls}>Key (placeholder)</th>
                          <th className={thCls}>Название поля</th>
                          <th className={thCls}>Тип</th>
                          <th className={thCls}>Variantlar (select uchun)</th>
                          <th className={thCls} style={{width:60}}>Majb.</th>
                          <th className={thCls} style={{width:100}}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map((f, i) => (
                          <tr key={i} className="border-b border-stroke dark:border-strokedark">
                            <td className={tdCls}>{i + 1}</td>
                            <td className={tdCls}>
                              <input className={inputCls + ' font-mono text-xs'} value={f.key}
                                onChange={e => updateField(i, { key: e.target.value })}
                                placeholder="passport_no" />
                            </td>
                            <td className={tdCls}>
                              <input className={inputCls} value={f.label}
                                onChange={e => updateField(i, { label: e.target.value })}
                                placeholder="Паспорт №" />
                            </td>
                            <td className={tdCls}>
                              <select className={inputCls} value={f.field_type}
                                onChange={e => updateField(i, { field_type: e.target.value as TField['field_type'] })}>
                                <option value="text">Текст</option>
                                <option value="date">Дата</option>
                                <option value="number">Число</option>
                                <option value="select">Список</option>
                                <option value="textarea">Многострочный</option>
                              </select>
                            </td>
                            <td className={tdCls}>
                              {f.field_type === 'select' ? (
                                <input className={inputCls + ' text-xs'} value={(f.options || []).join(', ')}
                                  onChange={e => updateField(i, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                  placeholder="Вариант1, Вариант2" />
                              ) : <span className="text-bodydark2 text-xs">—</span>}
                            </td>
                            <td className={tdCls + ' text-center'}>
                              <input type="checkbox" checked={f.required}
                                onChange={e => updateField(i, { required: e.target.checked })} />
                            </td>
                            <td className={tdCls}>
                              <div className="flex items-center gap-1">
                                <button onClick={() => moveField(i, -1)} disabled={i === 0}
                                  className="p-1 text-bodydark2 hover:text-black disabled:opacity-30"><FaArrowUp size={10} /></button>
                                <button onClick={() => moveField(i, 1)} disabled={i === fields.length - 1}
                                  className="p-1 text-bodydark2 hover:text-black disabled:opacity-30"><FaArrowDown size={10} /></button>
                                <button onClick={() => removeField(i)}
                                  className="p-1 text-red-500 hover:text-red-700"><FaTrash size={10} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  <button onClick={saveFields} disabled={fieldSaving}
                    className="flex items-center gap-2 rounded bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-60">
                    <FaCheck size={11} />{fieldSaving ? 'Сохранение...' : 'Maydonlarni saqlash'}
                  </button>
                </div>
              </div>
            )}

            {/* ── TAB: ROWS — Excel editor ──────────────────────────────── */}
            {tab === 'rows' && (
              <div>
                <p className="mb-3 text-xs text-bodydark2">
                  Excel kabi tahrirlang: ustunni bosib o'zgartiring, qator qo'shish uchun pastki bo'sh qatorga kiriting,
                  o'chirish uchun qatorni tanlang → <kbd className="rounded bg-gray-100 px-1">Del</kbd>.
                  <strong className="ml-2">Bo'lim:</strong> "Bo'lim?" ustunida <kbd className="rounded bg-gray-100 px-1">true</kbd> kiriting.
                </p>

                <ExcelEditor
                  key={editId ?? 'new'}
                  ref={rowsEditorRef}
                  height={500}
                  minSpareRows={3}
                  columns={[
                    { title: 'Ko\'rsatkich nomi', width: 320 },
                    { title: 'Metod (GOST)', width: 160 },
                    { title: 'Standart qiymat 1', width: 130 },
                    { title: 'Standart qiymat 2', width: 130 },
                    { title: 'Birlik / izoh', width: 120 },
                    { title: 'Bo\'lim?', width: 70, type: 'checkbox' },
                  ]}
                  data={rows.map(r => [
                    r.name, r.gost, r.standard_value, r.standard_value_2, r.unit,
                    r.is_section ? 'true' : 'false',
                  ])}
                />

                <div className="mt-4 flex justify-end">
                  <button onClick={saveRows} disabled={rowSaving}
                    className="flex items-center gap-2 rounded bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-60">
                    <FaCheck size={11} />{rowSaving ? 'Сохранение...' : 'Qatorlarni saqlash'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
