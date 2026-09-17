import type { AV, SpravkaTemplate, SpravkaTemplateProps } from '../shared/types';
import { blank, makePdfGenerator } from '../shared/pdfHelpers';
import { thCls, tdCls } from '../shared/styles';

function buildCopyContent(form: AV) {
  const ul = (val: string, pad = 18) => ({ text: blank(val, pad), decoration: 'underline', fontSize: 9 });
  const norm = (t: string) => ({ text: t, alignment: 'center', fontSize: 8, italics: true });
  return [
    { text: 'ZSK-5-PD 006-011-115', alignment: 'right', fontSize: 9, bold: true, margin: [0, 14, 0, 4] },
    { text: 'Qabul qilinadigan Kerosinga', alignment: 'center', bold: true, decoration: 'underline', fontSize: 11, margin: [0, 0, 0, 5] },
    { text: ["Ma'lumotnoma №  ", { text: blank(form.malumotnoma_no, 16), decoration: 'underline', bold: true, fontSize: 11 }], alignment: 'center', bold: true, fontSize: 11, margin: [0, 0, 0, 6] },
    { text: ['Manzil va sinov joyi: ', { text: '"Buxoro neftni qayta ishlash zavodi" MChJ markaziy tahlilxonasi, Qorovulbozor tumani, Mustaqillik ko\'chasi 1-uy. Tel: 65-364-12-27', decoration: 'underline', fontSize: 9 }], fontSize: 9, margin: [0, 0, 0, 4] },
    { columns: [{ text: ['Yetkazib beruvchi tashkilot: ', ul(form.yetkazib_beruvchi, 30)], width: '*', fontSize: 9 }, { text: ['  Vagon sisternalar soni: ', ul(form.vagon_soni, 8)], width: 'auto', fontSize: 9 }], margin: [0, 0, 0, 4] },
    { text: ['Namuna olingan v/s nomeri: ', ul(form.vagon_nomeri, 40)], fontSize: 9, margin: [0, 0, 0, 6] },
    { columns: [{ text: ["GOST 2517 bo'yicha namuna olingan sana: ", ul(form.gost_namuna_sana, 14)], width: '*', fontSize: 9 }, { text: ["Sinov o'tkazilgan sana: ", ul(form.sinov_sana, 14)], width: '*', fontSize: 9 }], margin: [0, 0, 0, 8] },
    {
      table: {
        headerRows: 1,
        widths: [22, '*', 85, 65],
        body: [
          [{ text: 'T/b\n№', bold: true, alignment: 'center', fontSize: 8, fillColor: '#e8e8e8' }, { text: "Ko'rsatkich nomi", bold: true, alignment: 'center', fontSize: 8, fillColor: '#e8e8e8' }, { text: "Me'yor", bold: true, alignment: 'center', fontSize: 8, fillColor: '#e8e8e8' }, { text: "Haqiqiy\nko'rsatgich", bold: true, alignment: 'center', fontSize: 8, fillColor: '#e8e8e8' }],
          [{ text: '1', alignment: 'center', fontSize: 8 }, { text: '15 °C haroratdagi zichlik, kg/m³, oraliqda', decoration: 'underline', fontSize: 8 }, { text: '775,0 - 840,0', alignment: 'center', fontSize: 8 }, { text: form.ker_zichlik || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '2', rowSpan: 7, alignment: 'center', fontSize: 8, margin: [0, 34, 0, 0] }, { stack: [{ text: 'Fraksiyaviy tarkibi', decoration: 'underline', fontSize: 8 }, { text: '- Haydash boshlanish harorati, °C', fontSize: 8 }] }, norm("me'yorlanmagan"), { text: form.ker_frak_1 || '', alignment: 'center', fontSize: 8, bold: true }],
          [{}, { text: '- 10% haydalganda, °C, yuqori emas', fontSize: 8 }, { text: '205', alignment: 'center', fontSize: 8 }, { text: form.ker_frak_2 || '', alignment: 'center', fontSize: 8, bold: true }],
          [{}, { text: '- 50% haydalganda, °C', fontSize: 8 }, norm("me'yorlanmagan"), { text: form.ker_frak_3 || '', alignment: 'center', fontSize: 8, bold: true }],
          [{}, { text: '- 90% haydalganda, °C', fontSize: 8 }, norm("me'yorlanmagan"), { text: form.ker_frak_4 || '', alignment: 'center', fontSize: 8, bold: true }],
          [{}, { text: '- Haydash tugash harorati, °C, yuqori emas', fontSize: 8 }, { text: '300', alignment: 'center', fontSize: 8 }, { text: form.ker_frak_5 || '', alignment: 'center', fontSize: 8, bold: true }],
          [{}, { text: "- Haydashdan qolgan qoldiq, %, ko'p emas", fontSize: 8 }, { text: '1,5', alignment: 'center', fontSize: 8 }, { text: form.ker_frak_6 || '', alignment: 'center', fontSize: 8, bold: true }],
          [{}, { text: "- Haydashdagi yo'qotishlar, %, ko'p emas", fontSize: 8 }, { text: '1,5', alignment: 'center', fontSize: 8 }, { text: form.ker_frak_7 || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '3', alignment: 'center', fontSize: 8 }, { text: 'Chaqnash harorati, °C, kam emas', decoration: 'underline', fontSize: 8 }, { text: '35', alignment: 'center', fontSize: 8 }, { text: form.ker_chaqnash || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '4', alignment: 'center', fontSize: 8 }, { text: "Merkaptanli oltingugurt miqdori, %, ko'p emas", decoration: 'underline', fontSize: 8 }, { text: '0,003', alignment: 'center', fontSize: 8 }, { text: form.ker_merkaptan || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '6', alignment: 'center', fontSize: 8 }, { text: "Kristallarning yo'qolish harorati, °C, yuqori emas", decoration: 'underline', fontSize: 8 }, { text: 'Minus 27', alignment: 'center', fontSize: 8 }, { text: form.ker_kristall || '', alignment: 'center', fontSize: 8, bold: true }],
        ],
      },
      layout: { hLineColor: '#000000', vLineColor: '#000000' },
      margin: [0, 0, 0, 8],
    },
    { text: "Ushbu ma'lumotnomani sinov laboratoriyasining ruxsatisiz ko'paytirish va nusxalash ta'qiqlanadi.", fontSize: 8, italics: true, margin: [0, 0, 0, 12] },
    { text: ["Smena boshlig'i: ", { text: blank(form.smena_boshligi, 36), decoration: 'underline', fontSize: 9 }], fontSize: 9, margin: [0, 0, 0, 6] },
  ];
}

