import type { AV, SpravkaTemplate, SpravkaTemplateProps } from '../shared/types';
import { blank, makePdfGenerator } from '../shared/pdfHelpers';
import { thCls, tdCls } from '../shared/styles';

/** Raqamli me'yorlari bo'lgan ko'rsatkichlar — me'yordan chiqqan qiymat "Haqiqiy ko'rsatgich" ustunida qizil rangda ko'rsatiladi. */
type Norm = { label: string; min?: number; max?: number };

const NORMS: Record<string, Norm> = {
  ks_zichlik: { label: '730', min: 730 },
  ks_frak_b: { label: '205', max: 205 },
  ks_frak_e: { label: '300', max: 300 },
  ks_frak_f: { label: '1,5', max: 1.5 },
  ks_frak_g: { label: '1,5', max: 1.5 },
  ks_chaqnash: { label: '40', min: 40 },
};

/** Hujjatda o'nlik kasr vergul bilan yoziladi ("729,5"), shuning uchun nuqta ham, vergul ham qabul qilinadi. */
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

function buildCopyContent(form: AV) {
  const ul = (val: string, pad = 18) => ({ text: blank(val, pad), decoration: 'underline', fontSize: 9 });
  const norm = (t: string) => ({ text: t, alignment: 'center', fontSize: 8, italics: true });
  return [
    { text: 'ZSK-5-PD 006-011-115', alignment: 'right', fontSize: 9, bold: true, margin: [0, 14, 0, 4] },
    { text: "Qabul qilinadigan sintetik aviayonilg'isiga", alignment: 'center', bold: true, decoration: 'underline', fontSize: 11, margin: [0, 0, 0, 5] },
    { text: ["Ma'lumotnoma №  ", { text: blank(form.malumotnoma_no, 16), decoration: 'underline', bold: true, fontSize: 11 }], alignment: 'center', bold: true, fontSize: 11, margin: [0, 0, 0, 6] },
    { text: ['Manzil va sinov joyi: ', { text: '"Buxoro neftni qayta ishlash zavodi" MChJ markaziy tahlilxonasi, Qorovulbozor tumani, Mustaqillik ko\'chasi 1-uy. Tel: 65-364-12-27', decoration: 'underline', fontSize: 9 }], fontSize: 9, margin: [0, 0, 0, 4] },
    { columns: [{ text: ['Yetkazib beruvchi tashkilot: ', ul(form.yetkazib_beruvchi, 30)], width: '*', fontSize: 9 }, { text: ['  Vagon sisternalar soni: ', ul(form.vagon_soni, 8)], width: 'auto', fontSize: 9 }], margin: [0, 0, 0, 4] },
    { text: ['Namuna olingan v/s nomeri: ', ul(form.vagon_nomeri, 40)], fontSize: 9, margin: [0, 0, 0, 6] },
    { columns: [{ text: ["GOST 2517 bo'yicha namuna olingan sana: ", ul(form.gost_namuna_sana, 14)], width: '*', fontSize: 9 }, { text: ["Sinov o'tkazilgan sana: ", ul(form.sinov_sana, 14)], width: '*', fontSize: 9 }], margin: [0, 0, 0, 8] },
    {
      table: {
        headerRows: 1,
        widths: [22, '*', 90, 65],
        body: [
          [{ text: 'T/b\n№', bold: true, alignment: 'center', fontSize: 8, fillColor: '#e8e8e8' }, { text: "Ko'rsatkich nomlari", bold: true, alignment: 'center', fontSize: 8, fillColor: '#e8e8e8' }, { text: "Ts 16472899-046:2022\nbo'yicha me'yor", bold: true, alignment: 'center', fontSize: 8, fillColor: '#e8e8e8' }, { text: "Haqiqiy\nko'rsatgich", bold: true, alignment: 'center', fontSize: 8, fillColor: '#e8e8e8' }],
          [{ text: '1', alignment: 'center', fontSize: 8 }, { text: '15°C haroratdgi zichlik, kg/m³, dan kam emas', decoration: 'underline', fontSize: 8 }, { text: '730', alignment: 'center', fontSize: 8 }, { text: form.ks_zichlik || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '2', rowSpan: 7, alignment: 'center', fontSize: 8, margin: [0, 34, 0, 0] }, { stack: [{ text: 'Fraksiyaviy tarkibi:', decoration: 'underline', fontSize: 8 }, { text: "a) Qaynashning boshlanishi, °C", fontSize: 8 }] }, norm("Me'yorlanmagan"), { text: form.ks_frak_a || '', alignment: 'center', fontSize: 8, bold: true }],
          [{}, { text: 'b) 10% qaynash, °C haroratda, yuqori emas', fontSize: 8 }, { text: '205', alignment: 'center', fontSize: 8 }, { text: form.ks_frak_b || '', alignment: 'center', fontSize: 8, bold: true }],
          [{}, { text: 'c) 50% qaynash, °C haroratda, yuqori emas', fontSize: 8 }, norm("Me'yorlanmagan"), { text: form.ks_frak_c || '', alignment: 'center', fontSize: 8, bold: true }],
          [{}, { text: 'd) 90% qaynash, °C haroratda, yuqori emas', fontSize: 8 }, norm("Me'yorlanmagan"), { text: form.ks_frak_d || '', alignment: 'center', fontSize: 8, bold: true }],
          [{}, { text: "e) Oxirgi qaynash harorati, °C, yuqori emas", fontSize: 8 }, { text: '300', alignment: 'center', fontSize: 8 }, { text: form.ks_frak_e || '', alignment: 'center', fontSize: 8, bold: true }],
          [{}, { text: "f) Haydashdan keyingi qoldiq, %, ko'p emas", fontSize: 8 }, { text: '1,5', alignment: 'center', fontSize: 8 }, { text: form.ks_frak_f || '', alignment: 'center', fontSize: 8, bold: true }],
          [{}, { text: "g) Haydashdan keyingi yo'qotish, %, ko'p emas", fontSize: 8 }, { text: '1,5', alignment: 'center', fontSize: 8 }, { text: form.ks_frak_g || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '3', alignment: 'center', fontSize: 8 }, { text: 'Yopiq tigilda aniqlangan chaqnash harorati, °C, kam emas', decoration: 'underline', fontSize: 8 }, { text: '40', alignment: 'center', fontSize: 8 }, { text: form.ks_chaqnash || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '4', alignment: 'center', fontSize: 8 }, { text: "Mexanik qo'shimchalar va suv miqdori (ko'z bilan ko'rish orqali)", decoration: 'underline', fontSize: 8 }, { text: 'Mavjud emas', alignment: 'center', fontSize: 8 }, { text: form.ks_mexanik || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '5', alignment: 'center', fontSize: 8 }, { text: '*Namuna olish vaqtdagi zichlik, kg/m³', decoration: 'underline', fontSize: 8 }, norm("Me'yorlanmaydi"), { text: form.ks_namuna_zichlik || '', alignment: 'center', fontSize: 8, bold: true }],
        ],
      },
      layout: { hLineColor: '#000000', vLineColor: '#000000' },
      margin: [0, 0, 0, 6],
    },
    { text: "*Izoh: Xom ashyoni sof og'irligini hajm-og'irlik usulida aniqlash maqsadida uning harorati va zichligi namuna olish vaqtida aniqlanadi.", fontSize: 7, italics: true, margin: [0, 0, 0, 8] },
    { text: ["Smena boshlig'i: ", { text: blank(form.smena_boshligi, 36), decoration: 'underline', fontSize: 9 }], fontSize: 9, margin: [0, 0, 0, 5] },
  ];
}

