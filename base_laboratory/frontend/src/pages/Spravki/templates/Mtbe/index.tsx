import type { AV, SpravkaTemplate, SpravkaTemplateProps } from '../shared/types';
import { blank, makePdfGenerator } from '../shared/pdfHelpers';
import { thCls, tdCls, inputLine } from '../shared/styles';

function buildCopyContent(form: AV) {
  const ul = (val: string, pad = 18) => ({ text: blank(val, pad), decoration: 'underline', fontSize: 9 });
  const norm = (t: string) => ({ text: t, alignment: 'center', fontSize: 8, italics: true });
  return [
    { text: 'ZSK-5-PD 006-011-115', alignment: 'right', fontSize: 9, bold: true, margin: [0, 14, 0, 4] },
    { text: "Qabul qilinadigan Oktan sonini oshiruvchi MTBE qo'shimchasiga", alignment: 'center', bold: true, decoration: 'underline', fontSize: 11, margin: [0, 0, 0, 5] },
    { text: ["Ma'lumotnoma №  ", { text: blank(form.malumotnoma_no, 16), decoration: 'underline', bold: true, fontSize: 11 }], alignment: 'center', bold: true, fontSize: 11, margin: [0, 0, 0, 6] },
    { text: ['Manzil va sinov joyi: ', { text: '"Buxoro neftni qayta ishlash zavodi" MChJ markaziy tahlilxonasi, Qorovulbozor tumani, Mustaqillik ko\'chasi 1-uy. Tel: 65-364-12-27', decoration: 'underline', fontSize: 9 }], fontSize: 9, margin: [0, 0, 0, 4] },
    { text: ["Oktan ko'taruvchi qo'shimcha nomi: ", ul(form.qoshimcha_nomi, 45)], fontSize: 9, margin: [0, 0, 0, 4] },
    { columns: [{ text: ['Yetkazib beruvchi tashkilot: ', ul(form.yetkazib_beruvchi, 30)], width: '*', fontSize: 9 }, { text: ['  Vagon sisternalar soni: ', ul(form.vagon_soni, 8)], width: 'auto', fontSize: 9 }], margin: [0, 0, 0, 4] },
    { text: ['Namuna olingan v/s nomeri: ', ul(form.vagon_nomeri, 40)], fontSize: 9, margin: [0, 0, 0, 4] },
    { columns: [{ text: ['Namuna olingan sana: ', ul(form.namuna_sana, 14)], width: '*', fontSize: 9 }, { text: ["GOST 2517 bo'yicha: ", ul(form.gost_2517, 10)], width: '*', fontSize: 9 }, { text: ["Sinov o'tkazilgan sana: ", ul(form.sinov_sana, 14)], width: '*', fontSize: 9 }], margin: [0, 0, 0, 6] },
    {
      table: {
        headerRows: 1,
        widths: [22, '*', 90, 65],
        body: [
          [{ text: 'T/b\n№', bold: true, alignment: 'center', fontSize: 8, fillColor: '#e8e8e8' }, { text: "Ko'rsatkich nomi", bold: true, alignment: 'center', fontSize: 8, fillColor: '#e8e8e8' }, { text: "TT 16472899-054:2026\nbo'yicha me'yor", bold: true, alignment: 'center', fontSize: 8, fillColor: '#e8e8e8' }, { text: "Haqiqiy\nko'rsatgich", bold: true, alignment: 'center', fontSize: 8, fillColor: '#e8e8e8' }],
          [{ text: '1', alignment: 'center', fontSize: 8 }, { text: "Tashqi ko'rinishi", decoration: 'underline', fontSize: 8 }, { text: "Mexanik qo'shimchalarsiz, tiniq suyuqlik", alignment: 'center', fontSize: 8 }, { text: form.mtbe_tashqi || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '2', alignment: 'center', fontSize: 8 }, { text: "**Tadqiqot uzulidagi oktan soni ( benzin mahsuloti bilan aralashtirish yo'li bilan aniqlangan), kam emas", decoration: 'underline', fontSize: 8 }, { text: '120', alignment: 'center', fontSize: 8 }, { text: form.mtbe_oktan || '', alignment: 'center', fontSize: 8, bold: true }],
          [{ text: '3', alignment: 'center', fontSize: 8 }, { text: '*Namuna olish vaqtdagi zichlik, kg/m³', decoration: 'underline', fontSize: 8 }, norm("Me'yorlanmaydi"), { text: form.mtbe_namuna_zichlik || '', alignment: 'center', fontSize: 8, bold: true }],
        ],
      },
      layout: { hLineColor: '#000000', vLineColor: '#000000' },
      margin: [0, 0, 0, 6],
    },
    { text: "*Izoh: Xom ashyoni sof og'irligini hajm-og'irlik usulida aniqlash maqsadida uning harorati va zichligi namuna olish vaqtida aniqlanadi.", fontSize: 7, italics: true, margin: [0, 0, 0, 2] },
    { text: "** Izoh: 2 ko'rsatkichlar zarur hollarda ishlab chiqarish bo'limi talabiga asosan aniqlanadi.", fontSize: 7, italics: true, margin: [0, 0, 0, 8] },
    { text: ["Smena boshlig'i: ", { text: blank(form.smena_boshligi, 36), decoration: 'underline', fontSize: 9 }], fontSize: 9, margin: [0, 0, 0, 6] },
  ];
}