const generatePdf = makePdfGenerator(buildCopyContent, 'kerosin');

function Table({ form, set }: SpravkaTemplateProps) {
  return (
    <>
      <div className="mb-5 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={thCls} style={{ width: 40 }}>T/b №</th>
              <th className={thCls}>Ko'rsatkich nomi</th>
              <th className={thCls} style={{ width: 100 }}>Me'yor</th>
              <th className={thCls} style={{ width: 90 }}>Haqiqiy ko'rsatgich</th>
            </tr>
          </thead>
          <tbody>
            {/* Row 1 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>1</td>
              <td className={tdCls}><span className="underline">15 °C haroratdagi zichlik, kg/m³, oraliqda</span></td>
              <td className={tdCls + ' text-center'}>775,0 - 840,0</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.ker_zichlik || ''}
                  onChange={(e) => set('ker_zichlik', e.target.value)}
                />
              </td>
            </tr>
            {/* Row 2 — Fraksiyaviy tarkibi (7 sub-rows) */}
            <tr>
              <td className={tdCls + ' text-center align-middle'} rowSpan={7}>2</td>
              <td className={tdCls}>
                <span className="underline">Fraksiyaviy tarkibi</span><br />
                - Haydash boshlanish harorati, °C
              </td>
              <td className={tdCls + ' text-center text-xs italic'}>me'yorlanmagan</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.ker_frak_1 || ''}
                  onChange={(e) => set('ker_frak_1', e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td className={tdCls}>- 10% haydalganda, °C, yuqori emas</td>
              <td className={tdCls + ' text-center'}>205</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.ker_frak_2 || ''}
                  onChange={(e) => set('ker_frak_2', e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td className={tdCls}>- 50% haydalganda, °C</td>
              <td className={tdCls + ' text-center text-xs italic'}>me'yorlanmagan</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.ker_frak_3 || ''}
                  onChange={(e) => set('ker_frak_3', e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td className={tdCls}>- 90% haydalganda, °C</td>
              <td className={tdCls + ' text-center text-xs italic'}>me'yorlanmagan</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.ker_frak_4 || ''}
                  onChange={(e) => set('ker_frak_4', e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td className={tdCls}>- Haydash tugash harorati, °C, yuqori emas</td>
              <td className={tdCls + ' text-center'}>300</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.ker_frak_5 || ''}
                  onChange={(e) => set('ker_frak_5', e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td className={tdCls}>- Haydashdan qolgan qoldiq, %, ko'p emas</td>
              <td className={tdCls + ' text-center'}>1,5</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.ker_frak_6 || ''}
                  onChange={(e) => set('ker_frak_6', e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td className={tdCls}>- Haydashdagi yo'qotishlar, %, ko'p emas</td>
              <td className={tdCls + ' text-center'}>1,5</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.ker_frak_7 || ''}
                  onChange={(e) => set('ker_frak_7', e.target.value)}
                />
              </td>
            </tr>
            {/* Row 3 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>3</td>
              <td className={tdCls}><span className="underline">Chaqnash harorati, °C, kam emas</span></td>
              <td className={tdCls + ' text-center'}>35</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.ker_chaqnash || ''}
                  onChange={(e) => set('ker_chaqnash', e.target.value)}
                />
              </td>
            </tr>
            {/* Row 4 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>4</td>
              <td className={tdCls}><span className="underline">Merkaptanli oltingugurt miqdori, %, ko'p emas</span></td>
              <td className={tdCls + ' text-center'}>0,003</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.ker_merkaptan || ''}
                  onChange={(e) => set('ker_merkaptan', e.target.value)}
                />
              </td>
            </tr>
            {/* Row 6 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>6</td>
              <td className={tdCls}><span className="underline">Kristallarning yo'qolish harorati, °C, yuqori emas</span></td>
              <td className={tdCls + ' text-center'}>Minus 27</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.ker_kristall || ''}
                  onChange={(e) => set('ker_kristall', e.target.value)}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mb-6 text-sm italic text-black dark:text-white">
        Ushbu ma'lumotnomani sinov laboratoriyasining ruxsatisiz ko'paytirish va nusxalash ta'qiqlanadi.
      </div>
    </>
  );
}

const KerosinTemplate: SpravkaTemplate = {
  name: 'Керосин',
  docCode: 'ZSK-5-PD 006-011-115',
  title: 'Qabul qilinadigan Kerosinga',
  address: '"Buxoro neftni qayta ishlash zavodi" MChJ markaziy tahlilxonasi, Qorovulbozor tumani, Mustaqillik ko\'chasi 1-uy. Tel: 65-364-12-27',
  shortDatesRow: true,
  Table,
  generatePdf,
};

export default KerosinTemplate;