const generatePdf = makePdfGenerator(buildCopyContent, 'kerosin_sintetik');

function Table({ form, set }: SpravkaTemplateProps) {
  return (
    <>
      <div className="mb-5 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={thCls} style={{ width: 40 }}>T/b №</th>
              <th className={thCls}>Ko'rsatkich nomlari</th>
              <th className={thCls} style={{ width: 130 }}>Ts 16472899-046:2022 bo'yicha me'yor</th>
              <th className={thCls} style={{ width: 90 }}>Haqiqiy ko'rsatgich</th>
            </tr>
          </thead>
          <tbody>
            {/* Row 1 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>1</td>
              <td className={tdCls}><span className="underline">15°C haroratdgi zichlik, kg/m³, dan kam emas</span></td>
              <td className={tdCls + ' text-center'}>730</td>
              <td className={tdCls}>
                <ValueInput field="ks_zichlik" form={form} set={set} />
              </td>
            </tr>
            {/* Row 2 — Fraksiyaviy tarkibi (7 sub-rows) */}
            <tr>
              <td className={tdCls + ' text-center align-middle'} rowSpan={7}>2</td>
              <td className={tdCls}>
                <span className="underline">Fraksiyaviy tarkibi:</span><br />
                a) Qaynashning boshlanishi, °C
              </td>
              <td className={tdCls + ' text-center text-xs italic'}>Me'yorlanmagan</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.ks_frak_a || ''}
                  onChange={(e) => set('ks_frak_a', e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td className={tdCls}>b) 10% qaynash, °C haroratda, yuqori emas</td>
              <td className={tdCls + ' text-center'}>205</td>
              <td className={tdCls}>
                <ValueInput field="ks_frak_b" form={form} set={set} />
              </td>
            </tr>
            <tr>
              <td className={tdCls}>c) 50% qaynash, °C haroratda, yuqori emas</td>
              <td className={tdCls + ' text-center text-xs italic'}>Me'yorlanmagan</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.ks_frak_c || ''}
                  onChange={(e) => set('ks_frak_c', e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td className={tdCls}>d) 90% qaynash, °C haroratda, yuqori emas</td>
              <td className={tdCls + ' text-center text-xs italic'}>Me'yorlanmagan</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.ks_frak_d || ''}
                  onChange={(e) => set('ks_frak_d', e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td className={tdCls}>e) Oxirgi qaynash harorati, °C, yuqori emas</td>
              <td className={tdCls + ' text-center'}>300</td>
              <td className={tdCls}>
                <ValueInput field="ks_frak_e" form={form} set={set} />
              </td>
            </tr>
            <tr>
              <td className={tdCls}>f) Haydashdan keyingi qoldiq, %, ko'p emas</td>
              <td className={tdCls + ' text-center'}>1,5</td>
              <td className={tdCls}>
                <ValueInput field="ks_frak_f" form={form} set={set} />
              </td>
            </tr>
            <tr>
              <td className={tdCls}>g) Haydashdan keyingi yo'qotish, %, ko'p emas</td>
              <td className={tdCls + ' text-center'}>1,5</td>
              <td className={tdCls}>
                <ValueInput field="ks_frak_g" form={form} set={set} />
              </td>
            </tr>
            {/* Row 3 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>3</td>
              <td className={tdCls}><span className="underline">Yopiq tigilda aniqlangan chaqnash harorati, °C, kam emas</span></td>
              <td className={tdCls + ' text-center'}>40</td>
              <td className={tdCls}>
                <ValueInput field="ks_chaqnash" form={form} set={set} />
              </td>
            </tr>
            {/* Row 4 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>4</td>
              <td className={tdCls}><span className="underline">Mexanik qo'shimchalar va suv miqdori (ko'z bilan ko'rish orqali)</span></td>
              <td className={tdCls + ' text-center'}>Mavjud emas</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.ks_mexanik || ''}
                  onChange={(e) => set('ks_mexanik', e.target.value)}
                />
              </td>
            </tr>
            {/* Row 5 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>5</td>
              <td className={tdCls}><span className="underline">*Namuna olish vaqtdagi zichlik, kg/m³</span></td>
              <td className={tdCls + ' text-center text-xs italic'}>Me'yorlanmaydi</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.ks_namuna_zichlik || ''}
                  onChange={(e) => set('ks_namuna_zichlik', e.target.value)}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mb-6 text-xs italic text-black dark:text-white">
        *Izoh: Xom ashyoni sof og'irligini hajm-og'irlik usulida aniqlash maqsadida uning harorati va zichligi namuna olish vaqtida aniqlanadi.
      </div>
    </>
  );
}

const KerosinSintetikTemplate: SpravkaTemplate = {
  name: 'Керосин Синтетик',
  docCode: 'ZSK-5-PD 006-011-115',
  title: "Qabul qilinadigan sintetik aviayonilg'isiga",
  address: '"Buxoro neftni qayta ishlash zavodi" MChJ markaziy tahlilxonasi, Qorovulbozor tumani, Mustaqillik ko\'chasi 1-uy. Tel: 65-364-12-27',
  shortDatesRow: true,
  Table,
  generatePdf,
};

export default KerosinSintetikTemplate;
