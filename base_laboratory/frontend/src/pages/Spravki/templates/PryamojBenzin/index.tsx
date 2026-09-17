import type { AV, SpravkaTemplate, SpravkaTemplateProps } from '../shared/types';
import { blank, makePdfGenerator } from '../shared/pdfHelpers';
import { thCls, tdCls, selectCls } from '../shared/styles';
import { ACTUAL_VALUE_INVALID_CLS } from '../../../../utils/passportValidation';

/**
 * TT 16472899-049:2026 bo'yicha raqamli me'yorlar — yagona manba.
 * `label` me'yor ustunida (ekranda ham, PDF'da ham) chiqadi, `min`/`max` esa
 * kiritilgan qiymatni tekshirish uchun ishlatiladi, shunda ikkalasi hech qachon ajralmaydi.
 * Bu yerda yo'q maydonlar ("Me'yorlanmaydi", "Mavjud emas", "Shaffof") tekshirilmaydi.
 */
type Norm = { label: string; min?: number; max?: number };

const NORMS: Record<string, Norm> = {
  pb_oktan: { label: '50', min: 50 },
  pb_frak_boshlang: { label: '30', min: 30 },
  pb_frak_10: { label: '75', max: 75 },
  pb_frak_50: { label: '120', max: 120 },
  pb_frak_oxiri: { label: '190', max: 190 },
  pb_frak_kolba: { label: '2,0', max: 2 },
  pb_frak_yoqotish: { label: '4,0', max: 4 },
  pb_oltingugurt: { label: '0,100', max: 0.1 },
  pb_benzol: { label: '5,0', max: 5 },
  pb_smola: { label: '5,0', max: 5 },
};

/**
 * Raqam emas, ro'yxatdan tanlanadigan ko'rsatkichlar.
 * `norm` — me'yor ustunida chiqadigan va to'g'ri hisoblanadigan variant.
 */
type Choice = { norm: string; options: string[] };

const CHOICES: Record<string, Choice> = {
  pb_mexanik: { norm: 'Mavjud emas', options: ['Mavjud emas', 'Mavjud'] },
  pb_suv: { norm: 'Mavjud emas', options: ['Mavjud emas', 'Mavjud'] },
  pb_mis: { norm: 'Chidamli', options: ['Chidamli', 'Chidamsiz'] },
};

