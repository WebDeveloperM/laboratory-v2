import type { AV, SpravkaTemplate, SpravkaTemplateProps } from '../shared/types';
import { blank, makePdfGenerator } from '../shared/pdfHelpers';
import { thCls, tdCls } from '../shared/styles';

function buildCopyContent(form: AV) {
  const ul = (val: string, pad = 18) => ({ text: blank(val, pad), decoration: 'underline', fontSize: 9 });
  return [
    { text: 'ZSK-5-PD 006-011-180', alignment: 'right', fontSize: 9, bold: true, margin: [0, 14, 0, 4] },
    { text: "Qabul qilinadigan MMA qo'ndirmasiga", alignment: 'center', bold: true, decoration: 'underline', fontSize: 11, margin: [0, 0, 0, 5] },
    { text: ["Ma'lumotnoma №  ", { text: blank(form.malumotnoma_no, 16), decoration: 'underline', bold: true, fontSize: 11 }], alignment: 'center', bold: true, fontSize: 11, margin: [0, 0, 0, 6] },
    { text: ['Manzil va sinov joyi: ', { text: '"Buxoro neftni qayta ishlash zavodi" MChJ markaziy tahlilxonasi, Qorovulbozor tumani, Mustaqillik ko\'chasi 1-uy. Tel: 65-364-12-27', decoration: 'underline', fontSize: 9 }], fontSize: 9, margin: [0, 0, 0, 4] },
    { columns: [{ text: ['Yetkazib beruvchi tashkilot: ', ul(form.yetkazib_beruvchi, 30)], width: '*', fontSize: 9 }, { text: ['  Vagon sisternalar soni: ', ul(form.vagon_soni, 8)], width: 'auto', fontSize: 9 }], margin: [0, 0, 0, 4] },
    { text: ['Namuna olingan v/s nomeri: ', ul(form.vagon_nomeri, 40)], fontSize: 9, margin: [0, 0, 0, 4] },
    { columns: [{ text: ['Namuna olingan sana: ', ul(form.namuna_sana, 14)], width: '*', fontSize: 9 }, { text: ["GOST 2517 bo'yicha: ", ul(form.gost_2517, 10)], width: '*', fontSize: 9 }, { text: ["Sinov o'tkazilgan sana: ", ul(form.sinov_sana, 14)], width: '*', fontSize: 9 }], margin: [0, 0, 0, 6] },
    {
      table: {
        headerRows: 1,
        widths: [22, '*', 90, 65],
        body: [
          [{ text: 'T/b\n№', bold: true, alignment: 'center', fontSize: 8, fillColor: '#e8e8e8' }, { text: "Ko'rsatkich nomlari", bold: true, alignment: 'center', fontSize: 8, fillColor: '#e8e8e8' }, { text: "TT 16472899-053:2026\nbo'yicha me'yor", bold: true, alignment: 'center', fontSize: 8, fillColor: '#e8e8e8' }, { text: "Haqiqiy\nko'rsatgich", bold: true, alignment: 'center', fontSize: 8, fillColor: '#e8e8e8' }],
          [{ text: '1', alignment: 'center', fontSize: 8 }, { text: "*70: 30 hajmiy nisbatda olingan izooktan va normal geptan aralashmasiga 1,5 % massaviy miqdorda aralashtirganda oktan sonining oshishi, dan kam emas.", fontSize: 8 }, { text: '6', alignment: 'center', fontSize: 8 }, { text: form.mma_oktan || '', alignment: 'center', fontSize: 8, bold: true }],
        ],
      },
      layout: { hLineColor: '#000000', vLineColor: '#000000' },
      margin: [0, 0, 0, 8],
    },
    { text: "* Izoh: Xom ashyoni ishlab chiqaruvchi tomonidan yuborilgan hujjat asosida qabul qilinadi va ushbu ko'rsatgich zarur hollarda ishlab chiqarish bo'limi talabiga asosan aniqlanadi.", fontSize: 7, italics: true, margin: [0, 0, 0, 12] },
    { text: ["Smena boshlig'i: ", { text: blank(form.smena_boshligi, 36), decoration: 'underline', fontSize: 9 }], fontSize: 9, margin: [0, 0, 0, 6] },
  ];
}

const generatePdf = makePdfGenerator(buildCopyContent, 'mma');

function Table({ form, set }: SpravkaTemplateProps) {
  return (
    <>
      <div className="mb-5 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={thCls} style={{ width: 40 }}>T/b №</th>
              <th className={thCls}>Ko'rsatkich nomlari</th>
              <th className={thCls} style={{ width: 130 }}>TT 16472899-053:2026 bo'yicha me'yor</th>
              <th className={thCls} style={{ width: 90 }}>Haqiqiy ko'rsatgich</th>
            </tr>
          </thead>
          <tbody>
            {/* Row 1 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>1</td>
              <td className={tdCls}>
                *70: 30 hajmiy nisbatda olingan izooktan va normal geptan aralashmasiga 1,5 % massaviy miqdorda aralashtirganda oktan sonining oshishi, dan kam emas.
              </td>
              <td className={tdCls + ' text-center'}>6</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.mma_oktan || ''}
                  onChange={(e) => set('mma_oktan', e.target.value)}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mb-6 text-xs italic text-black dark:text-white">
        * Izoh: Xom ashyoni ishlab chiqaruvchi tomonidan yuborilgan hujjat asosida qabul qilinadi va ushbu ko'rsatgich zarur hollarda ishlab chiqarish bo'limi talabiga asosan aniqlanadi.
      </div>
    </>
  );
}

const MmaTemplate: SpravkaTemplate = {
  name: 'ММА',
  docCode: 'ZSK-5-PD 006-011-180',
  title: "Qabul qilinadigan MMA qo'ndirmasiga",
  address: '"Buxoro neftni qayta ishlash zavodi" MChJ markaziy tahlilxonasi, Qorovulbozor tumani, Mustaqillik ko\'chasi 1-uy. Tel: 65-364-12-27',
  shortDatesRow: false,
  Table,
  generatePdf,
};

export default MmaTemplate;
