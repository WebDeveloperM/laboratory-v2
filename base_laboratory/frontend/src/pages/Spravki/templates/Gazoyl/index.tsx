import type { AV, SpravkaTemplate, SpravkaTemplateProps } from '../shared/types';
import { blank, makePdfGenerator } from '../shared/pdfHelpers';
import { thCls, tdCls } from '../shared/styles';

function buildCopyContent(form: AV) {
  const ul = (val: string, pad = 18) => ({ text: blank(val, pad), decoration: 'underline', fontSize: 9 });
  const norm = (t: string) => ({ text: t, alignment: 'center', fontSize: 8, italics: true });
  return [
    { text: 'ZSK-5-PD 006-011-115', alignment: 'right', fontSize: 9, bold: true, margin: [0, 14, 0, 4] },
    { text: 'Qabul qilinadigan gazoylga', alignment: 'center', bold: true, decoration: 'underline', fontSize: 11, margin: [0, 0, 0, 5] },
    { text: ["Ma'lumotnoma №  ", { text: blank(form.malumotnoma_no, 16), decoration: 'underline', bold: true, fontSize: 11 }], alignment: 'center', bold: true, fontSize: 11, margin: [0, 0, 0, 6] },
    { text: ['Manzil va sinov joyi: ', { text: '"Buxoro neftni qayta ishlash zavodi" MChJ markaziy tahlilxonasi, Qorovulbozor tumani, Mustaqillik ko\'chasi 1-uy. Tel: 65-364-12-27', decoration: 'underline', fontSize: 9 }], fontSize: 9, margin: [0, 0, 0, 3] },
    { columns: [{ text: ['Yetkazib beruvchi tashkilot: ', ul(form.yetkazib_beruvchi, 30)], width: '*', fontSize: 9 }, { text: ['  Vagon sisternalar soni: ', ul(form.vagon_soni, 8)], width: 'auto', fontSize: 9 }], margin: [0, 0, 0, 3] },
    { text: ['Namuna olingan v/s nomeri: ', ul(form.vagon_nomeri, 40)], fontSize: 9, margin: [0, 0, 0, 3] },
    { columns: [{ text: ['Namuna olingan sana: ', ul(form.namuna_sana, 12)], width: '*', fontSize: 9 }, { text: ["GOST 2517 bo'yicha: ", ul(form.gost_2517, 8)], width: '*', fontSize: 9 }, { text: ["Sinov o'tkazilgan sana: ", ul(form.sinov_sana, 12)], width: '*', fontSize: 9 }], margin: [0, 0, 0, 4] },
    {
      table: {
        headerRows: 2,
        widths: [20, '*', 68, 90, 56],
        body: [
          [
            { text: 'T/b\n№', rowSpan: 2, bold: true, alignment: 'center', fontSize: 7, fillColor: '#e8e8e8' },
            { text: "Ko'rsatkich nomlari", rowSpan: 2, bold: true, alignment: 'center', fontSize: 7, fillColor: '#e8e8e8' },
            { text: "TT 16472899-050:2026 bo'yicha me'yor", colSpan: 2, bold: true, alignment: 'center', fontSize: 7, fillColor: '#e8e8e8' },
            {},
            { text: "Haqiqiy\nko'rsatgich", rowSpan: 2, bold: true, alignment: 'center', fontSize: 7, fillColor: '#e8e8e8' },
          ],
          [ {}, {}, { text: 'Pryamogon\ngazoyl', bold: true, alignment: 'center', fontSize: 7, fillColor: '#e8e8e8' }, { text: 'Katalitik\nkreking gazoyli', bold: true, alignment: 'center', fontSize: 7, fillColor: '#e8e8e8' }, {} ],
          // Row 1a
          [ { text: '1.', rowSpan: 2, alignment: 'center', fontSize: 8, margin: [0, 8, 0, 0] }, { text: '20°C dagi zichlik, kg/m³, dan ortiq emas yoki', decoration: 'underline', fontSize: 8 }, { text: '860', alignment: 'center', fontSize: 8 }, { text: '890', alignment: 'center', fontSize: 8 }, { text: form.r1_haqiqiy || '', rowSpan: 2, alignment: 'center', fontSize: 8, bold: true, margin: [0, 8, 0, 0] } ],
          // Row 1b
          [ {}, { text: '**15°C dagi zichlik, kg/m³, dan ortiq emas', fontSize: 8 }, { text: '863,5', alignment: 'center', fontSize: 8 }, { text: '893', alignment: 'center', fontSize: 8 }, {} ],
          // Row 2
          [ { text: '2.', alignment: 'center', fontSize: 8 }, { text: '*Namuna olish vaqtdagi zichlik, kg/m³', decoration: 'underline', fontSize: 8 }, norm("Me'yorlanmaydi"), norm("Me'yorlanmaydi"), { text: form.r2_haqiqiy || '', alignment: 'center', fontSize: 8, bold: true } ],
          // Row 3a
          [ { text: '3.', rowSpan: 2, alignment: 'center', fontSize: 8, margin: [0, 8, 0, 0] }, { stack: [{ text: 'Fraksiyaviy tarkibi:', decoration: 'underline', fontSize: 8 }, { text: '°C, dan yuqori emas haroratda 50 % haydaladi,', fontSize: 8 }] }, { text: '280', alignment: 'center', fontSize: 8 }, { text: '300', alignment: 'center', fontSize: 8 }, { text: form.r3a_haqiqiy || '', alignment: 'center', fontSize: 8, bold: true } ],
          // Row 3b
          [ {}, { text: '°C, dan yuqori emas haroratda 95 % haydaladi', fontSize: 8 }, { text: '360', alignment: 'center', fontSize: 8 }, { text: '390', alignment: 'center', fontSize: 8 }, { text: form.r3b_haqiqiy || '', alignment: 'center', fontSize: 8, bold: true } ],
          // Row 4
          [ { text: '4.', alignment: 'center', fontSize: 8 }, { text: "**Umumiy oltingugurtning massaviy ulushi, %, dan ortiq emas", decoration: 'underline', fontSize: 8 }, { text: '1,36', alignment: 'center', fontSize: 8 }, { text: '1,36', alignment: 'center', fontSize: 8 }, { text: form.r4_haqiqiy || '', alignment: 'center', fontSize: 8, bold: true } ],
          // Row 5
          [ { text: '5.', alignment: 'center', fontSize: 8 }, { text: "Yopiq tigelda aniqlanadigan chaqnash harorati, °C dan past emas", decoration: 'underline', fontSize: 8 }, norm("Me'yorlanmaydi,\naniqlanishi shart"), norm("Me'yorlanmaydi,\naniqlanishi shart"), { text: form.r5_haqiqiy || '', alignment: 'center', fontSize: 8, bold: true } ],
          // Row 6
          [ { text: '6.', alignment: 'center', fontSize: 8 }, { text: "**Qotish harorati, °C, dan yuqori emas", decoration: 'underline', fontSize: 8 }, norm("Me'yorlanmaydi,\naniqlanishi shart"), norm("Me'yorlanmaydi,\naniqlanishi shart"), { text: form.r6_haqiqiy || '', alignment: 'center', fontSize: 8, bold: true } ],
          // Row 7
          [ { text: '7.', alignment: 'center', fontSize: 8 }, { text: "Suv miqdori.", decoration: 'underline', fontSize: 8 }, { text: 'Mavjud emas', alignment: 'center', fontSize: 8 }, { text: 'Mavjud emas', alignment: 'center', fontSize: 8 }, { text: form.r7_haqiqiy || '', alignment: 'center', fontSize: 8, bold: true } ],
          // Row 8
          [ { text: '8.', alignment: 'center', fontSize: 8 }, { text: "Mexanik birikmalar miqdori.", decoration: 'underline', fontSize: 8 }, { text: 'Mavjud emas', alignment: 'center', fontSize: 8 }, { text: 'Mavjud emas', alignment: 'center', fontSize: 8 }, { text: form.r8_haqiqiy || '', alignment: 'center', fontSize: 8, bold: true } ],
        ],
      },
      layout: { hLineColor: '#000000', vLineColor: '#000000' },
      margin: [0, 0, 0, 5],
    },
    { text: "*Izoh: xom ashyoni sof og'irligini hajm-og'irlik usulida aniqlash maqsadida uning harorati va zichligi namuna olish vaqtida aniqlanadi.", fontSize: 7, italics: true, margin: [0, 0, 0, 2] },
    { text: "** Izoh: 1, 4, va 6 ko'rsatkichlar zarur hollarda ishlab chiqarish bo'limi talabiga asosan aniqlanadi.", fontSize: 7, italics: true, margin: [0, 0, 0, 8] },
    { text: ["Smena boshlig'i: ", { text: blank(form.smena_boshligi, 36), decoration: 'underline', fontSize: 9 }], fontSize: 9, margin: [0, 0, 0, 5] },
  ];
}

