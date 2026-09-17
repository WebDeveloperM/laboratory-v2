import type { AV, SpravkaTemplate, SpravkaTemplateProps } from '../shared/types';
import { blank, makePdfGenerator } from '../shared/pdfHelpers';
import { thCls, tdCls } from '../shared/styles';

/** Raqamli me'yorlari bo'lgan ko'rsatkichlar — me'yordan chiqqan qiymat "Haqiqiy ko'rsatkich" ustunida qizil rangda ko'rsatiladi. */
type Norm = { label: string; min?: number; max?: number };

const NORMS: Record<string, Norm> = {
  zichlik: { label: '760,0', min: 760 },
  fraks_d: { label: '360', max: 360 },
  chaqnash: { label: '62', min: 62 },
};

/** Hujjatda o'nlik kasr vergul bilan yoziladi ("761,5"), shuning uchun nuqta ham, vergul ham qabul qilinadi. */
function toNumber(value: string): number | null {
  const normalized = String(value ?? '').trim().replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function isOutOfNorm(field: string, value: string): boolean {
  const norm = NORMS[field];
  const num = toNumber(value);
  if (!norm || num === null) return false;
  return (norm.min !== undefined && num < norm.min) || (norm.max !== undefined && num > norm.max);
}

function normHint(field: string): string | undefined {
  const norm = NORMS[field];
  if (!norm) return undefined;
  if (norm.min !== undefined) return `Me'yordan past: kamida ${norm.label} bo'lishi kerak`;
  return `Me'yordan yuqori: ${norm.label} dan ortiq bo'lmasligi kerak`;
}

/**
 * "Haqiqiy ko'rsatkich" ustunidagi maydon — me'yordan chiqqan qiymat matni qizil, to'ldirilishi
 * shart bo'lgan (requiredFields) bo'sh maydon esa pastki chizig'i qizil bo'lib ko'rsatiladi.
 */
function ValueInput({ field, form, set, requiredFields = [], showErrors }: SpravkaTemplateProps & { field: string }) {
  const value = form[field] || '';
  const invalid = isOutOfNorm(field, value);
  const missing = showErrors && requiredFields.includes(field) && !value.trim();
  return (
    <input
      className={
        'w-full bg-transparent text-center text-xs font-bold outline-none ' +
        (invalid ? 'text-red-600 dark:text-red-500 ' : 'dark:text-white ') +
        (missing ? 'border-b-2 border-red-600' : '')
      }
      title={invalid ? normHint(field) : undefined}
      value={value}
      onChange={(e) => set(field, e.target.value)}
    />
  );
}

function buildCopyContent(form: AV) {
  const ul = (val: string, pad = 18) => ({ text: blank(val, pad), decoration: 'underline', fontSize: 9 });
  return [
    { text: 'ZSK-5-PD 006-011-115', alignment: 'right', fontSize: 9, bold: true, margin: [0, 14, 0, 4] },
    { text: "Qabul qilinadigan sintetik dizel yonilg'isiga", alignment: 'center', bold: true, decoration: 'underline', fontSize: 11, margin: [0, 0, 0, 5] },
    { text: ["Ma'lumotnoma №  ", { text: blank(form.malumotnoma_no, 16), decoration: 'underline', bold: true, fontSize: 11 }], alignment: 'center', bold: true, fontSize: 11, margin: [0, 0, 0, 8] },
    { text: ['Manzil va sinov joyi: ', { text: '"Buxoro neftni qayta ishlash zavodi" MChJ markaziy tahlilxonasi, Qorovulbozor tumani, Mustaqillik ko\'chasi 1-uy. Tel: 65-364-12-27', decoration: 'underline', fontSize: 9 }], fontSize: 9, margin: [0, 0, 0, 4] },
    { columns: [{ text: ['Yetkazib beruvchi tashkilot: ', ul(form.yetkazib_beruvchi, 30)], width: '*', fontSize: 9 }, { text: ['  Vagon sisternalar soni: ', ul(form.vagon_soni, 8)], width: 'auto', fontSize: 9 }], margin: [0, 0, 0, 4] },
    { text: ['Namuna olingan v/s nomeri: ', ul(form.vagon_nomeri, 40)], fontSize: 9, margin: [0, 0, 0, 8] },
    { columns: [{ text: ["GOST 2517 bo'yicha namuna olingan sana: ", ul(form.gost_namuna_sana, 14)], width: '*', fontSize: 9 }, { text: ["Sinov o'tkazilgan sana: ", ul(form.sinov_sana, 14)], width: '*', fontSize: 9 }], margin: [0, 0, 0, 8] },
    {
      table: {
        headerRows: 1,
        widths: [22, '*', 95, 65],
        body: [
          [{ text: 'T/b\n№', bold: true, alignment: 'center', fontSize: 8, fillColor: '#e8e8e8' }, { text: "Ko'rsatkich nomi", bold: true, alignment: 'center', fontSize: 8, fillColor: '#e8e8e8' }, { text: "Me'yor", bold: true, alignment: 'center', fontSize: 8, fillColor: '#e8e8e8' }, { text: "Haqiqiy\nko'rsatkich", bold: true, alignment: 'center', fontSize: 8, fillColor: '#e8e8e8' }],
          [{ text: '1', alignment: 'center', fontSize: 8 }, { stack: [{ text: 'Zichlik, kg/m³:', decoration: 'underline', fontSize: 8 }, { text: 'a) 15 °C da, kam emas', fontSize: 8 }] }, { text: '760,0', alignment: 'center', fontSize: 8 }, { text: form.zichlik || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '2', rowSpan: 3, alignment: 'center', fontSize: 8, margin: [0, 18, 0, 0] }, { stack: [{ text: 'Fraksiyaviy tarkibi:', decoration: 'underline', fontSize: 8 }, { text: 'a) 250 °C haroratda distillanadi, %', fontSize: 8 }] }, { text: "Me'yorlanmagan", alignment: 'center', fontSize: 8, decoration: 'underline' }, { text: form.fraks_a || '', alignment: 'center', fontSize: 8, bold: true }],
          [{}, { text: 'b) 350 °C xaroratda distillanadi, %', fontSize: 8 }, { text: "Me'yorlanmagan", alignment: 'center', fontSize: 8, decoration: 'underline' }, { text: form.fraks_b || '', alignment: 'center', fontSize: 8, bold: true }],
          [{}, { text: "d) 95 % ni bug'lanish harorati, °C, yuqori emas", fontSize: 8 }, { text: '360', alignment: 'center', fontSize: 8 }, { text: form.fraks_d || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '3', alignment: 'center', fontSize: 8 }, { stack: [{ text: 'Yopiq tigelda aniqlanadigan chaqnash harorati,', decoration: 'underline', fontSize: 8 }, { text: '°C, dan past emas', fontSize: 8 }] }, { text: '62', alignment: 'center', fontSize: 8 }, { text: form.chaqnash || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '4', alignment: 'center', fontSize: 8 }, { text: "Tashqi ko'rinishi (ko'z bilan ko'rish orqali)", decoration: 'underline', fontSize: 8 }, { text: 'Och, shaffof', alignment: 'center', fontSize: 8 }, { text: form.tashqi || '', alignment: 'center', fontSize: 8, bold: true }],
        ],
      },
      layout: { hLineColor: '#000000', vLineColor: '#000000' },
      margin: [0, 0, 0, 8],
    },
    { text: "Ushbu ma'lumotnomani sinov laboratoriyasining ruxsatisiz ko'paytirish va nuxsalash ta'qiqlanadi.", fontSize: 8, italics: true, margin: [0, 0, 0, 12] },
    { text: ["Smena boshlig'i: ", { text: blank(form.smena_boshligi, 36), decoration: 'underline', fontSize: 9 }], fontSize: 9, margin: [0, 0, 0, 6] },
  ];
}

const generatePdf = makePdfGenerator(buildCopyContent, 'gazoyl_sintetik');

function Table({ form, set, requiredFields, showErrors }: SpravkaTemplateProps) {
  return (
    <>
      <div className="mb-5 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={thCls} style={{ width: 40 }}>T/b №</th>
              <th className={thCls}>Ko'rsatkich nomi</th>
              <th className={thCls} style={{ width: 110 }}>Me'yor</th>
              <th className={thCls} style={{ width: 90 }}>Haqiqiy ko'rsatkich</th>
            </tr>
          </thead>
          <tbody>
            {/* Row 1 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>1</td>
              <td className={tdCls}>
                <span className="underline">Zichlik, kg/m³:</span><br />
                a) 15 °C da, kam emas
              </td>
              <td className={tdCls + ' text-center'}>760,0</td>
              <td className={tdCls}>
                <ValueInput field="zichlik" form={form} set={set} requiredFields={requiredFields} showErrors={showErrors} />
              </td>
            </tr>
            {/* Row 2a */}
            <tr>
              <td className={tdCls + ' text-center align-middle'} rowSpan={3}>2</td>
              <td className={tdCls}>
                <span className="underline">Fraksiyaviy tarkibi:</span><br />
                a) 250 °C haroratda distillanadi, %
              </td>
              <td className={tdCls + ' text-center underline'}>Me'yorlanmagan</td>
              <td className={tdCls}>
                <ValueInput field="fraks_a" form={form} set={set} requiredFields={requiredFields} showErrors={showErrors} />
              </td>
            </tr>
            {/* Row 2b */}
            <tr>
              <td className={tdCls}>b) 350 °C xaroratda distillanadi, %</td>
              <td className={tdCls + ' text-center underline'}>Me'yorlanmagan</td>
              <td className={tdCls}>
                <ValueInput field="fraks_b" form={form} set={set} requiredFields={requiredFields} showErrors={showErrors} />
              </td>
            </tr>
            {/* Row 2d */}
            <tr>
              <td className={tdCls}>d) 95 % ni bug'lanish harorati, °C, yuqori emas</td>
              <td className={tdCls + ' text-center'}>360</td>
              <td className={tdCls}>
                <ValueInput field="fraks_d" form={form} set={set} requiredFields={requiredFields} showErrors={showErrors} />
              </td>
            </tr>
            {/* Row 3 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>3</td>
              <td className={tdCls}>
                <span className="underline">Yopiq tigelda aniqlanadigan chaqnash harorati,</span><br />
                °C, dan past emas
              </td>
              <td className={tdCls + ' text-center'}>62</td>
              <td className={tdCls}>
                <ValueInput field="chaqnash" form={form} set={set} requiredFields={requiredFields} showErrors={showErrors} />
              </td>
            </tr>
            {/* Row 4 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>4</td>
              <td className={tdCls + ' underline'}>
                Tashqi ko'rinishi (ko'z bilan ko'rish orqali)
              </td>
              <td className={tdCls + ' text-center'}>Och, shaffof</td>
              <td className={tdCls}>
                <ValueInput field="tashqi" form={form} set={set} requiredFields={requiredFields} showErrors={showErrors} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mb-6 text-sm italic text-black dark:text-white">
        Ushbu ma'lumotnomani sinov laboratoriyasining ruxsatisiz ko'paytirish va nuxsalash ta'qiqlanadi.
      </div>
    </>
  );
}

const GazoylSintetikTemplate: SpravkaTemplate = {
  name: 'Газойль Синтетик',
  docCode: 'ZSK-5-PD 006-011-115',
  title: "Qabul qilinadigan sintetik dizel yonilg'isiga",
  address: '"Buxoro neftni qayta ishlash zavodi" MChJ markaziy tahlilxonasi, Qorovulbozor tumani, Mustaqillik ko\'chasi 1-uy. Tel: 65-364-12-27',
  shortDatesRow: true,
  requiredFields: [
    'yetkazib_beruvchi', 'vagon_soni', 'vagon_nomeri', 'gost_namuna_sana', 'sinov_sana', 'berilgan_sana',
    'zichlik', 'fraks_a', 'fraks_b', 'fraks_d', 'chaqnash', 'tashqi',
  ],
  Table,
  generatePdf,
};

export default GazoylSintetikTemplate;
