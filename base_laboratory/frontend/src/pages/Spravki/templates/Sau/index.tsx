import type { AV, SpravkaTemplate, SpravkaTemplateProps } from '../shared/types';
import { blank, makePdfGenerator } from '../shared/pdfHelpers';
import { thCls, tdCls } from '../shared/styles';

function buildCopyContent(form: AV) {
  const ul = (val: string, pad = 18) => ({ text: blank(val, pad), decoration: 'underline', fontSize: 9 });
  const norm = (t: string) => ({ text: t, alignment: 'center', fontSize: 8, italics: true });
  return [
    { text: 'ZSK-5-PD 006-011-115', alignment: 'right', fontSize: 9, bold: true, margin: [0, 14, 0, 4] },
    { text: "Qabul qilinadigan motor yoqilg'ilari aromatik komponentlar aralashmasi (Смесь ароматических углеводородов САУ или Смесь ароматических компонентов САК) qo'shimchasiga", alignment: 'center', bold: true, decoration: 'underline', fontSize: 10, margin: [0, 0, 0, 5] },
    { text: ["Ma'lumotnoma №  ", { text: blank(form.malumotnoma_no, 16), decoration: 'underline', bold: true, fontSize: 11 }], alignment: 'center', bold: true, fontSize: 11, margin: [0, 0, 0, 6] },
    { text: ['Manzil va sinov joyi: ', { text: '"Buxoro neftni qayta ishlash zavodi" MChJ markaziy tahlilxonasi, Qorovulbozor tumani, Mustaqillik ko\'chasi 1-uy. Tel: 65-364-12-27', decoration: 'underline', fontSize: 9 }], fontSize: 9, margin: [0, 0, 0, 4] },
    { columns: [{ text: ['Yetkazib beruvchi tashkilot: ', ul(form.yetkazib_beruvchi, 30)], width: '*', fontSize: 9 }, { text: ['  Vagon sisternalar soni: ', ul(form.vagon_soni, 8)], width: 'auto', fontSize: 9 }], margin: [0, 0, 0, 4] },
    { text: ['Namuna olingan v/s nomeri: ', ul(form.vagon_nomeri, 40)], fontSize: 9, margin: [0, 0, 0, 6] },
    { columns: [{ text: ["GOST 2517 bo'yicha namuna olingan sana: ", ul(form.gost_namuna_sana, 14)], width: '*', fontSize: 9 }, { text: ["Sinov o'tkazilgan sana: ", ul(form.sinov_sana, 14)], width: '*', fontSize: 9 }], margin: [0, 0, 0, 8] },
    {
      table: {
        headerRows: 1,
        widths: [22, '*', 95, 65],
        body: [
          [{ text: 'T/b\n№', bold: true, alignment: 'center', fontSize: 8, fillColor: '#e8e8e8' }, { text: "Ko'rsatkich nomi", bold: true, alignment: 'center', fontSize: 8, fillColor: '#e8e8e8' }, { text: "TT 16472899-052:2026\nbo'yicha me'yor", bold: true, alignment: 'center', fontSize: 8, fillColor: '#e8e8e8' }, { text: "Haqiqiy\nko'rsatgich", bold: true, alignment: 'center', fontSize: 8, fillColor: '#e8e8e8' }],
          [{ text: '1', alignment: 'center', fontSize: 8 }, { text: "Tashqi ko'rinishi", fontSize: 8 }, { text: "Rangsizdan och-sariq ranggacha bo'lgan shaffof suyuqlik", alignment: 'center', fontSize: 7 }, { text: form.sau_tashqi || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '2', alignment: 'center', fontSize: 8 }, { text: '**Benzolning massa ulushi, %, dan ortiq emas', decoration: 'underline', fontSize: 8 }, { text: '5', alignment: 'center', fontSize: 8 }, { text: form.sau_benzol || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '3', alignment: 'center', fontSize: 8 }, { text: '20 °C dagi zichlik, kg/m³, oraliqda', decoration: 'underline', fontSize: 8 }, { text: '760 - 840', alignment: 'center', fontSize: 8 }, { text: form.sau_zichlik || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '4', rowSpan: 7, alignment: 'center', fontSize: 8, margin: [0, 40, 0, 0] }, { stack: [{ text: 'Fraksiyaviy tarkibi:', decoration: 'underline', fontSize: 8 }, { text: "haydashning boshlang'ich harorati, °C, dan past emas", fontSize: 8 }] }, { text: '30', alignment: 'center', fontSize: 8 }, { text: form.sau_frak_boshlang || '', alignment: 'center', fontSize: 8, bold: true }],
          [{}, { text: '10% miqdori haydaladigan harorat, °C, dan yuqori emas', fontSize: 8 }, { text: '85', alignment: 'center', fontSize: 8 }, { text: form.sau_frak_10 || '', alignment: 'center', fontSize: 8, bold: true }],
          [{}, { text: '50% miqdori haydaladigan harorat, °C, dan yuqori emas', fontSize: 8 }, { text: '130', alignment: 'center', fontSize: 8 }, { text: form.sau_frak_50 || '', alignment: 'center', fontSize: 8, bold: true }],
          [{}, { text: '90% miqdori haydaladigan harorat, °C, dan yuqori emas', fontSize: 8 }, { text: '190', alignment: 'center', fontSize: 8 }, { text: form.sau_frak_90 || '', alignment: 'center', fontSize: 8, bold: true }],
          [{}, { text: "qaynashning oxirgi harorati, °C, dan yuqori emas", fontSize: 8 }, { text: '215', alignment: 'center', fontSize: 8 }, { text: form.sau_frak_oxirgi || '', alignment: 'center', fontSize: 8, bold: true }],
          [{}, { text: 'kolbadagi qoldiq %(hajm), dan ortiq emas', fontSize: 8 }, { text: '2', alignment: 'center', fontSize: 8 }, { text: form.sau_frak_kolba || '', alignment: 'center', fontSize: 8, bold: true }],
          [{}, { text: "yo'qotishlar %(hajm), dan ortiq emas", fontSize: 8 }, { text: '2', alignment: 'center', fontSize: 8 }, { text: form.sau_frak_yoqotish || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '5', alignment: 'center', fontSize: 8 }, { text: "**Oltingugurt miqdori, mg/kg, dan ko'p emas", decoration: 'underline', fontSize: 8 }, { text: '500', alignment: 'center', fontSize: 8 }, { text: form.sau_oltingugurt || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '6', alignment: 'center', fontSize: 8 }, { text: '**Umumiy aromatik uglevodorlar hajmiy miqdori, % dan kam emas', decoration: 'underline', fontSize: 8 }, { text: '50', alignment: 'center', fontSize: 8 }, { text: form.sau_aromatik || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '7', alignment: 'center', fontSize: 8 }, { text: '**Mis plastinkada sinash', decoration: 'underline', fontSize: 8 }, { text: 'Chidamli', alignment: 'center', fontSize: 8 }, { text: form.sau_mis || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '8', alignment: 'center', fontSize: 8 }, { text: '**Tadqiqot usulidagi oktan soni, dan past emas', decoration: 'underline', fontSize: 8 }, { text: '94', alignment: 'center', fontSize: 8 }, { text: form.sau_oktan || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '9', alignment: 'center', fontSize: 8 }, { text: '*Namuna olish vaqtidagi zichlik, kg/m³', decoration: 'underline', fontSize: 8 }, norm("Me'yorlanmaydi"), { text: form.sau_namuna_zichlik || '', alignment: 'center', fontSize: 8, bold: true }],
        ],
      },
      layout: { hLineColor: '#000000', vLineColor: '#000000' },
      margin: [0, 0, 0, 6],
    },
    { text: "*Izoh: Xom ashyoni sof og'irligini hajm-og'irlik usulida aniqlash maqsadida uning harorati va zichligi namuna olish vaqtida aniqlanadi.", fontSize: 7, italics: true, margin: [0, 0, 0, 2] },
    { text: "** Izoh: 2,4,5,6,7, va 8 ko'rsatkichlar zarur hollarda ishlab chiqarish bo'limi talabiga asosan aniqlanadi.", fontSize: 7, italics: true, margin: [0, 0, 0, 8] },
    { text: ["Smena boshlig'i: ", { text: blank(form.smena_boshligi, 36), decoration: 'underline', fontSize: 9 }], fontSize: 9, margin: [0, 0, 0, 5] },
  ];
}