const generatePdf = makePdfGenerator(buildCopyContent, 'mtbe');

function HeaderExtra({ form, set }: SpravkaTemplateProps) {
  return (
    <div className="mb-3 flex items-baseline gap-2">
      <span className="whitespace-nowrap text-sm font-medium text-black dark:text-white">
        Oktan ko'taruvchi qo'shimcha nomi:
      </span>
      <input
        className={inputLine + ' flex-1'}
        placeholder=""
        value={form.qoshimcha_nomi || ''}
        onChange={(e) => set('qoshimcha_nomi', e.target.value)}
      />
    </div>
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
              <th className={thCls}>Ko'rsatkich nomi</th>
              <th className={thCls} style={{ width: 130 }}>TT 16472899-054:2026 bo'yicha me'yor</th>
              <th className={thCls} style={{ width: 90 }}>Haqiqiy ko'rsatgich</th>
            </tr>
          </thead>
          <tbody>
            {/* Row 1 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>1</td>
              <td className={tdCls}><span className="underline">Tashqi ko'rinishi</span></td>
              <td className={tdCls + ' text-center'}>Mexanik qo'shimchalarsiz, tiniq suyuqlik</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.mtbe_tashqi || ''}
                  onChange={(e) => set('mtbe_tashqi', e.target.value)}
                />
              </td>
            </tr>
            {/* Row 2 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>2</td>
              <td className={tdCls}><span className="underline">**Tadqiqot uzulidagi oktan soni ( benzin mahsuloti bilan aralashtirish yo'li bilan aniqlangan), kam emas</span></td>
              <td className={tdCls + ' text-center'}>120</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.mtbe_oktan || ''}
                  onChange={(e) => set('mtbe_oktan', e.target.value)}
                />
              </td>
            </tr>
            {/* Row 3 */}
            <tr>
              <td className={tdCls + ' text-center align-middle'}>3</td>
              <td className={tdCls}><span className="underline">*Namuna olish vaqtdagi zichlik, kg/m³</span></td>
              <td className={tdCls + ' text-center text-xs italic'}>Me'yorlanmaydi</td>
              <td className={tdCls}>
                <input
                  className="w-full bg-transparent text-center text-xs font-bold outline-none dark:text-white"
                  value={form.mtbe_namuna_zichlik || ''}
                  onChange={(e) => set('mtbe_namuna_zichlik', e.target.value)}
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
        ** Izoh: 2 ko'rsatkichlar zarur hollarda ishlab chiqarish bo'limi talabiga asosan aniqlanadi.
      </div>
    </>
  );
}

const MtbeTemplate: SpravkaTemplate = {
  name: 'МТБЭ',
  docCode: 'ZSK-5-PD 006-011-115',
  title: "Qabul qilinadigan Oktan sonini oshiruvchi MTBE qo'shimchasiga",
  address: '"Buxoro neftni qayta ishlash zavodi" MChJ markaziy tahlilxonasi, Qorovulbozor tumani, Mustaqillik ko\'chasi 1-uy. Tel: 65-364-12-27',
  shortDatesRow: false,
  HeaderExtra,
  Table,
  generatePdf,
};

export default MtbeTemplate;