/** Hujjatda o'nlik kasr vergul bilan yoziladi ("49,5"), shuning uchun nuqta ham, vergul ham qabul qilinadi. */
function toNumber(value: string): number | null {
  const normalized = String(value ?? '').trim().replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Qiymat me'yordan chiqqanmi? Bo'sh yoki raqam bo'lmagan qiymat xato hisoblanmaydi. */
function isOutOfNorm(field: string, value: string): boolean {
  const norm = NORMS[field];
  const num = toNumber(value);
  if (!norm || num === null) return false;
  return (norm.min !== undefined && num < norm.min) || (norm.max !== undefined && num > norm.max);
}

function buildCopyContent(form: AV) {
  const ul = (val: string, pad = 18) => ({ text: blank(val, pad), decoration: 'underline', fontSize: 9 });
  const norm = (t: string) => ({ text: t, alignment: 'center', fontSize: 8, italics: true });
  return [
    { text: 'ZSK-5-PD 006-011-115', alignment: 'right', fontSize: 9, bold: true, margin: [0, 14, 0, 4] },
    { text: 'Qabul qilinadigan pryamogon benzinga', alignment: 'center', bold: true, decoration: 'underline', fontSize: 11, margin: [0, 0, 0, 5] },
    { text: ["Ma'lumotnoma №  ", { text: blank(form.malumotnoma_no, 16), decoration: 'underline', bold: true, fontSize: 11 }], alignment: 'center', bold: true, fontSize: 11, margin: [0, 0, 0, 6] },
    { text: ['Manzil va sinov joyi: ', { text: '"Buxoro NQIZ" MChJ markaziy tahlilxonasi, Qorovulbozor tu-ni, Mustaqillik ko\'chasi 1-uy. Tel: 65-364-12-27', decoration: 'underline', fontSize: 9 }], fontSize: 9, margin: [0, 0, 0, 4] },
    { columns: [{ text: ['Yetkazib beruvchi tashkilot: ', ul(form.yetkazib_beruvchi, 30)], width: '*', fontSize: 9 }, { text: ['  Vagon sisternalar soni: ', ul(form.vagon_soni, 8)], width: 'auto', fontSize: 9 }], margin: [0, 0, 0, 4] },
    { text: ['Namuna olingan v/s nomeri: ', ul(form.vagon_nomeri, 40)], fontSize: 9, margin: [0, 0, 0, 6] },
    { columns: [{ text: ["GOST 2517 bo'yicha namuna olingan sana: ", ul(form.gost_namuna_sana, 14)], width: '*', fontSize: 9 }, { text: ["Sinov o'tkazilgan sana: ", ul(form.sinov_sana, 14)], width: '*', fontSize: 9 }], margin: [0, 0, 0, 8] },
    {
      table: {
        headerRows: 1,
        widths: [22, '*', 90, 65],
        body: [
          [{ text: 'T/b\n№', bold: true, alignment: 'center', fontSize: 8, fillColor: '#e8e8e8' }, { text: "Ko'rsatkich nomlari", bold: true, alignment: 'center', fontSize: 8, fillColor: '#e8e8e8' }, { text: "TT 16472899-049:2026\nbo'yicha me'yor", bold: true, alignment: 'center', fontSize: 8, fillColor: '#e8e8e8' }, { text: "Haqiqiy\nko'rsatgich", bold: true, alignment: 'center', fontSize: 8, fillColor: '#e8e8e8' }],
          [{ text: '1.', alignment: 'center', fontSize: 8 }, { text: '20°C da zichlik, kg/m³, dan kam emas', decoration: 'underline', fontSize: 8 }, norm("Me'yorlanmaydi, aniqlanishi shart"), { text: form.pb_zichlik || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '2.', alignment: 'center', fontSize: 8 }, { text: "**Tadqiqot usuli bo'yicha oktan soni, kamida", decoration: 'underline', fontSize: 8 }, { text: NORMS.pb_oktan.label, alignment: 'center', fontSize: 8 }, { text: form.pb_oktan || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '3.', rowSpan: 8, alignment: 'center', fontSize: 8, margin: [0, 50, 0, 0] }, { text: 'Fraksiyaviy tarkibi:', decoration: 'underline', fontSize: 8 }, {}, {}],
          [{}, { text: "Qaynashning boshlang'ich harorati, °C, dan kam emas", fontSize: 8 }, { text: NORMS.pb_frak_boshlang.label, alignment: 'center', fontSize: 8 }, { text: form.pb_frak_boshlang || '', alignment: 'center', fontSize: 8, bold: true }],
          [{}, { text: '10% hajmi qaynaydigan harorat, °C, dan kam emas yuqori emas', fontSize: 8 }, { text: NORMS.pb_frak_10.label, alignment: 'center', fontSize: 8 }, { text: form.pb_frak_10 || '', alignment: 'center', fontSize: 8, bold: true }],
          [{}, { text: '50% hajmi qaynaydigan harorat, °C, dan yuqori emas', fontSize: 8 }, { text: NORMS.pb_frak_50.label, alignment: 'center', fontSize: 8 }, { text: form.pb_frak_50 || '', alignment: 'center', fontSize: 8, bold: true }],
          [{}, { text: '90% hajmi qaynaydigan harorat, °C, dan yuqori emas', fontSize: 8 }, norm("Me'yorlanmaydi, aniqlanishi shart"), { text: form.pb_frak_90 || '', alignment: 'center', fontSize: 8, bold: true }],
          [{}, { text: "Qaynashning oxiri, °C, dan yuqori emas", fontSize: 8 }, { text: NORMS.pb_frak_oxiri.label, alignment: 'center', fontSize: 8 }, { text: form.pb_frak_oxiri || '', alignment: 'center', fontSize: 8, bold: true }],
          [{}, { text: 'Kolbadagi qoldiq, %, dan ortiq emas', fontSize: 8 }, { text: NORMS.pb_frak_kolba.label, alignment: 'center', fontSize: 8 }, { text: form.pb_frak_kolba || '', alignment: 'center', fontSize: 8, bold: true }],
          [{}, { text: "Qoldiq va yo'qotishlar, %, dan ortiq emas", fontSize: 8 }, { text: NORMS.pb_frak_yoqotish.label, alignment: 'center', fontSize: 8 }, { text: form.pb_frak_yoqotish || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '4.', alignment: 'center', fontSize: 8 }, { text: "**Umumiy oltingugurtning massaviy ulushi, %, dan ortiq emas", decoration: 'underline', fontSize: 8 }, { text: NORMS.pb_oltingugurt.label, alignment: 'center', fontSize: 8 }, { text: form.pb_oltingugurt || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '5.', alignment: 'center', fontSize: 8 }, { text: "**Benzolning hajmiy ulushi, %, dan ortiq emas", decoration: 'underline', fontSize: 8 }, { text: NORMS.pb_benzol.label, alignment: 'center', fontSize: 8 }, { text: form.pb_benzol || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '6.', alignment: 'center', fontSize: 8 }, { text: "**Erituvchi bilan yuvilgan smolalar konsentratsiyasi, mg/100 cm³, dan ortiq emas", decoration: 'underline', fontSize: 8 }, { text: NORMS.pb_smola.label, alignment: 'center', fontSize: 8 }, { text: form.pb_smola || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '7.', alignment: 'center', fontSize: 8 }, { text: '**Mis plastinkada sinov (50°C da 3 soat)', decoration: 'underline', fontSize: 8 }, { text: CHOICES.pb_mis.norm, alignment: 'center', fontSize: 8 }, { text: form.pb_mis || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '8.', alignment: 'center', fontSize: 8 }, { text: 'Mexanik aralashmalar miqdori,', decoration: 'underline', fontSize: 8 }, { text: CHOICES.pb_mexanik.norm, alignment: 'center', fontSize: 8 }, { text: form.pb_mexanik || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '9.', alignment: 'center', fontSize: 8 }, { text: 'Suv miqdori', decoration: 'underline', fontSize: 8 }, { text: CHOICES.pb_suv.norm, alignment: 'center', fontSize: 8 }, { text: form.pb_suv || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '10.', alignment: 'center', fontSize: 8 }, { text: "Tashqi ko'rinishi", decoration: 'underline', fontSize: 8 }, { text: 'Shaffof', alignment: 'center', fontSize: 8 }, { text: form.pb_tashqi || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '11.', alignment: 'center', fontSize: 8 }, { text: '*Namuna olish vaqtdagi zichlik, kg/m³', decoration: 'underline', fontSize: 8 }, norm("Me'yorlanmaydi"), { text: form.pb_namuna_zichlik || '', alignment: 'center', fontSize: 8, bold: true }],
        ],
      },
      layout: { hLineColor: '#000000', vLineColor: '#000000' },
      margin: [0, 0, 0, 6],
    },
    { text: "*Izoh: Xom ashyoni sof og'irligini hajm-og'irlik usulida aniqlash maqsadida uning harorati va zichligi namuna olish vaqtida aniqlanadi.", fontSize: 7, italics: true, margin: [0, 0, 0, 2] },
    { text: "** Izoh: 2, 4, 5, 6 va 7 ko'rsatkichlar zarur hollarda ishlab chiqarish bo'limi talabiga asosan aniqlanadi.", fontSize: 7, italics: true, margin: [0, 0, 0, 8] },
    { text: ["Smena boshlig'i: ", { text: blank(form.smena_boshligi, 36), decoration: 'underline', fontSize: 9 }], fontSize: 9, margin: [0, 0, 0, 5] },
  ];
}

const generatePdf = makePdfGenerator(buildCopyContent, 'pryamoj_benzin');

function normHint(field: string): string | undefined {
  const norm = NORMS[field];
  if (!norm) return undefined;
  if (norm.min !== undefined) return `Me'yordan past: kamida ${norm.label} bo'lishi kerak`;
  return `Me'yordan yuqori: ${norm.label} dan ortiq bo'lmasligi kerak`;
}

/** "Haqiqiy ko'rsatgich" ustunidagi maydon — me'yordan chiqqan qiymat qizil rangda ko'rsatiladi. */
function ValueInput({ field, form, set }: SpravkaTemplateProps & { field: string }) {
  const value = form[field] || '';
  const invalid = isOutOfNorm(field, value);

  return (
    <input
      className={
        'w-full bg-transparent text-center text-xs font-bold outline-none ' +
        (invalid ? 'text-red-600 dark:text-red-500' : 'dark:text-white')
      }
      title={invalid ? normHint(field) : undefined}
      value={value}
      onChange={(e) => set(field, e.target.value)}
    />
  );
}

/** Ro'yxatdan tanlanadigan ko'rsatkich; me'yordan boshqa variant qizil bo'ladi. */
function ChoiceInput({ field, form, set }: SpravkaTemplateProps & { field: string }) {
  const { norm, options } = CHOICES[field];
  const value = form[field] || '';
  const invalid = value !== '' && value !== norm;

  return (
    <select
      className={`${selectCls} ${invalid ? ACTUAL_VALUE_INVALID_CLS : ''}`}
      title={invalid ? `Me'yor bo'yicha "${norm}" bo'lishi kerak` : undefined}
      value={value}
      onChange={(e) => set(field, e.target.value)}
    >
      <option value="">— Выберите —</option>
      {options.map((option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  );
}

function Table({ form, set }: SpravkaTemplateProps) {
  return (
    <>
      <div className="mb-5 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={thCls} style={{ width: 40 }}>T/b №</th>
              <th className={thCls}>Ko'rsatkich nomlari</th>
              <th className={thCls} style={{ width: 130 }}>TT 16472899-049:2026 bo'yicha me'yor</th>
              <th className={thCls} style={{ width: 90 }}>Haqiqiy ko'rsatgich</th>
            </tr>
          </thead>
          <tbody>
            {/* Row 1 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>1</td>
              <td className={tdCls}><span className="underline">20°C da zichlik, kg/m³, dan kam emas</span></td>
              <td className={tdCls + ' text-center text-xs italic'}>Me'yorlanmaydi, aniqlanishi shart</td>
              <td className={tdCls}><ValueInput field="pb_zichlik" form={form} set={set} /></td>
            </tr>
            {/* Row 2 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>2</td>
              <td className={tdCls}><span className="underline">**Tadqiqot usuli bo'yicha oktan soni, kamida</span></td>
              <td className={tdCls + ' text-center'}>{NORMS.pb_oktan.label}</td>
              <td className={tdCls}><ValueInput field="pb_oktan" form={form} set={set} /></td>
            </tr>
            {/* Row 3 — Fraksiyaviy tarkibi: sarlavha + 7 ta ko'rsatkich.
                "Qoldiq va yo'qotishlar" ham shu punktga kiradi, shuning uchun rowSpan 8. */}
            <tr>
              <td className={tdCls + ' text-center align-middle'} rowSpan={8}>3</td>
              <td className={tdCls} colSpan={3}><span className="underline">Fraksiyaviy tarkibi:</span></td>
            </tr>
            <tr>
              <td className={tdCls}>Qaynashning boshlang'ich harorati, °C, dan kam emas</td>
              <td className={tdCls + ' text-center'}>{NORMS.pb_frak_boshlang.label}</td>
              <td className={tdCls}><ValueInput field="pb_frak_boshlang" form={form} set={set} /></td>
            </tr>
            <tr>
              <td className={tdCls}>10% hajmi qaynaydigan harorat, °C, dan kam emas yuqori emas</td>
              <td className={tdCls + ' text-center'}>{NORMS.pb_frak_10.label}</td>
              <td className={tdCls}><ValueInput field="pb_frak_10" form={form} set={set} /></td>
            </tr>
            <tr>
              <td className={tdCls}>50% hajmi qaynaydigan harorat, °C, dan yuqori emas</td>
              <td className={tdCls + ' text-center'}>{NORMS.pb_frak_50.label}</td>
              <td className={tdCls}><ValueInput field="pb_frak_50" form={form} set={set} /></td>
            </tr>
            <tr>
              <td className={tdCls}>90% hajmi qaynaydigan harorat, °C, dan yuqori emas</td>
              <td className={tdCls + ' text-center text-xs italic'}>Me'yorlanmaydi, aniqlanishi shart</td>
              <td className={tdCls}><ValueInput field="pb_frak_90" form={form} set={set} /></td>
            </tr>
            <tr>
              <td className={tdCls}>Qaynashning oxiri, °C, dan yuqori emas</td>
              <td className={tdCls + ' text-center'}>{NORMS.pb_frak_oxiri.label}</td>
              <td className={tdCls}><ValueInput field="pb_frak_oxiri" form={form} set={set} /></td>
            </tr>
            <tr>
              <td className={tdCls}>Kolbadagi qoldiq, %, dan ortiq emas</td>
              <td className={tdCls + ' text-center'}>{NORMS.pb_frak_kolba.label}</td>
              <td className={tdCls}><ValueInput field="pb_frak_kolba" form={form} set={set} /></td>
            </tr>
            <tr>
              <td className={tdCls}>Qoldiq va yo'qotishlar, %, dan ortiq emas</td>
              <td className={tdCls + ' text-center'}>{NORMS.pb_frak_yoqotish.label}</td>
              <td className={tdCls}><ValueInput field="pb_frak_yoqotish" form={form} set={set} /></td>
            </tr>
            {/* Row 4 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>4</td>
              <td className={tdCls}><span className="underline">**Umumiy oltingugurtning massaviy ulushi, %, dan ortiq emas</span></td>
              <td className={tdCls + ' text-center'}>{NORMS.pb_oltingugurt.label}</td>
              <td className={tdCls}><ValueInput field="pb_oltingugurt" form={form} set={set} /></td>
            </tr>
            {/* Row 5 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>5</td>
              <td className={tdCls}><span className="underline">**Benzolning hajmiy ulushi, %, dan ortiq emas</span></td>
              <td className={tdCls + ' text-center'}>{NORMS.pb_benzol.label}</td>
              <td className={tdCls}><ValueInput field="pb_benzol" form={form} set={set} /></td>
            </tr>
            {/* Row 6 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>6</td>
              <td className={tdCls}><span className="underline">**Erituvchi bilan yuvilgan smolalar konsentratsiyasi, mg/100 cm³, dan ortiq emas</span></td>
              <td className={tdCls + ' text-center'}>{NORMS.pb_smola.label}</td>
              <td className={tdCls}><ValueInput field="pb_smola" form={form} set={set} /></td>
            </tr>
            {/* Row 7 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>7</td>
              <td className={tdCls}><span className="underline">**Mis plastinkada sinov (50°C da 3 soat)</span></td>
              <td className={tdCls + ' text-center'}>{CHOICES.pb_mis.norm}</td>
              <td className={tdCls}><ChoiceInput field="pb_mis" form={form} set={set} /></td>
            </tr>
            {/* Row 8 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>8</td>
              <td className={tdCls}><span className="underline">Mexanik aralashmalar miqdori,</span></td>
              <td className={tdCls + ' text-center'}>{CHOICES.pb_mexanik.norm}</td>
              <td className={tdCls}><ChoiceInput field="pb_mexanik" form={form} set={set} /></td>
            </tr>
            {/* Row 9 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>9</td>
              <td className={tdCls}><span className="underline">Suv miqdori</span></td>
              <td className={tdCls + ' text-center'}>{CHOICES.pb_suv.norm}</td>
              <td className={tdCls}><ChoiceInput field="pb_suv" form={form} set={set} /></td>
            </tr>
            {/* Row 10 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>10</td>
              <td className={tdCls}><span className="underline">Tashqi ko'rinishi</span></td>
              <td className={tdCls + ' text-center'}>Shaffof</td>
              <td className={tdCls}><ValueInput field="pb_tashqi" form={form} set={set} /></td>
            </tr>
            {/* Row 11 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>11</td>
              <td className={tdCls}><span className="underline">*Namuna olish vaqtdagi zichlik, kg/m³</span></td>
              <td className={tdCls + ' text-center text-xs italic'}>Me'yorlanmaydi</td>
              <td className={tdCls}><ValueInput field="pb_namuna_zichlik" form={form} set={set} /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mb-2 text-xs italic text-black dark:text-white">
        *Izoh: Xom ashyoni sof og'irligini hajm-og'irlik usulida aniqlash maqsadida uning harorati va zichligi namuna olish vaqtida aniqlanadi.
      </div>
      <div className="mb-6 text-xs italic text-black dark:text-white">
        ** Izoh: 2, 4, 5, 6 va 7 ko'rsatkichlar zarur hollarda ishlab chiqarish bo'limi talabiga asosan aniqlanadi.
      </div>
    </>
  );
}

const PryamojBenzinTemplate: SpravkaTemplate = {
  name: 'Прямой бензин',
  docCode: 'ZSK-5-PD 006-011-115',
  title: 'Qabul qilinadigan pryamogon benzinga',
  address: '"Buxoro NQIZ" MChJ markaziy tahlilxonasi, Qorovulbozor tu-ni, Mustaqillik ko\'chasi 1-uy. Tel: 65-364-12-27',
  shortDatesRow: true,
  Table,
  generatePdf,
};

export default PryamojBenzinTemplate;