const generatePdf = makePdfGenerator(buildCopyContent, 'sau');

function Table({ form, set }: SpravkaTemplateProps) {
  return (
    <>
      <div className="mb-5 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={thCls} style={{ width: 40 }}>T/b №</th>
              <th className={thCls}>Ko'rsatkich nomi</th>
              <th className={thCls} style={{ width: 140 }}>TT 16472899-052:2026 bo'yicha me'yor</th>
              <th className={thCls} style={{ width: 90 }}>Haqiqiy ko'rsatgich</th>
            </tr>
          </thead>
          <tbody>
            {/* Row 1 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>1</td>
              <td className={tdCls}>Tashqi ko'rinishi</td>
              <td className={tdCls + ' text-center'}>Rangsizdan och-sariq ranggacha bo'lgan shaffof suyuqlik</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.sau_tashqi || ''}
                  onChange={(e) => set('sau_tashqi', e.target.value)}
                />
              </td>
            </tr>
            {/* Row 2 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>2</td>
              <td className={tdCls}><span className="underline">**Benzolning massa ulushi, %, dan ortiq emas</span></td>
              <td className={tdCls + ' text-center'}>5</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.sau_benzol || ''}
                  onChange={(e) => set('sau_benzol', e.target.value)}
                />
              </td>
            </tr>
            {/* Row 3 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>3</td>
              <td className={tdCls}><span className="underline">20 °C dagi zichlik, kg/m³, oraliqda</span></td>
              <td className={tdCls + ' text-center'}>760 - 840</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.sau_zichlik || ''}
                  onChange={(e) => set('sau_zichlik', e.target.value)}
                />
              </td>
            </tr>
            {/* Row 4 — Fraksiyaviy tarkibi (7 sub-rows) */}
            <tr>
              <td className={tdCls + ' text-center align-middle'} rowSpan={7}>4</td>
              <td className={tdCls}>
                <span className="underline">Fraksiyaviy tarkibi:</span><br />
                haydashning boshlang'ich harorati, °C, dan past emas
              </td>
              <td className={tdCls + ' text-center'}>30</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.sau_frak_boshlang || ''}
                  onChange={(e) => set('sau_frak_boshlang', e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td className={tdCls}>10% miqdori haydaladigan harorat, °C, dan yuqori emas</td>
              <td className={tdCls + ' text-center'}>85</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.sau_frak_10 || ''}
                  onChange={(e) => set('sau_frak_10', e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td className={tdCls}>50% miqdori haydaladigan harorat, °C, dan yuqori emas</td>
              <td className={tdCls + ' text-center'}>130</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.sau_frak_50 || ''}
                  onChange={(e) => set('sau_frak_50', e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td className={tdCls}>90% miqdori haydaladigan harorat, °C, dan yuqori emas</td>
              <td className={tdCls + ' text-center'}>190</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.sau_frak_90 || ''}
                  onChange={(e) => set('sau_frak_90', e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td className={tdCls}>qaynashning oxirgi harorati, °C, dan yuqori emas</td>
              <td className={tdCls + ' text-center'}>215</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.sau_frak_oxirgi || ''}
                  onChange={(e) => set('sau_frak_oxirgi', e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td className={tdCls}>kolbadagi qoldiq %(hajm), dan ortiq emas</td>
              <td className={tdCls + ' text-center'}>2</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.sau_frak_kolba || ''}
                  onChange={(e) => set('sau_frak_kolba', e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td className={tdCls}>yo'qotishlar %(hajm), dan ortiq emas</td>
              <td className={tdCls + ' text-center'}>2</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.sau_frak_yoqotish || ''}
                  onChange={(e) => set('sau_frak_yoqotish', e.target.value)}
                />
              </td>
            </tr>
            {/* Row 5 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>5</td>
              <td className={tdCls}><span className="underline">**Oltingugurt miqdori, mg/kg, dan ko'p emas</span></td>
              <td className={tdCls + ' text-center'}>500</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.sau_oltingugurt || ''}
                  onChange={(e) => set('sau_oltingugurt', e.target.value)}
                />
              </td>
            </tr>
            {/* Row 6 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>6</td>
              <td className={tdCls}><span className="underline">**Umumiy aromatik uglevodorlar hajmiy miqdori, % dan kam emas</span></td>
              <td className={tdCls + ' text-center'}>50</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.sau_aromatik || ''}
                  onChange={(e) => set('sau_aromatik', e.target.value)}
                />
              </td>
            </tr>
            {/* Row 7 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>7</td>
              <td className={tdCls}><span className="underline">**Mis plastinkada sinash</span></td>
              <td className={tdCls + ' text-center'}>Chidamli</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.sau_mis || ''}
                  onChange={(e) => set('sau_mis', e.target.value)}
                />
              </td>
            </tr>
            {/* Row 8 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>8</td>
              <td className={tdCls}><span className="underline">**Tadqiqot usulidagi oktan soni, dan past emas</span></td>
              <td className={tdCls + ' text-center'}>94</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.sau_oktan || ''}
                  onChange={(e) => set('sau_oktan', e.target.value)}
                />
              </td>
            </tr>
            {/* Row 9 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>9</td>
              <td className={tdCls}><span className="underline">*Namuna olish vaqtidagi zichlik, kg/m³</span></td>
              <td className={tdCls + ' text-center text-xs italic'}>Me'yorlanmaydi</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.sau_namuna_zichlik || ''}
                  onChange={(e) => set('sau_namuna_zichlik', e.target.value)}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mb-2 text-xs italic text-black dark:text-white">
        *Izoh: Xom ashyoni sof og'irligini hajm-og'irlik usulida aniqlash maqsadida uning harorati va zichligi namuna olish vaqtida aniqlanadi.
      </div>
      <div className="mb-6 text-xs italic text-black dark:text-white">
        ** Izoh: 2,4,5,6,7, va 8 ko'rsatkichlar zarur hollarda ishlab chiqarish bo'limi talabiga asosan aniqlanadi.
      </div>
    </>
  );
}

const SauTemplate: SpravkaTemplate = {
  name: 'САУ',
  docCode: 'ZSK-5-PD 006-011-115',
  title: "Qabul qilinadigan motor yoqilg'ilari aromatik komponentlar aralashmasi (Смесь ароматических углеводородов САУ или Смесь ароматических компонентов САК) qo'shimchasiga",
  address: '"Buxoro neftni qayta ishlash zavodi" MChJ markaziy tahlilxonasi, Qorovulbozor tumani, Mustaqillik ko\'chasi 1-uy. Tel: 65-364-12-27',
  shortDatesRow: true,
  Table,
  generatePdf,
};

export default SauTemplate;