const generatePdf = makePdfGenerator(buildCopyContent, 'gazoyl');

function Table({ form, set }: SpravkaTemplateProps) {
  return (
    <>
      <div className="mb-5 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={thCls} rowSpan={2} style={{ width: 40 }}>T/b №</th>
              <th className={thCls} rowSpan={2}>Ko'rsatkich nomlari</th>
              <th className={thCls} colSpan={2}>TT 16472899-050:2026 bo'yicha me'yor</th>
              <th className={thCls} rowSpan={2} style={{ width: 90 }}>Haqiqiy ko'rsatgich</th>
            </tr>
            <tr>
              <th className={thCls} style={{ width: 90 }}>Pryamogon gazoyl</th>
              <th className={thCls} style={{ width: 90 }}>Katalitik kreking gazoyli</th>
            </tr>
          </thead>
          <tbody>
            {/* Row 1a */}
            <tr>
              <td className={tdCls + ' text-center align-middle'} rowSpan={2}>1</td>
              <td className={tdCls}>
                <span className="underline">20°C dagi zichlik, kg/m³, dan ortiq emas yoki</span>
              </td>
              <td className={tdCls + ' text-center'}>860</td>
              <td className={tdCls + ' text-center'}>890</td>
              <td className={tdCls + ' align-middle'} rowSpan={2}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.r1_haqiqiy || ''}
                  onChange={(e) => set('r1_haqiqiy', e.target.value)}
                />
              </td>
            </tr>
            {/* Row 1b */}
            <tr>
              <td className={tdCls}>**15°C dagi zichlik, kg/m³, dan ortiq emas</td>
              <td className={tdCls + ' text-center'}>863,5</td>
              <td className={tdCls + ' text-center'}>893</td>
            </tr>
            {/* Row 2 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>2</td>
              <td className={tdCls}>
                <span className="underline">*Namuna olish vaqtdagi zichlik, kg/m³</span>
              </td>
              <td className={tdCls + ' text-center text-xs italic'}>Me'yorlanmaydi</td>
              <td className={tdCls + ' text-center text-xs italic'}>Me'yorlanmaydi</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.r2_haqiqiy || ''}
                  onChange={(e) => set('r2_haqiqiy', e.target.value)}
                />
              </td>
            </tr>
            {/* Row 3a */}
            <tr>
              <td className={tdCls + ' text-center align-middle'} rowSpan={2}>3</td>
              <td className={tdCls}>
                <span className="underline">Fraksiyaviy tarkibi:</span><br />
                °C, dan yuqori emas haroratda 50 % haydaladi,
              </td>
              <td className={tdCls + ' text-center'}>280</td>
              <td className={tdCls + ' text-center'}>300</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.r3a_haqiqiy || ''}
                  onChange={(e) => set('r3a_haqiqiy', e.target.value)}
                />
              </td>
            </tr>
            {/* Row 3b */}
            <tr>
              <td className={tdCls}>°C, dan yuqori emas haroratda 95 % haydaladi</td>
              <td className={tdCls + ' text-center'}>360</td>
              <td className={tdCls + ' text-center'}>390</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.r3b_haqiqiy || ''}
                  onChange={(e) => set('r3b_haqiqiy', e.target.value)}
                />
              </td>
            </tr>
            {/* Row 4 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>4</td>
              <td className={tdCls}>
                <span className="underline">**Umumiy oltingugurtning massaviy ulushi, %, dan ortiq emas</span>
              </td>
              <td className={tdCls + ' text-center'}>1,36</td>
              <td className={tdCls + ' text-center'}>1,36</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.r4_haqiqiy || ''}
                  onChange={(e) => set('r4_haqiqiy', e.target.value)}
                />
              </td>
            </tr>
            {/* Row 5 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>5</td>
              <td className={tdCls}>
                <span className="underline">Yopiq tigelda aniqlanadigan chaqnash harorati, °C dan past emas</span>
              </td>
              <td className={tdCls + ' text-center text-xs italic'}>Me'yorlanmaydi, aniqlanishi shart</td>
              <td className={tdCls + ' text-center text-xs italic'}>Me'yorlanmaydi, aniqlanishi shart</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.r5_haqiqiy || ''}
                  onChange={(e) => set('r5_haqiqiy', e.target.value)}
                />
              </td>
            </tr>
            {/* Row 6 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>6</td>
              <td className={tdCls}>
                <span className="underline">**Qotish harorati, °C, dan yuqori emas</span>
              </td>
              <td className={tdCls + ' text-center text-xs italic'}>Me'yorlanmaydi, aniqlanishi shart</td>
              <td className={tdCls + ' text-center text-xs italic'}>Me'yorlanmaydi, aniqlanishi shart</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.r6_haqiqiy || ''}
                  onChange={(e) => set('r6_haqiqiy', e.target.value)}
                />
              </td>
            </tr>
            {/* Row 7 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>7</td>
              <td className={tdCls}><span className="underline">Suv miqdori.</span></td>
              <td className={tdCls + ' text-center'}>Mavjud emas</td>
              <td className={tdCls + ' text-center'}>Mavjud emas</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.r7_haqiqiy || ''}
                  onChange={(e) => set('r7_haqiqiy', e.target.value)}
                />
              </td>
            </tr>
            {/* Row 8 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>8</td>
              <td className={tdCls}><span className="underline">Mexanik birikmalar miqdori.</span></td>
              <td className={tdCls + ' text-center'}>Mavjud emas</td>
              <td className={tdCls + ' text-center'}>Mavjud emas</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.r8_haqiqiy || ''}
                  onChange={(e) => set('r8_haqiqiy', e.target.value)}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mb-2 text-xs italic text-black dark:text-white">
        *Izoh: xom ashyoni sof og'irligini hajm-og'irlik usulida aniqlash maqsadida uning harorati va zichligi namuna olish vaqtida aniqlanadi.
      </div>
      <div className="mb-6 text-xs italic text-black dark:text-white">
        ** Izoh: 1, 4, va 6 ko'rsatkichlar zarur hollarda ishlab chiqarish bo'limi talabiga asosan aniqlanadi.
      </div>
    </>
  );
}

const GazoylTemplate: SpravkaTemplate = {
  name: 'Газойль',
  docCode: 'ZSK-5-PD 006-011-115',
  title: 'Qabul qilinadigan gazoylga',
  address: '"Buxoro neftni qayta ishlash zavodi" MChJ markaziy tahlilxonasi, Qorovulbozor tumani, Mustaqillik ko\'chasi 1-uy. Tel: 65-364-12-27',
  shortDatesRow: false,
  Table,
  generatePdf,
};

export default GazoylTemplate;
